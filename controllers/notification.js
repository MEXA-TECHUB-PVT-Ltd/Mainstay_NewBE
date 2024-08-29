const NotificationModel = require('../models/notification');
const { getAll } = require('../utility/dbHelper');
const pool = require("../config/db");

exports.createNotification = async (req, res) => {
  try {
    const { notification_title, notification_content, user_id, user_type, session_id, coach_area_id } = req.body;

    // Check if user_id exists in the users table
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check if session_id exists in the sessions table
    const sessionQuery = 'SELECT * FROM sessions WHERE id = $1';
    const sessionResult = await pool.query(sessionQuery, [session_id]);

    if (sessionResult.rows.length === 0) {
      return res.status(400).json({ status: false, message: 'Session not found' });
    }

    // Insert the notification
    const insertQuery = 'INSERT INTO notifications (notification_title, notification_content, user_id, user_type, session_id, coach_area_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const insertValues = [notification_title, notification_content, user_id, user_type, session_id, coach_area_id];
    const insertedNotification = await pool.query(insertQuery, insertValues);

    console.log(insertedNotification.rows[0]);

    res.status(201).json({ status: true, message: "Notification created successfully", data: insertedNotification.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ stattus: false, message: 'Internal server error' });
  }
};

exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedNotification = await NotificationModel.updateNotification(
      id,
      data
    );

    if (!updatedNotification) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, updatedNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNotification = await NotificationModel.deleteNotification(id);

    if (!deletedNotification) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, deletedNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationModel.getNotification(id);

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found.' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const values = [`%${searchTerm}%`, pageSize, offset];

    const query = `SELECT * FROM notifications WHERE LOWER(content) LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const result = await getAll(query, values);

    const countQuery = `SELECT COUNT(*) FROM notifications WHERE LOWER(content) LIKE $1`;

    const count = await getAll(countQuery, [`%${searchTerm}%`]);

    if (result.length > 0) {
      const total = count[0].count;
      return res.status(200).json({
        success: true,
        result,
        total,
        totalPage: Math.ceil(total / pageSize),
      });
    }

    return res
      .status(404)
      .json({ success: false, message: 'Notifications not found' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    const deletedNotifications =
      await NotificationModel.deleteAllNotifications();
    res.status(200).json({ success: true, deletedNotifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getAllNotificationsByUser = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const { user_id, user_type } = req.query;

    const query =
      'SELECT * FROM notifications WHERE user_id = $1 AND user_type = $2 AND LOWER(content) LIKE $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5';

    const values = [
      user_id,
      user_type,
      `%${searchTerm.toLowerCase()}%`,
      pageSize,
      offset,
    ];
    const notifications = await getAll(query, values);
    const countQuery =
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2 AND LOWER(content) LIKE $3';
    const count = await getAll(countQuery, [
      user_id,
      user_type,
      `%${searchTerm.toLowerCase()}%`,
    ]);
    const total = count[0].count;
    res.status(200).json({
      success: true,
      notifications,
      total,
      totalPage: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Controller function to get all notifications by notification type
exports.getAllNotificationsByType = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const { type_id } = req.params;
    const values = [type_id, `%${searchTerm.toLowerCase()}%`, pageSize, offset];
    const query =
      'SELECT * FROM notifications WHERE type_id = $1 AND LOWER(content) LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4';
    const notifications = await getAll(query, values);

    const countQuery =
      'SELECT COUNT(*) FROM notifications WHERE type_id = $1 AND LOWER(content) LIKE $2';

    const count = await getAll(countQuery, [
      type_id,
      `%${searchTerm.toLowerCase()}%`,
    ]);
    const total = count[0].count;

    res.status(200).json({
      success: true,
      notifications,
      total,
      totalPage: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Controller function to delete all notifications
