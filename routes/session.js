const express = require("express");

const { isAuthenticated } = require("../middleware/auth");
const {
  createSession,
  getSessionByCoach,
  updateSessionStatus,
  updateSessionRating,
  updateSessionPayment,
  getSessionByCoachee,
  getSessionByStatus,
  getSessionById,
  getAcceptedSessions,
  getCoachSessions,
} = require("../controllers/session");

const router = express.Router();

router.post("/create", isAuthenticated, createSession);
router.get("/get/:id", getSessionById);
router.get("/get-by-coach", isAuthenticated, getSessionByCoach);
router.get("/get-coach-sessions/:userId", getCoachSessions);
router.get("/get-by-status", isAuthenticated, getSessionByStatus);

router.get("/get-by-coachee", isAuthenticated, getSessionByCoachee);
router.get("/get-accepted/:coachId", getAcceptedSessions);
// router.get("/get-by-coacheee", isAuthenticated, getSessionByCoacheee);
router.put("/status-update/:id", isAuthenticated, updateSessionStatus);
router.put("/rating-update/:id", isAuthenticated, updateSessionRating);
router.put("/payment-status/:id", isAuthenticated, updateSessionPayment);

// router.delete('/delete/:id', isAuthenticated, deleteSection);

module.exports = router;
