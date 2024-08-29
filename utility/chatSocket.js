const socketIo = require("socket.io");
const pool = require("../config/db");
const {
  updateUserOnlineStatus,
  emitUnreadCount,
  getMessageIdsToMarkAsRead,
} = require("./chat.util");

let sessions = {};
let sessionData = {};
function chatSocket(server) {
  const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
  });

  io.on("connection", async (socket) => {
    console.log("A user connected via WebSocket");
    //   * time handling for video calling
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

    socket.on("coach-start-session", async (data) => {
      const { sessionId, coachStarted } = data;
      console.log("Received coach-start-session event:", data);

      try {
        await pool.query(
          "INSERT INTO session_data_socket (session_id, coach_started) VALUES ($1, $2) ON CONFLICT (session_id) DO UPDATE SET coach_started = $2",
          [sessionId, coachStarted]
        );

        // Emit an event to notify other clients
        io.emit("coach-start-session", { sessionId, coachStarted });
      } catch (error) {
        console.error("Error saving session data to database:", error);
      }
    });

    // Update online status to true
    const userId = socket.handshake.query.userId;
    console.log("User ID from client:", userId);
    if (!userId) {
      console.error("Invalid or missing userId.");
      return;
    }
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} connected and joined room user-${userId}`);
    }
    updateUserOnlineStatus(userId, true);

    // Emit unread messages count on connection
    // await emitUnreadCount(userId, socket);
    socket.on("fetch_contacts", async (userId) => {
      console.log("Fetch contacts");
      try {
        const contacts = await pool.query(
          `
SELECT 
    u.id, 
    u.email, 
    u.first_name, 
    u.last_name, 
    us.is_online, 
    us.last_online, 
    COUNT(DISTINCT c.chat_id) FILTER (WHERE c.read = false AND c.receiver_id = $1 AND c.deleted_by_receiver = false) AS unread_count,
    (
        SELECT c2.message
        FROM chats c2
        WHERE (c2.sender_id = u.id AND c2.receiver_id = $1 AND c2.deleted_by_receiver = false) 
           OR (c2.receiver_id = u.id AND c2.sender_id = $1 AND c2.deleted_by_sender = false)
        ORDER BY c2.created_at DESC
        LIMIT 1
    ) AS last_message,
    (
        SELECT c2.created_at
        FROM chats c2
        WHERE (c2.sender_id = u.id AND c2.receiver_id = $1 AND c2.deleted_by_receiver = false) 
           OR (c2.receiver_id = u.id AND c2.sender_id = $1 AND c2.deleted_by_sender = false)
        ORDER BY c2.created_at DESC
        LIMIT 1
    ) AS last_message_time,
    CASE 
        WHEN u.role = 'coach' THEN cv.profile_pic
        WHEN u.role = 'coachee' THEN cv2.profile_pic
        ELSE NULL
    END AS profile_pic
FROM 
    users u
JOIN 
    chats c ON (u.id = c.sender_id OR u.id = c.receiver_id) AND ((c.sender_id = $1 AND c.deleted_by_sender = false) OR (c.receiver_id = $1 AND c.deleted_by_receiver = false))
LEFT JOIN 
    user_status us ON u.id = us.user_id
LEFT JOIN 
    coach_v2 cv ON u.id = cv.user_id AND u.role = 'coach'
LEFT JOIN 
    coachee_v2 cv2 ON u.id = cv2.user_id AND u.role = 'coachee'
WHERE 
    u.id != $1
GROUP BY 
    u.id, u.email, u.first_name, u.last_name, us.is_online, us.last_online, cv.profile_pic, cv2.profile_pic
ORDER BY 
    MAX(c.created_at) DESC
      `,
          [userId]
        );
        console.log("Emitting contacts data:", contacts.rows);
        socket.emit("update_contacts", contacts.rows);
      } catch (error) {
        console.error("Error fetching contacts via WebSocket: ", error);
        socket.emit("error_fetching_contacts", "Failed to fetch contacts");
      }
    });
    socket.on("send_message", async (data) => {
      const { sender_id, receiver_id, message, image_url } = data;
      console.log("send_message", data);
      try {
        // Insert new message into the chats table
        const insertResult = await pool.query(
          `INSERT INTO chats (sender_id, receiver_id, message, image_url) 
       VALUES ($1, $2, $3, $4) RETURNING chat_id, created_at`,
          [sender_id, receiver_id, message, image_url]
        );

        const { chat_id, created_at } = insertResult.rows[0];

        // Query to get the last message between the two users
        const lastMessageData = await pool.query(
          `SELECT message, created_at as last_message_time 
       FROM chats 
       WHERE (sender_id = $1 AND receiver_id = $2 OR sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at DESC LIMIT 1`,
          [sender_id, receiver_id]
        );

        const lastMessage = lastMessageData.rows[0];

        // Emit message to the receiver
        socket.to(`user-${receiver_id}`).emit("receive_message", {
          ...data,
          chat_id,
          last_message_time: created_at,
        });

        socket.emit("fetch_contacts", sender_id);
        socket.to(`user-${receiver_id}`).emit("fetch_contacts", receiver_id);

        // Emit updated last message to both users
        [sender_id, receiver_id].forEach((id) => {
          io.to(`user-${id}`).emit("update_last_message", lastMessage);
        });

        // Request both users to update their contact list
        [sender_id, receiver_id].forEach((id) => {
          io.to(`user-${id}`).emit("update_contacts");
        });

        // Trigger contact list updates for both sender and receiver

        // Update unread count for the receiver
        await emitUnreadCount(receiver_id, socket);
        await emitUnreadCount(sender_id, socket);
      } catch (error) {
        console.error("Error sending message: ", error);
      }
    });

    socket.on("mark_messages_as_read", async (data) => {
      try {
        const userId = parseInt(data?.userId);
        const receiverId = parseInt(data?.receiverId);
        console.log("mark as read", userId, receiverId);
        const messageIds = await getMessageIdsToMarkAsRead(userId, receiverId);
        console.log("messageIds", messageIds);
        if (messageIds.length > 0) {
          const result = await pool.query(
            `UPDATE chats SET read = true WHERE chat_id = ANY($1) RETURNING *;`,
            [messageIds]
          );
          await emitUnreadCount(userId, socket);
          await emitUnreadCount(receiverId, socket);
          result.rows.forEach((msg) => {
            socket
              .to(`user-${msg.receiver_id}`)
              .emit("message_read", { chatId: msg.chat_id });
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
      updateUserOnlineStatus(userId, false);
    });

    socket.join(`user-${userId}`);
  });

  return io;
}

module.exports = { chatSocket };
