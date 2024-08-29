const db = require('../config/db');

const createNotification = async (content, user_id, user_type, type_id) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        'INSERT INTO notifications (content, user_type, user_id, type_id) VALUES ($1 , $2, $3, $4) RETURNING *';
      const values = [content, user_type, user_id, type_id];

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows[0]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const updateNotification = async (id, updateFields) => {
  return new Promise((resolve, reject) => {
    try {
      const fieldNames = Object.keys(updateFields);

      if (fieldNames.length === 0) {
        resolve(null); // No fields to update
        return;
      }

      const setClause = fieldNames
        .map((field, index) => `${field} = $${index + 1}`)
        .join(', ');
      const values = fieldNames.map((field) => updateFields[field]);
      values.push(id);

      const query = `UPDATE notifications SET ${setClause} WHERE id = $${values.length} RETURNING *`;

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows[0]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const deleteNotification = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM notifications WHERE id = $1 RETURNING *';
      const values = [id];

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows[0]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getNotification = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM notifications WHERE id = $1';
      const values = [id];

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows[0]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getAllNotifications = async () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM notifications ORDER BY created_at DESC';

      db.query(query, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const deleteAllNotifications = async () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM notifications RETURNING *';

      db.query(query, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getAllNotificationsByUser = async (user_id, user_type) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        'SELECT * FROM notifications WHERE user_id = $1 && user_type=$2';
      const values = [user_id, user_type];

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

// Model function to get all notifications by notification type
const getAllNotificationsByType = async (type_id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM notifications WHERE type_id = $1';
      const values = [type_id];

      db.query(query, values, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  createNotification,
  updateNotification,
  deleteNotification,
  getNotification,
  getAllNotifications,
  deleteAllNotifications,
  getAllNotificationsByType,
  getAllNotificationsByUser,
};
