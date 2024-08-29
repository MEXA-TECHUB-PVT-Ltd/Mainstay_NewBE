const availabilityModel = require('../models/availability');
const { getAll } = require('../utility/dbHelper');

exports.createAvailability = async (req, res) => {
  try {
    const { start_datetime, end_datetime, duration_ids } = req.body;
    const coach_id = req.user.userId;

    if (!start_datetime || !end_datetime || !duration_ids) {
      return res
        .status(400)
        .json({ success: false, message: 'add all required fields' });
    }

    const availability = await availabilityModel.createAvailability(
      coach_id,
      start_datetime,
      end_datetime,
      duration_ids
    );
    return res.status(201).json({ success: true, availability });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const coach_id = req.user.userId;
    const data = req.body;
    const updatedAvailability = await availabilityModel.updateAvailability(
      id,
      coach_id,
      data
    );
    if (!updatedAvailability) {
      return res
        .status(404)
        .json({ success: false, message: 'availability not found.' });
    }
    res.status(200).json({ success: true, updatedAvailability });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAvailability = await availabilityModel.deleteAvailability(id);
    if (!deletedAvailability) {
      return res
        .status(404)
        .json({ success: false, message: 'Availability  not found.' });
    }
    res.status(200).json({ success: true, deletedAvailability });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const availability = await availabilityModel.getAvailability(id);
    if (!availability) {
      return res
        .status(404)
        .json({ success: false, message: 'Availability  not found.' });
    }
    res.status(200).json({ success: true, availability });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getAllAvailability = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;

    const query =
      'SELECT ca.*, dt.id, dt.time AS duration_time, dt.amount AS duration_amount FROM coach_availability AS ca LEFT JOIN LATERAL unnest(ca.duration_ids) WITH ORDINALITY d_id ON TRUE LEFT JOIN duration AS dt ON d_id = dt.id    ORDER BY ca.created_at DESC LIMIT $1 OFFSET $2';
    const values = [pageSize, (page - 1) * pageSize];
    const availability = await getAll(query, values);
    const countQuery = 'SELECT count(*) FROM coach  ';
    const count = await getAll(countQuery, []);
    const total = count[0].count;
    res.status(200).json({
      success: true,
      availability,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
