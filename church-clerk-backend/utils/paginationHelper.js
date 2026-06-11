function buildPaginationParams(query) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query?.limit || 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginationResponse(totalItems, currentPage, limit) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    currentPage,
    totalPages,
    totalItems,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

export { buildPaginationParams, buildPaginationResponse };
