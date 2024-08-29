const pool = require("../config/db");

const afterCompletePayment = async (payment_data) => {
  await pool.query("BEGIN");
  console.log(
    "Payment is successfully completed",
    payment_data?.data?.object?.amount / 100,
    payment_data?.data?.object?.amount
  );
  try {
    const coachId = payment_data?.data.object?.metadata?.coach_id;
    const sessionId = payment_data?.data.object?.metadata?.session_id;
    const coacheeId = payment_data?.data.object?.metadata?.coachee_id;
    const paymentAmount = payment_data?.data?.object?.amount; // Convert cents to dollars
    const adminFee = payment_data?.data?.object?.application_fee_amount; // Calculate the 19% admin fee
    const netAmountToCoach = paymentAmount / 100 - adminFee; // Subtract the admin fee to manage the coach's wallet

    // Find or create the coach's wallet and update the balance
    const findCoachWallet = "SELECT * FROM wallets WHERE coach_id = $1";
    const walletResult = await pool.query(findCoachWallet, [coachId]);
    let newBalance;

    if (walletResult.rowCount === 0) {
      // Create a new wallet for the coach if not exists
      const walletCreationResult = await pool.query(
        "INSERT INTO wallets (coach_id, balance) VALUES ($1, $2) RETURNING balance",
        [coachId, netAmountToCoach] // Use the net amount
      );
      newBalance = walletCreationResult.rows[0].balance;
      // console.log(walletCreationResult.rows[0]);
    } else {
      // Update existing wallet
      newBalance = parseFloat(walletResult.rows[0].balance) + netAmountToCoach;
      await pool.query("UPDATE wallets SET balance = $1 WHERE coach_id = $2", [
        newBalance,
        coachId,
      ]);
    }

    const adminWalletResult = await pool.query(
      "SELECT * FROM wallets WHERE is_admin = TRUE"
    );
    let newAdminBalance;

    if (adminWalletResult.rowCount === 0) {
      // If no admin wallet exists, create one
      const adminWalletCreationResult = await pool.query(
        "INSERT INTO wallets (balance, is_admin) VALUES ($1, TRUE) RETURNING balance",
        [adminFee]
      );
      newAdminBalance = adminWalletCreationResult.rows[0].balance;
    } else {
      // Update existing admin wallet
      newAdminBalance =
        parseFloat(adminWalletResult.rows[0].balance) + adminFee;
      await pool.query(
        "UPDATE wallets SET balance = $1 WHERE is_admin = TRUE",
        [newAdminBalance]
      );
    }

    await pool.query(
      "INSERT INTO transactions (coach_id, session_id, coachee_id, amount) VALUES($1,$2,$3, $4)",
      [coachId, sessionId, coacheeId, netAmountToCoach]
    );

    await pool.query(
      "INSERT INTO admin_transactions (amount, out_going) VALUES ($1, FALSE)",
      [adminFee]
    );

    await pool.query("UPDATE sessions SET status = 'paid' WHERE id = $1", [
      sessionId,
    ]);

    // const isWellcoin = await pool.query(
    //   "SELECT * FROM well_coins WHERE user_id = $1",
    //   [coacheeId]
    // );

    // if (isWellcoin.rowCount > 0) {
    //   const coins = isWellcoin.rows[0].coins + 10;
    //   await pool.query("UPDATE well_coins SET coins = $1 WHERE user_id = $2", [
    //     coins,
    //     coacheeId,
    //   ]);
    // } else {
    // }

    // const well_coins_result = await pool.query(
    //   "INSERT INTO well_coins (coins, user_id, session_id) VALUES ($1, $2, $3)",
    //   [10, coacheeId, sessionId]
    // );

    const WELL_COINS = 10;


    await addSessionCoins(coacheeId, sessionId, WELL_COINS).catch(
      console.error
    );

    const title = "PAYMENT_SUCCESSFUL";
    const content = "payment successful";
    const type = "PAYMENT";
    await pool.query(
      "INSERT INTO notifications (title, content, type, coach_id, coachee_id, session_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, type, coachId, coacheeId, sessionId]
    );
    const titleWell = "WELL_COINS_RECEIVED";
    const contentWell = "You have successfully received 10 wellcoins";
    const typeWell = "WELL_COINS";
    await pool.query(
      "INSERT INTO notifications (title, content, type, coach_id, coachee_id, session_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [titleWell, contentWell, typeWell, coachId, coacheeId, sessionId]
    );

    await pool.query("COMMIT");

    return { success: true, message: "Operations successfully committed!" };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

async function addSessionCoins(coacheeId, sessionId, coins = 10) {
  try {
    // Start transaction

    // Step 1: Insert 10 coins for the session
    await pool.query(
      "INSERT INTO well_coins (coins, user_id, session_id) VALUES ($1, $2, $3)",
      [coins, coacheeId, sessionId]
    );

    // Step 2: Calculate the new total coins
    // Since each payment always adds 10 coins, we avoid summing the entire table for performance optimization
    const result = await pool.query(
      "SELECT coins FROM well_coins WHERE user_id = $1 ORDER BY session_id DESC LIMIT 1",
      [coacheeId]
    );

    const totalCoinsResult = await pool.query(
      `SELECT SUM(coins) AS overall_total_coins FROM well_coins WHERE user_id = $1`,
      [coacheeId]
    );

    const overallTotalCoins =
      totalCoinsResult.rows[0]?.overall_total_coins || 0;

    let totalCoins = 10; // Start with the 10 coins just added
    if (result.rows.length > 0) {
      totalCoins += parseInt(result.rows[0].coins, 10);
    }

    // Step 3: Determine the badge based on total coins
    let badge = null;
    if (overallTotalCoins >= 300) {
      badge = "Platinum";
    } else if (overallTotalCoins >= 100) {
      badge = "Gold";
    } else if (overallTotalCoins >= 60) {
      badge = "Silver";
    } else if (overallTotalCoins >= 30) {
      badge = "Bronze";
    }

    // Step 4: Update or insert the badge in the coachee_badges table
    if (badge) {
      await pool.query(
        "INSERT INTO coachee_badges (user_id, name) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name",
        [coacheeId, badge]
      );
    }

    console.log("Badge updated or assigned successfully.");
  } catch (error) {
    console.error("Error updating coins or badge:", error);
    throw error; // Rethrow the error to handle it in the caller or to log it.
  }
}

module.exports = {
  afterCompletePayment,
};
