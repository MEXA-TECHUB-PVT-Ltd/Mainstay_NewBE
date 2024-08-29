const countryModel = require('../models/country');
const { getAll } = require('../utility/dbHelper');
const db = require('../config/db');

exports.createCountry = async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data)) {
      return res
        .status(400)
        .json({ error: 'Invalid data format. Expecting an array of records.' });
    }

    try {
      for (const record of data) {
        await db.query('INSERT INTO country (name, code) VALUES ($1, $2)', [
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

exports.updateCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedCountry = await countryModel.updateCountry(id, data);
    if (!updatedCountry) {
      return res
        .status(404)
        .json({ success: false, message: 'Country  not found.' });
    }
    res.status(200).json({ success: true, updatedCountry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCountry = await countryModel.deleteCountry(id);
    if (!deletedCountry) {
      return res
        .status(404)
        .json({ success: false, message: 'Country  not found.' });
    }
    res.status(200).json({ success: true, deletedCountry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getCountry = async (req, res) => {
  try {
    const { id } = req.params;
    const country = await countryModel.getCountry(id);
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: 'country  not found.' });
    }
    res.status(200).json({ success: true, country });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCountry = async (req, res) => {
  try {
    const query = 'SELECT * FROM country';
    const country = await getAll(query, []);

    res.status(200).json({
      success: true,
      country,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
