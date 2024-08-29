const pool = require("../config/db");

exports.handleBadges = async (coachId) => {
  try {
    // Step 1: Calculate the average rating and count
    const ratingsResult = await pool.query(
      `SELECT COUNT(*) AS count, AVG(rating) AS average 
       FROM rating 
       WHERE coach_id = $1 AND rating >= 4`,
      [coachId]
    );

    const { count, average } = ratingsResult.rows[0];

    // Step 2: Determine the badge
    let badgeName;
    if (count >= 50 && average >= 4) {
      badgeName = "Platinum";
    } else if (count >= 25 && average >= 4) {
      badgeName = "Gold";
    } else if (count >= 15 && average >= 4) {
      badgeName = "Silver";
    } else if (count >= 5 && average >= 4) {
      badgeName = "Bronze";
    } else {
      badgeName = "NULL"; // Or handle no badge scenario
    }

    // Step 3: Update or insert the badge into the `badges` table
    const existCoachBadge = await pool.query(
      `SELECT id FROM badges WHERE coach_id = $1`,
      [coachId]
    );

    if (existCoachBadge.rowCount > 0) {
      // Update existing badge
      await pool.query(
        `UPDATE badges SET name = $1, created_at = CURRENT_TIMESTAMP WHERE coach_id = $2`,
        [badgeName, coachId]
      );
    } else {
      // Insert new badge
      await pool.query(`INSERT INTO badges (coach_id, name) VALUES ($1, $2)`, [
        coachId,
        badgeName,
      ]);
    }

    // Step 4: Check if badge is awarded and insert notification
    if (badgeName !== "NULL") {
      const title = "NEW_BADGE";
      const content = `Congratulations! You've been awarded the ${badgeName} badge.`;
      const type = "BADGES";
      await pool.query(
        "INSERT INTO notifications (title, content, type, coach_id) VALUES ($1, $2, $3, $4) RETURNING *",
        [title, content, type, coachId]
      );
    }
  } catch (error) {
    console.error("Error handling badges:", error);
    throw error;
  }
};

// const pool = require("../config/db");

// exports.handleBadges = async (coachId) => {
//   try {
//     // Step 1: Calculate the average rating and count
//     const ratingsResult = await pool.query(
//       `SELECT COUNT(*) AS count, AVG(rating) AS average
//        FROM rating
//        WHERE coach_id = $1 AND rating >= 4`,
//       [coachId]
//     );

//     const { count, average } = ratingsResult.rows[0];

//     // Step 2: Determine the badge
//     let badgeName;
//     if (count >= 50 && average >= 4) {
//       badgeName = "Platinum";
//     } else if (count >= 25 && average >= 4) {
//       badgeName = "Gold";
//     } else if (count >= 15 && average >= 4) {
//       badgeName = "Silver";
//     } else if (count >= 5 && average >= 4) {
//       badgeName = "Bronze";
//     } else {
//       badgeName = "NULL"; // Or handle no badge scenario
//     }

//     // Step 3: Update or insert the badge into the `badges` table
//     const existCoachBadge = await pool.query(
//       `SELECT id FROM badges WHERE coach_id = $1`,
//       [coachId]
//     );

//     if (existCoachBadge.rowCount > 0) {
//       // Update existing badge
//       await pool.query(
//         `UPDATE badges SET name = $1, created_at = CURRENT_TIMESTAMP WHERE coach_id = $2`,
//         [badgeName, coachId]
//       );
//     } else {
//       // Insert new badge
//       await pool.query(`INSERT INTO badges (coach_id, name) VALUES ($1, $2)`, [
//         coachId,
//         badgeName,
//       ]);
//     }
//   } catch (error) {
//     console.error("Error handling badges:", error);
//     throw error;
//   }
// };
