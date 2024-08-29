const db = require('../config/db');

const register = (email, password, code, exp_code, user_type) => {
  return new Promise((resolve, reject) => {
    const query =
      'INSERT INTO coachee (email,password,code,exp_code,user_type) VALUES  ($1,$2,$3,$4,$5) RETURNING *';

    db.query(
      query,
      [email, password, code, exp_code, user_type],
      (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result);
      }
    );
  });
};

const checkEmail = (email) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM coachee WHERE email=$1';

    db.query(query, [email], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
};

const checkCodeExistsInDatabase = (code) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM coachee WHERE code= $1';
    db.query(query, [code], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
};

const getCoacheeByCode = (code) => {
  return new Promise((resolve, reject) => {
    // const now = new Date();
    const query = 'SELECT * FROM coachee WHERE code=$1 ';
    db.query(query, [code], (error, results) => {
      if (error) {
        reject(error);
      }
      if (results.rows.length === 0) {
        reject('Invalid or expired code');
      }
      resolve(results.rows[0]);
    });
  });
};

const updateStatusAndClearCode = (id) => {
  return new Promise((resolve, reject) => {
    try {
      const clearCode = null;
      const clearCodeExp = null;
      const query =
        'UPDATE coachee SET status=true, code=$1 , exp_code=$2 WHERE id=$3 ';
      db.query(query, [clearCode, clearCodeExp, id], (error, results) => {
        if (error) {
          return reject(error);
        }
        resolve(results);
      });
    } catch (error) {
      reject(error);
    }
  });
};

const getCoacheeByEmail = (email) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coachee WHERE email=$1 ';
      db.query(query, [email], (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result.rows[0]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const forgetPassword = (id, code, expCode) => {
  return new Promise((resolve, reject) => {
    const query =
      'UPDATE coachee SET code=$1 , exp_code=$2  WHERE id=$3 RETURNING *';
    db.query(query, [code, expCode, id], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

const updatePassword = (id, password) => {
  return new Promise((resolve, reject) => {
    try {
      const clearCode = null;
      const clearCodeExp = null;
      const query =
        'UPDATE coachee SET password = $1, code = $2 , exp_code = $3 WHERE id = $4';
      db.query(
        query,
        [password, clearCode, clearCodeExp, id],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          resolve(results);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

const coachee = (id = false) => {
  return new Promise((resolve, reject) => {
    if (id) {
      const query = 'SELECT * FROM coachee_v2 WHERE user_id = $1';
      db.query(query, [id], (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows[0]);
      });
    } else {
      const query = 'SELECT * FROM coachee';
      db.query(query, (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result.rows);
      });
    }
  });
};

const updateCoachee = (id, updatedValues) => {
  return new Promise(async (resolve, reject) => {
    try {
      const setClause = Object.keys(updatedValues)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(', ');

      const query = `UPDATE coachee SET ${setClause} WHERE id = $${Object.keys(updatedValues).length + 1
        } RETURNING *`;

      const values = [...Object.values(updatedValues), id];

      const result = await db.query(query, values);

      resolve(result.rows);
    } catch (error) {
      reject(error);
    }
  });
};

const blockCoachee = (id, state) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'UPDATE coachee SET block=$1 WHERE id = $2 RETURNING *';

      db.query(query, [state, id], (error, results) => {
        if (error) {
          reject(error);
        }
        resolve(results);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const deleteCoachee = (id, state) => {
  return new Promise((resolve, reject) => {
    try {
      const query =
        'UPDATE coachee SET deleted=$1 , deleted_at = NOW() WHERE id = $2 RETURNING *';

      db.query(query, [state, id], (error, results) => {
        if (error) {
          reject(error);
        }
        resolve(results);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const getDeletedCoachee = () => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coachee WHERE deleted = true';
      db.query(query, (error, results) => {
        if (error) {
          reject(error);
        }
        resolve(results.rows);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const deleteOldData = async () => {
  try {
    const deleteQuery = `
      DELETE FROM users
      WHERE deleted = true AND deleted_at < NOW() - INTERVAL '90 days'
    `;

    const result = await db.query(deleteQuery);

    if (result.rowCount > 0) {
      // console.log(`${result.rowCount} old records deleted successfully.`);
    } else {
      console.log('No records to delete.');
    }
  } catch (error) {
    console.error('Error deleting old data:', error);
  }
};

const updateProfile = (profile_pic, id) => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE coachee SET profile_pic = $1 WHERE id=$2 RETURNING *';
    db.query(query, [profile_pic, id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};
const permanentDeleteCoachee = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM coachee  WHERE id=$1 RETURNING *';
    db.query(query, [id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};

module.exports = {
  checkEmail,
  register,
  checkCodeExistsInDatabase,
  getCoacheeByCode,
  updateStatusAndClearCode,
  getCoacheeByEmail,
  forgetPassword,
  updatePassword,
  coachee,
  blockCoachee,
  deleteCoachee,
  getDeletedCoachee,
  deleteOldData,
  updateCoachee,
  updateProfile,
  permanentDeleteCoachee,
};
