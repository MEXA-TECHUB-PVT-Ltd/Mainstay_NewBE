const pool = require("../config/db");
const session = require("../models/session");
const { getAll } = require("../utility/dbHelper");
const { isWithinGermany } = require("../utility/isWithinGermany");
const {
  ejsData,
  renderEJSTemplate,
  sessionAcceptedTemplatePath,
  sessionRequestTemplatePath,
  sessionAcceptedGermanTemplatePath,
  sessionRequestGermanTemplatePath,
} = require("../utility/renderEmail");
const sendEmail = require("../utility/sendMail");

exports.createSession = async (req, res) => {
  try {
    const coachee_id = req.user.userId;
    const { coach_id, date, duration, section, coaching_area_id, amount } =
      req.body;

    if (
      !coach_id ||
      !date ||
      !duration ||
      !section ||
      !coaching_area_id ||
      !amount
    ) {
      return res
        .status(400)
        .json({ success: false, message: "add all required fields" });
    }

    const coachData = await pool.query(
      `SELECT first_name, last_name, email , lat , long FROM users WHERE id = $1`,
      [coach_id]
    );
    const coacheeData = await pool.query(
      `SELECT first_name, last_name, email , lat, long FROM users WHERE id = $1`,
      [coachee_id]
    );

    // checking if the session is already booked

    const checkSession = await pool.query(
      `SELECT * FROM sessions WHERE coach_id = $1 AND date = $2 AND section = $3 AND (status = $4 OR status = $5)`,
      [coach_id, date, section, "accepted", "paid"]
    );

    if (checkSession.rowCount > 0) {
      return res.status(401).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    await pool.query(
      "INSERT INTO notification_requests (title, type, coachee_id) VALUES ($1, $2, $3) RETURNING *",
      ["REQUEST", "SESSION", coachee_id]
    );

    const newSession = await session.createSession(
      coachee_id,
      coach_id,
      date,
      duration,
      section,
      coaching_area_id,
      amount
    );
    const session_id = newSession.id;
    const title = "SESSION_REQUEST";
    const content = "Your session request has been sent to coach";
    const type = "SESSION";
    await pool.query(
      "INSERT INTO notifications (title, content, type, coach_id, coachee_id, session_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [title, content, type, coach_id, coachee_id, session_id]
    );
    const coach_name =
      coachData.rows[0].first_name + " " + coachData.rows[0].last_name;
    const coachee_name =
      coacheeData.rows[0].first_name + " " + coacheeData.rows[0].last_name;
    const email = coachData.rows[0].email;
    const coachee_email = coacheeData.rows[0].email;
    const data = {
      coach_name,
      coachee_name,
      coachee_email,
      duration,
      time: section,
      amount,
      date,
      web_link: process.env.FRONTEND_URL,
    };

    const inGermany = isWithinGermany(
      coachData.rows[0].lat,
      coachData.rows[0].long
    );

    const verificationData = ejsData(data);
    const verificationHtmlContent = await renderEJSTemplate(
      inGermany ? sessionRequestGermanTemplatePath : sessionRequestTemplatePath,
      verificationData
    );
    const emailSent = await sendEmail(
      email,
      inGermany ? "Neue Sitzungsanfrage" : "New Session Request",
      verificationHtmlContent
    );

    res.status(201).json({ success: true, newSession });
  } catch (error) {
    console.error("Error creating Session:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params; // Assuming 'id' is the session ID
    const values = [id]; // No need for pagination values

    let query = `
      SELECT 
        json_build_object(
          'session_id', s.id,
          'coaching_area_name', ca.name,
          'german_name', ca.german_name,
          'coach', json_build_object(
              'name', uc.first_name || ' ' || uc.last_name,
                  'coach_id', cv2.user_id,
                  'about', cv2.about,
                  'profile_pic', cv2.profile_pic,
                  'language_ids', cv2.language_ids,
                  'coaching_area_ids', cv2.coaching_area_ids,
                  'is_completed', cv2.is_completed,
                  'admin_verified', cv2.admin_verified,
                  'coach_badge', cb.name,
                  'coach_avg_rating', AVG(r.rating) 
                ),
                'coachee', json_build_object(
                  'coachee_id', cov2.user_id,
                  'name', uco.first_name || ' ' || uco.last_name,
                  'profile_pic', cov2.profile_pic,
                  'date_of_birth', cov2.date_of_birth,
                  'phone', cov2.phone,
                  'gender', cov2.gender,
                  'interests', cov2.interests,
                  'language', cov2.language,
                  'country_id', cov2.country_id,
                  'coachee_badge', ceb.name
          ),
          'session_details', json_build_object(
              'status', s.status,
              'payment_status', s.payment_status,
              'date', s.date,
              'duration', s.duration,
              'rating', s.rating,
              'amount', s.amount,
              'section', s.section,
              'comment', s.comment
          )
      ) AS session_data
      FROM 
        sessions s 
      LEFT JOIN 
        coach_area ca ON s.coaching_area_id = ca.id 
      LEFT JOIN 
        users uc ON s.coach_id = uc.id 
      LEFT JOIN 
        users uco ON s.coachee_id = uco.id 
      LEFT JOIN 
        coach_v2 cv2 ON uc.id = cv2.user_id 
      LEFT JOIN 
        coachee_v2 cov2 ON uco.id = cov2.user_id
      LEFT JOIN
        badges cb ON s.coach_id = cb.coach_id 
      LEFT JOIN
        coachee_badges ceb ON s.coachee_id = ceb.user_id
        LEFT JOIN
        rating r ON s.coach_id = r.coach_id
      WHERE 
        s.id = $1 GROUP BY s.id, ca.id, uc.id, uco.id, cv2.id, cov2.id, cb.id, ceb.id, r.id;
    `;

    const session = await getAll(query, values);

    if (!session || session.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    // Since it's for a single session, no need to calculate total and totalPage
    res.status(200).json({
      success: true,
      session: session[0], // Assuming 'getAll' returns an array
    });
  } catch (error) {
    console.error("Error fetching session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getSessionByCoach = async (req, res) => {
  // console.log("coming......");
  try {
    const coach_id = req.user.userId;
    const {
      page = 1,
      pageSize = 10,
      status = "",
      searchTerm = "",
      sort = "created_at_desc",
    } = req.query;
    const offset = (page - 1) * pageSize;
    let queryConditions = "WHERE coach.id = $1";
    let queryParams = [coach_id]; // Initial query parameters
    let statusValues = status.split(",");
    // Handling status condition
    if (status && status !== "") {
      if (status.toLowerCase() === "paid") {
        queryConditions += " AND s.status = 'paid'";
      } else {
        queryConditions += ` AND s.status IN (${statusValues
          .map((_, index) => `$${queryParams.length + index + 1}`)
          .join(", ")})`;
        queryParams.push(...statusValues);
      }
    } else {
      // If status is not passed, exclude 'paid' status sessions
      queryConditions += " AND s.status <> 'paid'";
    }

    if (searchTerm) {
      queryParams.push(`%${searchTerm.toLowerCase()}%`);
      queryConditions += ` AND (co.first_name ILIKE $${queryParams.length} OR co.last_name ILIKE $${queryParams.length})`;
    }

    // Sorting logic
    let orderByClause = "ORDER BY s.created_at DESC"; // Default sorting
    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY s.created_at ASC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY coachee.first_name ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY coachee.first_name DESC";
        break;
      // Add more sorting options as needed
    }

    let finalQuery = `
SELECT 
    json_build_object(
        'id', s.id,
        'coaching_area_name', ca.name,
        'coach_name', coach.first_name || ' ' || coach.last_name,
        'coach_id', coach.id,
        'coachee_name', coachee.first_name || ' ' || coachee.last_name,
        'coachee_id', coachee.id,
        'coachee_profile_pic', co.profile_pic,
        'coachee_badge', cob.name,
        'session_details', json_build_object(
          'session_id', s.id,
            'status', s.status,
            'payment_status', s.payment_status,
            'date', s.date,
            'duration', s.duration,
            'rating', s.rating,
            'amount', s.amount,
            'section', s.section,
            'comment', s.comment,
            'created_at', s.created_at
        )
    ) AS session_info
FROM 
    sessions s 
LEFT JOIN 
    coach_area ca ON s.coaching_area_id = ca.id 
LEFT JOIN 
    users coach ON s.coach_id = coach.id
LEFT JOIN 
    users coachee ON s.coachee_id = coachee.id
LEFT JOIN 
    coach_v2 c ON coach.id = c.user_id 
LEFT JOIN 
    coachee_v2 co ON coachee.id = co.user_id
LEFT JOIN
    coachee_badges cob ON coachee.id = cob.user_id
${queryConditions} 
${orderByClause} 
LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
`;

    queryParams.push(pageSize, offset); // Add LIMIT and OFFSET parameters at the end

    // Execute the query with all parameters
    const session = await getAll(finalQuery, queryParams);
    // console.log({ session: session });

    // Count total sessions for pagination

    const validStatusValues = statusValues.filter(
      (status) => status.trim() !== ""
    );

    let queryParts = [`SELECT count(*) FROM sessions s WHERE s.coach_id = $1`];
    let myParams = [coach_id];

    if (validStatusValues.length > 0) {
      const statusPlaceholders = validStatusValues
        .map((_, index) => `$${index + 2}`)
        .join(", ");
      queryParts.push(`AND s.status IN (${statusPlaceholders})`);
      myParams = myParams.concat(validStatusValues);
    }

    const countQuery = queryParts.join(" ");
    const countResult = await pool.query(countQuery, myParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // console.log({ status: "COUNT QUERY", countQuery });
    res.status(200).json({
      success: true,
      total,
      totalPage: Math.ceil(total / pageSize),
      sessions: session,
    });
  } catch (error) {
    console.error("Error fetching session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getSessionByCoachee = async (req, res) => {
  try {
    const coachee_id = req.user.userId;
    const {
      page = 1,
      pageSize = 10,
      status = "",
      searchTerm = "",
      sort = "created_at_desc",
    } = req.query;
    const offset = (page - 1) * pageSize;
    let queryConditions = "WHERE coachee.id = $1";
    let queryParams = [coachee_id]; // Initial query parameters
    let statusValues = status.split(",");
    // Handling status condition
    if (status && status !== "") {
      if (status.toLowerCase() === "paid") {
        queryConditions += " AND s.status = 'paid'";
      } else {
        queryConditions += ` AND s.status IN (${statusValues
          .map((_, index) => `$${queryParams.length + index + 1}`)
          .join(", ")})`;
        queryParams.push(...statusValues);
      }
    } else {
      // If status is not passed, exclude 'paid' status sessions
      queryConditions += " AND s.status <> 'paid'";
    }

    if (searchTerm) {
      queryParams.push(`%${searchTerm.toLowerCase()}%`);
      queryConditions += ` AND (co.first_name ILIKE $${queryParams.length} OR co.last_name ILIKE $${queryParams.length})`;
    }

    // Sorting logic
    let orderByClause = "ORDER BY s.created_at DESC"; // Default sorting
    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY s.created_at ASC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY coach.first_name ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY coach.first_name DESC";
        break;
    }

    let finalQuery = `
WITH coach_ratings AS (
    SELECT 
        coach_id, 
        AVG(rating) AS avg_rating
    FROM 
        rating
    GROUP BY 
        coach_id
)
SELECT 
    json_build_object(
        'id', s.id,
        'coaching_area_name', ca.name,
        'coaching_area_german_name' , ca.german_name,
        'coach_name', coach.first_name || ' ' || coach.last_name,
        'coachee_name', coachee.first_name || ' ' || coachee.last_name,
        'coach_id', c.user_id,
        'coach_profile_pic', c.profile_pic,
        'coach_avg_rating', cr.avg_rating,
        'coach_badge', cob.name,
        'session_details', json_build_object(
            'session_id', s.id,
            'status', s.status,
            'payment_status', s.payment_status,
            'date', s.date,
            'duration', s.duration,
            'rating', s.rating,
            'amount', s.amount,
            'section', s.section,
            'comment', s.comment,
            'created_at', s.created_at
        )
    ) AS session_info
FROM 
    sessions s 
JOIN 
    coach_area ca ON s.coaching_area_id = ca.id 
JOIN 
    users coach ON s.coach_id = coach.id
JOIN 
    coach_v2 c ON coach.id = c.user_id 
LEFT JOIN 
    coach_ratings cr ON c.user_id = cr.coach_id
JOIN 
    users coachee ON s.coachee_id = coachee.id
LEFT JOIN
    badges cob ON coach.id = cob.coach_id
-- Assuming queryConditions and orderByClause are placeholders you'll replace dynamically
${queryConditions} 
${orderByClause} 
LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
`;

    queryParams.push(pageSize, offset);
    const session = await getAll(finalQuery, queryParams);
    // console.log({ session: session });
    const validStatusValues = statusValues.filter(
      (status) => status.trim() !== ""
    );
    let queryParts = [
      `SELECT count(*) FROM sessions s WHERE s.coachee_id = $1`,
    ];
    let myParams = [coachee_id];

    if (validStatusValues.length > 0) {
      const statusPlaceholders = validStatusValues
        .map((_, index) => `$${index + 2}`)
        .join(", ");
      queryParts.push(`AND s.status IN (${statusPlaceholders})`);
      myParams = myParams.concat(validStatusValues);
    }

    const countQuery = queryParts.join(" ");
    const countResult = await pool.query(countQuery, myParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      total,
      totalPage: Math.ceil(total / pageSize),
      sessions: session,
    });
  } catch (error) {
    console.error("Error fetching session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// exports.getSessionByCoachee = async (req, res) => {
//   try {
//     const coachee_id = req.user.userId;
//     const {
//       page = 1,
//       pageSize = 10,
//       status,
//       sort = "created_at_desc",
//     } = req.query;
//     const offset = (page - 1) * pageSize;

//     const values = [coachee_id, pageSize, offset];
//     let query = `
//   SELECT
//     json_build_object(
//         'session_id', s.id,
//         'coaching_area_name', ca.name,
//         'coach', json_build_object(
//             'name', uc.first_name || ' ' || uc.last_name,
//             'details', json_build_object(
//                 'about', cv2.about,
//                 'profile_pic', cv2.profile_pic,
//                 'language_ids', cv2.language_ids,
//                 'coaching_area_ids', cv2.coaching_area_ids,
//                 'is_completed', cv2.is_completed,
//                 'admin_verified', cv2.admin_verified
//             )
//         ),
//         'coachee', json_build_object(
//             'name', uco.first_name || ' ' || uco.last_name,
//             'details', json_build_object(
//                 'date_of_birth', cov2.date_of_birth,
//                 'phone', cov2.phone,
//                 'gender', cov2.gender,
//                 'profile_pic', cov2.profile_pic, // Corrected alias from co2 to cov2
//                 'interests', cov2.interests,
//                 'language', cov2.language,
//                 'country_id', cov2.country_id
//             )
//         ),
//         'session_details', json_build_object(
//             'status', s.status,
//             'payment_status', s.payment_status,
//             'date', s.date,
//             'duration', s.duration,
//             'rating', s.rating,
//             'amount', s.amount,
//             'section', s.section,
//             'comment', s.comment
//         )
//     ) AS session_data
// FROM
//     sessions s
// JOIN
//     coach_area ca ON s.coaching_area_id = ca.id
// JOIN
//     users uc ON s.coach_id = uc.id
// JOIN
//     users uco ON s.coachee_id = uco.id
// JOIN
//     coach_v2 cv2 ON uc.id = cv2.user_id
// JOIN
//     coachee_v2 cov2 ON uco.id = cov2.user_id
// WHERE
//     uco.id = $1
// `;

//     if (status) {
//       const statusValues = status.split(",");
//       query += ` AND s.status IN (${statusValues
//         .map((_, index) => `$${index + 4}`)
//         .join(", ")})`;
//       values.push(...statusValues);
//     }

//     if (sort) {
//       switch (sort) {
//         case "created_at_asc":
//           query += " ORDER BY s.created_at ASC";
//           break;
//         case "created_at_desc":
//           query += " ORDER BY s.created_at DESC";
//           break;
//         case "first_name_asc":
//           query += " ORDER BY co.first_name ASC";
//           break;
//         case "first_name_desc":
//           query += " ORDER BY co.first_name DESC";
//           break;
//         default:
//           // Handle invalid sort parameters here
//           break;
//       }
//     }

//     query += " LIMIT $2 OFFSET $3";

//     const session = await getAll(query, values);

//     const countQuery = "SELECT count(*) FROM session WHERE coachee_id = $1";
//     const count = await getAll(countQuery, [coachee_id]);
//     const total = count[0].count;

//     res.status(200).json({
//       success: true,
//       session,
//       total,
//       totalPage: Math.ceil(total / pageSize),
//     });
//   } catch (error) {
//     console.error("Error fetching session:", error.message);
//     res.status(500).json({ success: false, error: "Internal server error" });
//   }
// };

exports.getSessionByStatus = async (req, res) => {};

exports.updateSessionStatus = async (req, res) => {
  const id = req.params.id;
  const coach_id = req.user.userId;
  let updateFields = req.body;

  const { date, section } = updateFields;
  const sessionData = await pool.query(`SELECT * FROM sessions WHERE id = $1`, [
    id,
  ]);
  const coachee_id = sessionData.rows[0].coachee_id;
  const duration = sessionData.rows[0].duration;
  const sectionTime = sessionData.rows[0].section;
  const amount = sessionData.rows[0].amount;
  const dateNow = sessionData.rows[0].date;
  if (updateFields.status === "accepted" && date && section) {
    const checkSession = await pool.query(
      `SELECT * FROM sessions WHERE coach_id = $1 AND date = $2 AND section = $3 AND status = $4`,
      [coach_id, date, section, "accepted"]
    );

    if (checkSession.rowCount > 0) {
      return res.status(401).json({
        success: false,
        message: "You have already accepted a session at this time slot.",
      });
    }
  }

  if (updateFields.status === "accepted") {
    updateFields = {
      ...updateFields,
      accepted_at: new Date(),
    };
    const coachData = await pool.query(
      `SELECT first_name, last_name, email , lat, long FROM users WHERE id = $1`,
      [coach_id]
    );
    const coacheeData = await pool.query(
      `SELECT first_name, last_name, email , lat, long FROM users WHERE id = $1`,
      [coachee_id]
    );

    await pool.query(
      "INSERT INTO notification_requests_accepted (title, type, coach_id) VALUES ($1, $2, $3) RETURNING *",
      ["ACCEPTED", "SESSION", coach_id]
    );

    const coach_name =
      coachData.rows[0].first_name + " " + coachData.rows[0].last_name;
    const coachee_name =
      coacheeData.rows[0].first_name + " " + coacheeData.rows[0].last_name;
    const email = coachData.rows[0].email;
    const coachee_email = coacheeData.rows[0].email;
    const data = {
      coach_name,
      coachee_name,
      coachee_email,
      duration,
      time: sectionTime,
      amount,
      date: dateNow,
      web_link: process.env.FRONTEND_URL,
    };

    const inGermany = isWithinGermany(
      coacheeData.rows[0].lat,
      coacheeData.rows[0].long
    );

    const verificationData = ejsData(data);
    const verificationHtmlContent = await renderEJSTemplate(
      inGermany
        ? sessionAcceptedGermanTemplatePath
        : sessionAcceptedTemplatePath,
      verificationData
    );
    const emailSent = await sendEmail(
      coachee_email,
      inGermany ? "Sitzung angenommen" : "Session Accepted",
      verificationHtmlContent
    );
  }

  try {
    const updatedSession = await session.updateSessionStatus(
      id,
      coach_id,
      updateFields
    );

    if (!updatedSession) {
      res.status(404).json({ success: false, error: "Session not found" });
    } else {
      res.status(200).json({ success: true, updatedSession });
    }
  } catch (error) {
    console.error("Error updating session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.updateSessionRating = async (req, res) => {
  const id = req.params.id;
  const coachee_id = req.user.userId;
  const updateFields = req.body; // Fields to update come from the request body

  try {
    const updatedSession = await session.updateSessionRating(
      id,
      coachee_id,
      updateFields
    );

    if (!updatedSession) {
      res.status(404).json({ success: false, error: "Session not found" });
    } else {
      res.status(200).json({ success: true, updatedSession });
    }
  } catch (error) {
    console.error("Error updating session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.updateSessionPayment = async (req, res) => {
  const id = req.params.id;
  const coachee_id = req.user.userId;
  const updateFields = req.body; // Fields to update come from the request body

  try {
    const updatedSession = await session.updateSessionPayment(
      id,
      coachee_id,
      updateFields
    );

    if (!updatedSession) {
      res.status(404).json({ success: false, error: "Session not found" });
    } else {
      res.status(200).json({ success: true, updatedSession });
    }
  } catch (error) {
    console.error("Error updating session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.addSessionDuration = async (req, res) => {
  const { session_id, amount, duration } = req.body;
  const coachee_id = req.user.userId;

  try {
  } catch (error) {
    console.error("Error updating session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getAcceptedSessions = async (req, res) => {
  const coachId = req.params.coachId;
  try {
    const result = await pool.query(
      `SELECT * FROM sessions WHERE coach_id = $1 AND status = 'accepted'`,
      [coachId]
    );
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        message: "The session is currently available for booking.",
        result: result.rows,
        code: "SESSION_AVAILABLE",
      });
    }
    return res.status(200).json({
      success: true,
      message: "The session has already been accepted or does not exist.",
      result: result.rows,
      code: "SESSION_NOT_AVAILABLE",
    });
  } catch (error) {
    console.error("Error checking session availability:", error.message);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

exports.getCoachSessions = async (req, res) => {
  try {
    const coach_id = req.params.userId;
    const {
      page = 1,
      pageSize = 10,
      status = "",
      searchTerm = "",
      sort = "created_at_desc",
    } = req.query;
    const offset = (page - 1) * pageSize;
    let queryConditions = "WHERE coach.id = $1";
    let queryParams = [coach_id]; // Initial query parameters
    let statusValues = status.split(",");
    // Handling status condition
    if (status && status !== "") {
      if (status.toLowerCase() === "paid") {
        queryConditions += " AND s.status = 'paid'";
      } else {
        queryConditions += ` AND s.status IN (${statusValues
          .map((_, index) => `$${queryParams.length + index + 1}`)
          .join(", ")})`;
        queryParams.push(...statusValues);
      }
    } else {
      // If status is not passed, exclude 'paid' status sessions
      queryConditions += " AND s.status <> 'paid'";
    }

    if (searchTerm) {
      queryParams.push(`%${searchTerm.toLowerCase()}%`);
      queryConditions += ` AND (co.first_name ILIKE $${queryParams.length} OR co.last_name ILIKE $${queryParams.length})`;
    }

    // Sorting logic
    let orderByClause = "ORDER BY s.created_at DESC"; // Default sorting
    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY s.created_at ASC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY coachee.first_name ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY coachee.first_name DESC";
        break;
      // Add more sorting options as needed
    }

    let finalQuery = `
SELECT 
    s.id AS session_id,
    ca.name AS coaching_area_name,
    CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name,
    coach.id AS coach_id,
    CONCAT(coachee.first_name, ' ', coachee.last_name) AS coachee_name,
    coachee.id AS coachee_id,
    co.profile_pic AS coachee_profile_pic,
        json_build_object(
          'session_id', s.id,
            'status', s.status,
            'payment_status', s.payment_status,
            'date', s.date,
            'duration', s.duration,
            'rating', s.rating,
            'amount', s.amount,
            'section', s.section,
            'comment', s.comment,
            'created_at', s.created_at
        ) as details
FROM 
    sessions s 
JOIN 
    coach_area ca ON s.coaching_area_id = ca.id 
JOIN 
    users coach ON s.coach_id = coach.id
JOIN 
    users coachee ON s.coachee_id = coachee.id
JOIN 
    coach_v2 c ON coach.id = c.user_id 
JOIN 
    coachee_v2 co ON coachee.id = co.user_id
${queryConditions} 
${orderByClause} 
LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
`;

    queryParams.push(pageSize, offset); // Add LIMIT and OFFSET parameters at the end

    // Execute the query with all parameters
    const session = await getAll(finalQuery, queryParams);
    // console.log({ session: session });

    // Count total sessions for pagination

    const validStatusValues = statusValues.filter(
      (status) => status.trim() !== ""
    );

    let queryParts = [`SELECT count(*) FROM sessions s WHERE s.coach_id = $1`];
    let myParams = [coach_id];

    if (validStatusValues.length > 0) {
      const statusPlaceholders = validStatusValues
        .map((_, index) => `$${index + 2}`)
        .join(", ");
      queryParts.push(`AND s.status IN (${statusPlaceholders})`);
      myParams = myParams.concat(validStatusValues);
    }

    const countQuery = queryParts.join(" ");
    const countResult = await pool.query(countQuery, myParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // console.log({ status: "COUNT QUERY", countQuery });
    res.status(200).json({
      success: true,
      total,
      totalPage: Math.ceil(total / pageSize),
      result: session,
    });
  } catch (error) {
    console.error("Error fetching session:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
