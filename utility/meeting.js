const dotenv = require('dotenv');
dotenv.config();

// exports.createZoomMeeting = async (user, meetingDetails) => {
//   try {
//     // Zoom API endpoint to create a meeting
//     const createMeetingEndpoint = 'https://api.zoom.us/v2/users/me/meetings';

//     // Prepare the request payload
//     const payload = {
//       topic: meetingDetails.topic,
//       type: 2, // 2 is for a scheduled meeting
//       start_time: meetingDetails.startDateTime,
//       duration: meetingDetails.event_duration,
//       timezone: 'UTC',
//     };

//     // Make the request to Zoom
//     const response = await fetch(createMeetingEndpoint, {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${user?.zoom_access_token}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || 'Failed to create Zoom meeting');
//     }

//     return data; // This contains the meeting details including the join URL
//   } catch (error) {
//     console.error('Error creating Zoom meeting:', error);
//     return { status: false, error };
//     // throw error;
//   }
// };

// exports.updateZoomMeeting = async (accessToken, meetingId, meetingDetails) => {
//   try {
//     // Zoom API endpoint to update a meeting
//     const updateMeetingEndpoint = `https://api.zoom.us/v2/meetings/${meetingId}`;
//     console.log(updateMeetingEndpoint);

//     // Prepare the request payload with updated details
//     const payload = {
//       // topic: meetingDetails.topic || undefined, // Only include fields you want to update
//       type: 2, // 2 is for a scheduled meeting
//       // start_time: "023-02-14T22:15:00Z " || undefined,
//       // duration: 40 || undefined,
//       timezone: 'UTC', // Update timezone if needed
//     };

//     const response = await fetch(updateMeetingEndpoint, {
//       method: 'PATCH',
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       console.error(
//         'Zoom API responded with an error, Status:',
//         response.status
//       );
//       const responseText = await response.text(); // Get response as text
//       console.log('Response Text:', responseText);
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     // Handle 'No Content' response
//     if (response.status === 204) {
//       console.log('Meeting updated successfully, no content returned.');
//       return; // Or return a custom success message/object
//     }

//     try {
//       const data = await response.json();
//       return data;
//     } catch (error) {
//       console.error('Failed to parse JSON');
//       throw error;
//     }
//   } catch (error) {
//     console.error('Error updating Zoom meeting:', error);
//     return { status: false, error };
//     // throw error;
//   }
// };

// exports.deleteZoomMeeting = async (accessToken, meetingId) => {
//   try {
//     // Zoom API endpoint to delete a meeting
//     const deleteMeetingEndpoint = `https://api.zoom.us/v2/meetings/${meetingId}`;

//     const response = await fetch(deleteMeetingEndpoint, {
//       method: 'DELETE',
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       console.error(
//         'Zoom API responded with an error, Status:',
//         response.status
//       );
//       const responseText = await response.text(); // Get response as text
//       console.log('Response Text:', responseText);
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     console.log('Meeting deleted successfully');
//     return { success: true, message: 'Meeting deleted successfully' };
//   } catch (error) {
//     console.error('Error deleting Zoom meeting:', error);
//     return { success: false, message: error.message };
//   }
// };

exports.refreshZoomAccessToken = async (userId) => {
  try {
    const user = await getUserZoomCredentials(userId);
    if (!user || !user.zoom_refresh_token) {
      throw new Error('Zoom credentials not found for the user');
    }

    console.log('trying to refresh access token');

    const refreshToken = user.zoom_refresh_token;
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const {
      access_token,
      refresh_token: newRefreshToken,
      expires_in,
    } = response.data;
    const newExpiry = new Date(new Date().getTime() + expires_in * 1000);

    await updateUserZoomTokens(
      userId,
      access_token,
      newRefreshToken,
      newExpiry
    );
    return { success: true, message: 'Zoom token refreshed successfully' };
  } catch (error) {
    console.error('Error refreshing Zoom access token:', error);
    await nullifyZoomUserTokens(userId);
    return { success: false, error: error.message };
  }
};

const getUserZoomCredentials = async (userId) => {
  const userRes = await pool.query('SELECT * FROM coachee WHERE id = $1', [
    userId,
  ]);
  return userRes.rows[0] || null;
};

const updateUserZoomTokens = async (
  userId,
  accessToken,
  refreshToken,
  newExpiry
) => {
  await pool.query(
    'UPDATE coachee SET zoom_access_token = $1, zoom_refresh_token = $2, zoom_expiry_at = $3 WHERE id = $4',
    [accessToken, refreshToken, newExpiry, userId]
  );
};

const nullifyZoomUserTokens = async (userId) => {
  await pool.query(
    'UPDATE coachee SET zoom_access_token = NULL, zoom_refresh_token = NULL, zoom_expiry_at = NULL WHERE id = $1',
    [userId]
  );
};
