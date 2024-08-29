const db = require('../config/db');
const { getAll } = require('../utility/dbHelper');

const createLanguage = async (language) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'INSERT INTO languages (language) VALUES ($1) RETURNING *';
      const values = [language];

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

const updateLanguage = async (id, updateFields) => {
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

      const query = `UPDATE languages SET ${setClause} WHERE id = $${values.length} RETURNING *`;

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

const deleteLanguage = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM languages WHERE id = $1 RETURNING *';
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

const getLanguage = async (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM languages WHERE id = $1';
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

module.exports = {
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getLanguage,
};
