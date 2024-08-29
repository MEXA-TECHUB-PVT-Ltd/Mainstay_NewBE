const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
// Configure a nodemailer transporter for sending emails
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Function to send a verification email

exports.sendVerificationEmail = (email, code) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: 'Email Verification',
    text: `Your Email Verification code is : ${code}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("email error",error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Function to send a password reset email
exports.sendPasswordResetEmail = (email, resetCode) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: email,
    subject: 'Password Reset',
    text: `Your Reset Password code is : ${resetCode}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};
