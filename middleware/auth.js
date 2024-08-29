const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { checkRecord } = require("../utility/dbValidationHelper");
dotenv.config();
module.exports = {
  isAuthenticated: (req, res, next) => {
    // Get the token from the request
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }
    // Verify the token using a secret
    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
      }
      req.user = decoded;

      const { userId } = decoded;
      try {
        await checkRecord("users", [
          { field: "id", operator: "=", value: userId },
        ]);
      } catch (error) {
        if (error.code === "NOT_FOUND") {
          return res.status(401).json({
            message: "Unauthorized: User not found with provided token",
          });
        }
        throw error;
      }
      next();
    });
  },
};
