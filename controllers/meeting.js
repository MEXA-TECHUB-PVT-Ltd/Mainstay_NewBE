const { default: axios } = require('axios');
const querystring = require('querystring');
const moment = require('moment');
const ejs = require('ejs');

const dotenv = require('dotenv');
const path = require('path');
const { refreshZoomAccessToken } = require('../utility/meeting');
dotenv.config();
exports.connectZoom = async (req, res) => {
  const { user_id } = req.query;
  //   const findUser = await pool.query('SELECT * FROM users WHERE id = $1', [
  //     user_id,
  //   ]);

  // j

  const url = `https://zoom.us/oauth/authorize?response_type=code&client_id=${
    process.env.ZOOM_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.REDIRECT_URI
  )}&state=${user_id}`;
  res.redirect(url);
};

exports.redirectZoom = async (req, res) => {
  const code = req.query.code;
  const user_id = req.query.state;
  //   return res.redirect('/')
  const tokenUrl = 'https://zoom.us/oauth/token';
  const tokenData = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.REDIRECT_URI,
  };


  const tokenHeaders = {
    Authorization:
      'Basic ' +
      Buffer.from(
        `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
      ).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  try {
    const response = await axios.post(
      tokenUrl,
      querystring.stringify(tokenData),
      { headers: tokenHeaders }
    );
    if (!response) {
      return res.status(401).json({
        status: false,
        message: 'Unable to get the token from zoom.',
      });
    }
    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;
    const expiresIn = response.data.expires_in;

    const expiryDate = moment(expiresIn).toISOString();

    // const findUser = await db.query('SELECT * FROM users WHERE id = $1', [
    //   user_id,
    // ]);

    // if (findUser.rowCount === 0) {
    //   return res.status(404).json({ status: false, message: 'User not found' });
    // }

    // await db.query(
    //   'UPDATE users SET zoom_access_token = $1, zoom_refresh_token = $2, zoom_expiry_at = $3 WHERE id = $4',
    //   [accessToken, refreshToken, expiryDate, user_id]
    // );

    // res.render(
    //   path.join(
    //     __dirname,
    //     '..',
    //     '..',
    //     '..',
    //     'app',
    //     'views',
    //     'platformSuccess.ejs'
    //   ),
    //   {
    //     type: 'Zoom',
    //   }
    // );

    res.status(200).json({
      success: true,
      message: 'connected',
      accessToken,
      refreshToken,
      expiresIn,
    });
  } catch (error) {
    console.error('Error connecting to Zoom:', error);
    res.status(500).send('Failed to connect to Zoom');
  }
};

exports.createMeeting = async (req, res) => {
  const { user_id } = req.query;

  if (!zoom_expiry_at) {
    res.redirect(
      `http://localhost:5019/api/meeting/connect?user_id=${user_id}`
    );
  }
  if (new Date(zoom_expiry_at) <= currentTime) {
    await refreshZoomAccessToken(user_id);
  } else {
    console.log('Zoom token still valid, no need to refresh');
  }

  const createMeetingUrl = 'https://api.zoom.us/v2/users/me/meetings';
  const meetingData = {
    topic: 'My Scheduled Zoom Meeting',
    type: 2, // 1 for instant meeting, 2 for scheduled meeting
    start_time: '2024-01-30T12:00:00Z', // Replace with your desired start time in ISO 8601 format
    duration: 60, // Replace with the desired duration in minutes
    settings: {
      host_video: true,
      participant_video: true,
    },
  };

  const createMeetingHeaders = {
    Authorization: `Bearer eyJzdiI6IjAwMDAwMSIsImFsZyI6IkhTNTEyIiwidiI6IjIuMCIsImtpZCI6IjBmYjkxZmY1LTkyN2QtNGZiMS04ZTMxLTVkY2ViNTFkYTM2YSJ9.eyJ2ZXIiOjksImF1aWQiOiJlMTAwZTUxNTRiMDM3MmYyZWI2MTJjYmUwZTJhMDBkZCIsImNvZGUiOiJ6Q29zaVk0Q1dSbUxkckMxeERJVENXVWVJVGZpakItRFEiLCJpc3MiOiJ6bTpjaWQ6STlkM1Y3T0FUakdMTEdpanlfUzlBQSIsImdubyI6MCwidHlwZSI6MCwidGlkIjowLCJhdWQiOiJodHRwczovL29hdXRoLnpvb20udXMiLCJ1aWQiOiJXbEdGRXUwblM3U1NSMWdmblFhNGRRIiwibmJmIjoxNzA2MDAzNjEyLCJleHAiOjE3MDYwMDcyMTIsImlhdCI6MTcwNjAwMzYxMiwiYWlkIjoibUI2UEFNSThSeld1NVBPTTNWeUhtUSJ9.ZipigMfKx7i9kK-DKc9QSnz1G3bU5H_Kh-XwCLQLfmg6Oc4we5RAeK-pLjii3dCM_I2W2b9mGDaOQacaGvVdPA`, // Replace with the actual access token
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(createMeetingUrl, meetingData, {
      headers: createMeetingHeaders,
    });

    if (!response || response.data.error) {
      console.error('Zoom Meeting Creation Error:', response.data);
      return res.status(500).json({
        status: false,
        message: 'Failed to create Zoom meeting.',
      });
    }

    const meetingId = response.data.id;
    const joinUrl = response.data.join_url;
    const start_time = response.data.start_time;

    // You can handle the meeting ID and join URL as needed in your application
    res.status(200).json({ success: true, meetingId, joinUrl, start_time });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    res
      .status(500)
      .json({ status: false, message: 'Failed to create Zoom meeting.' });
  }
};
    