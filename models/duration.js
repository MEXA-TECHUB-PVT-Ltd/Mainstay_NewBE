const db = require('../config/db');
const { getAll } = require('../utility/dbHelper');

const createDuration = async (details, user_id) => {
  try {
    const result = await db.query(
      'INSERT INTO duration (details, user_id) VALUES ($1, $2) RETURNING *',
      [details, user_id]
    );

    return result.rows[0];
  } catch (error) {
    return error;
  }
};

const updateDuration = async (details, user_id) => {
  try {
    const result = await db.query(
      "UPDATE duration SET  details = $1 WHERE user_id=$2 RETURNING *",
      [details, user_id]
    );

    return result.rows[0];
  } catch (error) {
    return error;
  }
};

const deleteDuration = async (coach_id) => {
  const result = await db.query(
    "DELETE FROM duration WHERE user_id = $1 RETURNING *",
    [coach_id]
  );

  if (result.rows.length === 0) {
    return null; // Section not found
  }

  return result.rows[0];
};

const getAllDuration = async (coach_id) => {
  const result = await db.query("SELECT * FROM duration WHERE user_id =$1 ", [
    coach_id,
  ]);
  console.log(result.rows)
  return result?.rows[0];
};

module.exports = {
  createDuration,
  updateDuration,
  deleteDuration,
  getAllDuration,
};
