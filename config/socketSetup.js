const socketIo = require("socket.io");
const pool = require("./db");

let io;

let sessions = {};

function setupSocket(server) {
  io = socketIo(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("A user connected via WebSocket");

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });

    socket.on("chat message", async (data) => {
      console.log("data", data);

      try {
        // Store the message in the database
        await pool.query(
          "INSERT INTO messages (senderid, receiverid, message, image) VALUES ($1, $2, $3, $4)",
          [data.senderid, data.receiverid, data.message, data.image]
        );

        // Broadcast the message to all users
        io.emit("chat message", data);
      } catch (error) {
        console.error("Error storing message in database:", error);
      }
    });

    socket.on("fetch messages", async ({ senderid, receiverid }) => {
      try {
        // Fetch messages from the database excluding messages deleted by the sender or receiver
        const result = await pool.query(
          "SELECT * FROM messages WHERE ((senderid = $1 AND receiverid = $2 AND deleted_by_sender = false) OR (senderid = $2 AND receiverid = $1 AND deleted_by_receiver = false)) ORDER BY timestamp",
          [senderid, receiverid]
        );

        // Send fetched messages to the client
        socket.emit("messages", result.rows);
      } catch (error) {
        console.error("Error fetching messages from database:", error);
      }
    });

    socket.on("fetch contacts", async ({ userId }) => {
      try {
        // Fetch contact IDs and last messages from the messages table excluding messages marked as deleted by sender or receiver
        const contactsWithLastMessagesResult = await pool.query(
          `
            SELECT
                u.id AS contact_id,
                u.email AS contact_email,
                u.first_name AS contact_first_name,
                u.last_name AS contact_last_name, 
                m.message AS last_message,
                m.timestamp AS last_message_timestamp,
                COALESCE(coachee.profile_pic, coach.profile_pic) AS profile_pic
            FROM (
                SELECT DISTINCT ON (CASE WHEN senderid = $1 THEN receiverid ELSE senderid END) 
                    CASE 
                        WHEN senderid = $1 THEN receiverid 
                        ELSE senderid 
                    END AS contact_id,
                    MAX(timestamp) AS last_message_timestamp
                FROM messages
                WHERE $1 IN (senderid, receiverid) 
                    AND (senderid = $1 AND deleted_by_sender = false OR receiverid = $1 AND deleted_by_receiver = false)
                GROUP BY CASE WHEN senderid = $1 THEN receiverid ELSE senderid END
            ) AS last_message_timestamps
            JOIN users AS u ON u.id = last_message_timestamps.contact_id
            JOIN messages AS m ON (m.senderid = u.id OR m.receiverid = u.id) AND 
                ((m.senderid = $1 AND m.receiverid = u.id) OR (m.senderid = u.id AND m.receiverid = $1)) AND 
                m.timestamp = last_message_timestamps.last_message_timestamp
            LEFT JOIN coachee_v2 AS coachee ON coachee.user_id = u.id
            LEFT JOIN coach_v2 AS coach ON coach.user_id = u.id 
            ORDER BY last_message_timestamp DESC;
        `,
          [userId]
        );

        const contacts = contactsWithLastMessagesResult.rows;
        socket.emit("contacts", contacts);
      } catch (error) {
        console.error("Error fetching contacts from database:", error);
      }
    });

    socket.on("delete messages", async ({ senderid, receiverid }) => {
      try {
        // Set deleted_by_sender to true for the sender
        await pool.query(
          "UPDATE messages SET deleted_by_sender = true WHERE senderid = $1 AND receiverid = $2",
          [senderid, receiverid]
        );

        // Set deleted_by_receiver to true for the receiver
        await pool.query(
          "UPDATE messages SET deleted_by_receiver = true WHERE senderid = $2 AND receiverid = $1",
          [senderid, receiverid]
        );

        // Notify the client that messages are deleted
        io.emit("messages deleted", { senderid, receiverid });
      } catch (error) {
        console.error("Error deleting messages from database:", error);
      }
    });

    socket.on("time update", (data) => {
      if (data.sessionId === channelName) {
        // Ensure this matches the actual sessionId
        const remainingTime = data.remainingTime;
        const startTime = Date.now() - (duration * 60000 - remainingTime);
        startCountdown(startTime);
      }
    });

    socket.on("start session", ({ sessionId, duration }) => {
      const endTime = Date.now() + duration * 60000; // convert minutes to milliseconds
      sessions[sessionId] = endTime;
      io.emit("session started", { sessionId, endTime });
    });

    socket.on("request time", ({ sessionId }) => {
      if (sessions[sessionId]) {
        const remainingTime = Math.max(0, sessions[sessionId] - Date.now());
        socket.emit("time update", { sessionId, remainingTime });
      } else {
        socket.emit("error", {
          message: "Session not found or not started yet.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
  return io;
}

function getIo() {
  if (!io) {
    console.log("Socket.io not initialized");
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = { setupSocket, getIo };
