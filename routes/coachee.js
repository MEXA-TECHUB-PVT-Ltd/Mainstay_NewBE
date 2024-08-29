const express = require('express');
const router = express.Router();
const {
  register,
  accountVerification,
  coacheeLogin,
  forgetPassword,
  resetPassword,
  coachee,
  blockCoachee,
  unBlockCoachee,
  deleteCoachee,
  getDeletedCoachee,
  updatePassword,
  allCoachee,
  updateCoachee,
  updateProfile,
  permanentDeleteCoachee,
  codeVerification,
} = require('../controllers/coachee');
const { cloudinaryUpload } = require('../middleware/cloudinaryUpload');

const { isAuthenticated } = require('../middleware/auth');

router.post('/register', register);
router.post('/coachee-verification', accountVerification);
router.post('/sign-in', coacheeLogin);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);
router.post('/code-verification', codeVerification);
router.get('/block/:id', blockCoachee);
router.get('/unblock/:id', unBlockCoachee);
router.delete('/delete/:id', deleteCoachee);
router.get('/delete', getDeletedCoachee);
router.put('/update/', isAuthenticated, updateCoachee);
router.post('/update-password/', isAuthenticated, updatePassword);
router.post('/update-coachee/', isAuthenticated, updateCoachee);
router.delete('/permanent-delete/:id', permanentDeleteCoachee);

router.put(
  '/update-profile/',
  isAuthenticated,
  cloudinaryUpload.single('profile_pic'),
  updateProfile
);

router.get('/all', allCoachee);

// router.get('/', coachee);
router.get('/:id', coachee);

module.exports = router;
