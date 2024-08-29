const languageModel = require('../models/language');
const { getAll } = require('../utility/dbHelper');
const db = require('../config/db');

exports.createLanguage = async (req, res) => {
  try {
    // Assuming the request body contains an array of JSON records
    const data = req.body;

    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: 'Invalid data format. Expecting an array of records.' });
    }

    try {
      for (const record of data) {
        await db.query('INSERT INTO languages (name, code) VALUES ($1, $2)', [
          record.name,
          record.code,
        ]);
      }
      return res.status(200).json({ message: 'Data inserted successfully!' });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error inserting data:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } catch (error) {
    console.error('Error processing request:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedLanguage = await languageModel.updateLanguage(id, data);
    if (!updatedLanguage) {
      return res
        .status(404)
        .json({ success: false, message: 'Language  not found.' });
    }
    res.status(200).json({ success: true, updatedLanguage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLanguage = await languageModel.deleteLanguage(id);
    if (!deletedLanguage) {
      return res
        .status(404)
        .json({ success: false, message: 'Language  not found.' });
    }
    res.status(200).json({ success: true, deletedLanguage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const language = await languageModel.getLanguage(id);
    if (!language) {
      return res
        .status(404)
        .json({ success: false, message: 'language  not found.' });
    }
    res.status(200).json({ success: true, language });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllLanguage = async (req, res) => {
  try {
    const query = `SELECT * FROM languages
      ORDER BY 
        CASE 
          WHEN name = 'English' THEN 0
          WHEN name = 'German' THEN 1
          WHEN name = 'Italian' THEN 2
          WHEN name = 'French' THEN 3
          WHEN name = 'Spanish' THEN 4
          ELSE 5
        END`;
    const languages = await getAll(query, []);

    res.status(200).json({
      success: true,
      languages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
