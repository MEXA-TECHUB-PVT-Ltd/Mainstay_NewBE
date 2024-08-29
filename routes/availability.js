const express = require('express');
const router = express.Router();
const {
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailability,
  getAllAvailability,
} = require('../controllers/availability');
const { isAuthenticated } = require('../middleware/auth');

// router.post('/create', isAuthenticated, createAvailability);

// router.put('/update/:id', isAuthenticated, updateAvailability);

// router.delete('/delete/:id', isAuthenticated, deleteAvailability);

// router.get('/get/:id', getAvailability);

// router.get('/get-all', getAllAvailability);

module.exports = router;
