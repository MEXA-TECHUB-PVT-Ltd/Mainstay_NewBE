const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

function generateAccessToken(userId) {
  const payload = {
    userId: userId,
    type: 'auth',
  };
  const options = {
    expiresIn: process.env.ACCESS_TOKEN_EXP,
  };
  return jwt.sign(payload, process.env.SECRET_KEY, options);
}

function generateRefreshToken(userId) {
  const payload = {
    userId: userId,
    type: 'auth',
  };
  const options = {
    expiresIn: process.env.REFRESH_TOKEN_EXP,
  };
  return jwt.sign(payload, process.env.SECRET_KEY, options);
}



module.exports = {
    generateRefreshToken,
    generateAccessToken
  };