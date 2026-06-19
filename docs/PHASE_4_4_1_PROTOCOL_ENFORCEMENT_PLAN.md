# PHASE 4.4.1 - PROTOCOL ENFORCEMENT IMPLEMENTATION PLAN

## EXECUTIVE SUMMARY

**Objective:** Remove all free-text input paths for ISO8583 and ISO20022 protocols in normal mode to enforce protocol metadata integrity.

**Status:** Implementation Plan - Ready for Execution

**Impact:** HIGH - Breaking change for protocol adapters, no impact on JSON/XML/CSV/DB adapters

---

## REMOVED FREE-TEXT PATHS

### 1. LinkAdapters.jsx - MappingTypeModal

**BEFORE:**
```javascript
// Line 289-293: Free-text target field input
{!targetField && (
  <div className="field">
    <label>Target Field</label>
    <input value={tgt} onChange={e => setTgt(e.target.value)} placeholder="e.g. remarks" autoFocus />
  </div>
)}
```

**AFTER:**
```javascript
// Protocol-aware dropdown or free-text based on format
{!targetField && (
  <div className="field">
    <label>Target Field</label>
    {isProtocolAdapter && !isExtensionMode ? (
      <select value={tgt} onChange={e => setTgt(e.target.value)} autoFocus>
        <option value="">Select target field...</option>
        {availableTargetFields.map(f => (
          <option key={f.name} value={f.name}>{f.name}</option>
        ))}
      </select>
    ) : (
      <>
        <input value={tgt} onChange={e => setTgt(e.target.value)} placeholder="e.g. remarks" autoFocus />
        {isProtocolAdapter && isExtensionMode && (
          <div className="protocol-extension-badge">
            <i className="ti ti-alert-triangle" /> Protocol Extension Mode
          </div>
        )}
      </>
    )}
  </div>
)}
```

**Vulnerability Closed:** ✅ ISO8583/ISO20022 field name bypass

---

### 2. ManageFunctionsPage.jsx - Source Key Inputs

#### Request Mappings

**BEFORE:**
```javascript
// Line 596-600: Free-text source key input
<input
  type="text"
  value={mapping.sourceKey}
  placeholder="e.g. cust_id"
  onChange={event => updateRow(typeIndex, "requestMappings", rowIndex, "sourceKey", event.target.value)}
/>
```

**AFTER:**
```javascript
// Protocol-aware dropdown for ISO8583/ISO20022
{isProtocolFormat(adapterFormat) && !isExtensionMode ? (
  <select
    value={mapping.sourceKey}
    onChange={event => updateRow(typeIndex, "requestMappings", rowIndex, "sourceKey", event.target.value)}
  >
    <option value="">Select field...</option>
    {protocolRequestFields.map(f => (
      <option key={f.name} value={f.name}>
        {f.name} {f.required ? '*' : ''}
      </option>
    ))}
  </select>
) : (
  <>
    <input
      type="text"
      value={mapping.sourceKey}
      placeholder="e.g. cust_id"
      onChange={event => updateRow(typeIndex, "requestMappings", rowIndex, "sourceKey", event.target.value)}
    />
    {isProtocolFormat(adapterFormat) && isExtensionMode && (
      <span className="extension-badge" title="Extension field">
        <i className="ti ti-puzzle" /> EXT
      </span>
    )}
  </>
)}
```

**Vulnerability Closed:** ✅ ISO8583 DE999, ISO20022 random XPath bypass

---

#### Response Mappings

**BEFORE:**
```javascript
// Line 707-711: Free-text response key input
<input
  type="text"
  value={mapping.sourceKey || ""}
  placeholder="e.g. status"
  onChange={event => updateRow(typeIndex, "responseMappings", rowIndex, "sourceKey", event.target.value)}
/>
```

**AFTER:**
```javascript
// Same pattern as request mappings
{isProtocolFormat(adapterFormat) && !isExtensionMode ? (
  <select
    value={mapping.sourceKey || ""}
    onChange={event => updateRow(typeIndex, "responseMappings", rowIndex, "sourceKey", event.target.value)}
  >
    <option value="">Select field...</option>
    {protocolResponseFields.map(f => (
      <option key={f.name} value={f.name}>
        {f.name} {f.required ? '*' : ''} {f.responseOnly ? '(response)' : ''}
      </option>
    ))}
  </select>
) : (
  <>
    <input
      type="text"
      value={mapping.sourceKey || ""}
      placeholder="e.g. status"
      onChange={event => updateRow(typeIndex, "responseMappings", rowIndex, "sourceKey", event.target.value)}
    />
    {isProtocolFormat(adapterFormat) && isExtensionMode && (
      <span className="extension-badge" title="Extension field">
        <i className="ti ti-puzzle" /> EXT
      </span>
    )}
  </>
)}
```

**Vulnerability Closed:** ✅ Response field bypass

---

#### Dynamic Functions Output Field

**BEFORE:**
```javascript
// Line 886-889: Free-text output field
<input
  value={fn.outputField || ""}
  placeholder="e.g. customerName"
  onChange={event => updateRow(typeIndex, "dynamicFunctions", rowIndex, "outputField", event.target.value)}
/>
```

**AFTER:**
```javascript
// Validate output field doesn't conflict with protocol fields
{isProtocolFormat(adapterFormat) && !isExtensionMode ? (
  <select
    value={fn.outputField || ""}
    onChange={event => updateRow(typeIndex, "dynamicFunctions", rowIndex, "outputField", event.target.value)}
  >
    <option value="">Select output field...</option>
    {allProtocolFields.map(f => (
      <option key={f.name} value={f.name}>{f.name}</option>
    ))}
    <optgroup label="Custom Output Fields">
      {customFields.map(f => (
        <option key={f} value={f}>{f}</option>
      ))}
    </optgroup>
  </select>
) : (
  <>
    <input
      value={fn.outputField || ""}
      placeholder="e.g. customerName"
      onChange={event => updateRow(typeIndex, "dynamicFunctions", rowIndex, "outputField", event.target.value)}
    />
    {isProtocolFormat(adapterFormat) && isExtensionMode && (
      <span className="extension-badge">EXT</span>
    )}
  </>
)}
```

**Vulnerability Closed:** ✅ Function output field conflict prevention

---

### 3. ConditionBuilderModal.jsx - Source Field Input

**BEFORE:**
```javascript
// Line 52-59: Free-text fallback when no source fields
) : (
  <input
    type="text"
    value={form.sourceField}
    placeholder="e.g. status"
    onChange={e => set("sourceField", e.target.value)}
  />
)
```

**AFTER:**
```javascript
// Remove free-text fallback for protocol adapters
) : isProtocolFormat ? (
  <div className="field-error" style={{padding: 12, background: "var(--danger-soft)"}}>
    <i className="ti ti-alert-circle" /> No source fields available for this protocol adapter.
    Please extract fields from request payload first.
  </div>
) : (
  <input
    type="text"
    value={form.sourceField}
    placeholder="e.g. status"
    onChange={e => set("sourceField", e.target.value)}
  />
)}
```

**Vulnerability Closed:** ✅ Condition source field bypass

---

### 4. CreateRequestTypePage.jsx - Schema Definition

**BEFORE:**
```javascript
// Line 168-177: Free-text JSON schema input
<textarea
  value={requestPayload}
  placeholder='{\\n  "customerId": "string",\\n  "accountNumber": "string",\\n  "amount": "number"\\n}'
  onChange={e => setRequestPayload(e.target.value)}
  rows={12}
  style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
  autoFocus
/>
```

**AFTER:**
```javascript
// Protocol-aware schema validation
<div>
  <textarea
    value={requestPayload}
    placeholder={isProtocolFormat(form.format) 
      ? 'Protocol fields will be auto-populated from registry'
      : '{\\n  "customerId": "string",\\n  "accountNumber": "string",\\n  "amount": "number"\\n}'
    }
    onChange={e => {
      setRequestPayload(e.target.value);
      if (isProtocolFormat(form.format)) {
        validateProtocolSchema(e.target.value, form.format, 'request');
      }
    }}
    rows={12}
    style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
    readOnly={isProtocolFormat(form.format) && !extensionMode}
    autoFocus
  />
  {isProtocolFormat(form.format) && !extensionMode && (
    <div className="protocol-notice">
      <i className="ti ti-info-circle" /> Protocol fields are read-only. 
      Enable Extension Mode to add custom fields.
    </div>
  )}
  {schemaValidationError && (
    <div className="field-error-msg">
      <i className="ti ti-alert-triangle" /> {schemaValidationError}
    </div>
  )}
</div>
```

**Vulnerability Closed:** ✅ Schema definition bypass for ISO8583/ISO20022

---

## PROTOCOL DETECTION UTILITY

Create new utility file: `src/utils/protocolEnforcement.js`

```javascript
/**
 * Protocol Enforcement Utilities
 * 
 * Determines if adapter format requires protocol metadata enforcement
 */

export const PROTOCOL_FORMATS = ['ISO8583', 'ISO20022', 'ISO_8583', 'ISO_20022'];

export function isProtocolFormat(format) {
  if (!format) return false;
  const normalized = String(format).toUpperCase().replace(/[-_\s]/g, '');
  return normalized === 'ISO8583' || normalized === 'ISO20022';
}

export function getProtocolType(format) {
  if (!format) return null;
  const normalized = String(format).toUpperCase().replace(/[-_\s]/g, '');
  if (normalized === 'ISO8583') return 'ISO8583';
  if (normalized === 'ISO20022') return 'ISO20022';
  return null;
}

export function isExtensionMode(adapter) {
  return Boolean(
    adapter?.metadata?.extensionMode === 'ADVANCED' ||
    adapter?.extensionMode === true ||
    adapter?.advancedMode === true ||
    adapter?.protocolExtension === true
  );
}

export function validateProtocolField(fieldName, protocolType, availableFields) {
  if (!isProtocolFormat(protocolType)) return { valid: true };
  
  const fieldExists = availableFields.some(f => f.name === fieldName || f.de === fieldName || f.path === fieldName);
  
  if (!fieldExists) {
    return {
      valid: false,
      error: `Field '${fieldName}' is not defined in ${protocolType} registry`,
      suggestion: 'Select a field from the dropdown or enable Extension Mode'
    };
  }
  
  return { valid: true };
}

export function getProtocolFieldsFromRegistry(protocolType, direction = 'request') {
  // Import from protocolRegistry.js
  import { PROTOCOL_REGISTRY } from '../config/protocolRegistry';
  
  if (protocolType === 'ISO8583') {
    const fields = direction === 'request' 
      ? PROTOCOL_REGISTRY.ISO8583.dataElements.primaryFields
      : PROTOCOL_REGISTRY.ISO8583.dataElements.primaryFields;
    
    return fields.map(f => ({
      name: `DE${f.de}`,
      displayName: f.name,
      type: f.type,
      required: f.required,
      responseOnly: f.responseOnly || false,
      maxLength: f.maxLength,
      pciProtection: f.pciProtection
    }));
  }
  
  if (protocolType === 'ISO20022') {
    const fields = direction === 'request'
      ? PROTOCOL_REGISTRY.ISO20022.commonFields.creditTransferTransaction
      : PROTOCOL_REGISTRY.ISO20022.commonFields.statusInformation;
    
    return fields.map(f => ({
      name: f.path,
      displayName: f.name,
      type: f.type,
      required: f.required,
      responseOnly: f.responseOnly || false,
      roundTripSafe: f.roundTripSafe
    }));
  }
  
  return [];
}
```

---

## EXTENSION MODE BADGE COMPONENT

Create new component: `src/components/ProtocolExtensionBadge.jsx`

```javascript
export default function ProtocolExtensionBadge({ show, inline = false }) {
  if (!show) return null;
  
  if (inline) {
    return (
      <span className="protocol-ext-badge-inline" title="Protocol Extension Mode Active">
        <i className="ti ti-puzzle" /> EXT
      </span>
    );
  }
  
  return (
    <div className="protocol-ext-badge-banner">
      <i className="ti ti-alert-triangle" />
      <div>
        <strong>Protocol Extension Mode</strong>
        <p>Custom fields are allowed but may not be compatible with all protocol processors</p>
      </div>
    </div>
  );
}
```

**CSS (add to index.css):**
```css
.protocol-ext-badge-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: #f59e0b;
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.protocol-ext-badge-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
}

.protocol-ext-badge-banner i {
  font-size: 24px;
  color: #f59e0b;
}

.protocol-ext-badge-banner strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--heading);
  margin-bottom: 2px;
}

.protocol-ext-badge-banner p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
```

---

## RUNTIME VALIDATION FUNCTION

Add to `src/utils/protocolEnforcement.js`:

```javascript
export function validateMappingForProtocol(mapping, sourceFormat, targetFormat, availableSourceFields, availableTargetFields) {
  const errors = [];
  
  // Source field validation
  if (isProtocolFormat(sourceFormat)) {
    const sourceValidation = validateProtocolField(
      mapping.sourceField,
      getProtocolType(sourceFormat),
      availableSourceFields
    );
    if (!sourceValidation.valid) {
      errors.push({
        field: 'sourceField',
        value: mapping.sourceField,
        error: sourceValidation.error,
        suggestion: sourceValidation.suggestion
      });
    }
  }
  
  // Target field validation
  if (isProtocolFormat(targetFormat)) {
    const targetValidation = validateProtocolField(
      mapping.targetField,
      getProtocolType(targetFormat),
      availableTargetFields
    );
    if (!targetValidation.valid) {
      errors.push({
        field: 'targetField',
        value: mapping.targetField,
        error: targetValidation.error,
        suggestion: targetValidation.suggestion
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateAllMappings(rows, sourceFormat, targetFormat, sourceFields, targetFields) {
  const results = rows.map(row => ({
    row,
    validation: validateMappingForProtocol(row, sourceFormat, targetFormat, sourceFields, targetFields)
  }));
  
  const invalid = results.filter(r => !r.validation.valid);
  
  return {
    valid: invalid.length === 0,
    invalidCount: invalid.length,
    invalidMappings: invalid,
    allResults: results
  };
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Utility Functions
- [ ] Create `src/utils/protocolEnforcement.js`
- [ ] Add protocol detection functions
- [ ] Add validation functions
- [ ] Add protocol field extraction from registry
- [ ] Write unit tests for utility functions

### Phase 2: Badge Component
- [ ] Create `src/components/ProtocolExtensionBadge.jsx`
- [ ] Add CSS styles to `src/index.css`
- [ ] Test badge rendering in different contexts

### Phase 3: LinkAdapters.jsx Modifications
- [ ] Import protocol enforcement utilities
- [ ] Detect adapter format from config
- [ ] Detect extension mode from adapter metadata
- [ ] Replace target field input (line 289-293)
- [ ] Add protocol field dropdowns
- [ ] Add extension mode badge
- [ ] Test with ISO8583 adapter
- [ ] Test with ISO20022 adapter
- [ ] Test with JSON adapter (should still allow free-text)

### Phase 4: ManageFunctionsPage.jsx Modifications
- [ ] Import protocol enforcement utilities
- [ ] Replace request mapping source key input (line 596-600)
- [ ] Replace response mapping source key input (line 707-711)
- [ ] Replace dynamic function output field (line 886-889)
- [ ] Add protocol field dropdowns
- [ ] Add extension mode badges
- [ ] Add validation before save
- [ ] Test protocol enforcement
- [ ] Test extension mode toggle

### Phase 5: ConditionBuilderModal.jsx Modifications
- [ ] Import protocol enforcement utilities
- [ ] Remove free-text fallback for protocol adapters (line 52-59)
- [ ] Add error message for missing fields
- [ ] Test with protocol adapters

### Phase 6: CreateRequestTypePage.jsx Modifications
- [ ] Import protocol enforcement utilities
- [ ] Add protocol schema validation
- [ ] Make schema textarea read-only for protocols (unless extension mode)
- [ ] Add protocol field auto-population
- [ ] Add extension mode toggle
- [ ] Test schema validation

### Phase 7: Runtime Validation
- [ ] Add validation hook before save in LinkAdapters
- [ ] Add validation hook before save in ManageFunctionsPage
- [ ] Display validation errors to user
- [ ] Prevent save if validation fails
- [ ] Add validation bypass in extension mode

### Phase 8: Testing & Documentation
- [ ] Test ISO8583 normal mode (should block DE999)
- [ ] Test ISO8583 extension mode (should allow custom)
- [ ] Test ISO20022 normal mode (should block random paths)
- [ ] Test ISO20022 extension mode (should allow custom)
- [ ] Test JSON/XML (should always allow free-text)
- [ ] Document extension mode activation
- [ ] Create user guide for protocol enforcement
- [ ] Update API documentation

---

## BEHAVIORAL MATRIX

| Format | Mode | Source Field | Target Field | Schema | Validation |
|--------|------|--------------|--------------|--------|------------|
| JSON | Normal | ✅ Free-text | ✅ Free-text | ✅ Free-text | ❌ None |
| XML | Normal | ✅ Free-text | ✅ Free-text | ✅ Free-text | ❌ None |
| CSV | Normal | ✅ Free-text | ✅ Free-text | ✅ Free-text | ❌ None |
| DB | Normal | ✅ Free-text | ✅ Free-text | ✅ Free-text | ❌ None |
| **ISO8583** | **Normal** | **🔒 Dropdown** | **🔒 Dropdown** | **🔒 Read-only** | **✅ Strict** |
| **ISO8583** | **Extension** | **⚠️ Free-text** | **⚠️ Free-text** | **⚠️ Free-text** | **⚠️ Warning** |
| **ISO20022** | **Normal** | **🔒 Dropdown** | **🔒 Dropdown** | **🔒 Read-only** | **✅ Strict** |
| **ISO20022** | **Extension** | **⚠️ Free-text** | **⚠️ Free-text** | **⚠️ Free-text** | **⚠️ Warning** |

**Legend:**
- ✅ = Allowed without restriction
- 🔒 = Restricted to protocol registry
- ⚠️ = Allowed with warning badge
- ❌ = No validation

---

## BEFORE/AFTER COMPARISON

### Scenario 1: ISO8583 Normal Mode

**BEFORE:**
```
User types: "DE999" → ✅ Accepted → 💥 Runtime failure
User types: "CUSTOM_FIELD" → ✅ Accepted → 💥 Invalid bitmap
```

**AFTER:**
```
User sees dropdown: [DE2, DE3, DE4, ...] → 🔒 Must select
User tries "DE999" → ❌ Not in dropdown → ✅ Cannot bypass
```

### Scenario 2: ISO20022 Normal Mode

**BEFORE:**
```
User types: "Random/XML/Path" → ✅ Accepted → 💥 Invalid message
User types: "Custom/Node" → ✅ Accepted → 💥 Schema violation
```

**AFTER:**
```
User sees dropdown: [GrpHdr/MsgId, CdtTrfTxInf/Amt/InstdAmt, ...] → 🔒 Must select
User tries random path → ❌ Not in dropdown → ✅ Cannot bypass
```

### Scenario 3: ISO8583 Extension Mode

**BEFORE:**
Same as Scenario 1

**AFTER:**
```
Extension mode enabled → ⚠️ Warning badge displayed
User types: "CUSTOM_FEE_FIELD" → ⚠️ Accepted with warning
Save payload includes: { extensionFields: ["CUSTOM_FEE_FIELD"] }
Runtime handles extension → ✅ Graceful handling
```

---

## ESTIMATED EFFORT

| Task | Effort | Priority |
|------|--------|----------|
| Utility functions | 2 hours | HIGH |
| Badge component | 1 hour | MEDIUM |
| LinkAdapters modifications | 4 hours | HIGH |
| ManageFunctionsPage modifications | 6 hours | HIGH |
| ConditionBuilderModal modifications | 1 hour | MEDIUM |
| CreateRequestTypePage modifications | 3 hours | MEDIUM |
| Runtime validation | 2 hours | HIGH |
| Testing | 4 hours | HIGH |
| Documentation | 2 hours | MEDIUM |
| **TOTAL** | **25 hours** | |

---

## RISK ASSESSMENT

### High Risk
1. **Breaking existing ISO8583/ISO20022 adapters** - All existing protocol adapters with custom fields will break
   - **Mitigation:** Auto-detect and enable extension mode for existing adapters

2. **Protocol registry incomplete** - Not all protocol fields may be in registry
   - **Mitigation:** Review and complete protocol registry before enforcement

### Medium Risk
1. **User confusion** - Users may not understand dropdown restriction
   - **Mitigation:** Clear error messages and documentation

2. **Extension mode misuse** - Users may always enable extension mode
   - **Mitigation:** Warning badges and admin-only extension mode toggle

### Low Risk
1. **Performance** - Dropdown population may be slow for large protocol registries
   - **Mitigation:** Virtual scrolling for large dropdowns

---

## ROLLBACK PLAN

If issues arise:

1. **Immediate:** Feature flag to disable enforcement
   ```javascript
   const ENFORCE_PROTOCOL_METADATA = false; // Toggle to disable
   ```

2. **Short-term:** Revert specific component changes while keeping utilities

3. **Long-term:** Gradual rollout by adapter type (ISO8583 first, then ISO20022)

---

## SUCCESS CRITERIA

✅ ISO8583 normal mode blocks: DE999, DE777, CUSTOM_FIELD
✅ ISO20022 normal mode blocks: Random/XML/Path, Custom/Node
✅ JSON/XML/CSV/DB unaffected (free-text still works)
✅ Extension mode allows custom fields with warning badge
✅ Runtime validation prevents invalid protocol mappings
✅ Zero false positives (valid protocol fields never blocked)
✅ Clear user feedback for validation failures
✅ Documentation complete and user-tested

---

## DELIVERABLES

1. ✅ This implementation plan document
2. ⏳ Modified source files (LinkAdapters, ManageFunctionsPage, etc.)
3. ⏳ New utility files (protocolEnforcement.js)
4. ⏳ New components (ProtocolExtensionBadge.jsx)
5. ⏳ Updated CSS (protocol badge styles)
6. ⏳ Unit tests for enforcement logic
7. ⏳ Integration tests for UI components
8. ⏳ User documentation
9. ⏳ Before/After screenshots
10. ⏳ Runtime validation proof

---

## NEXT STEPS

1. **Review this plan** with team and stakeholders
2. **Complete protocol registry review** (ensure all fields present)
3. **Implement Phase 1** (utility functions)
4. **Test Phase 1** thoroughly
5. **Implement Phases 2-6** incrementally
6. **User acceptance testing** with pilot ISO8583/ISO20022 adapters
7. **Production rollout** with monitoring

---

**Document Status:** ✅ READY FOR IMPLEMENTATION
**Last Updated:** 2024
**Version:** 1.0
