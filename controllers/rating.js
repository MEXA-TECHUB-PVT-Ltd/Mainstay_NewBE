const pool = require("../config/db");
const { handleBadges } = require("../utility/rating");

exports.add = async (req, res) => {
  const coacheeId = req.user.userId;
  const { sessionsId, coachId, rating, comment } = req.body;
  if (!sessionsId || !coachId || !rating) {
    return res.status(400).json({
      success: false,
      message: "coachId, and rating  are required!",
    });
  }
  try {
    const query =
      "INSERT INTO rating (sessions_id, coachee_id, coach_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const values = [sessionsId, coacheeId, coachId, rating, comment];
    const insertRating = await pool.query(query, values);
    const notificationRequest = await pool.query(
      "INSERT INTO notification_requests_rating (title, type, coachee_id) VALUES ($1, $2, $3) RETURNING *",
      ["RATING", "RATING", coacheeId]
    );

    // console.log("Notifi: ", notificationRequest.rows)
    if (insertRating.rowCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Couldn't rate the coach due to internal reasons.",
      });
    }

    await handleBadges(coachId);

    const title = "SESSION_REVIEW";
    const content = "You got a new review";
    const type_id = "SESSION";
    await pool.query(
      "INSERT INTO notifications (title, content, type, coach_id, coachee_id, session_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, type_id, coachId, coacheeId, sessionsId]
    );

    return res
      .status(200)
      .json({ success: true, result: insertRating.rows[0] });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.update = async (req, res) => {
  const { id, rating, comment } = req.body;

  if (!id || rating === undefined) {
    return res.status(400).json({
      success: false,
      message: "Rating ID and new rating value are required!",
    });
  }

  try {
    // Construct the SQL query for updating the rating
    const query = `
      UPDATE rating
      SET rating = $1, comment = $2
      WHERE id = $3
      RETURNING *;`;

    const values = [rating, comment, id];
    const updatedRating = await pool.query(query, values);

    // Check if the rating was actually found and updated
    if (updatedRating.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Rating not found or no changes made.",
      });
    }

    await handleBadges(updatedRating.rows[0].coach_id);

    // Respond with the updated rating
    return res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      result: updatedRating.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// get rating by session
exports.getRatingBySession = async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const result = await pool.query(
      `SELECT r.*, json_build_object('first_name', u.first_name, 'last_name', u.last_name) as user_info FROM rating r JOIN users u ON r.coachee_id = u.id WHERE r.sessions_id = $1`,
      [sessionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "No record found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Rating fetch successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAllByCoach = async (req, res) => {
  const coachId = req.params.coachId;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const averageQuery = `
      SELECT 
        AVG(rating) AS average_rating,
        COUNT(rating) AS total_ratings,
        COUNT(rating) FILTER (WHERE rating >= 4.0) AS four_star_ratings
      FROM rating
      WHERE coach_id = $1;
    `;
    const values = [coachId];
    const resultRating = await pool.query(averageQuery, values);
    const query = `SELECT r.*,  
    json_build_object('first_name', u.first_name, 'last_name', u.last_name, 'profile_pic', c.profile_pic) AS coachee 
FROM rating r 
JOIN coachee_v2 c ON r.coachee_id = c.user_id
JOIN users u ON r.coachee_id = u.id
WHERE r.coach_id = $1 ORDER BY r.id DESC LIMIT $2 OFFSET $3;
`;
    const result = await pool.query(query, [coachId, limit, offset]);
    if (result.rowCount === 0) {
      return res.status(200).json({
        status: true,
        message: "There no data to display",
        result: [],
      });
    }
    return res.status(200).json({
      success: true,
      totalCount: result.rowCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.rowCount / limit),
        totalCount: result.rowCount,
      },
      resultRating: resultRating.rows[0],
      result: result.rows,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.checkRatingExists = async (req, res) => {
  const coachee_id = req.user.userId;
  const { sessions_id } = req.query;

  try {
    const query = `
      SELECT * FROM rating
      WHERE coachee_id = $1 AND sessions_id = $2;
    `;
    const values = [coachee_id, sessions_id];
    const result = await pool.query(query, values);

    if (result.rowCount > 0) {
      return res.status(200).json({
        success: true,
        ratingExists: true,
        rating: result.rows[0],
      });
    } else {
      return res.status(200).json({
        success: true,
        ratingExists: false,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getAverageRatingForCoach = async (req, res) => {
  const { coach_id } = req.query;

  try {
    const query = `
      SELECT 
        AVG(rating) AS average_rating,
        COUNT(rating) AS total_ratings,
        COUNT(rating) FILTER (WHERE rating >= 4.0) AS four_star_ratings
      FROM rating
      WHERE coach_id = $1;
    `;
    const values = [coach_id];
    const result = await pool.query(query, values);

    // Check if we received a result
    if (result.rowCount > 0) {
      const averageRating = parseFloat(result.rows[0].average_rating).toFixed(
        1
      ); // Format to one decimal place
      const totalRatings = result.rows[0].total_ratings;
      const fourStarRatings = result.rows[0].four_star_ratings;

      return res.status(200).json({
        success: true,
        averageRating,
        totalRatings,
        fourStarRatings,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Coach not found or has no ratings.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getCoachBadges = async (req, res) => {
  const coachId = parseInt(req.params.coachId);
  try {
    const query = `
      SELECT 
        AVG(rating) AS average_rating,
        COUNT(rating) AS total_ratings,
        COUNT(rating) FILTER (WHERE rating >= 4.0) AS four_star_ratings
      FROM rating
      WHERE coach_id = $1;
    `;
    const values = [coachId];
    const resultRating = await pool.query(query, values);
    const result = await pool.query(
      `SELECT * FROM badges WHERE coach_id = $1`,
      [coachId]
    );
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        message: "You don't have any badges",
        result: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: "badges retrieved",
      resultRating: resultRating.rows[0],
      result: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getCoacheeBadges = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "SELECT * FROM coachee_badges WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "You don't have any badges" });
    }
    return res.status(200).json({
      success: true,
      message: "badges retrieved",
      result: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
exports.getCoacheeWellCoins = async (req, res) => {
  const { coacheeId, page = 1, limit = 10 } = req.query;
  const userId = req.user.userId || coacheeId;
  const offset = (page - 1) * limit;
  console.log(userId);
  try {
    const sessionsResult = await pool.query(
      `
      SELECT json_build_object(
        'session_id', s.id,
        'coaching_area_details', json_build_object(
          'coaching_area_id', ca.id,
          'name', ca.name,
          'icon', ca.icon
        ),
        'coach_details', json_build_object(
          'id', c.id,
          'first_name', c.first_name,
          'last_name', c.last_name,
          'email', c.email,
          'profile_pic', co.profile_pic
        ),
        'coachee_id', s.coachee_id,
        'session_status', s.status,
        'payment_status', s.payment_status,
        'date', s.date,
        'duration', s.duration,
        'rating', s.rating,
        'amount', s.amount,
        'section', s.section,
        'comment', s.comment,
        'session_created_at', s.created_at,
        'accepted_at', s.accepted_at,
        'is_session_started', s.is_session_started,
        'session_channel_name', s.session_channel_name,
        'total_coins', wc.total_coins
      ) AS session_info
      FROM sessions s
      JOIN (
        SELECT session_id, SUM(coins) AS total_coins
        FROM well_coins
        WHERE user_id = $1
        GROUP BY session_id
      ) wc ON s.id = wc.session_id
      JOIN users c ON s.coach_id = c.id
      JOIN coach_v2 co ON c.id = co.user_id
      JOIN coach_area ca ON s.coaching_area_id = ca.id
      WHERE s.coachee_id = $1 
      ORDER BY s.id DESC LIMIT $2 OFFSET $3 
      `,
      [userId, limit, offset]
    );
    const totalCoinsResult = await pool.query(
      `SELECT SUM(coins) AS overall_total_coins FROM well_coins WHERE user_id = $1`,
      [userId]
    );

    const overallTotalCoins =
      totalCoinsResult.rows[0]?.overall_total_coins || 0;

    if (sessionsResult.rowCount === 0 && overallTotalCoins === 0) {
      return res.status(200).json({
        success: false,
        message: "You don't have any sessions or well coins",
        sessions: [],
        overallTotalCoins: 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wellcoins and session details retrieved",
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(sessionsResult.rowCount / limit),
        totalCount: sessionsResult.rowCount,
      },
      overallTotalCoins: overallTotalCoins,
      result: sessionsResult.rows.map((row) => row.session_info),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
