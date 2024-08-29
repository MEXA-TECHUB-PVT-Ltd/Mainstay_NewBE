const express = require('express');
const {
  createSection,
  getAllSections,
  updateSection,
  deleteSection,
  getSectionsByCoach,
} = require('../controllers/section');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.post('/create', isAuthenticated, createSection);
router.get('/get/:coach_id', getAllSections);
router.get('/get-by-coach/:coach_id', getSectionsByCoach);
// router.get('/get-by-coach', isAuthenticated, getSectionsByCoach);

router.put('/update', isAuthenticated, updateSection);
router.delete('/delete/', isAuthenticated, deleteSection);

module.exports = router;
