const pool = require("../config/db");
const { CustomError } = require("./ErrorClass");
const { buildWhereClause } = require("./dbClause");

const insertRecord = async (tableName, data) => {
  if (!data || Object.keys(data).length === 0) {
    throw new Error("InsertDataMissing");
  }

  const fields = Object.keys(data).join(", ");
  const values = Object.values(data);
  const valuePlaceholders = values
    .map((_, index) => `$${index + 1}`)
    .join(", ");
  const insertQuery = `INSERT INTO ${tableName} (${fields}) VALUES (${valuePlaceholders}) RETURNING *`;

  try {
    const insertResult = await pool.query(insertQuery, values);
    console.log("", insertResult);
    return insertResult.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const fieldNameMatch = /Key \(([^)]+)\)=/.exec(error.detail);
      const fieldName = fieldNameMatch ? fieldNameMatch[1] : "unknown field";
      const errorMessage = `${fieldName} already exists in ${tableName}.`;

      throw new CustomError("DUPLICATE", errorMessage, error);
    }
    console.error(error);
    throw error;
  }
};

const updateRecord = async (tableName, data, filters) => {
  try {
    const updates = Object.keys(data)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const dataValues = Object.values(data);

    const { clause: whereClause, values: filterValues } = buildWhereClause(
      filters,
      dataValues.length
    );

    const combinedValues = [...dataValues, ...filterValues];

    const updateQuery = `UPDATE ${tableName} SET ${updates} ${whereClause} RETURNING *`;
    const updateResult = await pool.query(updateQuery, combinedValues);

    console.log(updateQuery);
    console.log(combinedValues);

    return updateResult.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      const fieldNameMatch = /Key \(([^)]+)\)=/.exec(error.detail);
      const fieldName = fieldNameMatch ? fieldNameMatch[1] : "unknown field";
      const errorMessage = `${fieldName} already exists in ${tableName}.`;

      throw new CustomError("DUPLICATE", errorMessage, error);
    }
    console.error(error);
    throw error;
  }
};

module.exports = {
  insertRecord,
  updateRecord,
};
