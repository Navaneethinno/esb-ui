# PHASE 1 - ONE TO MANY INTEGRATION UX IMPLEMENTATION

## Implementation Summary

This document provides the implementation plan for Phase 1 One-to-Many Integration.

### Changes Required in LinkAdapters.jsx

#### 1. Add State Variables (after line ~715)
```javascript
// PHASE 1: One-to-Many Integration State
const [oneToManyEnabled, setOneToManyEnabled] = useState(false);
const [selOutbound2, setSelOutbound2] = useState("");
const [selOutboundReq2, setSelOutboundReq2] = useState("");
const [outboundConfigs2, setOutboundConfigs2] = useState([]);
const [outboundRequestTypes2, setOutboundRequestTypes2] = useState([]);
const [outboundLoading2, setOutboundLoading2] = useState(false);
```

#### 2. Add useEffect for Second Outbound (after existing outbound useEffect)
```javascript
// PHASE 1: Load second outbound adapter configs
useEffect(() => {
  setSelOutboundReq2(""); setOutboundConfigs2([]);
  setOutboundRequestTypes2([]);
  if (!selOutbound2 || !oneToManyEnabled) return;
  setOutboundLoading2(true);
  getOutboundAdapterConfigurations(selOutbound2)
    .then((configs) => {
      const configsArray = Array.isArray(configs) ? configs : [];
      setOutboundConfigs2(configsArray);
      setOutboundRequestTypes2(configsArray);
    })
    .catch((err) => {
      console.error('[LinkAdapters] Failed to load outbound2 configs:', err);
      setOutboundConfigs2([]);
      setOutboundRequestTypes2([]);
    })
    .finally(() => setOutboundLoading2(false));
}, [selOutbound2, oneToManyEnabled]);
```

#### 3. Update IntegrationFlowCard Component
Replace the IntegrationFlowCard function with:

```javascript
function IntegrationFlowCard({ outboundName, inboundName, outboundRequestName, inboundRequestName, oneToManyEnabled, outboundName2, outboundRequestName2 }) {
  if (oneToManyEnabled) {
    // One-to-Many mode
    return (
      <div className="la-flow-card">
        <div className="la-flow-card-header">
          <p className="la-flow-eyebrow"><i className="ti ti-topology-star-3" /> Integration Flow (ONE-TO-MANY)</p>
        </div>
        <div className="la-flow-diagram">
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px 1fr 160px", gap: 14, alignItems: "center", minWidth: 680 }}>
            <div className="la-flow-node la-flow-node--inbound">
              <i className="ti ti-building-bank" />
              <strong>{inboundName}</strong>
              {inboundRequestName && <span>{inboundRequestName}</span>}
            </div>
            <div className="la-flow-connector la-flow-connector--req">
              <span className="la-flow-label">SOURCE</span>
              <div className="la-flow-line">
                <i className="ti ti-arrow-right" />
              </div>
            </div>
            <div className="la-flow-esb">
              <i className="ti ti-circuit-switchboard" />
              <strong>Innobridge ESB</strong>
              <span>Orchestrate</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 40, height: 1, background: "rgba(22,163,74,0.4)" }} />
                <i className="ti ti-arrow-right" style={{ fontSize: 16, color: "var(--success)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 40, height: 1, background: "rgba(22,163,74,0.4)" }} />
                <i className="ti ti-arrow-right" style={{ fontSize: 16, color: "var(--success)" }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="la-flow-node la-flow-node--outbound" style={{ padding: "12px 10px" }}>
                <i className="ti ti-device-mobile" style={{ fontSize: 18 }} />
                <strong style={{ fontSize: 12 }}>{outboundName}</strong>
                {outboundRequestName && <span style={{ fontSize: 10 }}>{outboundRequestName}</span>}
              </div>
              <div className="la-flow-node la-flow-node--outbound" style={{ padding: "12px 10px" }}>
                <i className="ti ti-device-mobile" style={{ fontSize: 18 }} />
                <strong style={{ fontSize: 12 }}>{outboundName2 || "Outbound 2"}</strong>
                {outboundRequestName2 && <span style={{ fontSize: 10 }}>{outboundRequestName2}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original single mode (keep existing code)
  return (
    <div className="la-flow-card">
      {/* ... existing single mode JSX ... */}
    </div>
  );
}
```

#### 4. Add Checkbox and Second Outbound Fields in Adapter Selection

In the la-setup-grid section, add after the first outbound adapter fields:

```javascript
{/* ONE-TO-MANY CHECKBOX */}
<div style={{ gridColumn: "1 / -1", padding: "12px 16px", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, background: "rgba(245,158,11,0.06)" }}>
  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <input 
      type="checkbox" 
      checked={oneToManyEnabled} 
      onChange={e => {
        setOneToManyEnabled(e.target.checked);
        if (!e.target.checked) {
          setSelOutbound2("");
          setSelOutboundReq2("");
        }
      }}
      style={{ width: 18, height: 18 }}
    />
    <strong style={{ fontSize: 14, color: "var(--heading)" }}>☐ One-to-Many Integration</strong>
    <span style={{ fontSize: 12, color: "var(--muted)" }}>(Limit: 2 outbound adapters for Phase 1)</span>
  </label>
</div>

{/* SECOND OUTBOUND ADAPTER (conditional) */}
{oneToManyEnabled && (
  <>
    <div className="la-setup-side">
      <div className="la-setup-side-badge la-setup-side-badge--out">Outbound Adapter 2</div>
      <div className="field">
        <label>Adapter</label>
        <select value={selOutbound2} onChange={e => setSelOutbound2(e.target.value)}>
          <option value="">Select second outbound adapter…</option>
          {outboundList.filter(a => getOutboundId(a) !== selOutbound).map((a, i) => (
            <option key={`${getOutboundId(a)}-${i}`} value={getOutboundId(a)}>{getOutboundName(a)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Request Type</label>
        <select value={selOutboundReq2} disabled={!selOutbound2 || outboundLoading2} onChange={e => setSelOutboundReq2(e.target.value)}>
          <option value="">{outboundLoading2 ? "Loading…" : !selOutbound2 ? "Select adapter first" : "Select request type…"}</option>
          {outboundRequestTypes2.map((c, i) => {
            const name = getRequestName(c, "");
            const id = getConfigId(c,i) || name;
            return name ? <option key={id} value={name}>{name}</option> : null;
          })}
        </select>
      </div>
    </div>
  </>
)}
```

#### 5. Add Banner Warning

After the IntegrationFlowCard component usage:

```javascript
{oneToManyEnabled && (
  <div style={{ 
    padding: "14px 18px", 
    borderRadius: 12, 
    border: "1px solid rgba(245,158,11,0.3)", 
    background: "rgba(245,158,11,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 12
  }}>
    <i className="ti ti-alert-triangle" style={{ fontSize: 24, color: "#f59e0b", flexShrink: 0 }} />
    <div>
      <strong style={{ display: "block", fontSize: 13, color: "var(--heading)", marginBottom: 4 }}>
        Design Mode Only
      </strong>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>
        One-to-Many orchestration execution is not yet enabled. Configuration is stored for design validation.
      </span>
    </div>
  </div>
)}
```

#### 6. Update handleSave Function

Modify the payload structure to include one-to-many configuration:

```javascript
const payload = {
  inboundAdapterId: selInbound,
  outboundAdapterId: selOutbound,
  inboundRequestName: inboundRequestName || selInboundReq || null,
  outboundRequestName: outboundRequestName || selOutboundReq || null,
  requestMappings,
  responseMappings,
  dynamicFunctions: routeFunctionsToPayload(routeFunctions),
  routeFunctions: routeFunctionsToPayload(routeFunctions),
  // PHASE 1: One-to-Many configuration
  ...(oneToManyEnabled && {
    integrationMode: "ONE_TO_MANY",
    outbounds: [
      {
        adapterId: selOutbound,
        requestType: outboundRequestName || selOutboundReq,
      },
      ...(selOutbound2 && selOutboundReq2 ? [{
        adapterId: selOutbound2,
        requestType: selOutboundReq2,
      }] : [])
    ]
  })
};
```

#### 7. Update IntegrationFlowCard Props

Where IntegrationFlowCard is rendered, update to:

```javascript
const outboundAdapter2 = useMemo(() => outboundList.find(a=>getOutboundId(a)===selOutbound2), [outboundList, selOutbound2]);
const outboundConfig2  = useMemo(() => outboundConfigs2.find((c,i)=>getConfigId(c,i)===selOutboundReq2 || getRequestName(c,"")===selOutboundReq2), [outboundConfigs2, selOutboundReq2]);
const outboundAdapterName2 = useMemo(() => getOutboundName(outboundAdapter2) || "Outbound Adapter 2", [outboundAdapter2]);
const outboundRequestName2 = useMemo(() => getRequestName(outboundConfig2, selOutboundReq2), [outboundConfig2, selOutboundReq2]);

<IntegrationFlowCard
  outboundName={outboundAdapterName}
  inboundName={inboundAdapterName}
  outboundRequestName={outboundRequestName}
  inboundRequestName={inboundRequestName}
  oneToManyEnabled={oneToManyEnabled}
  outboundName2={outboundAdapterName2}
  outboundRequestName2={outboundRequestName2}
/>
```

## Testing Checklist

- [ ] Checkbox toggles one-to-many mode
- [ ] Second outbound adapter fields appear when enabled
- [ ] Flow diagram updates dynamically
- [ ] Banner warning displays in one-to-many mode
- [ ] Save payload includes integrationMode and outbounds array
- [ ] Saved configuration can be reloaded
- [ ] Backward compatibility maintained for one-to-one integrations

## Backend Requirements

The backend should accept and store:
```json
{
  "integrationMode": "ONE_TO_MANY",
  "outbounds": [
    {
      "adapterId": "OB-001",
      "requestType": "ACCOUNT_INQUIRY"
    },
    {
      "adapterId": "OB-002",
      "requestType": "BALANCE_CHECK"
    }
  ]
}
```

Runtime execution is NOT required for Phase 1. This is persistence only.
