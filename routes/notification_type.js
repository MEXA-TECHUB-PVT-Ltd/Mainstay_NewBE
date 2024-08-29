const express = require("express");

const controller = require("../controllers/notification_type");

const router = express.Router();

router.post("/add", controller.add);
// router.get("/get/:id", getSessionById);
// router.get("/get-by-coach", isAuthenticated, getSessionByCoach);
// router.get("/get-by-status", isAuthenticated, getSessionByStatus);

// router.get("/get-by-coachee", isAuthenticated, getSessionByCoachee);
// // router.get("/get-by-coacheee", isAuthenticated, getSessionByCoacheee);
// router.put("/status-update/:id", isAuthenticated, updateSessionStatus);
// router.put("/rating-update/:id", isAuthenticated, updateSessionRating);
// router.put("/payment-status/:id", isAuthenticated, updateSessionPayment);

// router.delete('/delete/:id', isAuthenticated, deleteSection);

module.exports = router;
