const DEFAULT_LIMIT_OPTIONS = [10, 20, 50, 100];

function Pagination({
  pagination,
  rowsCount = 0,
  limit,
  onLimitChange,
  onPageChange,
  itemName = "records",
  filtered = false,
  disabled = false,
  limitOptions = DEFAULT_LIMIT_OPTIONS,
  className = "",
}) {
  const pg = pagination || {};
  const total = pg.totalResult ?? pg.total ?? pg.totalRecords ?? pg.totalCount ?? pg.totalItems ?? 0;
  const currentPage = pg.currentPage || 1;
  const totalPages = pg.totalPages || 1;
  const pageSize = Number(limit) || Number(pg.limit) || 20;

  const prevPage = pg.prevPage ?? (pg.hasPrev ? currentPage - 1 : null);
  const nextPage = pg.nextPage ?? (pg.hasNext ? currentPage + 1 : null);

  const rangeStart = total ? (currentPage - 1) * pageSize + 1 : 0;
  const rangeEnd = total ? Math.min(rangeStart + rowsCount - 1, total) : 0;
  const summary = total
    ? `Showing ${rangeStart}-${rangeEnd} of ${total}${filtered ? " matching" : ""} ${itemName}`
    : `Page ${currentPage} of ${totalPages}`;

  const handlePage = (page) => {
    if (!page || disabled) return;
    onPageChange?.(page);
  };

  const handleLimit = (e) => {
    const n = Number(e.target.value) || 20;
    if (!disabled) onLimitChange?.(n);
  };

  return (
    <div className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:px-6 ${className}`}>
      <div className="text-gray-600 text-sm">{summary}</div>
      <div className="flex items-center justify-between gap-3 md:flex-wrap md:justify-end">
        {onLimitChange ? (
          <label className="flex items-center gap-2 text-gray-600 text-sm">
            <span className="whitespace-nowrap">Rows per page</span>
            <select
              value={pageSize}
              onChange={handleLimit}
              disabled={disabled}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-semibold text-gray-700 text-sm"
            >
              {limitOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePage(prevPage)}
            disabled={disabled || !prevPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 text-sm md:py-2"
          >
            Prev
          </button>
          <div className="text-gray-600 text-sm whitespace-nowrap">
            {currentPage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => handlePage(nextPage)}
            disabled={disabled || !nextPage}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-50 text-sm md:py-2"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
