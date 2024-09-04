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
exports.verificationEmailGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "verificationEmailGerman.ejs"
);
exports.forgetPasswordTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "forgetPassword.ejs"
);
exports.forgetPasswordGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "forgetPasswordGerman.ejs"
);
exports.sessionAcceptedTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionAccepted.ejs"
);
exports.sessionAcceptedGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionAcceptedGerman.ejs"
);
exports.sessionRequestTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionRequest.ejs"
);
exports.sessionRequestGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionRequestGerman.ejs"
);
exports.sessionPayTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPay.ejs"
);
exports.sessionPayGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPayGerman.ejs"
);
exports.sessionPayCoacheeTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPayCoachee.ejs"
);
exports.sessionPayCoacheeGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "sessionPayCoacheeGerman.ejs"
);
exports.coachVerifiedTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "coachVerified.ejs"
);

exports.coachVerifiedGermanTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "coachVerfiedGerman.ejs"
);

exports.ejsData = (data) => {
  return { data };
};
