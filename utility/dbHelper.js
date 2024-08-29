const db = require('../config/db');

const getAll = async (query, values) => {
  // console.log({ query, values})
  return new Promise((resolve, reject) => {
    try {
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

const getCount = async (query) => {
  return new Promise((resolve, reject) => {
    try {
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
  getAll,
};
