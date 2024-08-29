const NotificationTypeModel = require('../models/notificationType');
const { getAll } = require('../utility/dbHelper');

exports.createNotificationType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res
        .status(400)
        .json({ success: false, message: 'name and description required' });
    }

    const notificationType = await NotificationTypeModel.createNotificationType(
      name,
      description
    );
    return res.status(201).json({ success: true, notificationType });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateNotificationType = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedNotificationType =
      await NotificationTypeModel.updateNotificationType(id, data);
    if (!updatedNotificationType) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification type not found.' });
    }
    res.status(200).json({ success: true, updatedNotificationType });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteNotificationType = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNotificationType =
      await NotificationTypeModel.deleteNotificationType(id);
    if (!deletedNotificationType) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification type not found.' });
    }
    res.status(200).json({ success: true, deletedNotificationType });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getNotificationType = async (req, res) => {
  try {
    const { id } = req.params;
    const notificationType = await NotificationTypeModel.getNotificationType(
      id
    );
    if (!notificationType) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification type not found.' });
    }
    res.status(200).json({ success: true, notificationType });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getAllNotificationTypes = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const values = [`%${searchTerm}%`, pageSize, offset];
    const query =
      'SELECT * FROM notification_type WHERE  LOWER(name) LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    const countQuery =
      'SELECT count(*) FROM notification_type WHERE  LOWER(name) LIKE $1 ';
    const notificationTypes = await getAll(query, values);
    const count = await getAll(countQuery, [`%${searchTerm.toLowerCase()}%`]);
    const total = count[0].count;

    res.status(200).json({
      success: true,
      notificationTypes,
      total,
      currentPage: page,
      totalPage: Math.ceil(total / pageSize),
    });

    // return res.status(200).json({ success: true, notificationTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteAllNotificationTypes = async (req, res) => {
  try {
    const deletedNotificationTypes =
      await NotificationTypeModel.deleteAllNotificationTypes();
    res.status(200).json({ success: true, deletedNotificationTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
