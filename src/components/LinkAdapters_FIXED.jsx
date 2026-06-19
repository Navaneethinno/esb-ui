// Search for this section in LinkAdapters.jsx and replace:

// FIND THIS SECTION (around line 1880-1950):
/*
      <section className="la-section" style={{ marginTop: 28 }}>
          <div className="la-flow-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
*/

// REPLACE WITH:

      <section className="la-section" style={{ marginTop: 28 }}>
          <div className="la-section-heading">
            <div className="la-section-badge la-section-badge--req">REQUEST</div>
            <div>
              <h3 className="la-section-title" style={{ marginBottom: 6 }}>Request Type</h3>
              <p className="la-section-sub">Choose one inbound request type and optionally add extra outbound request types.</p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={oneToManyEnabled}
                onChange={(e) => setOneToManyEnabled(e.target.checked)}
              />
              Multiple Outbound Request Types
            </label>
          </div>

          <div className="la-flow-card" style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
              <div className="field">
                <label>Inbound Request Type</label>
                <select
                  value={selInboundReq}
                  onChange={(e) => setSelInboundReq(e.target.value)}
                  disabled={!selInbound || inboundLoading}
                >
                  <option value="">{selInbound ? "Select inbound request type" : "Select inbound adapter first"}</option>
                  {inboundRequestTypes.map((c, i) => {
                    const name = getRequestName(c, "");
                    const id = getConfigId(c, i) || name;
                    return name ? <option key={id} value={name}>{name}</option> : null;
                  })}
                </select>
              </div>

              {!oneToManyEnabled ? (
                <div className="field">
                  <label>Outbound Request Type</label>
                  <select
                    value={selOutboundReq}
                    onChange={(e) => setSelOutboundReq(e.target.value)}
                    disabled={!selOutbound || outboundLoading}
                  >
                    <option value="">{selOutbound ? "Select outbound request type" : "Select outbound adapter first"}</option>
                    {outboundRequestTypes.map((c, i) => {
                      const name = getRequestName(c, "");
                      const id = getConfigId(c, i) || name;
                      return name ? <option key={id} value={name}>{name}</option> : null;
                    })}
                  </select>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--label)", margin: 0 }}>Outbound Request Type</label>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setOutboundRequestSelections((current) => (current.length ? [...current, ""] : [selOutboundReq || ""]))}
                      disabled={!selOutbound || outboundLoading}
                      style={{ padding: "7px 14px", fontSize: 13, height: 32 }}
                    >
                      <i className="ti ti-plus" style={{ fontSize: 14 }} /> Add Request Type
                    </button>
                  </div>
                  <select
                    value={selOutboundReq}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelOutboundReq(next);
                      setOutboundRequestSelections((current) => {
                        const updated = current.length ? [...current] : [""];
                        updated[0] = next;
                        return updated;
                      });
                    }}
                    disabled={!selOutbound || outboundLoading}
                  >
                    <option value="">{selOutbound ? "Select outbound request type" : "Select outbound adapter first"}</option>
                    {outboundRequestTypes.map((c, i) => {
                      const name = getRequestName(c, "");
                      const id = getConfigId(c, i) || name;
                      return name && name !== selOutboundReq ? <option key={id} value={name}>{name}</option> : null;
                    })}
                  </select>

                  {outboundRequestSelections.slice(1).length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
                      {outboundRequestSelections.slice(1).map((value, extraIndex) => (
                        <div key={extraIndex} style={{ marginTop: extraIndex === 0 ? 0 : 12, display: "grid", gridTemplateColumns: "1fr 44px", gap: 12, alignItems: "center" }}>
                          <select
                            value={value}
                            onChange={(e) => {
                              const next = e.target.value;
                              setOutboundRequestSelections((current) => {
                                const updated = [...current];
                                updated[extraIndex + 1] = next;
                                return updated;
                              });
                            }}
                            disabled={!selOutbound || outboundLoading}
                          >
                            <option value="">{selOutbound ? "Select another target request type" : "Select outbound adapter first"}</option>
                            {outboundRequestTypes.map((c, i) => {
                              const name = getRequestName(c, "");
                              const id = getConfigId(c, i) || name;
                              const chosen = [selOutboundReq, ...outboundRequestSelections.filter(Boolean)];
                              const isCurrent = value && name === value;
                              return name && (isCurrent || !chosen.includes(name)) ? <option key={id} value={name}>{name}</option> : null;
                            })}
                          </select>
                          <button
                            type="button"
                            className="ar-icon-btn ar-icon-btn-danger"
                            onClick={() => setOutboundRequestSelections((current) => current.filter((_, i) => i !== extraIndex + 1))}
                            title="Remove outbound request type"
                            style={{ opacity: 1 }}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
