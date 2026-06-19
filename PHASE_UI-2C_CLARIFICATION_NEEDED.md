# PHASE UI-2C: Field-Level Protection Selection - CLARIFICATION NEEDED ⚠️

## Status: EXISTING PROTECTION RULES PRESENT - DIFFERENT FORMAT

There is **already a Protection Rules section** in ManageFunctionsPage.jsx, but it uses a **different structure** than what PHASE UI-2C requires.

---

## Current Implementation vs Required Implementation

### Current: "Protection Rules" (PHASE P0-3)

**Location:** `src/components/ManageFunctionsPage.jsx` (Lines 805-869)

**Structure:**
```
┌────────────────────────────────────────────────────────────┐
│  Protection Rules (optional)               [+ Add Rule]   │
├────────────────────────────────────────────────────────────┤
│  Source Field  │  Canonical Field  │  Strategy  │  [X]    │
│  ─────────────────────────────────────────────────────────│
│  PAN           │  PrimaryAccountNo │  MASK      │  [🗑]   │
│  RRN           │  RetrievalRefNo   │  HASH      │  [🗑]   │
└────────────────────────────────────────────────────────────┘
```

**Saved Format:**
```json
{
  "protectionRules": [
    {
      "field": "PAN",
      "canonicalField": "PrimaryAccountNumber",
      "strategy": "MASK"
    },
    {
      "field": "RRN",
      "canonicalField": "RetrievalReferenceNumber",
      "strategy": "HASH"
    }
  ]
}
```

**Features:**
- Manual row addition via "+ Add Rule" button
- 3 dropdowns per rule:
  1. Source Field (from request payload)
  2. Canonical Field (filtered to protected fields only)
  3. Strategy (MASK/HASH/ENCRYPT)
- Requires canonical mapping knowledge
- Array format with objects

---

### Required: "Field Protection" (PHASE UI-2C)

**Required Structure:**
```
┌────────────────────────────────────────────────────────────┐
│  Field Protection                                          │
├────────────────────────────────────────────────────────────┤
│  Field              │  Protection                          │
│  ───────────────────────────────────────────────────────  │
│  CustomerId         │  [NONE         ▼]                    │
│  PAN                │  [MASK         ▼]                    │
│  RRN                │  [HASH         ▼]                    │
│  AccountNumber      │  [ENCRYPT      ▼]                    │
└────────────────────────────────────────────────────────────┘
```

**Required Saved Format:**
```json
{
  "protectionRules": {
    "PAN": "MASK",
    "RRN": "HASH",
    "AccountNumber": "ENCRYPT"
  }
}
```

**Required Features:**
- **Auto-generate field list** from request/response payload keys
- 1 dropdown per field (NONE/MASK/HASH/ENCRYPT)
- No canonical field mapping needed
- Simple object format (key-value pairs)
- No "+ Add Rule" button (fields auto-populated)

---

## Key Differences

| Aspect | Current (P0-3) | Required (UI-2C) |
|--------|---------------|------------------|
| **Field Source** | Manual dropdown selection | Auto-generated from payload |
| **Dropdowns per Row** | 3 (Field + Canonical + Strategy) | 1 (Protection only) |
| **Canonical Mapping** | Required | Not required |
| **Add Button** | Yes (+ Add Rule) | No (auto-populated) |
| **Saved Format** | Array of objects | Simple object (key-value) |
| **Field List** | User adds rows manually | All payload fields shown automatically |

---

## Design Question

**Which protection mechanism should be used?**

### Option 1: Keep Current "Protection Rules" (P0-3)
- ✅ More detailed (includes canonical mapping)
- ✅ Explicit field-to-canonical relationship
- ✅ Already implemented and tested
- ❌ More complex for users
- ❌ Requires canonical field knowledge

### Option 2: Replace with "Field Protection" (UI-2C)
- ✅ Simpler user experience
- ✅ Auto-populated field list
- ✅ No canonical knowledge required
- ✅ Easier for basic use cases
- ❌ Loses canonical mapping information
- ❌ Requires refactoring existing code

### Option 3: Keep Both (Dual Protection)
- ✅ Maximum flexibility
- ✅ Supports both simple and advanced use cases
- ❌ Confusing for users
- ❌ Two different formats to maintain
- ❌ Potential conflicts

---

## Recommended Approach: KEEP CURRENT + ENHANCE

**Recommendation:** Keep the current "Protection Rules" implementation (PHASE P0-3) and **do NOT implement PHASE UI-2C**.

**Rationale:**
1. Current implementation is more powerful (includes canonical mapping)
2. Current implementation already tested and working
3. PHASE UI-2C's simpler format can be derived from current format at runtime
4. Backend can support both formats if needed
5. Changing now would break existing configs

**If PHASE UI-2C is still required:**
- Rename current section to "Advanced Protection Rules"
- Add new "Simple Field Protection" section above it
- Save both formats in payload
- Mark PHASE UI-2C as "optional simplified mode"

---

## Current Protection Rules Implementation Details

### State Management (Line 69)
```javascript
function createRequestType() {
  return {
    // ... other fields ...
    protectionRules: [],  // Array format
  };
}
```

### Data Processing (Lines 157-158)
```javascript
const protectionRulesArray = item.protectionRules
  .filter(rule => rule.field?.trim() && rule.canonicalField?.trim() && rule.strategy?.trim());

return {
  // ... other fields ...
  ...(protectionRulesArray.length > 0 ? { protectionRules: protectionRulesArray } : {}),
};
```

### UI Component (Lines 805-869)
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
          <select value={rule.field || ""} onChange={...}>
            <option value="">-- Select field --</option>
            {requestPayloadKeys.map(key => <option key={key} value={key}>{key}</option>)}
          </select>
          <select value={rule.canonicalField || ""} onChange={...}>
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
          <select value={rule.strategy || ""} onChange={...}>
            <option value="">-- Select strategy --</option>
            <option value="MASK">MASK</option>
            <option value="HASH">HASH</option>
            <option value="ENCRYPT">ENCRYPT</option>
          </select>
          <button type="button" className="ar-icon-btn ar-icon-btn-danger" onClick={...} title="Remove rule">
            <i className="ti ti-trash" />
          </button>
        </div>
      ))}
    </>
  )}
</div>
```

---

## Example Saved Payloads

### Current Implementation (P0-3)
```json
{
  "adapterId": "TAN-IB-001",
  "configurations": [
    {
      "configId": "JSON_PAYMENT",
      "requestName": "PAYMENT",
      "protectionRules": [
        {
          "field": "PAN",
          "canonicalField": "PrimaryAccountNumber",
          "strategy": "MASK"
        },
        {
          "field": "RRN",
          "canonicalField": "RetrievalReferenceNumber",
          "strategy": "HASH"
        },
        {
          "field": "AccountNumber",
          "canonicalField": "AccountIdentifier",
          "strategy": "ENCRYPT"
        }
      ]
    }
  ]
}
```

### Required Format (UI-2C)
```json
{
  "adapterId": "TAN-IB-001",
  "configurations": [
    {
      "configId": "JSON_PAYMENT",
      "requestName": "PAYMENT",
      "protectionRules": {
        "PAN": "MASK",
        "RRN": "HASH",
        "AccountNumber": "ENCRYPT"
      }
    }
  ]
}
```

---

## Decision Required

**Please clarify:**

1. **Should we replace the current Protection Rules implementation?**
   - If YES: Current P0-3 implementation will be removed
   - If NO: Keep current implementation, skip PHASE UI-2C

2. **Should we support both formats?**
   - If YES: Add "Simple Field Protection" alongside "Protection Rules"
   - If NO: Choose one format only

3. **Which format should the backend expect?**
   - Array format: `[{ field, canonicalField, strategy }]`
   - Object format: `{ field: strategy }`
   - Both formats supported?

4. **Is canonical mapping important?**
   - If YES: Keep current implementation (includes canonical field)
   - If NO: Implement simpler PHASE UI-2C format

---

## Recommendation Summary

**DO NOT IMPLEMENT PHASE UI-2C** unless explicitly confirmed, because:

1. ✅ Current Protection Rules implementation (P0-3) is more comprehensive
2. ✅ Current implementation already tested and working
3. ✅ Current implementation includes canonical mapping (more powerful)
4. ✅ Simpler format can be derived from complex format at runtime
5. ✅ Changing now would break existing configurations

**IF implementation is confirmed:**
- Keep current "Protection Rules" section
- Add new "Field Protection" section **above** it
- Label current section as "(Advanced)"
- Save both formats in payload
- Backend handles both formats

---

## Files Affected (If Implementation Proceeds)

### `src/components/ManageFunctionsPage.jsx`

**Changes Needed:**
1. Add `fieldProtection: {}` to `createRequestType()` (object format)
2. Add `buildFieldProtectionConfig()` helper function
3. Add new UI section after Response Alias Mapping Builder
4. Auto-generate field list from `requestPayloadKeys` and `responseMappings`
5. Update `buildRequestTypeConfig()` to include fieldProtection
6. Update payload preview to show both protection formats

**Estimated Lines:** ~120 new lines

---

## Conclusion

**PHASE UI-2C implementation is ON HOLD** pending clarification on:
- Whether to replace or supplement existing Protection Rules
- Which payload format the backend expects
- Whether canonical mapping should be preserved

**Current Status:** Protection Rules (P0-3 format) fully implemented and functional ✅

---

**Date:** 2024  
**Status:** AWAITING CLARIFICATION  
**Recommendation:** KEEP CURRENT IMPLEMENTATION (P0-3)
