const db = require('../config/db');

const addCoachArea = async (name, german_name, icon) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        "INSERT INTO coach_area (name, icon, german_name) VALUES ($1, $2, $3) RETURNING *";
      const values = [name, icon, german_name];

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

const getAllCoachAreas = async () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coach_area';

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

const updateCoachArea = (id, updateFields) => {
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

      const query = `UPDATE coach_area SET ${setClause} WHERE id = $${values.length} RETURNING *`;

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

const deleteCoachArea = (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM coach_area WHERE id = $1 RETURNING *';
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

const getCoachArea = (id) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coach_area WHERE id = $1';
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

const searchCoachAreas = (query) => {
  return new Promise((resolve, reject) => {
    try {
      const searchQuery = `%${query}%`;
      const searchByName = 'SELECT * FROM coach_area WHERE name ILIKE $1';

      db.query(searchByName, [searchQuery], (errorByName, resultByName) => {
        if (errorByName) {
          reject(errorByName);
        }

        resolve(resultByName?.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const deleteAllCoachAreas = () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'DELETE FROM coach_area RETURNING *';

      db.query(query, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows?.length);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getCoachAreasOfUser = (userId) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coach_area WHERE user_id = $1';
      const values = [userId];

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
  addCoachArea,
  getAllCoachAreas,
  updateCoachArea,
  deleteCoachArea,
  getCoachArea,
  searchCoachAreas,
  deleteAllCoachAreas,
  getCoachAreasOfUser,
};
