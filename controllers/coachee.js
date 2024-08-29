const coacheeModel = require('../models/coachee');
const { generateCode, generateExpirationTime } = require('../utility/code');
const { getAll } = require('../utility/dbHelper');
const { calculateRemainingDays } = require('../utility/duration');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utility/email');
const { hashPassword, comparePassword } = require('../utility/password');
const coachModel = require('../models/coach');

const {
  generateAccessToken,
  generateRefreshToken,
} = require('../utility/token');

exports.register = async (req, res) => {
  try {
    const { email, password, user_type } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'add all required fields' });
    }
    const coachee = coacheeModel.checkEmail(email);
    const coach = coachModel.checkEmail(email);

    const promises = [coach, coachee];
    Promise.all(promises)
      .then(async (value) => {
        if (value[0].rowCount === 0 && value[1].rowCount === 0) {
          const verificationCode = generateCode();
          const codeExp = generateExpirationTime();
          const hPassword = await hashPassword(password);
          const data = await coacheeModel.register(
            email,
            hPassword,
            verificationCode,
            codeExp,
            user_type
          );

          if (data) {
            const accessToken = generateAccessToken(data.rows[0].id);

            sendVerificationEmail(email, verificationCode);
            return res.status(200).json({
              success: true,
              message: 'verification code send to your email',
              coachee: { ...data.rows[0], accessToken },
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: 'email already exist',
          });
        }
      })
      .catch(async (e) => {
        return res.status(500).json({ success: false, message: e });
      });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: 'server error' });
  }
};

// exports.updateCoachee = async (req, res) => {
//   try {

//     const id = req.user.userId;
//     const updatedValues = req.body;

//     const rowCount = await coacheeModel.updateCoachee(id, updatedValues);

//     if (rowCount > 0) {
//       return res
//         .status(200)
//         .json({ success: true, message: 'Coachee updated successfully' });
//     }

//     return res
//       .status(404)
//       .json({ success: false, message: 'Coachee not found' });
//   } catch (err) {
//     return res
//       .status(500)
//       .json({ success: false, message: 'Internal Server Error' });
//   }
// };

exports.accountVerification = async (req, res) => {
  try {
    const { code } = req.body;
    // check code id valid
    const coachee = await coacheeModel.getCoacheeByCode(code);
    if (!coachee) {
      return res
        .status(400)
        .json({ message: 'Invalid or expire code', success: false });
    }
    if (coachee.isVerified) {
      return res
        .status(400)
        .json({ message: 'coachee already verified', success: false });
    }
    // update account status
    const result = await coacheeModel.updateStatusAndClearCode(coachee.id);

    if (!result) {
      return res.status(500).json({ message: 'Server Error', success: false });
    }
    res
      .status(200)
      .json({ message: 'verification successfull', success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error });
  }
};

exports.coacheeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'email and password  required' });
    }
    const coachee = await coacheeModel.getCoacheeByEmail(email);

    if (!coachee) {
      return res
        .status(400)
        .json({ success: false, message: 'email not exist' });
    }
    const passwordMatch = await comparePassword(password, coachee.password);

    if (!passwordMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'invalid password' });
    }

    if (coachee.block || coachee.deleted) {
      return res.status(400).json({
        success: false,
        message: 'this coachee is deleted or block',
      });
    }
    const accessToken = generateAccessToken(coachee.id);
    const refreshToken = generateRefreshToken(coachee.id);

    return res.status(200).json({
      success: true,
      data: { id: coachee.id, email: coachee.email, accessToken, refreshToken },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'please enter your email' });
    }
    const coachee = await coacheeModel.getCoacheeByEmail(email);
    if (!coachee) {
      return res
        .status(400)
        .json({ success: false, message: 'email not exist' });
    }

    const code = generateCode();
    const codeExp = generateExpirationTime();
    const data = await coacheeModel.forgetPassword(coachee.id, code, codeExp);
    if (data) {
      sendPasswordResetEmail(email, code);
      return res.status(200).json({
        success: true,
        message: 'password reset code send to your email',
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { code, password } = req.body;

    if (!code || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'code and password required' });
    }

    const coachee = await coacheeModel.getCoacheeByCode(code);

    if (!coachee) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expire code' });
    }

    const hPassword = await hashPassword(password);

    const data = coacheeModel.updatePassword(coachee.id, hPassword);

    if (data) {
      return res
        .status(200)
        .json({ success: true, message: 'password reset successfully' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};
exports.codeVerification = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'code required' });
    }

    const coachee = await coacheeModel.getCoacheeByCode(code);

    if (!coachee) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expire code' });
    }

    return res.status(200).json({ success: true, message: 'code Match' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};
exports.allCoachee = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;
    const offset = (page - 1) * pageSize;
    const values = [`%${searchTerm}%`, pageSize, offset];

    const query = `
    SELECT * FROM coachee WHERE  LOWER(email) LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;`;

    const coachee = await getAll(query, values);

    const countQuery =
      'SELECT count(*) FROM coachee WHERE  LOWER(email) LIKE $1;';
    const count = await getAll(countQuery, [`%${searchTerm.toLowerCase()}%`]);
    const total = count[0].count;

    return res.status(200).json({
      success: true,
      coachee,
      total,
      totalPage: Math.ceil(total / pageSize),
    });

    return res
      .status(404)
      .json({ success: false, message: 'Coachee not found' });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

exports.coachee = async (req, res) => {
  try {
    const { id } = req.params;

    const coachee = await coacheeModel.coachee(id);

    if (coachee.length > 0) {
      return res.status(200).json({ success: true, coachee });
    }
    return res
      .status(400)
      .json({ success: true, coachee, message: 'coachee not found' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.blockCoachee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: true, message: 'coachee id is required' });
    }
    const coachee = await coacheeModel.blockCoachee(id, true);
    if (coachee.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'coachee not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'coachee block successfully',
      data: coachee.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.unBlockCoachee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: true, message: 'coachee id is required' });
    }
    const coachee = await coacheeModel.blockCoachee(id, false);
    if (coachee.rowCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'coachee not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'coachee unblock successfully',
      data: coachee.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.deleteCoachee = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: true, message: 'coachee id is required' });
    }
    const coachee = await coacheeModel.deleteCoachee(id, true);
    if (coachee.rowCount === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'coachee not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'coachee deleted successfully',
      data: coachee.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err });
  }
};

exports.getDeletedCoachee = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, searchTerm = '' } = req.query;

    const query = `SELECT * FROM coachee WHERE LOWER(email) LIKE $1 AND deleted = true ORDER BY deleted_at DESC LIMIT $2 OFFSET $3;`;
    const countQuery =
      'SELECT count(*) FROM coachee WHERE  LOWER(email) LIKE $1 ';
    const values = [`%${searchTerm}%`, pageSize, (page - 1) * pageSize];

    const result = await getAll(query, values);
    const deletedCoachees = result.map((coachee) => ({
      ...coachee,
      remainingDays: calculateRemainingDays(coachee.deleted_at),
    }));
    const count = await getAll(countQuery, [`%${searchTerm.toLowerCase()}%`]);
    const total = count[0].count;
    return res.status(200).json({
      success: true,
      deletedCoachees,
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: page,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const id = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'id required' });
    }
    const coachee = await coacheeModel.coachee(id);

    if (!coachee) {
      return res
        .status(400)
        .json({ success: true, message: 'coachee not found' });
    }
    const passwordMatch = await comparePassword(oldPassword, coachee.password);

    if (!passwordMatch) {
      return res
        .status(200)
        .json({ success: true, message: 'invalid current password' });
    }

    const hPassword = await hashPassword(newPassword);

    const data = await coacheeModel.updatePassword(coachee.id, hPassword);
    if (data) {
      return res
        .status(200)
        .json({ success: true, message: 'password update successfully' });
    }

    return res
      .status(400)
      .json({ success: false, message: 'some thing went wrong' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'server error' });
  }
};
exports.updateCoachee = async (req, res) => {
  try {
    const id = req.user.userId;
    const updateFields = req.body;

    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No fields provided for update.' });
    }

    const updatedCoachee = await coacheeModel.updateCoachee(id, updateFields);

    if (!updatedCoachee) {
      return res
        .status(404)
        .json({ success: false, message: 'Coachee not found.' });
    }

    res.status(200).json({ success: true, updatedCoachee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const id = req.user.userId;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'file required' });
    }

    const uploadProfile = await coacheeModel.updateProfile(file.path, id);
    if (uploadProfile) {
      return res.status(200).json({ success: true, uploadProfile });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.permanentDeleteCoachee = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCoach = await coacheeModel.permanentDeleteCoachee(id);

    if (!deletedCoach) {
      return res
        .status(404)
        .json({ success: false, message: 'Coachee not found.' });
    }

    res.status(200).json({ success: true, deletedCoach });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
