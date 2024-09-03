const {
  generatePassword,
  generateCode,
  generateExpirationTime,
} = require("../utility/code");
const coachModel = require("../models/coach");

const coacheeModel = require("../models/coachee");

const { hashPassword, comparePassword } = require("../utility/password");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utility/email");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utility/token");
const { getAll } = require("../utility/dbHelper");
const {
  renderEJSTemplate,
  ejsData,
  coachVerifiedTemplatePath,
  coachVerifiedGermanTemplatePath,
} = require("../utility/renderEmail");
const sendEmail = require("../utility/sendMail");
const pool = require("../config/db");
const { isWithinGermany } = require("../utility/isWithinGermany");
exports.register = async (req, res) => {
  try {
    const { email, password, user_type } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is require" });
    }

    const coach = coachModel.checkEmail(email);
    const coachee = coacheeModel.checkEmail(email);

    const promises = [coach, coachee];
    Promise.all(promises)
      .then(async (value) => {
        if (value[0].rowCount === 0 && value[1].rowCount === 0) {
          const hPassword = await hashPassword(password);
          const data = await coachModel.register(email, hPassword, user_type);

          if (data) {
            return res.status(200).json({
              success: true,
              message: "Password code send to email",
              coach: data.rows[0],
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Email already exist",
          });
        }
      })
      .catch((e) => {
        return res.status(500).json({ success: false, message: e });
      });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.coachLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password  required" });
    }
    const coach = await coachModel.getCoachByEmail(email);

    if (!coach) {
      return res
        .status(400)
        .json({ success: false, message: "email not exist" });
    }
    if (!coach.status) {
      return res.status(400).json({
        success: false,
        message: "you are not verified so you cant login ",
      });
    }
    const passwordMatch = await comparePassword(password, coach.password);

    if (!passwordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "invalid password" });
    }

    const accessToken = generateAccessToken(coach.id);
    const refreshToken = generateRefreshToken(coach.id);

    return res.status(200).json({
      success: true,
      data: { coach, accessToken, refreshToken },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.updateCoach = async (req, res) => {
  try {
    const id = req.user.userId;
    const updateFields = req.body;

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

    return res.status(200).json({ success: true, updatedCoach });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const id = req.user.userId;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "file required" });
    }

    const uploadProfile = await coachModel.updateProfile(file.path, id);
    if (uploadProfile) {
      return res.status(200).json({ success: true, uploadProfile });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCoach = async (req, res) => {
  try {
    const id = req.user.userId;
    const updateFields = req.body;

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
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllCoach = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      searchTerm = "",
      sort = "created_at_desc",
    } = req.query;

    let orderByClause = "";

    switch (sort) {
      case "created_at_asc":
        orderByClause = "ORDER BY created_at ASC";
        break;
      case "created_at_desc":
        orderByClause = "ORDER BY created_at DESC";
        break;
      case "first_name_asc":
        orderByClause = "ORDER BY first_name ASC";
        break;
      case "first_name_desc":
        orderByClause = "ORDER BY first_name DESC";
        break;
      default:
        orderByClause = "ORDER BY created_at DESC"; // Default sorting
        break;
    }

    const query = `
      SELECT c.id, c.first_name, c.last_name, c.email, c.about, 
      ARRAY(SELECT DISTINCT name FROM languages WHERE id = ANY(c.language_ids)) AS languages, 
      ARRAY(SELECT DISTINCT name FROM coach_area WHERE id = ANY(c.coaching_area_ids)) AS coaching_areas, 
      c.password, c.status, c.is_completed, c.profile_pic, c.created_at, c.code, c.exp_code, c.user_type, 
      jsonb_build_object('average_rating', AVG(s.rating), 
      'reviews', jsonb_agg(jsonb_build_object('rating', s.rating, 'comment', s.comment))) AS rating_comments_object 
      FROM coach c 
      LEFT JOIN session s ON c.id = s.coach_id 
      WHERE LOWER(email) LIKE $1
      GROUP BY c.id
      ${orderByClause} 
      LIMIT $2 OFFSET $3;
    `;

    const countQuery = "SELECT count(*) FROM coach WHERE LOWER(email) LIKE $1";
    const values = [
      `%${searchTerm.toLowerCase()}%`,
      pageSize,
      (page - 1) * pageSize,
    ];

    const coach = await getAll(query, values);
    const count = await getAll(countQuery, [`%${searchTerm.toLowerCase()}%`]);
    const total = count[0].count;

    return res.status(200).json({
      success: true,
      coach,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const { role, page = 1, pageSize = 10, searchTerm = "" } = req.query;
    const { id } = req.params;
    const query = `SELECT     c.id,     c.first_name,     c.last_name,     c.email,     c.about,     ARRAY(SELECT DISTINCT name FROM languages WHERE id = ANY(c.language_ids)) AS languages,    ARRAY(SELECT DISTINCT name FROM coach_area WHERE id = ANY(c.coaching_area_ids)) AS coaching_areas,     c.password,   c.status,     c.is_completed,     c.profile_pic,     c.created_at,     c.code, c.exp_code,     c.user_type,      jsonb_build_object(        'average_rating', AVG(s.rating),        'reviews', jsonb_agg(jsonb_build_object(            'rating', s.rating,            'comment', s.comment        ))    ) AS rating_comments_object FROM     coach c LEFT JOIN     session s ON c.id = s.coach_id WHERE     $1 = ANY(c.coaching_area_ids) GROUP BY     c.id ORDER BY     created_at DESC LIMIT     $2 OFFSET $3;`;
    const countQuery =
      "SELECT count(*) FROM coach  WHERE $1 = ANY(coaching_area_ids)";
    const values = [id, pageSize, (page - 1) * pageSize];

    const coach = await getAll(query, values);
    const count = await getAll(countQuery, [id]);
    const total = count[0].count;
    return res.status(200).json({
      success: true,
      coach,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getCoach = async (req, res) => {
  try {
    const { id } = req.params;

    const coach = await coachModel.getCoach(id);

    if (coach) {
      return res.status(200).json({ success: true, coach });
    }
    return res
      .status(404)
      .json({ success: true, coach, message: "coach found" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.permanentDeleteCoach = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCoach = await coachModel.permanentDeleteCoach(id);

    if (!deletedCoach) {
      return res
        .status(404)
        .json({ success: false, message: "Coach not found." });
    }

    res.status(200).json({ success: true, deletedCoach });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "please enter your email" });
    }
    const coach = await coachModel.getCoachByEmail(email);
    if (!coach) {
      return res
        .status(400)
        .json({ success: false, message: "email not exist" });
    }

    const code = generateCode();
    const codeExp = generateExpirationTime();
    const data = await coachModel.forgetPassword(coach.id, code, codeExp);
    if (data) {
      sendPasswordResetEmail(email, code);
      return res.status(200).json({
        success: true,
        message: "password reset code send to your email",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: err });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { code, password } = req.body;

    if (!code || !password) {
      return res
        .status(400)
        .json({ success: false, message: "code and password required" });
    }

    const coach = await coachModel.getCoachByCode(code);

    if (!coach) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expire code" });
    }

    const hPassword = await hashPassword(password);

    const data = coachModel.updatePassword(coach.id, hPassword);

    if (data) {
      return res
        .status(200)
        .json({ success: true, message: "password reset successfully" });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.codeVerification = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "code required" });
    }

    const coach = await coachModel.getCoachByCode(code);

    if (!coach) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expire code" });
    }

    return res.status(200).json({ success: true, message: "code Match" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const id = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "id required" });
    }
    const coach = await coachModel.getCoach(id);

    if (!coach) {
      return res
        .status(400)
        .json({ success: true, message: "coach not found" });
    }
    const passwordMatch = await comparePassword(oldPassword, coach.password);

    if (!passwordMatch) {
      return res
        .status(200)
        .json({ success: true, message: "invalid current password" });
    }

    const hPassword = await hashPassword(newPassword);

    const data = await coachModel.updatePassword(coach.id, hPassword);
    if (data) {
      return res
        .status(200)
        .json({ success: true, message: "password update successfully" });
    }

    return res
      .status(400)
      .json({ success: false, message: "some thing went wrong" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
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

    const coachData = await pool.query(
      `SELECT first_name, last_name, email , lat, long FROM users WHERE id = $1`,
      [id]
    );

    const coach_name =
      coachData.rows[0].first_name + " " + coachData.rows[0].last_name;
    const email = coachData.rows[0].email;
    const data = {
      coach_name,
      web_link: process.env.FRONTEND_URL,
    };

    console.log(coachData.rows[0]);

    const inGermany = isWithinGermany(
      coachData?.rows[0]?.lat,
      coachData?.rows[0]?.long
    );

    const templatePath = inGermany
      ? coachVerifiedGermanTemplatePath
      : coachVerifiedTemplatePath;

    const verificationData = ejsData(data);
    const verificationHtmlContent = await renderEJSTemplate(
      templatePath,
      verificationData
    );
    await sendEmail(
      email,
      inGermany ? "Konto bestätigt" : "Account Verified",
      verificationHtmlContent
    );

    res.status(200).json({ success: true, updatedCoach });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
