import './PageHeader.css';

export default function PageHeader({
  title,
  subtitle,
  description,
  showTitle = true,
  showSubtitle = false,
  showDescription = false,
  actions,
  badges,
  backAction,
  className = '',
}) {
  if (!showTitle && !title) return null;

  return (
    <div className={`page-header ${className}`}>
      <div className="page-header-main">
        {backAction && (
          <button
            className="page-header-back"
            onClick={backAction.onClick}
            type="button"
          >
            <i className="ti ti-arrow-left" />
            {backAction.label || 'Back'}
          </button>
        )}

        <div className="page-header-content">
          {showTitle && title && (
            <h1 className="page-header-title">{title}</h1>
          )}
          
          {showSubtitle && subtitle && (
            <p className="page-header-subtitle">{subtitle}</p>
          )}
          
          {showDescription && description && (
            <p className="page-header-description">{description}</p>
          )}
        </div>

        {badges && badges.length > 0 && (
          <div className="page-header-badges">
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`page-header-badge ${badge.variant || 'default'}`}
                style={badge.style}
              >
                {badge.icon && <i className={`ti ${badge.icon}`} />}
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="page-header-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
                className={action.className || 'btn-primary'}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <i className={`ti ${action.icon}`} />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
