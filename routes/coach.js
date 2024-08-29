const express = require('express');
const {
  register,
  coachLogin,
  updateCoach,
  getAllCoach,
  getCoach,
  updateProfile,
  permanentDeleteCoach,
  forgetPassword,
  resetPassword,
  codeVerification,
  updatePassword,
  updateStatus,
  getByCategory,
} = require('../controllers/coach');
const { isAuthenticated } = require('../middleware/auth');
const { cloudinaryUpload } = require('../middleware/cloudinaryUpload');
const router = express.Router();
router.post('/register', register);
router.post('/sign-in', coachLogin);
router.put('/update/', isAuthenticated, updateCoach);

router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);
router.post('/code-verification', codeVerification);
router.delete('/permanent-delete/:id', permanentDeleteCoach);

router.put('/update-password/', isAuthenticated, updatePassword);
router.get('/get-by-category/:id', getByCategory);
router.get('/get-all/', getAllCoach);
router.get('/get/:id', getCoach);
router.put('/coach-verification/:id', updateStatus);
router.put(
  '/update-profile/',
  isAuthenticated,
  cloudinaryUpload.single('profile_pic'),
  updateProfile
);

module.exports = router;
