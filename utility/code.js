const env = require("dotenv");
const UserModel = require("../models/coachee");
env.config();

const generateExpirationTime = () => {
  const now = new Date();
  // For 4 hours, multiply 4 (hours) by 60 (minutes per hour) by 60000 (milliseconds per minute)
  const newDate = new Date(now.getTime() + 4 * 60 * 60000);
  return newDate;
};

// generate six digit code
const generateCode = () => {
  const min = 1000;
  const max = 9999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generatePassword = () => {
  const min = 10000000;
  const max = 99999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

module.exports = {
  generateExpirationTime,
  generateCode,
  generatePassword,
};
