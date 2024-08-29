const express = require('express');
const router = express.Router();

const {
  createCountry,
  updateCountry,
  deleteCountry,
  getCountry,
  getAllCountry,
} = require('../controllers/country');

router.post('/create', createCountry);

router.put('/update/:id', updateCountry);

router.delete('/delete/:id', deleteCountry);

router.get('/get/:id', getCountry);

router.get('/get-all', getAllCountry);

module.exports = router;
