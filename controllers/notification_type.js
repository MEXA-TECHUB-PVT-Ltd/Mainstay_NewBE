const pool = require("../config/db");
 
exports.add = async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notification_type (name) VALUES ($1) RETURNING *",
      [name]
    );

    if (result.rowCount === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Unexpected Error, while creating the notification type",
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "notification type created successfully",
        result: result.rows[0],
      });
  } catch (error) {
      console.log(error)
    return res
      .status(500)
      .json({ success: false, message: "INTERNAL SERVEr ERROR" });
  }
};
