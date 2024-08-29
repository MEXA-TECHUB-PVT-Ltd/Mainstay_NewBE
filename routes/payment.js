const express = require("express");
const router = express.Router();
const {
  createStripeCustomer,
  addNewCard,
  createCharges,
  get,
  getTransactionDetails,
  deleteCard,
  standardAccountConnect,
  createAccountLink,
  checkVerificationStatus,
  transferFunds,
  createCustomer,
  getAccountBalance,
  getUserCards,
  getUserTransactions,
  withdraw,
  monthlyTransactions,
  yearlyTransactions,
  monthlyAdminTransactions,
  yearlyAdminTransactions,
  getAdminTransactions,
  adminWithdraw,
  overallYearlyTransactions,
  overallMonthlyTransactions,
  getUsersTransactions,
} = require("../controllers/payment");
const { isAuthenticated } = require("../middleware/auth");

router.post("/creates/customer", isAuthenticated, createStripeCustomer);

router.post("/add-card", isAuthenticated, addNewCard);
router.post("/payment/:card_id", isAuthenticated, createCharges);
router.get("/card/get", isAuthenticated, get);
router.get(
  "/transactionDetails/:coach_id",
  isAuthenticated,
  getTransactionDetails
);
router.delete("/card/delete/:id", isAuthenticated, deleteCard);

router.post("/standard-connected-account", standardAccountConnect);
router.post("/create-account-link", isAuthenticated, createAccountLink);
router.post("/create-customer", createCustomer);
router.post("/transfer-funds", transferFunds);
router.post("/get-account-balance", getAccountBalance);
router.get("/check-verification-status", checkVerificationStatus);
router.get("/get-user-cards/:userId", getUserCards);
router.get("/get-user-transactions/:userId", getUserTransactions);
router.get("/get-admin-transactions", getAdminTransactions);
router.get("/get-users-transactions", getUsersTransactions);
router.post("/withdraw", withdraw);
router.post("/adminWithdraw", adminWithdraw);
router.get("/monthlyTransactions/:coachId", monthlyTransactions);
router.get("/yearlyTransactions/:coachId", yearlyTransactions);
router.get("/monthlyAdminTransactions", monthlyAdminTransactions);
router.get("/yearlyAdminTransactions", yearlyAdminTransactions);
router.get("/overallYearlyTransactions", overallYearlyTransactions);
router.get("/overallMonthlyTransactions", overallMonthlyTransactions);

module.exports = router;
