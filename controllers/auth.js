const coacheeModel = require("../models/coachee");
const coachModel = require("../models/coach");
const bcrypt = require("bcrypt");

const { generateCode, generateExpirationTime } = require("../utility/code");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utility/email");

const { hashPassword, comparePassword } = require("../utility/password");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utility/token");
const { insertRecord, updateRecord } = require("../utility/dbOperations");
const { recordExists, checkRecord } = require("../utility/dbValidationHelper");
const pool = require("../config/db");
const { typeJoinQuery, isVerifyByAdmin } = require("./utils/auth");
const sendEmail = require("../utility/sendMail");
const {
  renderEJSTemplate,
  verificationEmailTemplatePath,
  ejsData,
  forgetPasswordTemplatePath,
} = require("../utility/renderEmail");

exports.register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, device_id } = req.body;

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, device_id and role are required!",
      });
    }

    // Check if user already registered
    const userExists = await recordExists("users", [
      { field: "email", operator: "=", value: email },
    ]);

    const hashedPassword = await hashPassword(password);
    const verificationCode = generateCode();
    const codeExp = generateExpirationTime();

    const userData = {
      email: email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      code: verificationCode,
      exp_code: codeExp,
      role: role,
      device_id: device_id,
    };

    const user = await insertRecord("users", userData);
    const userId = user.id;

    let typeTable =
      role === "coach" ? "coach_v2" : role === "admin" ? "admin" : "coachee_v2";

    await insertRecord(typeTable, {
      user_id: userId,
    });

    const joinQuery = typeJoinQuery(role);

    const { rows } = await pool.query(joinQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User registered.",
      });
    }

    if (role === "coachee") {
      // sendVerificationEmail(email, verificationCode);
      const currentYear = new Date().getFullYear();
      const date = new Date().toLocaleDateString();
      // Use the rendered HTML content for the email
      const data = {
        email,
        otp: verificationCode,
        currentYear,
        web_link: process.env.FRONTEND_URL,
      };
      const verificationData = ejsData(data);
      const verificationHtmlContent = await renderEJSTemplate(
        verificationEmailTemplatePath,
        verificationData
      );
      const emailSent = await sendEmail(
        email,
        "Registration Verification",
        verificationHtmlContent
      );
    }

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    rows[0].accessToken = accessToken;
    rows[0].refreshToken = refreshToken;

    return res.status(201).json({
      success: true,
      message:
        role === "coach"
          ? "User registered successfully."
          : "verification code send to your email",
      result: rows[0],
    });
  } catch (err) {
    if (err.name === "ALREADY_EXISTS" || err.name === "ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password  required" });
    }
    const filter = [{ field: "email", operator: "=", value: email }];
    if (role) {
      filter.push({ field: "role", operator: "=", value: role });
    }
    const user = await checkRecord("users", filter);

    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (user.is_block) {
      return res.status(400).json({
        success: false,
        message: "Your account has been blocked by admin",
      });
    }
    if (user.deleted) {
      return res.status(400).json({
        success: false,
        message: "You've deleted this account",
      });
    }
    if (user.role === "coach") {
      const coach = await isVerifyByAdmin(res, user);
      if (!coach) {
        return;
      }
    }
    const joinQuery = typeJoinQuery(user.role);
    if (role === "admin") {
      const result = await pool.query(
        "SELECT * FROM users WHERE role = 'admin'"
      );
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        result: { user: result.rows[0], accessToken, refreshToken },
      });
    }

    if (role !== "admin") {
      const { rows } = await pool.query(joinQuery, [user.id]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User registered but not found in database.",
        });
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);
      return res.status(200).json({
        success: true,
        result: { user: rows[0], accessToken, refreshToken },
      });
    } else {
      const { rows } = await pool.query(
        "SELECT id, first_name, last_name, email  FROM users WHERE id = $1 AND role = $2",
        [user.id, role]
      );
      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      return res.status(200).json({
        success: true,
        result: { user: rows[0], accessToken, refreshToken },
      });
    }
  } catch (err) {
    switch (err.code) {
      case "NOT_FOUND":
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      default:
        return res.status(500).json({ success: false, message: err.message });
    }
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "please enter your email" });
    }
    const filter = [{ field: "email", operator: "=", value: email }];
    if (role) {
      filter.push({ field: "role", operator: "=", value: role });
    }
    const user = await checkRecord("users", filter);

    if (user) {
      const code = generateCode();
      const codeExp = generateExpirationTime();
      const updatedUserData = {
        code,
        exp_code: codeExp,
      };
      // const data = await forgetPassword(user.id, code, codeExp);
      const data = await updateRecord("users", updatedUserData, [
        { field: "email", operator: "=", value: email },
      ]);
      if (user.role === "coach") {
        const coach = await isVerifyByAdmin(res, user);
        if (!coach) {
          return;
        }
      }
      if (data) {
        // sendVerificationEmail(email, verificationCode);
        const currentYear = new Date().getFullYear();
        const date = new Date().toLocaleDateString();
        // Use the rendered HTML content for the email
        const data = {
          email,
          otp: code,
          web_link: process.env.FRONTEND_URL,
        };
        const verificationData = ejsData(data);
        const verificationHtmlContent = await renderEJSTemplate(
          forgetPasswordTemplatePath,
          verificationData
        );
        const emailSent = await sendEmail(
          email,
          "Forget Password Verification",
          verificationHtmlContent
        );
        return res.status(200).json({
          success: true,
          message: `We've sent you a verification code on ${email}`,
          code,
        });
      }
    }
  } catch (err) {
    if (err.code === "DUPLICATE" || err.name === "ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res
        .status(401)
        .json({ success: false, message: "User not found with this email" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password required" });
    }

    const filter = [{ field: "email", operator: "=", value: email }];
    if (role) {
      filter.push({ field: "role", operator: "=", value: role });
    }
    const user = await checkRecord("users", filter);

    const hPassword = await hashPassword(password);

    const updatedUserData = {
      password: hPassword,
    };
    if (user.role === "coach") {
      const coach = await isVerifyByAdmin(res, user);
      if (!coach) {
        return;
      }
    }
    const data = await updateRecord("users", updatedUserData, [
      { field: "email", operator: "=", value: email },
    ]);
    return res
      .status(200)
      .json({ success: true, message: "password reset successfully" });
  } catch (err) {
    if (err.code === "DUPLICATE" || err.name === "ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Invalid email" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
};

exports.codeVerification = async (req, res) => {
  try {
    const { email, code, role } = req.body; // Assuming 'email' and 'role' are also provided in req.body

    if (!code) {
      return res.status(400).json({ success: false, message: "code required" });
    }

    const filter = [{ field: "email", operator: "=", value: email }];
    if (role) {
      filter.push({ field: "role", operator: "=", value: role });
    }
    const user = await checkRecord("users", filter);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or code does not match",
      });
    }

    // Assuming checkRecord returns user data including exp_code
    const now = new Date();
    const expCodeDate = new Date(user.exp_code);

    // Check if code is expired
    if (expCodeDate < now) {
      return res
        .status(400)
        .json({ success: false, message: "Code is expired" });
    }

    if (user.code !== code) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    if (user.role === "coach") {
      const coach = await isVerifyByAdmin(res, user);
      if (!coach) {
        return;
      }
    }
    const updatedUserData = {
      code: null,
      exp_code: null,
    };

    // Assuming email is unique and can identify the user
    await updateRecord("users", updatedUserData, [
      { field: "email", operator: "=", value: email },
    ]);

    return res
      .status(200)
      .json({ success: true, message: "Code verified successfully" });
  } catch (err) {
    // Handle errors
    if (err.code === "DUPLICATE" || err.name === "ALREADY_EXISTS") {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.code === "NOT_FOUND") {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or role" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
};

exports.accountVerification = async (req, res) => {
  try {
    const { code } = req.body;
    // check code id valid
    const coachee = await coacheeModel.getCoacheeByCode(code);
    if (!coachee) {
      return res
        .status(400)
        .json({ message: "Invalid or expire code", success: false });
    }
    if (coachee.isVerified) {
      return res
        .status(400)
        .json({ message: "coachee already verified", success: false });
    }
    // update account status
    const result = await coacheeModel.updateStatusAndClearCode(coachee.id);

    if (!result) {
      return res.status(500).json({ message: "Server Error", success: false });
    }
    res
      .status(200)
      .json({ message: "verification successfull", success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};

exports.changePassword = async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;

  // Input validation (basic example, consider using a library like joi)
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Please provide both current and new passwords." });
  }

  try {
    // Check if the user exists
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);
    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const user = userResult.rows[0];

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res
        .status(403)
        .json({ success: false, message: "Current password is incorrect." });
    }

    // Hash new password
    const saltRounds = 10; // Adjust according to your security requirement
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      userId,
    ]);

    // Respond to the request
    res
      .status(200)
      .json({ success: true, message: "Password successfully changed." });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while changing the password.",
    });
  }
};
