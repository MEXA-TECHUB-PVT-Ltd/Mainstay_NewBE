const express = require('express');
const router = express.Router();
const {
  createStripeCustomer,
  addNewCard,
  createCharges,
  get,
  deleteCard,
} = require('../controllers/payment');
const { isAuthenticated } = require('../middleware/auth');
const {
  createMeeting,
  connectZoom,
  redirectZoom,
} = require('../controllers/meeting');

router.get('/connect', connectZoom);
router.get('/redirect', redirectZoom);
router.post('/create', createMeeting);

// router.post('/add-card', isAuthenticated, addNewCard);
// router.post('/payment/:card_id', isAuthenticated, createCharges);
// router.get('/card/get/:coachee_id', isAuthenticated, get);
// router.delete('/card/delete/:id', isAuthenticated, deleteCard);

module.exports = router;
