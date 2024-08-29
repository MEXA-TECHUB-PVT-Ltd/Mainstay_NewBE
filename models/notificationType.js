const db = require('../config/db');
const { getAll } = require('../utility/dbHelper');

const createNotificationType = async (name, description) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        'INSERT INTO notification_type (name, description) VALUES ($1, $2) RETURNING *';
      const values = [name, description];

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

const updateNotificationType = async (id, updateFields) => {
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

      const query = `UPDATE notification_type SET ${setClause} WHERE id = $${values.length} RETURNING *`;

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

const deleteNotificationType = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM notification_type WHERE id = $1 RETURNING *';
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

const getNotificationType = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM notification_type WHERE id = $1';
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

const getAllNotificationTypes = async (values) => {
  try {
    const query = `
      WITH NotificationTypeWithRowNumber AS (
        SELECT
          notification_type.*,
          ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num
        FROM notification_type
        WHERE name LIKE $1
      ),
      TotalNotificationTypeCount AS (
        SELECT COUNT(*) AS total_count
        FROM NotificationTypeWithRowNumber
      )
      SELECT
        notification_type.*,
        TotalNotificationTypeCount.total_count,
        CEIL(TotalNotificationTypeCount.total_count::numeric / $2::numeric) AS total_pages
      FROM NotificationTypeWithRowNumber notification_type, TotalNotificationTypeCount
      WHERE row_num > $3 AND row_num <= $3 + $2;
    `;

    return getAll(query, values);
  } catch (err) {
    return err;
  }
};

const deleteAllNotificationTypes = async () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM notification_type RETURNING *';

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

module.exports = {
  createNotificationType,
  updateNotificationType,
  deleteNotificationType,
  getNotificationType,
  getAllNotificationTypes,
  deleteAllNotificationTypes,
};
