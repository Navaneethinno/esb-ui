export default function AutoMatchPreviewModal({ matches, onAccept, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="automatch-modal">
        <div className="automatch-header">
          <div>
            <p className="automatch-eyebrow">
              <i className="ti ti-sparkles" /> Auto Match Preview
            </p>
            <h2 className="automatch-title">
              {matches.length} {matches.length === 1 ? "Match" : "Matches"} Found
            </h2>
            <p className="automatch-sub">
              Review the suggested mappings below. Click Accept to apply all mappings.
            </p>
          </div>
          <button type="button" className="ar-icon-btn" onClick={onCancel} style={{ opacity: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="automatch-body">
          {matches.length === 0 ? (
            <div className="automatch-empty">
              <i className="ti ti-mood-sad" />
              <p>No matches found. Try extracting keys first or add mappings manually.</p>
            </div>
          ) : (
            <div className="automatch-list">
              {matches.map((match, idx) => (
                <div className="automatch-item" key={idx}>
                  <div className="automatch-item-fields">
                    <span className="automatch-source">{match.sourceKey}</span>
                    <i className="ti ti-arrow-right automatch-arrow" />
                    <span className="automatch-target">{match.canonicalKey}</span>
                  </div>
                  <div className="automatch-confidence">
                    <div
                      className="automatch-confidence-bar"
                      style={{ width: `${match.confidence}%` }}
                      data-level={
                        match.confidence >= 80 ? "high" : match.confidence >= 60 ? "medium" : "low"
                      }
                    />
                    <span className="automatch-confidence-label">{match.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="automatch-footer">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAccept(matches)}
            disabled={matches.length === 0}
          >
            <i className="ti ti-check" /> Accept Matches
          </button>
        </div>
      </div>
    </div>
  );
}
