const pool = require("../config/db");

const checkActiveSessions = (userId, callback) => {
  // This function checks for other active sessions in some session store or cache
  const hasOtherSessions = false; // Placeholder for actual session check
  callback(hasOtherSessions);
};

exports.emitUnreadCount = async (userId, socket) => {
  if (!socket) {
    console.error("Socket is undefined or not provided.");
    return; // Exit if there is no socket to use for emitting.
  }
  try {
    const res = await pool.query(
      `SELECT COUNT(*) AS unread_count FROM chats WHERE receiver_id = $1 AND read = false`,
      [userId]
    );
    if (res.rows.length > 0) {
      const unreadCount = parseInt(res.rows[0].unread_count, 10);
      socket.to(`user-${userId}`).emit("unread_count", unreadCount);
    }
  } catch (err) {
    console.error("Error fetching unread count for user:", userId, err);
  }
};

const handleQueryResponse = (err, res) => {
  if (err) {
    console.error("Database Query Error: ", err);
  } else {
    // console.log("Database Query Successful", res);
  }
};

exports.updateUserOnlineStatus = (userId, isOnline) => {
  if (isOnline) {
    pool.query(
      `INSERT INTO user_status (user_id, is_online, last_online) VALUES ($1, true, NOW()) ON CONFLICT (user_id) DO UPDATE SET is_online = true, last_online = NOW()`,
      [userId],
      handleQueryResponse
    );
  } else {
    // Check if the user has other active sessions before setting to offline
    checkActiveSessions(userId, (isActive) => {
      if (!isActive) {
        pool.query(
          `UPDATE user_status SET is_online = false WHERE user_id = $1`,
          [userId],
          handleQueryResponse
        );
      }
    });
  }
};


exports.getMessageIdsToMarkAsRead = async (userId, receiverId) => {
  try {
    const query = `
      SELECT chat_id
      FROM chats
      WHERE receiver_id = $1 AND sender_id = $2 AND read = false
    `;
    const values = [userId, receiverId];
    const result = await pool.query(query, values);
    return result.rows.map((row) => row.chat_id);
  } catch (err) {
    console.error("Failed to fetch unread message IDs:", err);
    throw err; // It's generally a good practice to re-throw the error after logging.
  }
};
