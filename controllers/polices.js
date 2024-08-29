const pool = require("../config/db");


exports.add = async (req, res) => {
    const { content, type } = req.body;

    if (!content || !type) {
        return res.status(400).json({
            success: false,
            message: 'Both content and type are required.'
        });
    }

    try {
        const upsertQuery = `
            INSERT INTO policies (content, type)
            VALUES ($1, $2)
            ON CONFLICT (type) 
            DO UPDATE SET content = EXCLUDED.content, updated_at = now()
            RETURNING *;
        `;
        const result = await pool.query(upsertQuery, [content, type]);

        return res.status(200).json({
            success: true,
            message: result.rowCount > 0 ? 'Policy updated successfully.' : 'Policy created successfully.',
            policy: result.rows[0]
        });
    } catch (error) {
        console.error('Error handling policy:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
}


exports.get = async (req, res) => {
  const { type } = req.params; // Assume the type is sent as a URL parameter

  if (!type) {
    return res.status(400).json({
      success: false,
      message: "Type parameter is required.",
    });
  }

  try {
    const query = `SELECT * FROM policies WHERE type = $1`;
    const result = await pool.query(query, [type]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Policy not found.",
      });
    }

    return res.status(200).json({
      success: true,
      policy: result.rows[0],
    });
  } catch (error) {
    console.error("Error retrieving policy:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



