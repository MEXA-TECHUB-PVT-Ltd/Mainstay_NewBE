const pool = require("../config/db");

exports.create = async (req, res) => {
  const { title, content, type, coach_id, coachee_id, session_id } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notifications (title, content, type, coach_id, coachee_id, session_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, type, coach_id, coachee_id, session_id]
    );

    return res.status(200).json({
      success: true,
      message: "Notification created successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVER ERROR" });
  }
};

exports.updateReadStatus = async (req, res) => {
  const { ids, is_read, role } = req.body;
  try {
    if (!Array.isArray(ids) || !role) {
      return res.status(400).json({
        success: false,
        message: "Invalid input, ids should be an array || role is required",
      });
    }

    let result;

    if (role === "coach") {
      result = await pool.query(
        "UPDATE notifications SET is_read_coach = $1 WHERE id = ANY($2::int[]) RETURNING *",
        [is_read, ids]
      );
    }
    if (role === "coachee") {
      result = await pool.query(
        "UPDATE notifications SET is_read_coachee = $1 WHERE id = ANY($2::int[]) RETURNING *",
        [is_read, ids]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Notifications updated successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVER ERROR" });
  }
};

exports.getAll = async (req, res) => {
  const { coach_id, coachee_id, is_read } = req.query;
  try {
    let baseQuery = `
      SELECT 
        n.id,
        n.title,
        n.content,
        n.is_read,
        n.type,
        n.coach_id,
        CONCAT(c.first_name, ' ', c.last_name) AS coach_full_name,
        n.coachee_id,
        CONCAT(co.first_name, ' ', co.last_name) AS coachee_full_name,
        n.session_id,
        n.created_at,
        n.updated_at
      FROM 
        notifications n
      JOIN 
        users c ON n.coach_id = c.id
      JOIN 
        users co ON n.coachee_id = co.id`;

    const conditions = [];
    const params = [];

    if (coach_id) {
      conditions.push("n.coach_id = $1");
      params.push(coach_id);
    }

    if (coachee_id) {
      conditions.push("n.coachee_id = $1");
      params.push(coachee_id);
    }

    if (is_read === "true") {
      conditions.push("n.is_read = true");
    } else if (is_read === "false") {
      conditions.push("n.is_read = false");
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    baseQuery += " ORDER BY n.created_at DESC";

    const result = await pool.query(baseQuery, params);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVER ERROR" });
  }
};

exports.getCount = async (req, res) => {
  const { coachId, coacheeId } = req.query;

  try {
    let query = "SELECT COUNT(*) FROM notifications WHERE";
    let params = [];

    if (coachId) {
      query += " is_read_coach = FALSE AND coach_id = $1";
      params.push(coachId);
    } else if (coacheeId) {
      query += " is_read_coachee = FALSE AND coachee_id = $1";
      params.push(coacheeId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Missing coachId or coacheeId" });
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows[0].count,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVER ERROR" });
  }
};

exports.updateReadStatusByUser = async (req, res) => {
  const { coachId, coacheeId, is_read } = req.body;

  try {
    let query = "UPDATE notifications SET ";
    let params = [is_read];

    if (coachId) {
      query += " is_read_coach = $1 WHERE coach_id = $2";
      params.push(coachId);
    } else if (coacheeId) {
      query += " is_read_coachee = $1 WHERE coachee_id = $2";
      params.push(coacheeId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Missing coachId or coacheeId" });
    }

    const result = await pool.query(query + " RETURNING *", params);

    return res.status(200).json({
      success: true,
      message: "Notifications updated successfully",
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVER ERROR" });
  }
};
