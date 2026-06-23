import './DataTableContainer.css';

/**
 * ═══════════════════════════════════════════════════════════════
 * DataTableContainer - Full-Height Layout Wrapper
 * ═══════════════════════════════════════════════════════════════
 * Manages the full-height flex layout for toolbar + table.
 * Eliminates empty space beneath tables.
 */

export default function DataTableContainer({ toolbar, children, pagination, className = '' }) {
  return (
    <div className={`dt-container ${className}`}>
      {toolbar ? <div className="dt-container-toolbar">{toolbar}</div> : null}
      {children}
      {pagination ? <div className="dt-container-pagination">{pagination}</div> : null}
    </div>
  );
}
