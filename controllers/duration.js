const durationModel = require("../models/duration");
const { getAll } = require("../utility/dbHelper");
const { insertRecord } = require("../utility/dbOperations");

exports.createDuration = async (req, res) => {
  const { durationDetails } = req.body;
  const user_id = req.user.userId;

  try {
    const data = {
      user_id: user_id,
      details: durationDetails,
    };
    const newDuration = await insertRecord("duration", data);

    // const newDuration = await durationModel.createDuration(
    //   durationDetails,
    //   coach_id
    // );

    res.status(201).json({ success: true, newDuration });
  } catch (error) {
    console.error("Error creating duration:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getDurationByCoach = async (req, res) => {
  try {
    const coach_id = req.user.userId;
    const duration = await durationModel.getAllDuration(coach_id);
    res.status(200).json({ success: true, duration });
  } catch (error) {
    console.error("Error fetching duration:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getAllDuration = async (req, res) => {
  try {
    const { coach_id } = req.params;
    console.log(coach_id);
    const duration = await durationModel.getAllDuration(coach_id);
    console.log("duration: " + duration)
    res.status(200).json({ success: true, duration });
  } catch (error) {
    console.error("Error fetching duration:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getCoachDuration = async (req, res) => {
  try {
    const coach_id = req.user.userId;
    const duration = await durationModel.getAllDuration(coach_id);
    res.status(200).json({ success: true, duration });
  } catch (error) {
    console.error("Error fetching duration:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.updateDuration = async (req, res) => {
  const { durationDetails } = req.body;
  const coach_id = req.user.userId;

  try {
    const updatedDuration = await durationModel.updateDuration(
      durationDetails,
      coach_id
    );

    res.status(200).json({ success: true, updatedDuration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteDuration = async (req, res) => {
  const coach_id = req.user.userId;
  try {
    const deletedDuration = await durationModel.deleteDuration(coach_id);

    if (!deletedDuration) {
      res.status(404).json({ success: false, error: "Duration not found" });
    } else {
      res.status(200).json({
        success: true,
        message: "Duration deleted successfully",
        deletedDuration,
      });
    }
  } catch (error) {
    console.error("Error deleting Duration:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// exports.updateDuration = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const data = req.body;
//     const updatedDuration = await durationModel.updateDuration(id, data);
//     if (!updatedDuration) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'duration  not found.' });
//     }
//     res.status(200).json({ success: true, updatedDuration });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
// };

// exports.deleteDuration = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedDuration = await durationModel.deleteDuration(id);
//     if (!deletedDuration) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'duration  not found.' });
//     }
//     res.status(200).json({ success: true, deletedDuration });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
// };

// exports.getDuration = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const duration = await durationModel.getDuration(id);
//     if (!duration) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'duration  not found.' });
//     }
//     res.status(200).json({ success: true, duration });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
// };

// exports.getDurationByCoachId = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const duration = await durationModel.getDurationByCoachId(id);
//     if (!duration) {
//       return res
//         .status(404)
//         .json({ success: false, message: 'duration  not found.' });
//     }
//     res.status(200).json({ success: true, duration });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
// };

// exports.getAllDuration = async (req, res) => {
//   try {
//     const query = 'SELECT * FROM duration';
//     const durations = await getAll(query, []);

//     res.status(200).json({
//       success: true,
//       durations,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Internal Server Error' });
//   }
// };
