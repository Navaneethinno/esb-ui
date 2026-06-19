import './DataTableToolbar.css';

/**
 * ═══════════════════════════════════════════════════════════════
 * DataTableToolbar - Reusable Toolbar Component
 * ═══════════════════════════════════════════════════════════════
 * Handles filters, search, and primary actions above tables.
 */

export default function DataTableToolbar({
  title,
  primaryAction,
  filters = [],
  searchProps,
  refreshAction,
  className = '',
  children,
}) {
  return (
    <div className={`dt-toolbar ${className}`}>
      {primaryAction && (
        <button
          className="dt-toolbar-primary-btn"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.icon && <i className={`ti ${primaryAction.icon}`} />}
          {primaryAction.label}
        </button>
      )}

      <div className="dt-toolbar-controls">
        {filters.length > 0 && (
          <div className="dt-toolbar-filters">
            {filters.map((filter, idx) => {
              if (filter.type === 'tabs') {
                return (
                  <div key={idx} className="dt-filter-tabs" role="group" aria-label={filter.label}>
                    {filter.options.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={filter.value === option.value ? 'active' : ''}
                        onClick={() => filter.onChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                );
              }

              if (filter.type === 'select') {
                return (
                  <select
                    key={idx}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    aria-label={filter.label}
                    className="dt-filter-select"
                  >
                    {filter.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                );
              }

              return null;
            })}
          </div>
        )}

        {searchProps && (
          <input
            type="text"
            placeholder={searchProps.placeholder || 'Search...'}
            value={searchProps.value}
            onChange={(e) => searchProps.onChange(e.target.value)}
            className="dt-toolbar-search"
          />
        )}

        {refreshAction && (
          <button
            className="dt-toolbar-refresh-btn"
            onClick={refreshAction.onClick}
            disabled={refreshAction.loading}
          >
            <i className={`ti ti-refresh ${refreshAction.loading ? 'spin' : ''}`} />
            {refreshAction.label || 'Refresh'}
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
