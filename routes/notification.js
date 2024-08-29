const express = require('express');
const router = express.Router();
const {
  createNotification,
  updateNotification,
  deleteNotification,
  getNotification,
  getAllNotifications,
  deleteAllNotifications,
  getAllNotificationsByUser,
  getAllNotificationsByType,
} = require('../controllers/notification');

router.post('/create', createNotification);

router.put('/update/:id', updateNotification);

router.delete('/delete/:id', deleteNotification);

router.get('/get/:id', getNotification);
router.get('/get-by-user/', getAllNotificationsByUser);
router.get('/get-by-type/:type_id', getAllNotificationsByType);

router.get('/get-all', getAllNotifications);

router.delete('/delete-all', deleteAllNotifications);

module.exports = router;
