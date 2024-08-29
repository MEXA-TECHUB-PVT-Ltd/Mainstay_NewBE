const pool = require("../config/db");
const { getAll } = require("../utility/dbHelper");
const { updateRecord, insertRecord } = require("../utility/dbOperations");
const { checkRecord } = require("../utility/dbValidationHelper");
const { isVerifyByAdmin } = require("./utils/auth");
const coachModel = require("../models/coach");
const moment = require("moment");

exports.updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID not found in request." });
    }

    const { role } = req.body;
    if (!role || (role !== "coach" && role !== "coachee")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing role." });
    }

    const typeTable = role === "coach" ? "coach_v2" : "coachee_v2";
    const updateFields = { ...req.body };
    const file = req.file;

    if (updateFields.date_of_birth) {
      const age = moment().diff(
        moment(updateFields.date_of_birth, "YYYY-MM-DD"),
        "years"
      );
      if (age < 18) {
        return res.status(400).json({
          success: false,
          message: "You must be at least 18 years old",
        });
      }
    }

    let updatesMade = false;
    const userUpdateFields = {};
    if (updateFields.first_name)
      userUpdateFields.first_name = updateFields.first_name;
    if (updateFields.last_name)
      userUpdateFields.last_name = updateFields.last_name;

    if (Object.keys(userUpdateFields).length > 0) {
      await updateRecord("users", userUpdateFields, [
        { field: "id", operator: "=", value: req.user.userId },
      ]);
      updatesMade = true;
    }

    delete updateFields.role; // Role is not updated
    delete updateFields.first_name;
    delete updateFields.last_name;
    if (file) {
      updateFields.profile_pic = file.path; // Update profile_pic if a file is uploaded
    }

    if (updateFields.is_completed) {
      updateFields.is_completed = updateFields.is_completed; // Update profile_pic if a file is uploaded
    }

    let record;

    console.log("😀😀😀😀😀😁😁😂😂😂", updateFields);
    if (Object.keys(updateFields).length > 0) {
      record = await updateRecord(typeTable, updateFields, [
        { field: "user_id", operator: "=", value: req.user.userId },
      ]);
      updatesMade = true;
    }
    console.log(record);

    if (!updatesMade) {
      return res
        .status(400)
        .json({ success: false, message: "No fields provided for update." });
    }

    // Fetch the updated data
    const selectQuery = `
      SELECT u.*, c.* FROM users u
      LEFT JOIN ${typeTable} c ON u.id = c.user_id
      WHERE u.id = $1;
    `;

    const updatedData = await pool.query(selectQuery, [req.user.userId]); // Assuming `query` is your method to execute SQL queries
    if (!updatedData || updatedData.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No updated data found." });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedData.rows[0],
    });
  } catch (err) {
    console.error(err);
    if (err.code === "DUPLICATE" || err.name === "ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: err.message });
    } else if (err.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: err.message });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "Server error: " + err.message });
    }
  }
};

exports.getAllByRole = async (req, res) => {
  try {
    const {
      role,
      page = 1,
      pageSize = 10,
      searchTerm = "",
      sort = "created_at_desc",
    } = req.query;

    if (!role || (role !== "coach" && role !== "coachee")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing role." });
    }

    const typeTable = role === "coach" ? "coach_v2" : "coachee_v2";
    const userJoinCondition =
      role === "coach"
        ? "JOIN users u ON c.user_id = u.id"
        : "JOIN users u ON co.user_id = u.id LEFT JOIN well_coins wl ON u.id = wl.user_id LEFT JOIN coachee_badges cb ON u.id = cb.user_id";

    let orderByClause = "";
    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY u.created_at ASC";
        break;
      case "created_at_desc":
        orderByClause = "ORDER BY u.created_at DESC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY u.first_name ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY u.first_name DESC";
        break;
      default:
        orderByClause = "ORDER BY u.created_at DESC"; // Default sorting
    }

const query = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.block, u.is_block, u.deleted, u.deleted_at, u.created_at, u.updated_at, 
  ${
    typeTable === "coach_v2"
      ? `
      c.about, 
      ARRAY(SELECT DISTINCT name FROM languages WHERE id = ANY(c.language_ids)) AS languages, 
      (
        SELECT JSON_AGG(ROW_TO_JSON(t)) 
        FROM (
          SELECT name, german_name 
          FROM coach_area 
          WHERE id = ANY(c.coaching_area_ids)
        ) t
      ) AS coaching_areas,
      c.is_completed, c.profile_pic, c.admin_verified
      `
      : `
        co.date_of_birth, co.phone, co.gender, co.profile_pic, co.customer_id, ARRAY(SELECT DISTINCT name || ',' || german_name FROM coach_area WHERE id = ANY(co.interests)) AS coachee_interests, co.language, co.country_id, SUM(wl.coins) AS total_coins, cb.name 
      `
  }
      FROM ${typeTable} ${typeTable === "coach_v2" ? "c" : "co"}
      ${userJoinCondition}
      WHERE LOWER(u.email) LIKE $1
      GROUP BY u.id ${typeTable === "coach_v2" ? ", c.id" : ", co.id, cb.name"}
      ${orderByClause}
      LIMIT $2 OFFSET $3;
    `;

    const countQuery = `SELECT count(*) FROM ${typeTable} ${
      typeTable === "coach_v2" ? "c" : "co"
    } ${userJoinCondition} WHERE LOWER(u.email) LIKE $1`;
    const values = [
      `%${searchTerm.toLowerCase()}%`,
      pageSize,
      (page - 1) * pageSize,
    ];

    const coach = await getAll(query, values);
    const countResult = await getAll(countQuery, [
      `%${searchTerm.toLowerCase()}%`,
    ]);
    const total = parseInt(countResult[0].count, 10);

    return res.status(200).json({
      success: true,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
      result: coach,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


exports.getByCoachArea = async (req, res) => {
  try {
    const {
      role,
      page = 1,
      pageSize = 10,
      coachingAreaId,
      sort = "created_at_desc",
    } = req.query;

    let orderByClause = "ORDER BY u.created_at DESC"; // Default sorting
    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY u.created_at ASC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY TRIM(u.first_name) ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY TRIM(u.first_name) DESC";
        break;
      case "rating":
        orderByClause = `ORDER BY avg_rating DESC, u.created_at DESC`;
        break;
      default:
        orderByClause = "ORDER BY u.created_at DESC";
        break;
    }
    // Validate mandatory parameters
    if (!role || (role !== "coach" && role !== "coachee")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing parameters." });
    }

    const typeTable = role === "coach" ? "coach_v2" : "coachee_v2";
    const offset = (page - 1) * pageSize;

    let queryParameters = [];
    let parameterCounter = 1;

    let whereClause =
      "WHERE c.is_completed = true AND c.is_stripe_completed = true AND u.deleted = false";
    if (coachingAreaId && coachingAreaId !== "all") {
      whereClause = `WHERE $${parameterCounter} = ANY(c.coaching_area_ids) AND c.is_completed = true AND c.is_stripe_completed = true AND u.deleted = false`;
      queryParameters.push(coachingAreaId);
      parameterCounter++;
    }

    const limitOffsetClause = `LIMIT $${parameterCounter} OFFSET $${
      parameterCounter + 1
    }`;
    queryParameters.push(pageSize, offset);

    const query = `
SELECT  
    u.id AS user_id, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.role, 
    u.status AS user_status, 
    u.created_at AS user_created_at, 
    u.updated_at AS user_updated_at,
    c.id AS role_id, 
    c.about, 
    cob.name AS badge_name,
    ARRAY(
      SELECT DISTINCT name 
        FROM languages 
        WHERE id = ANY(c.language_ids)
    ) AS languages, 
      (
        SELECT JSON_AGG(ROW_TO_JSON(t)) 
        FROM (
          SELECT name, german_name 
          FROM coach_area 
          WHERE id = ANY(c.coaching_area_ids)
        ) t
      ) AS coaching_areas,
    c.is_completed, 
    c.profile_pic, 
    c.created_at,
    (SELECT COALESCE(AVG(r.rating), 0) 
     FROM rating r 
     WHERE r.coach_id = c.user_id) AS avg_rating -- Calculating average rating
FROM 
coach_v2 c
JOIN 
users u ON c.user_id = u.id
LEFT JOIN 
    sessions s ON u.id = s.coach_id
LEFT JOIN
    badges cob ON u.id = cob.coach_id
${whereClause}
GROUP BY 
    u.id, c.id, cob.name
    ${orderByClause}
${limitOffsetClause}
`;

    // Assuming a function similar to pool.query is available to run your query
    const coachData = await pool.query(query, queryParameters);

    // console.log("whereClause: ", query);
    // Count query preparation
    let countQueryParameters = [];
    let countParameterCounter = 1;

    let countWhereClause = "";
    if (coachingAreaId && coachingAreaId !== "all") {
      countWhereClause = `WHERE $${countParameterCounter} = ANY(c.coaching_area_ids) AND c.is_completed = true AND c.is_stripe_completed = true AND u.deleted = false`;
      countQueryParameters.push(coachingAreaId);
      // countParameterCounter++; // This line is not needed here since we're only using one parameter for the count query, but it's useful if you add more parameters later.
    }

    if (coachingAreaId && coachingAreaId === "all") {
      countWhereClause =
        "WHERE c.is_completed = true AND c.is_stripe_completed = true AND u.deleted = false";
    }

    const countQuery = `
    SELECT COUNT(*) AS total
    FROM ${typeTable} c
    LEFT JOIN users u ON c.user_id = u.id
    ${countWhereClause};
`;

    // Execute the count query with dynamic parameters
    const { rows: countResult } = await pool.query(
      countQuery,
      countQueryParameters
    );

    const total = parseInt(countResult[0].total, 10);

    return res.status(200).json({
      success: true,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
      data: coachData.rows,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getOneByRole = async (req, res) => {
  try {
    const userId = req.params.user_id; // Assuming the user's ID is provided as a URL parameter
    const { role } = req.query;
    if (!role || (role !== "coach" && role !== "coachee")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing role." });
    }

    // Main query to fetch user details along with role-specific details
    const query = `
SELECT 
    u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.is_block, u.created_at, u.updated_at,
    ${
      role === "coach"
        ? `
            c.about,
            ARRAY(SELECT name FROM languages WHERE id = ANY(c.language_ids)) AS languages,
      (
        SELECT JSON_AGG(ROW_TO_JSON(t)) 
        FROM (
          SELECT name, german_name 
          FROM coach_area 
          WHERE id = ANY(c.coaching_area_ids)
        ) t
      ) AS coaching_areas,
            c.is_completed,
            c.profile_pic,
            c.admin_verified,
            (SELECT row_to_json(b)
             FROM (SELECT id, name, created_at 
                   FROM badges 
                   WHERE coach_id = u.id 
                  ) b) AS badges,
                            COALESCE((SELECT AVG(r.rating) FROM rating r WHERE r.coach_id = u.id), 0) AS avg_rating
        `
        : `
            co.date_of_birth, co.phone, co.gender, co.profile_pic, co.customer_id, co.language, 
            co.country_id, ARRAY(SELECT name FROM coach_area WHERE id = ANY(co.interests)) AS interests,
            (SELECT name FROM country WHERE id = co.country_id) AS country_name, SUM(wl.coins) AS total_coins, cb.name
        `
    }
FROM 
    users u
    ${
      role === "coach"
        ? "LEFT JOIN coach_v2 c ON u.id = c.user_id LEFT JOIN rating r ON u.id = r.coach_id"
        : "LEFT JOIN coachee_v2 co ON u.id = co.user_id LEFT JOIN well_coins wl ON u.id = wl.user_id LEFT JOIN coachee_badges cb ON u.id = cb.user_id"
    }
WHERE 
    u.id = $1
    ${
      role === "coachee"
        ? "GROUP BY u.id, co.id, cb.name"
        : "GROUP BY u.id, c.id, r.id"
    }
    `;

    // console.log("SQL query", query);

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User with the specified role not found.",
      });
    }

    // Format the data into a JSON object
    const user = result.rows[0];
    const formattedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
      details:
        role === "coach"
          ? {
              badges: {
                id: user.id,
                name: user.name,
              },
              about: user.about,
              languages: user.languages,
              coaching_areas: user.coaching_areas,
              is_completed: user.is_completed,
              profile_pic: user.profile_pic,
              admin_verified: user.admin_verified,
              avg_rating: user.avg_rating,
            }
          : {
              date_of_birth: user.date_of_birth,
              phone: user.phone,
              gender: user.gender,
              profile_pic: user.profile_pic,
              customer_id: user.customer_id,
              interests: user.interests,
              language: user.language,
              country_id: user.country_id,
              country_name: user.country_name,
              badges: {
                id: user.id,
                name: user.name,
              },
            },
    };

    return res.status(200).json({ success: true, user: user });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.user_id;

    const deletedUser = await pool.query("DELETE FROM users WHERE id = $1", [
      userId,
    ]);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "Coach not found." });
    }

    res.status(200).json({ success: true, deletedUser: deletedUser.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.verifyCoach = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = { admin_verified: true };

    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields provided for update." });
    }

    const updatedCoach = await coachModel.updateCoach(id, updateFields);

    if (!updatedCoach) {
      return res
        .status(404)
        .json({ success: false, message: "Coach not found." });
    }

    res.status(200).json({ success: true, updatedCoach });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getAllCoachAreaQuery = `
WITH rated_coaches AS (
    SELECT
        coach_id,
        AVG(rating) AS avg_rating
    FROM rating
    GROUP BY coach_id
), paginated_areas AS (
    SELECT 
        id, 
        name AS text, 
        german_name AS german_name, 
        icon
    FROM coach_area
    ORDER BY id
    LIMIT $1 OFFSET $2 -- Pagination parameters for coach areas
), coaching_areas_names AS (
    SELECT
        cv2.id AS coach_id,
        (
          SELECT JSON_AGG(ROW_TO_JSON(t))
          FROM (
            SELECT name, german_name
            FROM coach_area ca
            WHERE ca.id = ANY(cv2.coaching_area_ids)
          ) t
        ) AS coaching_areas
    FROM coach_v2 cv2
    GROUP BY cv2.id
), coaches AS (
    SELECT
        cv2.id,
        cv2.about,
        cv2.profile_pic,
        cv2.user_id,
        u.first_name,
        u.last_name,
        cv2.created_at,
        cv2.updated_at,
        unnest(cv2.coaching_area_ids) AS coach_area_id,
        COALESCE(rc.avg_rating, 0) AS avg_rating,
        can.coaching_areas AS coaching_area_names, -- Corrected alias here
        ROW_NUMBER() OVER(PARTITION BY unnest(cv2.coaching_area_ids) ORDER BY COALESCE(rc.avg_rating, 0) DESC, cv2.created_at DESC) AS rn
    FROM coach_v2 cv2
    LEFT JOIN rated_coaches rc ON cv2.user_id = rc.coach_id
    JOIN users u ON cv2.user_id = u.id
    LEFT JOIN coaching_areas_names can ON cv2.id = can.coach_id
    WHERE cv2.is_completed = true
      AND cv2.is_stripe_completed = true
      AND u.deleted = false 
      AND EXISTS (
        SELECT 1 FROM paginated_areas pa WHERE pa.id = ANY(cv2.coaching_area_ids)
      )
)
SELECT
    pa.id AS area_id,
    pa.text AS area_name,
    pa.german_name,
    pa.icon AS area_icon,
    json_agg(
        json_build_object(
            'id', c.id,
            'about', c.about,
            'coaching_area_names', c.coaching_area_names, -- Corrected reference here
            'profile_pic', c.profile_pic,
            'user_id', c.user_id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'avg_rating', c.avg_rating,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        ) ORDER BY c.avg_rating DESC, c.created_at DESC
    ) FILTER (WHERE c.rn <= 5) AS coaches
FROM paginated_areas pa
LEFT JOIN coaches c ON pa.id = c.coach_area_id
WHERE c.rn IS NULL OR c.rn <= 5
GROUP BY pa.id, pa.text, pa.icon, pa.german_name
ORDER BY pa.id;
`;

exports.getAllByCoachArea = async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize, 10) || 3; // Default page size
    const page = parseInt(req.query.page, 10) || 1; // Default page number
    const offset = (page - 1) * pageSize;

    const result = await pool.query(getAllCoachAreaQuery, [pageSize, offset]);
    if (result.rowCount === 0) {
      return res.status(200).json({
        success: false,
        message: "No results data available",
        result: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: "Found all the results",
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getUserInterest = async (req, res) => {
  try {
    const userId = req.params.userId;

    // First, determine the role of the user
    const roleCheckQuery = `SELECT role FROM users WHERE id = $1;`;
    const roleCheckResult = await pool.query(roleCheckQuery, [userId]);
    if (roleCheckResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userRole = roleCheckResult.rows[0].role;
    let query;
    if (userRole === "coach") {
      // Query to fetch the interests for a coach
      query = `
        SELECT ca.name AS interest_name
        FROM coach_v2 cv
        JOIN coach_area ca ON cv.coaching_area_ids && ARRAY[ca.id]
        JOIN users u ON cv.user_id = u.id
        WHERE u.id = $1;
      `;
    } else if (userRole === "coachee") {
      // Query to fetch the interests for a coachee
      query = `
        SELECT ci.name AS interest_name
        FROM coachee_v2 c
        JOIN coach_area ci ON c.interests && ARRAY[ci.id]
        JOIN users u ON c.user_id = u.id
        WHERE u.id = $1;
      `;
      // Note: This assumes there is a 'coachee_interest' table similar to 'coach_area',
      // where 'ci.id' corresponds to the interests' IDs.
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user role" });
    }

    // Execute the appropriate query based on the user's role
    const result = await pool.query(query, [userId]);

    // Extract the interest names from the result
    const interests = result.rows.map((row) => row.interest_name);

    return res.status(200).json({
      success: true,
      message: "Interests retrieved successfully",
      interests: interests,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getTotalCounts = async (req, res) => {
  try {
    // Query counts for each role and admin wallets
    const coachResult = await pool.query(
      "SELECT COUNT(c.*) as count FROM coach_v2 c LEFT JOIN users u ON c.user_id =  u.id WHERE u.role = 'coach' AND  c.admin_verified = TRUE AND c.is_completed = TRUE AND c.is_stripe_completed = TRUE"
    );
    const coacheeResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'coachee'"
    );
    const walletResult = await pool.query(
      "SELECT *  FROM wallets WHERE is_admin = TRUE"
    );

    // Extract counts from query results
    const coachCount = parseInt(coachResult.rows[0].count, 10);
    const coacheeCount = parseInt(coacheeResult.rows[0].count, 10);
    const adminWalletCount = parseInt(walletResult.rows[0].balance, 10);

    // Return all counts in one response
    return res.status(200).json({
      success: true,
      message: "Counts retrieved successfully",
      result: {
        coachCount: coachCount || 0, // Ensures 0 is returned if no coaches
        coacheeCount: coacheeCount || 0, // Ensures 0 is returned if no coachees
        adminWalletCount: adminWalletCount || 0, // Ensures 0 is returned if no admin wallets
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getCoachRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT u.*, c.* FROM coach_v2 c JOIN users u ON c.user_id = u.id WHERE  (c.is_completed = FALSE OR c.is_stripe_completed = FALSE) ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalCountQuery = await pool.query(
      `SELECT COUNT(*) FROM coach_v2 WHERE is_completed = FALSE AND is_stripe_completed = FALSE`
    );
    const totalCount = parseInt(totalCountQuery.rows[0].count);

    if (result.rowCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No records found",
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / limit),
          totalCount: totalCount,
        },
        result: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: "Coach requests fetched successfully",
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
      },
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// get all verified coach's

exports.getVerifiedCoach = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const query = `SELECT u.*, c.*, b.*, AVG(r.rating) AS average_rating
FROM coach_v2 c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN badges b ON u.id = b.coach_id
LEFT JOIN rating r ON u.id = r.coach_id
WHERE c.admin_verified = TRUE AND c.is_completed = TRUE AND c.is_stripe_completed = TRUE GROUP BY u.id, c.id, b.id ORDER BY u.id DESC LIMIT $1 OFFSET $2 ;
`;
    const result = await pool.query(query, [limit, offset]);
    if (result.rowCount === 0) {
      return res.status(200).json({
        status: true,
        message: "There no data to display",
        result: [],
      });
    }
    return res.status(200).json({
      success: true,
      totalCount: result.rowCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.rowCount / limit),
        totalCount: result.rowCount,
      },
      result: result.rows,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.blockUser = async (req, res) => {
  const { id, is_block } = req.body;
  console.log(req.body);
  try {
    const result = await pool.query(
      `UPDATE users SET is_block = $1 WHERE id = $2`,
      [is_block, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User block status updated successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.tempDelete = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      `UPDATE users SET deleted = TRUE, deleted_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};
exports.permDelete = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
      result: result.rows[0],
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//           c.about,
//           ARRAY(SELECT name FROM languages WHERE id = ANY(c.language_ids)) AS languages,
//           ARRAY(SELECT name FROM coach_area WHERE id = ANY(c.coaching_area_ids)) AS coaching_areas,
//           c.is_completed,
//           c.profile_pic,
//           c.admin_verified,
//           (SELECT row_to_json(b)
//            FROM (SELECT id, name, created_at
//                  FROM badges
//                  WHERE coach_id = u.id
//                 ) b) AS badges

//                             co.date_of_birth, co.phone, co.gender, co.profile_pic, co.customer_id, co.language,
//           co.country_id, ARRAY(SELECT name FROM coach_area WHERE id = ANY(co.interests)) AS interests,
// (SELECT name FROM country WHERE id = co.country_id) AS country_name, SUM(wl.coins) AS total_coins, cb.name

//         ? "LEFT JOIN coach_v2 c ON u.id = c.user_id"
//       : "LEFT JOIN coachee_v2 co ON u.id = co.user_id LEFT JOIN well_coins wl ON u.id = wl.user_id LEFT JOIN coachee_badges cb ON u.id = cb.user_id"

exports.getDeletedUsers = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  try {
    // Fetch users and determine their roles
    const usersQuery = `
      SELECT id, role FROM users WHERE deleted = TRUE ORDER BY created_at DESC LIMIT $1 OFFSET $2;
    `;
    const users = await pool.query(usersQuery, [pageSize, offset]);

    // Check if we found users
    if (users.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No users found.",
      });
    }

    // Prepare arrays for coaches and coachees
    let coaches = [];
    let coachees = [];

    // Fetch additional data based on user roles
    for (const user of users.rows) {
      let additionalDataQuery;
      if (user.role === "coach") {
        additionalDataQuery = pool.query(
          `
          SELECT 
              u.id, 
              u.email, 
              u.deleted_at,
              90 - EXTRACT(DAY FROM NOW() - u.deleted_at) AS remaining_days,
              '90' as total_days,
              c.about, 
              ARRAY(SELECT name FROM languages WHERE id = ANY(c.language_ids)) AS languages, 
              ARRAY(SELECT name FROM coach_area WHERE id = ANY(c.coaching_area_ids)) AS coaching_areas, 
              AVG(r.rating) AS average_rating, 
              cb.name AS badge_name, 
              COUNT(s.id) OVER (PARTITION BY s.coachee_id) AS total_sessions, 
              w.balance AS wallet_balance
          FROM 
              users u
              LEFT JOIN coach_v2 c ON u.id = c.user_id
              LEFT JOIN badges cb ON u.id = cb.coach_id
              LEFT JOIN rating r ON u.id = r.coach_id
              LEFT JOIN wallets w ON u.id = w.coach_id
              LEFT JOIN sessions s ON u.id = s.coach_id
          WHERE 
              u.id = $1 AND u.deleted = TRUE GROUP BY u.id, c.id, cb.name, s.id, w.id, r.id;
        `,
          [user.id]
        );
      } else {
        additionalDataQuery = pool.query(
          `
          SELECT u.id, u.first_name, u.last_name, u.email, u.deleted_at,
                        90 - EXTRACT(DAY FROM NOW() - u.deleted_at) AS remaining_days,
              '90' as total_days, co.phone, co.profile_pic,co.language, (SELECT name FROM country WHERE id = co.country_id) AS country_name, ARRAY(SELECT name FROM coach_area WHERE id = ANY(co.interests)) AS coaching_areas, SUM(wl.coins) AS total_coins, cb.name AS badge_name, COUNT(s.id) OVER (PARTITION BY s.coachee_id) AS total_sessions
          FROM users u
          LEFT JOIN coachee_v2 co ON u.id = co.user_id
          LEFT JOIN well_coins wl ON u.id = wl.user_id
          LEFT JOIN coachee_badges cb ON u.id = cb.user_id
          LEFT JOIN sessions s ON u.id = s.coachee_id
          WHERE u.id = $1 AND u.deleted = TRUE GROUP BY u.id, co.id, cb.name, s.id;
        `,
          [user.id]
        );
      }

      const additionalDataResult = await additionalDataQuery;
      const userData = { ...user, ...additionalDataResult.rows[0] };

      // Add user data to appropriate array based on role
      if (user.role === "coach") {
        coaches.push(userData);
      } else {
        coachees.push(userData);
      }
    }

    return res.status(200).json({
      status: true,
      message: "Users retrieved successfully",
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageSize),
        totalPages: Math.ceil(users.rowCount / pageSize),
        totalCount: users.rowCount,
      },
      result: {
        coaches,
        coachees,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.reportedUser = async (req, res) => {
  const { reported, reported_by, reason } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reported_users (reported, reported_by, reason) VALUES ($1, $2, $3) RETURNING *`,
      [reported, reported_by, reason]
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "reported user not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Your reported is sent to admin successfully!",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.getReports = async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  try {
    const query = `SELECT
    ru.id AS report_id,
    ru.reason AS report_reason,
    reported.id AS reported_user_id,
    reported.first_name AS reported_first_name,
    reported.last_name AS reported_last_name,
    reporter.id AS reporter_user_id,
    reporter.first_name AS reporter_first_name,
    reporter.last_name AS reporter_last_name,
    reported.is_block AS is_block
FROM
    reported_users ru
INNER JOIN users reported ON ru.reported = reported.id
INNER JOIN users reporter ON ru.reported_by = reporter.id
ORDER BY ru.id DESC
LIMIT $1 OFFSET $2



`;
    const result = await pool.query(query, [pageSize, offset]);
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: false,
        message: "Reports not found",
        result: [],
      });
    }

    const totalCount = await pool.query(
      `SELECT COUNT(*) AS total_reports FROM reported_users;`
    );

    const counts = totalCount.rows[0].total_reports;
    return res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageSize),
        totalPages: Math.ceil(counts / pageSize),
        totalCount: counts,
      },
      result: result.rows,
    });
  } catch (error) {
    console.error("Error retrieving policy:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
