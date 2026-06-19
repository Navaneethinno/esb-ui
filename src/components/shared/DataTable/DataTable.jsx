import { TABLE_THEME } from './tableTheme';
import './DataTable.css';

/**
 * ═══════════════════════════════════════════════════════════════
 * DataTable - Enterprise-Grade Reusable Table Component
 * ═══════════════════════════════════════════════════════════════
 * Single source for all table implementations across the app.
 */

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No data available.',
  layoutName = 'standard6',
  stickyHeader = true,
  hoverEffect = true,
  className = '',
  onRowClick,
  rowKey = 'id',
  renderCell,
  skeletonRows = 5,
}) {
  const columnLayout = TABLE_THEME.layout;

  if (isLoading) {
    return (
      <div className={`dt-wrapper ${className}`}>
        <table className="dt-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {columns.map((col, idx) => (
              <col key={idx} style={col.width ? { width: col.width } : {}} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="dt-header-cell">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="dt-cell">
                    <div className="dt-skeleton" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`dt-wrapper ${className}`}>
        <table className="dt-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {columns.map((col, idx) => (
              <col key={idx} style={col.width ? { width: col.width } : {}} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="dt-header-cell">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="dt-empty">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`dt-wrapper ${className}`}>
      <table className="dt-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {columns.map((col, idx) => (
            <col key={idx} style={col.width ? { width: col.width } : {}} />
          ))}
        </colgroup>
        <thead className={stickyHeader ? 'dt-sticky' : ''}>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="dt-header-cell"
                style={col.align ? { textAlign: col.align } : {}}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row[rowKey] || rowIdx}
              className={`dt-row ${hoverEffect ? 'dt-row-hover' : ''} ${onRowClick ? 'dt-row-clickable' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className="dt-cell"
                  data-label={col.label}
                  style={col.align ? { textAlign: col.align } : {}}
                >
                  {renderCell ? renderCell(col.field, row, col) : row[col.field]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
