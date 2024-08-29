const db = require('../config/db');

const updateSessionStatus = async (id, coach_id, updateFields) => {
  const setClause = [];
  const values = [id, coach_id];

  Object.entries(updateFields).forEach(([field, value], index) => {
    setClause.push(`${field} = $${index + 3}`);
    values.push(value);
  });

  const result = await db.query(
    `UPDATE sessions SET ${setClause.join(
      ', '
    )} WHERE id = $1 AND coach_id = $2 RETURNING *`,
    values
  );

  return result?.rows[0];
};

const createSession = async (
  coachee_id,
  coach_id,
  date,
  duration,
  section,
  coaching_area_id,
  amount
) => {
  const result = await db.query(
    'INSERT INTO sessions (coach_id, coachee_id,coaching_area_id,date,duration,section,amount) VALUES ($1, $2, $3, $4,$5,$6,$7) RETURNING *',
    [
      coach_id,
      coachee_id,
      coaching_area_id,
      date,
      duration,
      section,
      amount,
    ]
  );

  return result.rows[0];
};

const getAllSessionByCoach = (coach_id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT s.id, s.coaching_area_id, s.amount    s.coach_id,    s.coachee_id,    s.status,     s.payment_status,     s.date,     s.duration_id,    s.rating,    s.section_id,    s.created_at,    ca.name AS coaching_area_name,    c.first_name AS coach_name,    co.first_name AS coachee_name,    d.time AS duration_time,    sec.start_time AS section_start_time FROM    sessions s JOIN coach_area ca ON s.coaching_area_id = ca.id JOIN coach c ON s.coach_id = c.id JOIN coachee co ON s.coachee_id = co.id JOIN duration d ON s.duration_id = d.id LEFT JOIN section sec ON s.section_id = sec.id WHERE     s.coach_id = $1 LIMIT $2  OFFSET $3`;
    db.query(query, [coach_id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0] || []);
    });
  });
};

const updateSessionRating = async (id, coachee_id, updateFields) => {
  const setClause = [];
  const values = [id, coachee_id];

  Object.entries(updateFields).forEach(([field, value], index) => {
    setClause.push(`${field} = $${index + 3}`);
    values.push(value);
  });

  const result = await db.query(
    `UPDATE sessions SET ${setClause.join(
      ', '
    )} WHERE id = $1 AND coachee_id = $2 RETURNING *`,
    values
  );

  return result?.rows[0];
};

const updateSessionPayment = async (id, coachee_id, updateFields) => {
  const setClause = [];
  const values = [id, coachee_id];

  Object.entries(updateFields).forEach(([field, value], index) => {
    setClause.push(`${field} = $${index + 3}`);
    values.push(value);
  });

  const result = await db.query(
    `UPDATE sessions SET ${setClause.join(
      ', '
    )} WHERE id = $1 AND coachee_id = $2 RETURNING *`,
    values
  );

  return result?.rows[0];
};




module.exports = {
  createSession,
  updateSessionStatus,
  getAllSessionByCoach,
  updateSessionRating,
  updateSessionPayment,
};




