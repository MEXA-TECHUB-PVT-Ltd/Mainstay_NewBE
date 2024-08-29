const express = require("express");
const {
  register,
  login,
  forgetPassword,
  resetPassword,
  codeVerification,
  accountVerification,
  changePassword,
} = require("../controllers/auth");
const { isAuthenticated } = require("../middleware/auth");
const { cloudinaryUpload } = require("../middleware/cloudinaryUpload");
const router = express.Router();

router.post("/register", register);
router.post("/sign-in", login);
router.post("/coachee-verification", accountVerification);

router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);
router.post("/code-verification", codeVerification);

router.patch("/changePassword", isAuthenticated, changePassword);

// router.put('/update-password/', isAuthenticated, updatePassword);

module.exports = router;
