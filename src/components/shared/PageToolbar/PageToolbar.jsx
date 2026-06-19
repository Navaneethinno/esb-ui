import './PageToolbar.css';

export default function PageToolbar({
  primaryAction,
  filters = [],
  searchProps,
  refreshAction,
  className = '',
}) {
  return (
    <div className={`page-toolbar ${className}`}>
      {primaryAction && (
        <button
          className="page-toolbar-btn-primary"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.icon && <i className={`ti ${primaryAction.icon}`} />}
          {primaryAction.label}
        </button>
      )}

      {filters.length > 0 && filters.map((filter, idx) => {
        if (filter.type === 'tabs') {
          return (
            <div key={idx} className="page-toolbar-tabs" role="group" aria-label={filter.label}>
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
              className="page-toolbar-select"
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

      {searchProps && (
        <input
          type="text"
          placeholder={searchProps.placeholder || 'Search...'}
          value={searchProps.value}
          onChange={(e) => searchProps.onChange(e.target.value)}
          className="page-toolbar-search"
        />
      )}

      {refreshAction && (
        <button
          className="page-toolbar-btn-refresh"
          onClick={refreshAction.onClick}
          disabled={refreshAction.loading}
        >
          <i className={`ti ti-refresh ${refreshAction.loading ? 'spin' : ''}`} />
          {refreshAction.label || 'Refresh'}
        </button>
      )}
    </div>
  );
}
