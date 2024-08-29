const express = require("express");
const controller = require("../controllers/rating");
const { isAuthenticated } = require("../middleware/auth");

const router = express.Router();

router.post("/add", isAuthenticated, controller.add);
router.post("/update", isAuthenticated, controller.update);
router.get(
  "/getAllByCoach/:coachId",
  // isAuthenticated,
  controller.getAllByCoach
);
router.get("/checkRatingExists", isAuthenticated, controller.checkRatingExists);
router.get(
  "/getCoachBadges/:coachId",
  // isAuthenticated,
  controller.getCoachBadges
);
router.get("/getCoacheeBadges", isAuthenticated, controller.getCoacheeBadges);
router.get(
  "/getCoacheeWellCoins",
  isAuthenticated,
  controller.getCoacheeWellCoins
);
router.get(
  "/getAverageRatingForCoach",
  // isAuthenticated,
  controller.getAverageRatingForCoach
);
router.get(
  "/getRatingBySession/:sessionId",
  // isAuthenticated,
  controller.getRatingBySession
);

module.exports = router;
