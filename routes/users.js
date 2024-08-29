const express = require("express");
const {
  updateProfile,
  getAllByRole,
  getByCoachArea,
  getAllByCoachArea,
  getOneByRole,
  deleteUser,
  verifyCoach,
  getUserInterest,
  getTotalCounts,
  getCoachRequests,
  getVerifiedCoach,
  blockUser,
  tempDelete,
  permDelete,
  getDeletedUsers,
  reportedUser,
  getReports,
} = require("../controllers/users");
const { cloudinaryUpload } = require("../middleware/cloudinaryUpload");
const { isAuthenticated } = require("../middleware/auth");
const router = express.Router();

router.put(
  "/updateProfile",
  isAuthenticated,
  cloudinaryUpload.single("profile_pic"),
  updateProfile
);
router.patch("/coach-verification/:id", isAuthenticated, verifyCoach);
router.patch("/block", blockUser);
router.delete("/delete-temp/:id", tempDelete);
router.delete("/delete/:id", permDelete);
router.get("/getDeletedUsers", getDeletedUsers);
router.get("/getAllByRole", getAllByRole);
router.get("/getVerifiedCoach", getVerifiedCoach);
// router.get("/getAllByRole", verifyCoach);
router.get("/getOneByRole/:user_id", getOneByRole);
router.get("/getByCoachArea", getByCoachArea);
router.get("/getAllByCoachArea", getAllByCoachArea);
router.get("/getUserInterest/:userId", getUserInterest);
router.delete("/delete/:user_id", isAuthenticated, deleteUser);

// report user
router.post("/report", isAuthenticated, reportedUser);
router.get("/reports/getReports", getReports);
// admin
router.get("/getTotalCounts", getTotalCounts);
router.get("/getCoachRequests", getCoachRequests);

module.exports = router;
