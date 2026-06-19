# PHASE P0-3 REVISED: Architecture Correction Implementation

## IMPLEMENTATION STATUS: ✅ PARTIALLY COMPLETE

---

## Completed Changes

### 1. ✅ Removed CreateRequestTypePage Route
- **File:** `src/App.jsx`
- **Actions:**
  - Removed import of CreateRequestTypePage
  - Removed "Create Request Type" tab from TABS array
  - Removed route handler for `activeTab === "create_request"`

### 2. ✅ Added ISO8583/ISO20022 Protocol Selection to Create Adapter Page
- **File:** `src/components/CreateAdapterPage.jsx`
- **Actions:**
  - Added imports: `getIso8583Mtis`, `getIso20022Families`, `getIso20022Messages`
  - Added `protocolMeta` state for MTI/Family/Message selection
  - Added useEffect to load protocol metadata based on selected format
  - Added ISO8583 MTI dropdown (appears when format = ISO8583)
  - Added ISO20022 Family dropdown (appears when format = ISO20022)
  - Added ISO20022 Message Type dropdown (cascades from Family selection)
  - Updated `createInboundAdapter` payload to include `protocolMetadata`
  - Added validation: MTI required for ISO8583, Family+Message required for ISO20022

### 3. ✅ Removed Custom Headers from Create Adapter Page
- **File:** `src/components/CreateAdapterPage.jsx`
- **Actions:**
  - Removed `CustomHeadersEditor` component
  - Removed `customHeaders` state
  - Removed headers section from HTTP/HTTPS protocol fields
  - Removed `outboundPayload.headers` assignment

---

## Remaining Changes Required

### 4. ⏳ Remove Conditions from ManageFunctionsPage
- **File:** `src/components/ManageFunctionsPage.jsx`
- **Actions Required:**
  - Remove `import ConditionBuilderModal`
  - Remove `conditions: []` from `createRequestType()`
  - Remove `conditions` filtering in `buildRequestTypeConfig()`
  - Remove `conditionModal` state
  - Remove Conditions panel from UI (lines ~859-895)
  - Remove condition preview in payload (line 996)
  - Remove `{conditionModal !== null && ...}` block (lines 1095-1113)
  - Remove `setConditionModal` calls

### 5. ⏳ Add Custom Headers to ManageFunctionsPage
- **File:** `src/components/ManageFunctionsPage.jsx`
- **Actions Required:**
  - Add `customHeaders: {}` to `createRequestType()`
  - Add `customHeaders` state management in component
  - Add Custom Headers panel UI (similar to Custom Fields)
  - Include `customHeaders` in `buildRequestTypeConfig()` output
  - Add to payload preview

### 6. ⏳ Add Protection Rules to ManageFunctionsPage
- **File:** `src/components/ManageFunctionsPage.jsx`
- **Actions Required:**
  - Add `protectionRules: []` to `createRequestType()`
  - Add Protection Rules panel UI
  - Add rule builder modal/inline editor
  - Include `protectionRules` in `buildRequestTypeConfig()` output
  - Validation: field must be from canonical mapping

### 7. ⏳ Remove CreateRequestTypePage.jsx
- **File:** `src/components/CreateRequestTypePage.jsx`
- **Action:** Delete file completely

### 8. ⏳ Remove ConditionBuilderModal.jsx
- **File:** `src/components/ConditionBuilderModal.jsx`
- **Action:** Delete file completely

---

## Architecture Diagram (CORRECTED)

```
┌────────────────────────────────────────────────────────────────┐
│  USER WORKFLOW                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. CREATE ADAPTER                                            │
│     └─ CreateAdapterPage                                      │
│        ├─ Basic info (name, protocol, host, port)            │
│        ├─ Format selection (JSON, XML, ISO8583, ISO20022)    │
│        ├─ ISO8583: Select MTI ◄─────────────────┐            │
│        └─ ISO20022: Select Family + Message ◄───┤            │
│                                                   │            │
│  2. MANAGE FUNCTIONS                             │            │
│     └─ ManageFunctionsPage                       │            │
│        ├─ Request Types (multiple per adapter) ◄─┤            │
│        │  ├─ Request Payload Definition          │            │
│        │  ├─ Response Payload Definition         │            │
│        │  ├─ Request Mappings (source→canonical) │            │
│        │  └─ Response Mappings (source→canonical)│            │
│        ├─ Custom Fields                          │            │
│        ├─ Dynamic Functions                      │            │
│        ├─ Custom Headers ◄─── NEW               │            │
│        └─ Protection Rules ◄── NEW               │            │
│                                                   │            │
│  3. LINK ADAPTERS                                 │            │
│     └─ LinkAdapters                               │            │
│        ├─ Select Outbound + Request Type          │            │
│        ├─ Select Inbound + Request Type           │            │
│        ├─ Map Request Fields (outbound→inbound)   │            │
│        └─ Map Response Fields (inbound→outbound)  │            │
│                                                   │            │
└───────────────────────────────────────────────────┘            │
                                                                 │
         Protocol Metadata Selected at Adapter Creation ────────┘
         (MTI / Family+Message determines available fields)
```

---

## Data Flow

### 1. Inbound Adapter Creation

```javascript
// CreateAdapterPage.jsx
const payload = {
  adapterName: "BANK_A_INBOUND",
  type: "ISO8583",
  timeout_seconds: 30,
  requestName: "BASE_ROUTER",
  username: "admin",
  protocolMetadata: {
    format: "ISO8583",
    mti: "0200"  // ◄── Selected during adapter creation
  }
};

await createInboundAdapter(payload);
```

### 2. Request Type Configuration (ManageFunctionsPage)

```javascript
// ManageFunctionsPage.jsx
const requestType = {
  requestName: "BALANCE_INQUIRY",
  requestPayload: "...",  // If not ISO8583/ISO20022
  responsePayload: "...", // If not ISO8583/ISO20022
  requestMappings: [
    { sourceKey: "DE2", canonicalKey: "PrimaryAccountNumber" },
    { sourceKey: "DE3", canonicalKey: "ProcessingCode" }
  ],
  responseMappings: [
    { sourceKey: "DE38", canonicalKey: "AuthorizationCode" },
    { sourceKey: "DE39", canonicalKey: "ResponseCode" }
  ],
  customFields: {
    "channel": "MOBILE",
    "sourceSystem": "BANK_A"
  },
  dynamicFunctions: {
    "timestamp": "CURRENT_TIMESTAMP()",
    "feeAmount": "CALC_FEE(DE4)"
  },
  customHeaders: {  // ◄── NEW
    "X-Request-ID": "uuid()",
    "X-Channel": "ESB"
  },
  protectionRules: [  // ◄── NEW
    {
      field: "DE2",
      canonicalField: "PrimaryAccountNumber",
      strategy: "MASK"
    },
    {
      field: "DE35",
      canonicalField: "Track2Data",
      strategy: "ENCRYPT"
    }
  ]
};
```

### 3. Integration Mapping (LinkAdapters)

```javascript
// LinkAdapters.jsx - unchanged
const mapping = {
  outboundAdapterId: "TAN-OB-001",
  outboundRequestName: "BALANCE_INQUIRY",
  inboundAdapterId: "TAN-IB-001",
  inboundRequestName: "CORE_BALANCE_CHECK",
  requestMappings: {
    "mobileAccountNo": { sourceField: "DE2", targetField: "accountNumber" },
    "txnAmount": { sourceField: "DE4", targetField: "amount" }
  },
  responseMappings: {
    "coreBalance": { sourceField: "availableBalance", targetField: "DE54" },
    "coreStatus": { sourceField: "statusCode", targetField: "DE39" }
  }
};
```

---

## Custom Headers Implementation

### UI Component (to add to ManageFunctionsPage)

```jsx
<div className="mf-panel">
  <div className="mf-panel-head">
    <span>Custom Headers <em>(optional)</em></span>
    <button
      type="button"
      className="btn-ghost"
      onClick={() => addRow(typeIndex, "customHeaders", { key: "", value: "" })}
    >
      <i className="ti ti-plus" /> Add Header
    </button>
  </div>
  {requestType.customHeaders.length > 0 && (
    <>
      <div className="mf-grid-row mf-grid-row--head" style={{ gridTemplateColumns: "1fr 1fr 32px" }}>
        <span>Header Name</span>
        <span>Header Value</span>
        <span />
      </div>
      {requestType.customHeaders.map((header, rowIndex) => (
        <div className="mf-grid-row" key={rowIndex} style={{ gridTemplateColumns: "1fr 1fr 32px" }}>
          <input
            type="text"
            value={header.key || ""}
            placeholder="e.g. X-Request-ID"
            onChange={event => updateRow(typeIndex, "customHeaders", rowIndex, "key", event.target.value)}
          />
          <input
            type="text"
            value={header.value || ""}
            placeholder="e.g. uuid()"
            onChange={event => updateRow(typeIndex, "customHeaders", rowIndex, "value", event.target.value)}
          />
          <button
            type="button"
            className="ar-icon-btn ar-icon-btn-danger"
            style={{ opacity: 1 }}
            onClick={() => removeRow(typeIndex, "customHeaders", rowIndex)}
            title="Remove header"
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}
    </>
  )}
</div>
```

---

## Protection Rules Implementation

### UI Component (to add to ManageFunctionsPage)

```jsx
<div className="mf-panel">
  <div className="mf-panel-head">
    <span>Protection Rules <em>(optional)</em></span>
    <button
      type="button"
      className="btn-ghost"
      onClick={() => addRow(typeIndex, "protectionRules", { field: "", canonicalField: "", strategy: "" })}
    >
      <i className="ti ti-plus" /> Add Rule
    </button>
  </div>
  {requestType.protectionRules.length > 0 && (
    <>
      <div className="mf-grid-row mf-grid-row--head" style={{ gridTemplateColumns: "1fr 1fr 1fr 32px" }}>
        <span>Source Field</span>
        <span>Canonical Field</span>
        <span>Strategy</span>
        <span />
      </div>
      {requestType.protectionRules.map((rule, rowIndex) => (
        <div className="mf-grid-row" key={rowIndex} style={{ gridTemplateColumns: "1fr 1fr 1fr 32px" }}>
          <select
            value={rule.field || ""}
            onChange={event => updateRow(typeIndex, "protectionRules", rowIndex, "field", event.target.value)}
          >
            <option value="">-- Select field --</option>
            {requestPayloadKeys.map(key => <option key={key} value={key}>{key}</option>)}
          </select>
          <select
            value={rule.canonicalField || ""}
            onChange={event => updateRow(typeIndex, "protectionRules", rowIndex, "canonicalField", event.target.value)}
          >
            <option value="">-- Select canonical field --</option>
            {sortedCanonicalFields
              .filter(field => {
                const meta = getCanonicalProtectionMeta(field);
                return meta && meta.required;
              })
              .map((field, fieldIndex) => {
                const name = fieldName(field);
                return <option key={fieldId(field) || fieldIndex} value={name}>{name}</option>;
              })}
          </select>
          <select
            value={rule.strategy || ""}
            onChange={event => updateRow(typeIndex, "protectionRules", rowIndex, "strategy", event.target.value)}
          >
            <option value="">-- Select strategy --</option>
            <option value="MASK">MASK</option>
            <option value="HASH">HASH</option>
            <option value="ENCRYPT">ENCRYPT</option>
          </select>
          <button
            type="button"
            className="ar-icon-btn ar-icon-btn-danger"
            style={{ opacity: 1 }}
            onClick={() => removeRow(typeIndex, "protectionRules", rowIndex)}
            title="Remove rule"
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}
    </>
  )}
</div>
```

---

## Files to Delete

1. `src/components/CreateRequestTypePage.jsx` - No longer needed
2. `src/components/ConditionBuilderModal.jsx` - Conditions removed from architecture
3. `PHASE_P0-3_ROUTING_PROOF.md` - Created in error
4. `NAVIGATION_GUIDE.md` - Created in error (partially completed)

---

## Build Verification

```bash
npm run build
```

**Expected:** ✅ Clean build after all changes applied

---

## Testing Checklist

### Create Adapter Flow
- [ ] Create inbound adapter with JSON format
- [ ] Create inbound adapter with ISO8583 format
  - [ ] Verify MTI dropdown appears
  - [ ] Verify MTI selection is required
  - [ ] Verify MTI is included in API payload
- [ ] Create inbound adapter with ISO20022 format
  - [ ] Verify Family dropdown appears
  - [ ] Verify Message dropdown appears after Family selection
  - [ ] Verify both are required
  - [ ] Verify Family+Message included in API payload
- [ ] Create outbound adapter (unchanged behavior)

### Manage Functions Flow
- [ ] Navigate to Manage Functions from adapter registry
- [ ] Create Request Type #1
  - [ ] Define request/response payloads
  - [ ] Add request mappings
  - [ ] Add response mappings
  - [ ] Add custom fields
  - [ ] Add dynamic functions
  - [ ] Add custom headers (NEW)
  - [ ] Add protection rules (NEW)
- [ ] Verify Conditions section is NOT present
- [ ] Verify payload preview includes all sections
- [ ] Save and verify API payload structure

---

## Status Summary

| Task | Status | File |
|------|--------|------|
| Remove CreateRequestTypePage route | ✅ DONE | App.jsx |
| Add ISO8583 MTI selection | ✅ DONE | CreateAdapterPage.jsx |
| Add ISO20022 Family/Message selection | ✅ DONE | CreateAdapterPage.jsx |
| Remove Custom Headers from Create Adapter | ✅ DONE | CreateAdapterPage.jsx |
| Remove Conditions from Manage Functions | ⏳ TODO | ManageFunctionsPage.jsx |
| Add Custom Headers to Manage Functions | ⏳ TODO | ManageFunctionsPage.jsx |
| Add Protection Rules to Manage Functions | ⏳ TODO | ManageFunctionsPage.jsx |
| Delete CreateRequestTypePage.jsx | ⏳ TODO | File deletion |
| Delete ConditionBuilderModal.jsx | ⏳ TODO | File deletion |

---

**Next Actions:**
1. Complete ManageFunctionsPage refactoring
2. Delete obsolete files
3. Build and test end-to-end workflow
4. Capture screenshots for documentation

---

**CRITICAL NOTE:**
ManageFunctionsPage.jsx is 1100+ lines. The remaining changes require careful surgical editing to:
- Remove all condition-related code
- Add custom headers panel
- Add protection rules panel
- Update createRequestType() initial state
- Update buildRequestTypeConfig() to include new sections
- Maintain existing request type, mapping, custom field, and function logic

Would you like me to proceed with these remaining changes now?
