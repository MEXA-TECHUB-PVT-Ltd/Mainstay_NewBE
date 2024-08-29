const path = require("path");
const ejs = require("ejs");

exports.renderEJSTemplate = async (templatePath, data) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, (err, htmlContent) => {
      if (err) {
        return reject(err);
      }
      resolve(htmlContent);
    });
  });
};

exports.verificationEmailTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "verificationEmail.ejs"
);
exports.forgetPasswordTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "forgetPassword.ejs"
);
exports.sessionAcceptedTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionAccepted.ejs"
);
exports.sessionRequestTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionRequest.ejs"
);
exports.sessionPayTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPay.ejs"
);
exports.sessionPayCoacheeTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPayCoachee.ejs"
);
exports.coachVerifiedTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "coachVerified.ejs"
);

exports.ejsData = (data) => {
  return { data };
};
