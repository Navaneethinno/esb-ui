import './TablePagination.css';

export default function TablePagination({
  currentPage,
  pageCount,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = '',
}) {
  const safePage = Math.max(1, Number(currentPage) || 1);
  const safePageCount = Math.max(1, Number(pageCount) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endItem = Math.min(safePage * safePageSize, totalItems);

  return (
    <div className={`dt-pagination ${className}`}>
      <div className="dt-pagination-info">
        <span className="dt-pagination-range">
          Showing {startItem}-{endItem} of {totalItems}
        </span>
      </div>

      <div className="dt-pagination-controls">
        {onPageSizeChange && (
          <label className="dt-pagination-size">
            <span>Rows</span>
            <select value={safePageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className="dt-pagination-button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          <i className="ti ti-chevron-left" />
          Prev
        </button>

        <span className="dt-pagination-page">
          Page {safePage} / {safePageCount}
        </span>

        <button
          type="button"
          className="dt-pagination-button"
          onClick={() => onPageChange(Math.min(safePageCount, safePage + 1))}
          disabled={safePage >= safePageCount}
        >
          Next
          <i className="ti ti-chevron-right" />
        </button>
      </div>
    </div>
  );
}
