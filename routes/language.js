const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

const {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getLanguage,
  getAllLanguage,
} = require('../controllers/language');

router.post('/create', createLanguage);

router.put('/update/:id', updateLanguage);

router.delete('/delete/:id', deleteLanguage);

router.get('/get/:id', getLanguage);

router.get('/get-all', getAllLanguage);

module.exports = router;
