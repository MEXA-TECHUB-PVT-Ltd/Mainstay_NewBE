const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

const {
  createDuration,
  updateDuration,
  deleteDuration,
  // getDuration,
  getAllDuration,
  getCoachDuration,
  // getDurationByCoachId,
} = require('../controllers/duration');

router.post('/create', isAuthenticated, createDuration);

router.put('/update', isAuthenticated, updateDuration);

router.delete('/delete', isAuthenticated, deleteDuration);

// router.get('/get/:id', getDuration);
// router.get('/get-by-coach/:id', getDurationByCoachId);

router.get('/get/:coach_id', getAllDuration);
router.get('/coach-get/', isAuthenticated, getCoachDuration);

module.exports = router;
