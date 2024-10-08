const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
require("./config/db");
const coachee = require("./routes/coachee");
const users = require("./routes/users");
const coach = require("./routes/coach");
const duration = require("./routes/duration");
const availability = require("./routes/availability");
const coachArea = require("./routes/coachArea");
const notificationType = require("./routes/notificationType");
const notification = require("./routes/notification");
const language = require("./routes/language");
const section = require("./routes/section");
const payment = require("./routes/payment");
const session = require("./routes/session");
const polices = require("./routes/polices");
const country = require("./routes/country");
const rating = require("./routes/rating");
const notification_type = require("./routes/notification_type");
const notifications = require("./routes/notifications");
const auth = require("./routes/auth");
const meeting = require("./routes/meeting");
const cors = require("cors");
const cron = require("node-cron");
const { deleteOldData } = require("./models/coachee");
const ejs = require("ejs");
const { afterCompletePayment } = require("./utility/payments.");
const pool = require("./config/db");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { Server } = require("socket.io");
// const ejs = require("ejs");
const moment = require("moment");

const stripe = require("stripe")(
  "sk_test_51Ml3wJGui44lwdb4hcY6Nr91bXfxAT2KVFXMxiV6ridW3LCMcB6aoV9ZAQxL3kDjaBphiAoga8ms0zbUiQjbZgzd00DpMxrLN"
);
// const stripe = require("stripe")(
//   "sk_test_51OmriNHtA3SK3biQL8S0aKmV7f0lXuskZx1007UoWekU80nAwpXCtqZM63GOr3oaHr6ewNBlY1F9hL8oQ0K8SoxL00z86ycA77"
// );
const http = require("http");
const { setupSocket } = require("./config/socketSetup");
const socketVideoDSK = require("./utility/socket");
const { chatSocket } = require("./utility/chatSocket");
const { emitUnreadCount } = require("./utility/chat.util");
const { cloudinaryUpload } = require("./middleware/cloudinaryUpload");
const sendEmail = require("./utility/sendMail");

dotenv.config();
const app = express();

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

// io.on("connection", (socket) => {
//   console.log("New client connected");

//   socket.on("disconnect", () => {
//     console.log("Client disconnected");
//   });
// });

app.use(express.static(path.join(__dirname, "public")));

// This is your Stripe CLI webhook secret for testing your endpoint locally.

// const endpointSecret = "whsec_bVONTUjpWxDkC0XNskkr7wgPychc8IJu";

const endpointSecret = "whsec_wacAkOnREImvUMMBalPINJYOELdirvxx";

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];
    const payloadString = request.body.toString("utf-8");
    const secret = endpointSecret;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    let event;

    try {
      event = stripe.webhooks.constructEvent(payloadString, header, secret);
    } catch (err) {
      console.error("Webhook Error: ", err);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    let result;

    switch (event.type) {
      case "payment_intent.canceled":
        console.log("Payment intent canceled", event);
        break;
      case "payment_intent.created":
        console.log("Payment intent created", event);
        break;
      case "payment_intent.succeeded":
        console.log("Event Data:::: ", event);
        // console.log("Payment intent succeeded", event);
        // console.log("Metadata:", event.data.object.metadata);
        result = await afterCompletePayment(event);
        if (result.success) {
          console.log("After success payment g");
        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    response.send({
      success: true,
      message: "Received event successfully!",
      result: result,
    });
  }
);

app.use(express.json());
// app.set("view engine", "ejs");

app.get("/email", async (req, res) => {
  const data = {
    email: "user@example.com",
    otp: "123456",
    coach_name: "ABCD",
    web_link: process.env.FRONTEND_URL,
  };

  res.render(path.join(__dirname, "templates", "coachVerified.ejs"), {
    data,
  });
});

const port = 5019;

app.use(
  cors({
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
    origin: "*",
  })
);
app.use("/api/coachee", coachee);
app.use("/api/coach", coach);
app.use("/api/section", section);
app.use("/api/auth", auth);

app.use("/api/users", users);

app.set("view engine", "ejs"); // Or 'pug', 'hbs', etc.

app.use("/api/meeting", meeting);

app.use("/api/duration", duration);
app.use("/api/session", session);
app.use("/api/country", country);

app.use("/api/availability", availability);
app.use("/api/coach-area", coachArea);
app.use("/api/notification-type", notificationType);
app.use("/api/notification", notification);
app.use("/api/language", language);
app.use("/api/notifications", notifications);
app.use("/api/rating", rating);
app.use("/api/notification_type", notification_type);
app.use("/api/polices", polices);

app.use("/api/payments", payment);

app.post("/upload-icon", async (req, res) => {
  try {
    const file = await stripe.files.create({
      purpose: "business_icon",
      file: {
        data: fs.readFileSync("./icon.png"),
        name: "icon.png",
        type: "application/octet-stream",
      },
    });

    res.send(file);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: error.message });
  }
});

app.get("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM session_data_socket WHERE session_id = $1",
      [sessionId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Session not found" });
    }
  } catch (error) {
    console.error("Error retrieving session data from database:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

app.post("/api/generate-token", (req, res) => {
  const {
    role,
    sessionId = 1,
    password = "somekinda",
    username = "HOST GOST",
  } = req.body;

  const payload = {
    app_key: process.env.ZOOM_SDK_KEY,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    tpc: `session_${sessionId}`,
    role_type: role,
    pwd: password,
    user_identity: username,
    session_key: sessionId,
  };

  const token = jwt.sign(payload, process.env.ZOOM_SDK_SECRET);

  res.json({ token });
});

// app.get("/api/generate-token", (req, res) => {
//   const payload = {
//     iss: process.env.ZOOM_API_KEY,
//     exp: new Date().getTime() + 5000,
//   };

//   const token = jwt.sign(payload, process.env.ZOOM_API_SECRET);
//   res.json({ jwtToken: token });
// });

console.log(path.join(__dirname, "views", "payment.html"));

app.get("/payment", (req, res) => {
  res.render(path.join(__dirname, "views", "payment.ejs"));
});

// ! CHAT

app.get("/contacts/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const result = await pool.query(
      `
SELECT 
    u.id, 
    u.email, 
    u.first_name, 
    u.last_name, 
    us.is_online, 
    us.last_online, 
    COUNT(DISTINCT c.chat_id) FILTER (WHERE c.read = false AND c.receiver_id = $1 AND c.deleted_by_receiver = false) AS unread_count,
    -- Subquery to get the latest message for each user
    (
        SELECT c2.message
        FROM chats c2
        WHERE (c2.sender_id = u.id AND c2.receiver_id = $1 AND c2.deleted_by_receiver = false) 
           OR (c2.receiver_id = u.id AND c2.sender_id = $1 AND c2.deleted_by_sender = false)
        ORDER BY c2.created_at DESC
        LIMIT 1
    ) AS last_message,
    -- Subquery to get the timestamp of the latest message
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
    MAX(c.created_at) DESC;



      `,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching contacts", err);
    res.status(500).send("Server error");
  }
});

app.get("/messages/:user1Id/:user2Id", async (req, res) => {
  const user1Id = parseInt(req.params.user1Id);
  const user2Id = parseInt(req.params.user2Id);
  const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
  const limit = parseInt(req.query.limit) || 20; // Default to 20 messages per page if not specified
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT * FROM chats
       WHERE ((sender_id = $1 AND receiver_id = $2 AND deleted_by_sender = false)
          OR (sender_id = $2 AND receiver_id = $1 AND deleted_by_receiver = false))
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [user1Id, user2Id, limit, offset]
    );
    res.json({
      page,
      limit,
      totalMessages: result.rowCount,
      messages: result.rows,
    });
  } catch (error) {
    console.error("Error fetching messages", error);
    res.status(500).send("Server error");
  }
});

app.get("/get-unread-count/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!userId) {
    return res.status(400).json({ success: false, message: "Invalid user ID" });
  }

  try {
    // Query to count unread messages for the user
    const query = `SELECT COUNT(*) AS unread_count FROM chats WHERE receiver_id = $1 AND read = FALSE`;
    const result = await pool.query(query, [userId]);

    if (result.rows.length > 0) {
      // Extract unread count from the first row
      const unreadCount = parseInt(result.rows[0].unread_count, 10);
      return res.status(200).json({ success: true, count: unreadCount });
    } else {
      // If no rows returned, assume no messages found
      return res.status(200).json({ success: true, count: 0 });
    }
  } catch (error) {
    console.error("Error fetching unread messages count", error);
    res.status(500).send("Server error");
  }
});

app.delete("/delete/:senderId/:receiverId", async (req, res) => {
  const senderId = parseInt(req.params.senderId);
  const receiverId = parseInt(req.params.receiverId);

  try {
    // Update the chats as deleted by this user
    const result = await pool.query(
      `
      UPDATE chats
      SET deleted_by_sender = CASE WHEN sender_id = $1 THEN true ELSE deleted_by_sender END,
          deleted_by_receiver = CASE WHEN receiver_id = $1 THEN true ELSE deleted_by_receiver END
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      RETURNING *;
      `,
      [senderId, receiverId]
    );

    if (result.rows.length > 0) {
      res.send({ message: "Chats deleted successfully.", chats: result.rows });
    } else {
      res.status(404).send("No chats found between the specified users.");
    }
  } catch (error) {
    console.error("Error deleting chats", error);
    res.status(500).send("Server error");
  }
});

app.post("/upload", cloudinaryUpload.single("image"), async (req, res) => {
  if (req.file && req.file.path) {
    res.json({ imageUrl: req.file.path });
  } else {
    res.status(400).send("No image uploaded.");
  }
});

// ! CHAT END

cron.schedule("* * * * *", async () => {
  const updateQuery = `
UPDATE sessions
SET status = 'pending'
WHERE status = 'accepted'
  AND payment_status = false
  AND accepted_at < NOW() - INTERVAL '1 hour';
;
  `;
  try {
    const updated = await pool.query(updateQuery);
    console.log(updated.rows[0]);
    console.log("Session statuses updated if necessary.");
  } catch (error) {
    console.error("Error updating session statuses:", error);
  }
});

cron.schedule("0 0 */1 * *", () => {
  deleteOldData();
});

// io.on("connection", (socket) => {
//   console.log("a user connected");
//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

app.get("/api/notification-request", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.first_name, u.last_name FROM notification_requests n LEFT JOIN users u ON n.coachee_id = u.id ORDER BY n.created_at DESC LIMIT 1`
    );
    res.json({ result: result.rows[0] });
  } catch (error) {
    console.error("Error fetching the latest notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/notification-request/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM notification_requests WHERE id = $1`, [id]);
    res.json({
      success: true,
      message: "Notification request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/notification-request-rating", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.first_name, u.last_name FROM notification_requests_rating n LEFT JOIN users u ON n.coachee_id = u.id ORDER BY n.created_at DESC LIMIT 1`
    );
    res.json({ result: result.rows[0] });
  } catch (error) {
    console.error("Error fetching the latest notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/notification-request-rating/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM notification_requests_rating WHERE id = $1`, [
      id,
    ]);
    res.json({
      success: true,
      message: "Notification request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/notification-request-payment", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.first_name, u.last_name FROM notification_requests_payment n LEFT JOIN users u ON n.coachee_id = u.id ORDER BY n.created_at DESC LIMIT 1`
    );
    res.json({ result: result.rows[0] });
  } catch (error) {
    console.error("Error fetching the latest notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/notification-request-payment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notification_requests_payment WHERE id = $1`,
      [id]
    );
    res.json({
      success: true,
      message: "Notification request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.get("/api/notification-request-accepted", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.first_name, u.last_name FROM notification_requests_accepted n LEFT JOIN users u ON n.coach_id = u.id ORDER BY n.created_at DESC LIMIT 1`
    );
    res.json({ result: result.rows[0] });
  } catch (error) {
    console.error("Error fetching the latest notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/notification-request-accepted/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notification_requests_accepted WHERE id = $1`,
      [id]
    );
    res.json({
      success: true,
      message: "Notification request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Function to create the email content
const createEmailContent = (session, type, role) => {
  const web_link = process.env.FRONTEND_URL;
  const hours = type === "1-hour" ? "1 hour" : "24 hours";
  const name =
    role === "coachee"
      ? session.coachee_first_name + " " + session.coachee_last_name
      : session.coach_first_name + " " + session.coach_last_name;
  const sendername =
    !role === "coachee"
      ? session.coachee_first_name + " " + session.coachee_last_name
      : session.coach_first_name + " " + session.coach_last_name;
  return `
      <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #000;
          }
          .primary {
            color: #0f6d6a !important;
            font-size: "25px" !important;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
          }
          .header {
            padding: 10px;
            display: flex;
            align-items: center;
          }
          .header img {
            width: 80px;
            margin-right: 20px;
          }
          .header .greeting {
            font-size: 24px;
            color: #0f6d6a;
          }
          .content {
            margin: 20px 0;
            text-align: center;
            background-color: #fff;
            padding: 10px;
          }
          .footer {
            padding: 10px;
            text-align: center;
            font-size: 12px;
          }
          .button {
            display: inline-block;
            padding: 10px 15px;
            margin: 10px auto;
            background-color: #0f6d6a;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
          .center{
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img
              src="https://res.cloudinary.com/dfbds6fd7/image/upload/v1715683419/mainstays/email/Mainstays_mit_Claim_CMYK_1_gypyzn.png"
              alt="Logo"
            />
          </div>
          <div class="center"><p class="color-black primary">Dear ${name},</p></div>
          <div class="content">
            <p>This is a reminder that your session with ${sendername} is scheduled to start in ${hours} hours. The session details are as follows:</p>
            <ul>
              <li><strong>Date:</strong> ${session.date}</li>
              <li><strong>Duration:</strong> ${session.duration} minutes</li>
            </ul>
            <p>Please be prepared and join the session on time.</p>
            <p>Best regards,<br>Your Coaching Platform</p>
            <a href=${web_link} class="button">Check Out Our Website</a>
          </div>
        </div>
      </body>
    </html>
  `;
};

const sentReminders = new Set();

// app.get("/s", async (req, res) => {
//   const sqlQuery = `
//     SELECT * FROM sessions
//         WHERE status = 'paid'
// AND date >= CURRENT_TIMESTAMP
//       AND date < CURRENT_TIMESTAMP + INTERVAL '24 hours'
//   `;

//   try {
//     const result = await pool.query(sqlQuery);
//     return res.send({ result: result.rows });
//   } catch (error) {
//     console.error("Error executing query", error.stack);
//     return res.send({ result: error });
//   }
// });

// cron.schedule("*/5 * * * *", async () => {
app.get("/se", async (req, res) => {
  const query = `
   SELECT
        s.*,
        coach.email AS coach_email,
        coach.first_name AS coach_first_name,
        coach.last_name AS coach_last_name,
        coachee.email AS coachee_email,
        coachee.first_name AS coachee_first_name,
        coachee.last_name AS coachee_last_name
    FROM
        sessions s
    JOIN
        users AS coach ON s.coach_id = coach.id
    JOIN
        users AS coachee ON s.coachee_id = coachee.id
    WHERE
        s.status = 'paid'
      AND s.date >= CURRENT_TIMESTAMP
      AND s.date < CURRENT_TIMESTAMP + INTERVAL '24 hours'
      AND s.is_notified_24hr = false
  `;

  const client = await pool.connect();

  try {
    const result = await client.query(query);
    const sessions = result.rows;

    for (const session of sessions) {
      const emailContent = createEmailContent(session, "24-hour");
      const emailCoacheeContent = createEmailContent(
        session,
        "24-hour",
        "coachee"
      );

      await sendEmail(
        session.coach_email,
        "24-hour Session Reminder",
        emailContent
      );
      await sendEmail(
        session.coachee_email,
        "24-hour Session Reminder",
        emailCoacheeContent
      );

      await client.query(
        `UPDATE sessions SET is_notified_24hr = true WHERE id = $1`,
        [session.id]
      );
    }

    await client.query("COMMIT");
    console.log("24-hour reminder emails sent if necessary.");
    res.send(sessions);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error fetching sessions for 24-hour reminder:", error);
    res.status(500).send("An error occurred while processing the request.");
  } finally {
    client.release();
  }
});

const sentRemindersOneHour = new Set();

console.log("dateB", new Date().toISOString());

cron.schedule("*/5 * * * *", async () => {
  const currentDate = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");

  try {
    const result = await pool.query(`
      SELECT 
        s.*, 
        u_coach.email as coach_email, 
        u_coach.first_name as coach_first_name, 
        u_coach.last_name as coach_last_name,
        u_coachee.email as coachee_email, 
        u_coachee.first_name as coachee_first_name, 
        u_coachee.last_name as coachee_last_name
      FROM sessions s
      JOIN users u_coach ON s.coach_id = u_coach.id
      JOIN users u_coachee ON s.coachee_id = u_coachee.id
      WHERE s.is_notified = false AND s.status = 'paid'
    `);

    if (result.rows.length === 0) {
      console.log("No sessions found");
      // return res.status(404).send({ message: "No sessions found" });
    }

    const filteredSessions = result.rows.filter((session) => {
      const sessionDate = moment(session.date).format("YYYY-MM-DD");
      const sessionTimeString = `${sessionDate} ${session.section}:00`;
      const sessionDateTime = moment(sessionTimeString, "YYYY-MM-DD HH:mm:ss");

      // Check if the session is today and if there is one hour left until the session time
      const oneHourBeforeSession = moment(sessionDateTime)
        .subtract(1, "hour")
        .format("YYYY-MM-DD HH:mm:ss");
      const isOneHourLeft =
        moment(currentTime).isSameOrAfter(oneHourBeforeSession) &&
        moment(currentTime).isBefore(sessionDateTime);

      return sessionDateTime.isSame(currentDate, "day") && isOneHourLeft;
    });

    if (filteredSessions.length === 0) {
      console.log(
        "No sessions with one hour left until the session time found"
      );
      // return res.status(404).send({
      //   message: "No sessions with one hour left until the session time found",
      // });
    }

    for (const session of filteredSessions) {
      const emailContent = createEmailContent(session, "1-hour");
      const emailCoacheeContent = createEmailContent(
        session,
        "1-hour",
        "coachee"
      );

      await sendEmail(
        session.coach_email,
        "1-hour Session Reminder",
        emailContent
      );
      await sendEmail(
        session.coachee_email,
        "1-hour Session Reminder",
        emailCoacheeContent
      );

      // Update the session to mark it as notified
      await pool.query(`UPDATE sessions SET is_notified = true WHERE id = $1`, [
        session.id,
      ]);
    }

    console.log("Send to ");

    // return res.send({
    //   sessions: filteredSessions,
    //   currentTime,
    // });
  } catch (error) {
    console.log(error);
    // return res.status(500).send({ message: "Error fetching sessions" });
  }
});

// 24-hour reminder
cron.schedule("*/5 * * * *", async () => {
  const currentDate = moment().format("YYYY-MM-DD");
  const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");

  try {
    const result = await pool.query(`
      SELECT 
        s.*, 
        u_coach.email as coach_email, 
        u_coach.first_name as coach_first_name, 
        u_coach.last_name as coach_last_name,
        u_coachee.email as coachee_email, 
        u_coachee.first_name as coachee_first_name, 
        u_coachee.last_name as coachee_last_name
      FROM sessions s
      JOIN users u_coach ON s.coach_id = u_coach.id
      JOIN users u_coachee ON s.coachee_id = u_coachee.id
      WHERE s.is_notified_24hr = false
    `);

    if (result.rows.length === 0) {
      console.log("No sessions found");
      return;
    }

    const filteredSessions = result.rows.filter((session) => {
      const sessionDate = moment(session.date).format("YYYY-MM-DD");
      const sessionTimeString = `${sessionDate} ${session.section}:00`;
      const sessionDateTime = moment(sessionTimeString, "YYYY-MM-DD HH:mm:ss");

      // Check if the session is within the next 24 hours
      const twentyFourHoursBeforeSession = moment(sessionDateTime)
        .subtract(24, "hour")
        .format("YYYY-MM-DD HH:mm:ss");
      const isTwentyFourHoursLeft =
        moment(currentTime).isSameOrAfter(twentyFourHoursBeforeSession) &&
        moment(currentTime).isBefore(sessionDateTime);

      return (
        sessionDateTime.isSame(currentDate, "day") && isTwentyFourHoursLeft
      );
    });

    if (filteredSessions.length === 0) {
      console.log(
        "No sessions with 24 hours left until the session time found"
      );
      return;
    }

    for (const session of filteredSessions) {
      const emailContent = createEmailContent(session, "24-hour");
      const emailCoacheeContent = createEmailContent(
        session,
        "24-hour",
        "coachee"
      );

      await sendEmail(
        session.coach_email,
        "24-hour Session Reminder",
        emailContent
      );
      await sendEmail(
        session.coachee_email,
        "24-hour Session Reminder",
        emailCoacheeContent
      );

      // Update the session to mark it as notified for 24 hours
      await pool.query(
        `UPDATE sessions SET is_notified_24hr = true WHERE id = $1`,
        [session.id]
      );
    }

    console.log("24-hour reminders sent");
  } catch (error) {
    console.log(error);
  }
});

// Set up Socket.IO
setupSocket(server);
socketVideoDSK();
chatSocket(server);
server.listen(port, () => {
  console.log(`run server at ${port}`);
});

module.exports = io;
