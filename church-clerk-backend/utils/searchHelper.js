function buildSearchQuery(searchTerm, searchFields) {
  if (!searchTerm || !searchFields || searchFields.length === 0) {
    return {};
  }

  const regex = new RegExp(searchTerm, "i");
  const orConditions = searchFields.map((field) => ({ [field]: regex }));
  return { $or: orConditions };
}

function buildDateRangeQuery(dateFrom, dateTo, dateField = "createdAt") {
  const query = {};
  if (dateFrom) {
    query[dateField] = { ...query[dateField], $gte: new Date(dateFrom) };
  }
  if (dateTo) {
    query[dateField] = { ...query[dateField], $lte: new Date(dateTo) };
  }
  return query;
}

export { buildSearchQuery, buildDateRangeQuery };
