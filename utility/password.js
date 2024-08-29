const bcrypt = require('bcrypt');

// hash a password
exports.hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (saltError, salt) => {
      if (saltError) {
        reject(saltError);
      }

      bcrypt.hash(password, salt, (hashError, hashedPassword) => {
        if (hashError) {
          reject(hashError);
        }

        resolve(hashedPassword);
      });
    });
  });
};

// compare a password with a hashed password
exports.comparePassword = (password, hashedPassword) => {
  return new Promise((resolve, reject) => {
    bcrypt
      .compare(password, hashedPassword)
      .then((isMatch) => {
        resolve(isMatch);
      })
      .catch((compareError) => {
        reject(compareError);
      });
  });
};


