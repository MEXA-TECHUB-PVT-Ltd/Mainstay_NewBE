
const buildJoinClause = (joins) => {
  return joins
    .map(
      (join) =>
        `${join.type ? join.type : "JOIN"} ${join.table} ON ${join.condition}`
    )
    .join(" ");
};

const buildWhereClause = (filters, startIndex = 0) => {
  if (!filters || filters.length === 0) return { clause: "", values: [] };

  const filterClauses = filters.map(
    (filter, index) =>
      `${filter.field} ${filter.operator} $${index + startIndex + 1}`
  );
  const filterValues = filters.map((filter) => filter.value);

  return {
    clause: `WHERE ${filterClauses.join(" AND ")}`,
    values: filterValues,
  };
};

const getSortClause = (sortField, sortOrder) => {
  sortOrder =
    sortOrder &&
    (sortOrder.toLowerCase() === "asc" || sortOrder.toLowerCase() === "desc")
      ? sortOrder.toUpperCase()
      : "ASC";

  return sortField ? ` ORDER BY ${sortField} ${sortOrder}` : "";
};

const buildAggregateClause = (aggregates) => {
  if (!Array.isArray(aggregates) || aggregates.length === 0) return "";

  return aggregates
    .map((agg) => {
      if (!agg.function || !agg.field || !agg.alias) {
        throw new Error("Invalid aggregate object");
      }
      return `${agg.function}(${agg.field}) as ${agg.alias}`;
    })
    .join(", ");
};

const buildGroupByClause = (options) => {
  return options.groupBy ? `GROUP BY ${options.groupBy}` : "";
};

module.exports = {
  buildJoinClause,
  buildWhereClause,
  getSortClause,
  buildAggregateClause,
  buildGroupByClause,
};
