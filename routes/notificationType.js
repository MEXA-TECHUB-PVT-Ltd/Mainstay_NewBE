const express = require('express');
const router = express.Router();
const {
  createNotificationType,
  updateNotificationType,
  deleteNotificationType,
  getNotificationType,
  getAllNotificationTypes,
  deleteAllNotificationTypes,
} = require('../controllers/notificationType');

router.post('/create', createNotificationType);

router.put('/update/:id', updateNotificationType);

router.delete('/delete/:id', deleteNotificationType);

router.get('/get/:id', getNotificationType);

router.get('/get-all', getAllNotificationTypes);

router.delete('/delete-all', deleteAllNotificationTypes);

module.exports = router;
