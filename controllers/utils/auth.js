const { checkRecord } = require("../../utility/dbValidationHelper");

const typeJoinQuery = (userType) => {
  let joinQuery = "";

  if (userType === "coach") {
    joinQuery = `
        SELECT 
                u.*,
                json_build_object(
                'id', t.id,
                'about', t.about,
                'language_ids', t.language_ids,
                'coaching_area_ids', t.coaching_area_ids,
                'is_completed', t.is_completed,
                'admin_verified', t.admin_verified,
                'profile_pic', t.profile_pic,
                'stripe_account_id', t.stripe_account_id,
                'is_stripe_completed', t.is_stripe_completed
            ) as coach
        FROM users u
        LEFT JOIN coach_v2 t ON u.id = t.user_id
        WHERE u.id = $1;
    `;
  } else if (userType === "coachee") {
    joinQuery = `
        SELECT 
                u.*,
                  json_build_object(
              'id', t.id,
        'date_of_birth', t.date_of_birth,
        'phone', t.phone,
        'gender', t.gender,
        'profile_pic', t.profile_pic,
        'customer_id', t.customer_id,
        'interests', t.interests,
        'language', t.language,
        'country_id', t.country_id
            ) as coachee
        FROM users u
        LEFT JOIN coachee_v2 t ON u.id = t.user_id
        WHERE u.id = $1;
    `;
  }

  return joinQuery;
};

const isVerifyByAdmin = async (res, user) => {
  const coach = await checkRecord("coach_v2", [
    { field: "user_id", operator: "=", value: user.id },
  ]);

  if (!coach || !coach.admin_verified) {
    // If coach not found or not verified by admin, send an appropriate response
    res.status(401).json({
      success: false,
      message: "Your account has not yet been verified by an administrator.",
    });
    return null;
  }
  return coach;
};

module.exports = {
  typeJoinQuery,
  isVerifyByAdmin,
};
