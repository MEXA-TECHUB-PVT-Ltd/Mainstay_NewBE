const db = require('../config/db');
const { getAll } = require('../utility/dbHelper');

const createAvailability = async (
  coach_id,
  start_dateTime,
  end_dateTime,
  duration_ids
) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        'INSERT INTO coach_availability (coach_id,start_dateTime,end_dateTime,duration_ids) VALUES ($1,$2,$3,$4) RETURNING *';
      const values = [coach_id, start_dateTime, end_dateTime, duration_ids];

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

const updateAvailability = async (id, coach_id, updateFields) => {
  return new Promise((resolve, reject) => {
    try {
      const fieldNames = Object.keys(updateFields);

      if (fieldNames.length === 0) {
        resolve(null); // No fields to update
        return;
      }

      const setClause = fieldNames
        .map((field, index) => `"${field}" = $${index + 1}`)
        .join(', ');

      const values = fieldNames.map((field) => updateFields[field]);
      values.push(id, coach_id);

      const query = `UPDATE coach_availability SET ${setClause} WHERE id = $${
        values.length - 1
      } AND coach_id = $${values.length} RETURNING *`;

      // Explicitly cast coach_id to the correct data type
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

const deleteAvailability = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM coach_availability WHERE id = $1 RETURNING *';
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

const getAvailability = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT ca.*, dt.id AS duration_id, dt.time AS duration_time, dt.amount AS duration_amount FROM coach_availability AS ca LEFT JOIN LATERAL unnest(ca.duration_ids) WITH ORDINALITY d_id ON TRUE LEFT JOIN duration AS dt ON d_id = dt.id WHERE ca.id = $1';
      const values = [id];

      db.query(query, values, (error, result) => {
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
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailability,
};
