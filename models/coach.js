const db = require('../config/db');

const register = (email, password, user_type) => {
  return new Promise((resolve, reject) => {
    const query =
      'INSERT INTO coach (email,password,user_type) VALUES  ($1,$2,$3) RETURNING *';

    db.query(query, [email, password, user_type], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
};
const checkEmail = (email) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM coach WHERE email=$1';

    db.query(query, [email], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
  });
};

const getCoachByEmail = (email) => {
  return new Promise((resolve, reject) => {
    try {
      const query = 'SELECT * FROM coach WHERE email=$1 ';
      db.query(query, [email], (error, result) => {
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

const updateCoach = (id, updateFields) => {
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

      const query = `UPDATE coach_v2 SET ${setClause} WHERE user_id = $${values.length} RETURNING *`;

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

const getCoach = (id) => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT c.id, c.first_name, c.last_name, c.email, c.about, ARRAY(SELECT DISTINCT name FROM languages WHERE id = ANY(c.language_ids)) AS languages, ARRAY(SELECT DISTINCT name FROM coach_area WHERE id = ANY(c.coaching_area_ids)) AS coaching_areas, c.status, c.is_completed, c.profile_pic, c.created_at, c.user_type, COALESCE( jsonb_build_object( 'average_rating', AVG(s.rating), 'reviews', CASE WHEN COUNT(s.id) = 0 THEN '[]'::jsonb ELSE ( SELECT jsonb_agg( jsonb_build_object( 'rating', s.rating, 'comment', s.comment, 'coachee_first_name', co.first_name, 'coachee_last_name', co.last_name, 'coachee_profile_pic', co.profile_pic)) FROM session s LEFT JOIN coachee co ON s.coachee_id = co.id WHERE s.coach_id = c.id AND s.status = 'completed' ) END ), jsonb_build_object('average_rating', 0, 'reviews', '[]'::jsonb) ) AS rating_comments_object FROM coach c LEFT JOIN session s ON c.id = s.coach_id LEFT JOIN coachee co ON s.coachee_id = co.id WHERE c.id = $1 GROUP BY c.id, c.first_name, c.last_name, c.email, c.about, c.status, c.is_completed, c.profile_pic, c.user_type    ";
    db.query(query, [id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};

const updateProfile = (profile_pic, id) => {
  return new Promise((resolve, reject) => {
    const query = 'UPDATE coach SET profile_pic = $1 WHERE id=$2 RETURNING *';
    db.query(query, [profile_pic, id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};

const permanentDeleteCoach = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM coach  WHERE id=$1 RETURNING *';
    db.query(query, [id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};

const getCoachByCode = (code) => {
  return new Promise((resolve, reject) => {
    // const now = new Date();
    const query = 'SELECT * FROM coach WHERE code=$1 ';
    db.query(query, [code], (error, results) => {
      if (error) {
        reject(error);
      }
      if (results?.rows?.length === 0) {
        reject('Invalid or expired code');
      }
      resolve(results?.rows[0]);
    });
  });
};

const updateStatusAndClearCode = (id) => {
  return new Promise((resolve, reject) => {
    try {
      const clearCode = null;
      const clearCodeExp = null;
      const query =
        'UPDATE coach SET status=true, code=$1 , exp_code=$2 WHERE id=$3 ';
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
const forgetPassword = (id, code, expCode) => {
  return new Promise((resolve, reject) => {
    const query =
      'UPDATE coach SET code=$1 , exp_code=$2  WHERE id=$3 RETURNING *';
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
        'UPDATE coach SET password = $1, code = $2 , exp_code = $3 WHERE id = $4';
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

module.exports = {
  getCoachByEmail,
  checkEmail,
  updateCoach,
  register,
  getCoach,
  updateProfile,
  permanentDeleteCoach,
  updateStatusAndClearCode,
  getCoachByCode,
  forgetPassword,
  updatePassword,
};
