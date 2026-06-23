export default function LinkAdaptersLoadingSkeleton() {
  return (
    <div className="la-page" style={{ opacity: 0.7 }}>
      {/* Header Skeleton */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <div className="created-skeleton" style={{ width: 300, height: 24, marginBottom: 8 }} />
          <div className="created-skeleton" style={{ width: 400, height: 16 }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="created-skeleton" style={{ width: 80, height: 40, borderRadius: 8 }} />
          <div className="created-skeleton" style={{ width: 140, height: 40, borderRadius: 8 }} />
        </div>
      </div>

      {/* Adapter Selection Skeleton */}
      <section className="la-setup-card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 16, alignItems: "center" }}>
          <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
            <div className="created-skeleton" style={{ width: 120, height: 14, marginBottom: 16 }} />
            <div className="created-skeleton" style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 7 }} />
            <div className="created-skeleton" style={{ width: "100%", height: 38, borderRadius: 7 }} />
          </div>
          
          <i className="ti ti-arrow-right" style={{ fontSize: 24, color: "var(--muted)" }} />
          
          <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
            <div className="created-skeleton" style={{ width: 120, height: 14, marginBottom: 16 }} />
            <div className="created-skeleton" style={{ width: "100%", height: 38, marginBottom: 12, borderRadius: 7 }} />
            <div className="created-skeleton" style={{ width: "100%", height: 38, borderRadius: 7 }} />
          </div>

          <div style={{ padding: 20, border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", minWidth: 220 }}>
            <div className="created-skeleton" style={{ width: 100, height: 14, marginBottom: 12 }} />
            <div className="created-skeleton" style={{ width: "100%", height: 40, borderRadius: 8 }} />
          </div>
        </div>
      </section>

      {/* Request Mapping Skeleton */}
      <section className="la-section" style={{ marginTop: 28 }}>
        <div className="la-flow-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
            <div>
              <div className="created-skeleton" style={{ width: 80, height: 24, marginBottom: 8, borderRadius: 999 }} />
              <div className="created-skeleton" style={{ width: 280, height: 18, marginBottom: 4 }} />
              <div className="created-skeleton" style={{ width: 320, height: 14 }} />
            </div>
          </div>

          <div className="la-studio">
            <div className="la-studio-header">
              <div className="created-skeleton" style={{ width: 200, height: 16 }} />
              <div className="created-skeleton" style={{ width: 120, height: 32, borderRadius: 999 }} />
            </div>

            <div className="la-studio-body">
              <div className="la-column">
                <div className="la-column-header">
                  <div className="created-skeleton" style={{ width: 100, height: 14 }} />
                  <div className="created-skeleton" style={{ width: 60, height: 14 }} />
                </div>
                <div className="la-column-body">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="created-skeleton" style={{ width: "100%", height: 36, borderRadius: 7, marginBottom: 6 }} />
                  ))}
                </div>
              </div>

              <div className="la-mappings-col">
                <div className="la-column-header">
                  <div className="created-skeleton" style={{ width: 80, height: 14 }} />
                </div>
                <div className="la-mappings-body">
                  <div className="la-mappings-empty">
                    <i className="ti ti-arrows-exchange spin" style={{ fontSize: 42, opacity: 0.3, color: "var(--primary)" }} />
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Loading mapping studio...</p>
                  </div>
                </div>
              </div>

              <div className="la-column">
                <div className="la-column-header">
                  <div className="created-skeleton" style={{ width: 100, height: 14 }} />
                  <div className="created-skeleton" style={{ width: 60, height: 14 }} />
                </div>
                <div className="la-column-body">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="created-skeleton" style={{ width: "100%", height: 36, borderRadius: 7, marginBottom: 6 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Response Mapping Skeleton */}
        <div className="la-flow-card" style={{ padding: 18, marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
            <div>
              <div className="created-skeleton" style={{ width: 90, height: 24, marginBottom: 8, borderRadius: 999 }} />
              <div className="created-skeleton" style={{ width: 300, height: 18, marginBottom: 4 }} />
              <div className="created-skeleton" style={{ width: 340, height: 14 }} />
            </div>
          </div>

          <div className="created-skeleton" style={{ width: "100%", height: 320, borderRadius: 10 }} />
        </div>
      </section>

      {/* Save Bar Skeleton */}
      <div className="la-save-bar">
        <div className="created-skeleton" style={{ width: 200, height: 40 }} />
        <div className="created-skeleton" style={{ width: 160, height: 40, borderRadius: 7 }} />
      </div>
    </div>
  );
}
