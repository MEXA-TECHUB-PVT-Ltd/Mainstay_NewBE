const db = require("../config/db");

const createSection = async (sectionDetails, coach_id) => {
  try {
    const result = await db.query(
      "INSERT INTO section (section_details, coach_id) VALUES ($1, $2) RETURNING *",
      [sectionDetails, coach_id]
    );

    return result.rows[0];
  } catch (error) {
    return error;
  }
};

const getAllSections = async (coach_id) => {
  const result = await db.query(
    `
SELECT 
    u.id, 
    u.first_name, 
    u.last_name, 
    u.email, 
    c.about, 
    c.language_ids, 
    (
        SELECT 
            json_agg(
                json_build_object(
                    'section_id', s.id, 
                    'section_details', s.section_details
                )
            )
        FROM section s
        WHERE s.user_id = u.id
    ) AS section_list, 
    (
        SELECT 
            json_agg(
                json_build_object(
                    'coaching_area_id', ca.id, 
                    'name', ca.name, 
                    'icon', ca.icon,
                    'german_name', ca.german_name
                )
            )
        FROM coach_area ca
        WHERE ca.id = ANY(c.coaching_area_ids)
    ) AS coaching_area_list, 
    c.is_completed, 
    c.admin_verified, 
    c.profile_pic, 
    c.created_at
FROM 
    coach_v2 c
JOIN 
    users u ON c.user_id = u.id
WHERE 
    c.user_id = $1;


    `,
    [coach_id]
  );

  return result.rows[0];
};

const updateSection = async (sectionDetails, coach_id) => {
  try {
    const result = await db.query(
      "UPDATE section SET  section_details = $1 WHERE user_id=$2 RETURNING *",
      [sectionDetails, coach_id]
    );

    return result.rows[0];
  } catch (error) {
    return error;
  }
};

const deleteSection = async (coach_id) => {
  const result = await db.query(
    "DELETE FROM section WHERE coach_id = $1 RETURNING *",
    [coach_id]
  );

  if (result.rows.length === 0) {
    return null; // Section not found
  }

  return result.rows[0];
};

module.exports = {
  getAllSections,
  deleteSection,
  getAllSections,
  createSection,
  updateSection,
};
