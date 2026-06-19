import './DataTableContainer.css';

/**
 * ═══════════════════════════════════════════════════════════════
 * DataTableContainer - Full-Height Layout Wrapper
 * ═══════════════════════════════════════════════════════════════
 * Manages the full-height flex layout for toolbar + table.
 * Eliminates empty space beneath tables.
 */

export default function DataTableContainer({ children, className = '' }) {
  return (
    <div className={`dt-container ${className}`}>
      {children}
    </div>
  );
}
