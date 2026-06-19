export default function ProtocolExtensionBadge({ show, inline, protocolType, variant = 'banner' }) {
  if (!show) return null;
  
  if (variant === 'inline' || inline) {
    return <span className="protocol-ext-badge-inline" title="Protocol Extension Mode - Custom fields enabled"><i className="ti ti-puzzle" /> EXT</span>;
  }
  
  if (variant === 'notice') {
    return (
      <div className="protocol-enforcement-notice">
        <i className="ti ti-shield-lock" />
        <div>
          <strong>{protocolType} Protocol Enforcement</strong>
          <p>Only protocol-defined fields are allowed in normal mode. Enable Extension Mode to add custom fields.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="protocol-ext-badge-banner">
      <i className="ti ti-alert-triangle" />
      <div>
        <strong>Protocol Extension Mode Active</strong>
        <p>Custom fields are allowed for {protocolType || 'this protocol'} but may not be compatible with all protocol processors. Extension fields will be stored separately.</p>
      </div>
    </div>
  );
}
