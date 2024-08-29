// controllers/sectionController.js
const pool = require("../config/db");
const Section = require("../models/section");
const { insertRecord } = require("../utility/dbOperations");

exports.createSection = async (req, res) => {
  const { sectionDetails } = req.body;
  const user_id = req.user.userId;
  try {
    const data = {
      user_id: user_id,
      section_details: sectionDetails,
    };

    const newSection = await insertRecord("section", data);

    // const newSection = await Section.createSection(sectionDetails, coach_id);

    res.status(201).json({ success: true, newSection });
  } catch (error) {
    console.error("Error creating section:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getSectionsByCoach = async (req, res) => {
  try {
    const { coach_id } = req.params;
    // console.log("COach id ", coach_id);
    const sections = await Section.getAllSections(coach_id);
    res.status(200).json({ success: true, sections });
  } catch (error) {
    console.error("Error fetching sections:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
 
exports.getAllSections = async (req, res) => {
  try {
    const { coach_id } = req.params;
    const sections = await Section.getAllSections(coach_id);
    res.status(200).json({ success: true, sections });
  } catch (error) {
    console.error("Error fetching sections:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.updateSection = async (req, res) => { 
  const { sectionDetails } = req.body;
  const coach_id = req.user.userId;
  const data = {
    user_id: coach_id,
    section_details: sectionDetails,
  };

  try {
    const findSection = await pool.query(
      "SELECT * FROM section WHERE user_id = $1",
      [coach_id]
    );
    let updatedSection;
    if (findSection.rowCount === 0) {
      updatedSection = await insertRecord("section", data);
    } else {
      updatedSection = await Section.updateSection(sectionDetails, coach_id);
    }

    // console.log("Updated section: ", updatedSection);

    res.status(200).json({ success: true, updatedSection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteSection = async (req, res) => {
  const coach_id = req.user.userId;
  try {
    const deletedSection = await Section.deleteSection(coach_id);

    if (!deletedSection) {
      res.status(404).json({ success: false, error: "Section not found" });
    } else {
      res.status(200).json({
        success: true,
        message: "Section deleted successfully",
        deletedSection,
      });
    }
  } catch (error) {
    console.error("Error deleting section:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
