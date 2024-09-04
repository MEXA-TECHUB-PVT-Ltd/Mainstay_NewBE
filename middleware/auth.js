const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { checkRecord } = require("../utility/dbValidationHelper");
dotenv.config();
module.exports = {
  isAuthenticated: (req, res, next) => {
    // Get the token from the request
    const authtoken = req.headers.authorization;
    if (!authtoken) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const token = authtoken.startsWith("Bearer ")
      ? authtoken.split(" ")[1]
      : authtoken;

    // Verify the token using a secret
    jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
      if (err) {
        console.log(err);
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
