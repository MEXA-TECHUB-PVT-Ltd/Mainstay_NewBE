const pool = require("../config/db");
const CoachAreaModel = require("../models/coachArea");

exports.createCoachArea = async (req, res) => {
  try {
    const { name, german_name } = req.body;
    const file = req?.file;
    if (!name || !file) {
      return res
        .status(400)
        .json({ success: false, message: "enter all required fields" });
    }

    const coachArea = await CoachAreaModel.addCoachArea(name, german_name, file.path);

    res.status(200).json({ success: true, coachArea });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

exports.getAllCoachAreas = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  try {
    const result = await pool.query(
      `SELECT * FROM coach_area ORDER BY id DESC LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        result: [],
      });
    }

    return res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageSize),
        totalPages: Math.ceil(result.rowCount / pageSize),
        totalCount: result.rowCount,
      },
      result: result.rows,
    });
  } catch (error) {
    console.error("Error getting all coachee areas:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// controllers/coachAreaController.js
exports.getCoachArea = async (req, res) => {
  try {
    const { id } = req.params;

    const coachArea = await CoachAreaModel.getCoachArea(id);

    if (!coachArea) {
      return res
        .status(404)
        .json({ success: false, message: "Coach area not found." });
    }

    res.status(200).json({ success: true, coachArea });
  } catch (error) {
    console.error("Error getting coach area:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// controllers/coachAreaController.js
exports.updateCoachArea = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req?.file;

    const updateFields = req.body;
    if (file) {
      updateFields.icon = file.path;
    }
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields provided for update." });
    }

    const updatedCoachArea = await CoachAreaModel.updateCoachArea(
      id,
      updateFields
    );

    if (!updatedCoachArea) {
      return res
        .status(404)
        .json({ success: false, message: "Coach area not found." });
    }

    res.status(200).json({ success: true, updatedCoachArea });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCoachArea = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCoachArea = await CoachAreaModel.deleteCoachArea(id);

    if (!deletedCoachArea) {
      return res
        .status(404)
        .json({ success: false, message: "Coach area not found." });
    }

    res
      .status(200)
      .json({ success: true, message: "Coach area deleted successfully." });
  } catch (error) {
    console.error("Error deleting coach area:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// controllers/coachAreaController.js
exports.searchCoachAreas = async (req, res) => {
  try {
    const { name } = req.query;

    const coachAreas = await CoachAreaModel.searchCoachAreas(name);

    res.status(200).json({ success: true, coachAreas });
  } catch (error) {
    console.error("Error searching coach areas:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// controllers/coachAreaController.js
exports.deleteAllCoachAreas = async (req, res) => {
  try {
    const deletedCount = await CoachAreaModel.deleteAllCoachAreas();

    res.status(200).json({
      success: true,
      message: `${deletedCount} coach areas deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting all coach areas:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
