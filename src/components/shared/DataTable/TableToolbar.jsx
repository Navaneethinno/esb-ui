import './DataTableToolbar.css';

export default function TableToolbar({
  primaryAction,
  filters = [],
  searchProps,
  refreshAction,
  className = '',
  children,
}) {
  const showSearch = Boolean(searchProps);
  const searchOptions = Array.isArray(searchProps?.columns) ? searchProps.columns : [];
  const searchValue = searchProps?.value ?? '';
  const selectedColumn = searchProps?.selectedColumn ?? 'all';
  const handleSubmit = () => {
    searchProps?.onSubmit?.();
  };

  return (
    <div className={`dt-toolbar ${className}`}>
      {primaryAction && (
        <button
          className="dt-toolbar-primary-btn"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          type="button"
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

        {showSearch && (
          <div className="dt-toolbar-search-group">
            {searchOptions.length > 0 && (
              <select
                className="dt-toolbar-search-column"
                value={selectedColumn}
                onChange={(e) => searchProps.onColumnChange?.(e.target.value)}
                aria-label={searchProps.columnLabel || 'Search column'}
              >
                {searchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder={searchProps.placeholder || 'Search...'}
              value={searchValue}
              onChange={(e) => searchProps.onChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="dt-toolbar-search"
            />

            <button
              type="button"
              className="dt-toolbar-search-btn"
              onClick={handleSubmit}
              disabled={searchProps.searchDisabled}
            >
              <i className="ti ti-search" />
              {searchProps.buttonLabel || 'Search'}
            </button>
          </div>
        )}

        {refreshAction && (
          <button
            className="dt-toolbar-refresh-btn"
            onClick={refreshAction.onClick}
            disabled={refreshAction.loading}
            type="button"
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
