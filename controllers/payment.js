const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const pool = require("../config/db");
const coacheeModule = require("../models/coachee");
const paymentModel = require("../models/payment");
const { isWithinGermany } = require("../utility/isWithinGermany");
const { afterCompletePayment } = require("../utility/payments.");
const {
  sessionPayTemplatePath,
  ejsData,
  renderEJSTemplate,
  sessionPayCoacheeTemplatePath,
  sessionPayGermanTemplatePath,
  sessionPayCoacheeGermanTemplatePath,
} = require("../utility/renderEmail");
const sendEmail = require("../utility/sendMail");
const moment = require("moment");
exports.createStripeCustomer = async (req, res) => {
  try {
    const id = req.user.userId;
    const coachee = await coacheeModule.coachee(id);

    const customer = await stripe.customers.create({
      email: coachee.email,
    });
    const update = await coacheeModule.updateCoachee(coachee.id, {
      customer_id: customer.id,
    });
    if (update) {
      return res.status(200).json({ success: true, update });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.addNewCard = async (req, res) => {
  try {
    const id = req.user.userId;
    const coachee = await coacheeModule.coachee(id);
    const { number, exp_month, exp_year, cvc } = req.body;
    console.log(coachee);

    // return res.send("hello")
    const cardToken = await stripe.tokens.create({
      card: {
        number,
        exp_month,
        exp_year,
        cvc,
      },
    });

    console.log(cardToken);

    const card = await stripe.customers.createSource(coachee.customer_id, {
      source: `${cardToken.id}`,
    });

    const checkCard = await paymentModel.getCardByFingerPrint(card.fingerprint);
    if (checkCard.length > 0) {
      const updatedCard = await paymentModel.updateCard(
        card.id,
        card.fingerprint
      );
      res.status(200).send({ success: true, card: updatedCard });
    } else {
      const newCard = await paymentModel.addNewCard(
        coachee.customer_id,
        coachee.id,
        card.id,
        card.fingerprint
      );
      res.status(200).send({ success: true, card: newCard });
    }
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
};

exports.createCharges = async (req, res) => {
  try {
    const coachee_id = req.user.userId;
    const { id } = req.params;
    const cardDetail = await paymentModel.getByCard(id);
    const { charges } = req.body;
    const coachee = await coacheeModule.coachee(coachee_id);
    const createCharge = await stripe.charges.create({
      receipt_email: coachee.email,
      amount: parseInt(charges) * 100,
      currency: "USD",
      card: cardDetail.id,
      customer: coachee.customer_id,
      //   transfer_data: {
      //     destination: 'coach.account_number', // Replace with the actual account ID
      //     amount: splitAmount,
      //   },
    });

    return res.status(200).json({ success: true, createCharge });
  } catch (error) {
    return res.status(400).json({ success: false, msg: error.message });
  }
};

exports.get = async (req, res) => {
  try {
    const coachee_id = req.user.userId;

    const cards = await paymentModel.getAllByCoachee(coachee_id);

    // Retrieve cards from Stripe
    const stripeData = await stripe.customers.listSources(cards.customer_id, {
      object: "card",
    });

    // Update last4 field in cards
    cards.cardlist.forEach((card) => {
      const matchCard = stripeData.data.find((obj) => obj.id === card.card_id);
      if (matchCard) {
        card.last4 = matchCard.last4;
        card.type = matchCard.brand;
      }
    });

    return res.status(200).json({ success: true, cards });
  } catch (err) {
    return res.status(400).json({ success: false, msg: err.message });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteCard = await paymentModel.cardDelete(id);

    const card = await stripe.customers.deleteSource(
      deleteCard.customer_id,
      deleteCard.card_id
    );

    if (card.deleted) {
      return res.status(200).json({ success: true, deleteCard });
    }
  } catch (err) {
    return res.status(400).json({ success: false, msg: err.message });
  }
};

exports.getTransactionDetails = async (req, res) => {
  const coach_id = req.params.coach_id;
  try {
    const walletResult = await pool.query(
      "SELECT * FROM wallets WHERE coach_id = $1",
      [coach_id]
    );
    const transactionResult = await pool.query(
      "SELECT * FROM transactions WHERE coach_id = $1",
      [coach_id]
    );

    const walletData = walletResult.rows;
    const transactionData = transactionResult.rows;

    if (walletData.length === 0 && transactionData.length === 0) {
      // If both walletData and transactionData arrays are empty, return a response indicating no data found
      return res.status(404).json({ success: false, msg: "No data found" });
    }

    const responseData = {
      wallets: walletData[0],
      transactions: transactionData,
    };

    // Send the data in the response
    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    res.status(500).json({ success: false, msg: "INTERNAL SERVER ERROR" });
  }
};

exports.createCustomer = async (req, res) => {
  const { user_id, paymentMethodId } = req.body;

  console.log({ user_id, paymentMethodId });

  try {
    // Check if user exists and retrieve user details
    const userResult = await pool.query(
      `SELECT * FROM coachee_v2 LEFT JOIN users ON coachee_v2.user_id = users.id WHERE coachee_v2.user_id = $1`,
      [user_id]
    );
    let user = userResult.rows[0];
    if (!user) return res.status(404).json({ result: "User not found." });

    let customerId = user.customer_id;
    if (!customerId) {
      const name = user.first_name ? user.first_name : user.email;
      const customer = await stripe.customers.create({
        name: name,
        email: user.email,
      });
      customerId = customer.id;

      const updateUserResult = await pool.query(
        `UPDATE coachee_v2 SET customer_id = $1 WHERE user_id = $2 RETURNING *`,
        [customerId, user_id]
      );
      if (updateUserResult.rowCount === 0) {
        throw new Error("Failed to update user with customer ID.");
      }

      // Retrieve the updated user details
      const updatedUserResult = await pool.query(
        `SELECT * FROM coachee_v2 LEFT JOIN users ON coachee_v2.user_id = users.id WHERE coachee_v2.user_id = $1`,
        [user_id]
      );
      user = updatedUserResult.rows[0];
    }

    // Check if the card already exists for the customer
    const cardResult = await pool.query(
      `SELECT * FROM cards WHERE customer_id = $1 AND card_id = $2`,
      [customerId, paymentMethodId]
    );
    if (cardResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Card already exists for this customer.",
      });
    }

    // Attach payment method to customer
    const customerCard = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Insert new card details into the database
    const insertCardResult = await pool.query(
      `INSERT INTO cards (customer_id, card_id, exp_month, exp_year, last_digit, finger_print, brand_name, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        customerId,
        customerCard.id,
        customerCard.card.exp_month,
        customerCard.card.exp_year,
        customerCard.card.last4,
        customerCard.card.fingerprint,
        customerCard.card.brand,
        user_id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Customer & Card added successfully!",
      card: insertCardResult.rows[0],
    });
  } catch (error) {
    console.error("Error in customer creation or card attachment:", error);
    return res.status(500).json({
      success: false,
      message: "INTERNAL SERVER ERROR",
      error: error.message,
    });
  }
};

exports.standardAccountConnect = async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: "standard",
      country: "CH",
    });

    res.status(200).json({
      success: true,
      message: "Account created successfully",
      result: account,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

/**
 *
 * @param {*} req
 * @param {*} res
 *
 * if user already has the connected account id then it will use that ID to full fill other requirements for stripe
 * if user don't have the connected account id then it will start from the beginning of the account
 * @returns
 */

exports.createAccountLink = async (req, res) => {
  try {
    // const { user_id } = req.body;
    const user_id = req.user.userId;
    let accountLink;
    const accountIdExists = await pool.query(
      "SELECT stripe_account_id FROM coach_v2 WHERE user_id = $1",
      [user_id]
    );
    if (accountIdExists.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (accountIdExists.rows[0].stripe_account_id) {
      accountLink = await stripe.accountLinks.create({
        account: accountIdExists.rows[0].stripe_account_id,
        refresh_url: "https://mtechub.com/reauth",
        return_url: `${process.env.FRONTEND_URL}/coach-profile-complete?stripe_account=connected&account_id=${accountIdExists.rows[0].stripe_account_id}`,
        type: "account_onboarding",
      });
    } else {
      // create the standard account first ----
      const account = await stripe.accounts.create({
        type: "standard",
        country: "CH",
      });
      if (account) {
        accountLink = await stripe.accountLinks.create({
          account: account?.id,
          refresh_url: "https://mtechub.com/reauth",
          return_url: `${process.env.FRONTEND_URL}/coach-profile-complete?stripe_account=connected&account_id=${account?.id}`,
          type: "account_onboarding",
        });

        await pool.query(
          "UPDATE coach_v2 SET stripe_account_id = $1 WHERE user_id = $2",
          [account.id, user_id]
        );
      }
    }
    return res.status(200).json({
      success: true,
      message: "Account link created successfully!",
      result: accountLink,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.checkVerificationStatus = async (req, res) => {
  try {
    const accountId = req.query.accountId;
    const account = await stripe.accounts.retrieve(accountId);

    // Make sure we have an account object and requirements before proceeding
    if (!account || !account.requirements) {
      throw new Error("Account or account requirements are not available.");
    }

    // Check each field to ensure it's not null before trying to access its properties
    const requirements = account.requirements;
    const requirementsData = {
      current_deadline: requirements.current_deadline,
      currently_due: requirements.currently_due || [],
      disabled_reason: requirements.disabled_reason,
      errors: requirements.errors || [],
      eventually_due: requirements.eventually_due || [],
      past_due: requirements.past_due || [],
      pending_verification: requirements.pending_verification || [],
    };
    return res.status(200).json({
      success: true,
      message: "Verification data retrieved!",
      result: requirementsData,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.transferFunds = async (req, res) => {
  const { coach_id, session_id, coachee_id, amount, paymentMethodId } =
    req.body;

  try {
    console.log("Request for payment", coach_id, coachee_id);

    const userResult = await pool.query(
      "SELECT stripe_account_id FROM coach_v2 WHERE user_id = $1",
      [coach_id]
    );
    const coacheeResult = await pool.query(
      "SELECT customer_id FROM coachee_v2 WHERE user_id = $1",
      [coachee_id]
    );

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Coach not found" });
    }
    if (coacheeResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Coachee not found" });
    }

    const connectedAccountId = userResult.rows[0].stripe_account_id;
    const customer_id = coacheeResult.rows[0].customer_id;

    if (!connectedAccountId) {
      return res.status(400).json({
        success: false,
        message: "Coach's Stripe account ID is missing",
      });
    }

    const coacheeCardResult = await pool.query(
      "SELECT card_id FROM cards WHERE user_id = $1",
      [coachee_id]
    );

    if (coacheeCardResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No card found for Coachee" });
    }

    const card_id = coacheeCardResult.rows[0].card_id;

    const applicationFeeAmount = (amount / 100) * 19;
    const amountInRappen = amount * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      payment_method: paymentMethodId,
      customer: customer_id,
      amount: amountInRappen,
      currency: "chf",
      confirmation_method: "automatic",
      confirm: true,
      on_behalf_of: connectedAccountId,
      transfer_data: {
        destination: connectedAccountId,
      },
      return_url: "https://linkedin.com",
      application_fee_amount: Math.round(applicationFeeAmount),
      metadata: {
        coach_id,
        session_id,
        coachee_id,
      },
    });

    await pool.query(
      "INSERT INTO notification_requests_payment (title, type, coachee_id) VALUES ($1, $2, $3) RETURNING *",
      ["PAYMENT SUCCESSFUL", "PAYMENT", coachee_id]
    );

    const coachData = await pool.query(
      `SELECT first_name, last_name, email , lat , long FROM users WHERE id = $1`,
      [coach_id]
    );

    const coacheeData = await pool.query(
      `SELECT first_name, last_name, email , lat, long FROM users WHERE id = $1`,
      [coachee_id]
    );
    const sessionData = await pool.query(
      `SELECT * FROM sessions WHERE id = $1`,
      [session_id]
    );

    const coach_name =
      coachData.rows[0].first_name + " " + coachData.rows[0].last_name;
    const coach_email = coachData.rows[0].email;
    const coachee_name =
      coacheeData.rows[0].first_name + " " + coacheeData.rows[0].last_name;
    const email = coachData.rows[0].email;
    const coachee_email = coacheeData.rows[0].email;
    const duration = sessionData.rows[0].duration;
    const section = moment(sessionData.rows[0].section, "HH:mm:ss").format(
      "HH:mm"
    );
    const date = moment(sessionData.rows[0].date).format("YYYY-MM-DD");
    const data = {
      coach_name,
      coach_email,
      coachee_name,
      coachee_email,
      duration,
      time: section,
      amount,
      date: date,
      web_link: process.env.FRONTEND_URL,
    };

    const coachInGermany = isWithinGermany(
      coachData?.rows[0]?.lat,
      coachData?.rows[0]?.long
    );
    const coacheeInGermany = isWithinGermany(
      coacheeData?.rows[0]?.lat,
      coacheeData?.rows[0]?.long
    );

    const verificationData = ejsData(data);
    const verificationHtmlContent = await renderEJSTemplate(
      coachInGermany ? sessionPayGermanTemplatePath : sessionPayTemplatePath,
      verificationData
    );
    const verificationHtmlContentCoachee = await renderEJSTemplate(
      coacheeInGermany
        ? sessionPayCoacheeGermanTemplatePath
        : sessionPayCoacheeTemplatePath,
      verificationData
    );
    await sendEmail(
      email,
      coachInGermany ? "Sitzungszahlung erhalten" : "Received Session Payment",
      verificationHtmlContent
    );
    await sendEmail(
      coachee_email,
      coacheeInGermany
        ? "Sitzungszahlung erfolgreich"
        : "Session Payment Successful",
      verificationHtmlContentCoachee
    );

    console.log("Payment Successfull.......>>");

    return res.status(200).json({
      success: true,
      message: "Payment has been successful",
      // result: paymentIntent,
    });
  } catch (error) {
    console.log("Error Occured during payment : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.body;
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    res.status(200).json({
      success: true,
      message: "Balance retrieved successfully",
      result: balance,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getUserCards = async (req, res) => {
  const userId = req.params.userId;
  try {
    const result = await pool.query("SELECT * FROM cards WHERE user_id = $1", [
      userId,
    ]);

    if (result.rowCount === 0) {
      return result
        .status(200)
        .json({ success: true, message: "No records available", result: [] });
    }

    res.status(200).json({
      success: true,
      message: "Balance retrieved successfully",
      result: result.rows,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getUserTransactions = async (req, res) => {
  const { userId } = req.params;

  console.log("Getting user transaction");

  try {
    const result = await pool.query(
      "SELECT * FROM transactions WHERE coach_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    const wallet = await pool.query(
      "SELECT * FROM wallets WHERE coach_id = $1",
      [userId]
    );

    // console.log("Wallet", wallet.rows[0]);

    if (result.rowCount === 0 || wallet.rowCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "We are facing some issues..." });
    }

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      result: { wallet: wallet.rows[0], transactions: result.rows },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAdminTransactions = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  try {
    const result = await pool.query(
      "SELECT * FROM admin_transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    );

    const wallet = await pool.query(
      "SELECT * FROM wallets WHERE is_admin = TRUE"
    );

    // console.log("Wallet", wallet.rows[0]);

    if (result.rowCount === 0 || wallet.rowCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "We are facing some issues..." });
    }

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageSize),
        totalPages: Math.ceil(result.rowCount / pageSize),
        totalCount: result.rowCount,
      },
      result: { wallet: wallet.rows[0], transactions: result.rows },
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getUsersTransactions = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  try {
    const result = await pool.query(
      `
SELECT 
    t.*, 
    (coach.first_name || ' ' || coach.last_name) AS coach_full_name,
    (coachee.first_name || ' ' || coachee.last_name) AS coachee_full_name
FROM 
    transactions t
LEFT JOIN 
    users coach ON t.coach_id = coach.id
LEFT JOIN 
    users coachee ON t.coachee_id = coachee.id
ORDER BY 
    t.created_at DESC 
LIMIT $1 OFFSET $2;

`,
      [pageSize, offset]
    );

    // console.log("Wallet", wallet.rows[0]);

    if (result.rowCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "We are facing some issues..." });
    }

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageSize),
        totalPages: Math.ceil(result.rowCount / pageSize),
        totalCount: result.rowCount,
      },
      result: result.rows,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.withdraw = async (req, res) => {
  const { amount, coachId } = req.body;
  try {
    // Check if a withdrawal has been made in the last week
    const lastWithdrawal = await pool.query(
      "SELECT * FROM transactions WHERE coach_id = $1 AND out_going = TRUE AND created_at >= NOW() - INTERVAL '7 days' LIMIT 1",
      [coachId]
    );

    if (lastWithdrawal.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Only one withdrawal is allowed per week.",
        code: "WEEKLY_WIThDRAWAL_ERROR",
      });
    }
    const userWalletBalance = await pool.query(
      "SELECT * FROM wallets WHERE coach_id = $1",
      [coachId]
    );
    const walletBalance = parseInt(userWalletBalance.rows[0].balance);
    if (amount > walletBalance || amount < 5) {
      return res.status(400).json({
        success: false,
        message: "Transaction failed: Insufficient funds in your wallet.",
      });
    }

    const coach = await pool.query(
      "SELECT * FROM coach_v2 WHERE user_id = $1",
      [coachId]
    );
    const stripeAccountId = coach.rows[0].stripe_account_id;
    if (!stripeAccountId) {
      return res
        .status(404)
        .send({ success: false, message: "Stripe account not found." });
    }

    // Create a payout to the user's bank account
    const payout = await stripe.payouts.create(
      {
        amount: amount * 100,
        currency: "chf",
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    await pool.query(
      "INSERT INTO transactions (coach_id, amount, out_going) VALUES($1,$2,$3)",
      [coachId, amount, true]
    );

    // Update the user's wallet balance in your database
    const newBalance = walletBalance - amount;
    await pool.query("UPDATE wallets SET balance = $1 WHERE coach_id = $2", [
      newBalance,
      coachId,
    ]);

    res.json({ success: true, message: "Withdraw successfully made!" });
  } catch (error) {
    console.error("Withdrawal failed: 😁😁😁", error?.code);
    if (error?.code === "balance_insufficient") {
      return res.status(400).json({
        success: false,
        message: "Your balance is insufficient for this withdrawal",
      });
    }
    if (error?.code === "amount_too_small") {
      return res.status(400).json({
        success: false,
        message: "Amount is too small to withdrawal",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Withdrawal failed. try again later",
    });
  }
};

exports.adminWithdraw = async (req, res) => {
  const { amount } = req.body;
  try {
    // Check if a withdrawal has been made in the last week
    const lastWithdrawal = await pool.query(
      "SELECT * FROM admin_transactions WHERE out_going = TRUE AND created_at >= NOW() - INTERVAL '7 days' LIMIT 1"
    );

    if (lastWithdrawal.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Only one withdrawal is allowed per week.",
        code: "WEEKLY_WIThDRAWAL_ERROR",
      });
    }
    const userWalletBalance = await pool.query(
      "SELECT * FROM wallets WHERE is_admin = TRUE"
    );
    const walletBalance = parseInt(userWalletBalance.rows[0].balance);
    if (amount > walletBalance) {
      return res.status(400).json({
        success: false,
        message: "Transaction failed: Insufficient funds in your wallet.",
      });
    }
    const payout = await stripe.payouts.create({
      amount: amount * 100,
      currency: "chf",
    });
    console.log("Payout created:", payout);
    return res.status(200).json({ success: true, message: "Payout created" });
  } catch (error) {
    console.error("Error creating payout:", error);
  }
};

// Fetch monthly transactions for a coach
exports.monthlyTransactions = async (req, res) => {
  const coachId = parseInt(req.params.coachId);
  try {
    const { rows } = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM created_at) AS year,
        EXTRACT(MONTH FROM created_at) AS month,
        SUM(amount) AS total_amount
      FROM transactions
      WHERE coach_id = $1 AND out_going = FALSE
      GROUP BY year, month
      ORDER BY year, month;`,
      [coachId]
    );
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch yearly transactions for a coach
exports.yearlyTransactions = async (req, res) => {
  const coachId = parseInt(req.params.coachId);
  try {
    const { rows } = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM created_at) AS year,
        SUM(amount) AS total_amount
      FROM transactions
      WHERE coach_id = $1 AND out_going = FALSE
      GROUP BY year
      ORDER BY year;`,
      [coachId]
    );
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Fetch monthly transactions for a admin
exports.monthlyAdminTransactions = async (req, res) => {
  const coachId = parseInt(req.params.coachId);
  try {
    const { rows } = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM created_at) AS year,
        EXTRACT(MONTH FROM created_at) AS month,
        SUM(amount) AS total_amount
      FROM admin_transactions
      WHERE out_going = FALSE
      GROUP BY year, month
      ORDER BY year, month;`
    );
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch yearly transactions for a admin
exports.yearlyAdminTransactions = async (req, res) => {
  const coachId = parseInt(req.params.coachId);
  try {
    const { rows } = await pool.query(
      `SELECT
        EXTRACT(YEAR FROM created_at) AS year,
        SUM(amount) AS total_amount
      FROM admin_transactions
      WHERE out_going = FALSE
      GROUP BY year
      ORDER BY year;`
    );
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.overallMonthlyTransactions = async (req, res) => {
  try {
    const query = `
      WITH monthly_coaches AS (
        SELECT
          EXTRACT(YEAR FROM created_at) AS year,
          EXTRACT(MONTH FROM created_at) AS month,
          SUM(amount) AS total_amount
        FROM transactions
        WHERE coach_id IS NOT NULL AND out_going = FALSE
        GROUP BY year, month
      ),
      monthly_admins AS (
        SELECT
          EXTRACT(YEAR FROM created_at) AS year,
          EXTRACT(MONTH FROM created_at) AS month,
          SUM(amount) AS total_amount
        FROM admin_transactions
        WHERE out_going = FALSE
        GROUP BY year, month
      )
      SELECT
        COALESCE(c.year, a.year) AS year,
        COALESCE(c.month, a.month) AS month,
        COALESCE(c.total_amount, 0) + COALESCE(a.total_amount, 0) AS total_amount
      FROM monthly_coaches c
      FULL OUTER JOIN monthly_admins a ON c.year = a.year AND c.month = a.month
      ORDER BY year, month;
    `;

    const { rows } = await pool.query(query);
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.overallYearlyTransactions = async (req, res) => {
  try {
    const query = `
      WITH yearly_coaches AS (
        SELECT
          EXTRACT(YEAR FROM created_at) AS year,
          SUM(amount) AS total_amount
        FROM transactions
        WHERE coach_id IS NOT NULL AND out_going = FALSE
        GROUP BY year
      ),
      yearly_admins AS (
        SELECT
          EXTRACT(YEAR FROM created_at) AS year,
          SUM(amount) AS total_amount
        FROM admin_transactions
        WHERE out_going = FALSE
        GROUP BY year
      )
      SELECT
        COALESCE(c.year, a.year) AS year,
        COALESCE(c.total_amount, 0) + COALESCE(a.total_amount, 0) AS total_amount
      FROM yearly_coaches c
      FULL OUTER JOIN yearly_admins a ON c.year = a.year
      ORDER BY year;
    `;

    const { rows } = await pool.query(query);
    res.json({ status: true, result: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
