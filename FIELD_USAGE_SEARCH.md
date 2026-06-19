# FIELD NAME USAGE SEARCH RESULTS

## SEARCH PATTERNS USED

Searched for the following patterns across the codebase:
- `f.name`
- `field.name`
- `canonicalFields =`
- `const canonicalFields`

---

## RESULTS BY FILE

### **1. src/services/CanonicalFieldService.js**

**Line ~17-50: unwrapFields() function**
```javascript
fieldName: item.fieldName || item.referenceId || item.fieldId || item.code || item.name || ""
displayName: item.displayName || item.name || item.fieldName || item.referenceId || item.fieldId || item.code || ""
```
- **Usage**: Normalizes API response to standard format
- **Active**: YES ✅
- **Critical Filter**: `filter(field => field.fieldName && field.displayName)`
- **Impact**: Fields without both properties are REMOVED

---

### **2. src/contexts/APIContext.jsx**

**Line ~89: loadCanonicalFields() function**
```javascript
const [canonicalFields, setCanonicalFields] = useState([]);
const data = Array.isArray(response) ? response : [];
cache.data = data;
setCanonicalFields(data);
```
- **Usage**: Stores canonical fields in context state
- **Active**: YES ✅
- **Impact**: All components using useAPI() get this data

---

### **3. src/components/ManageFunctionsPage.jsx**

**Line ~15: fieldName() helper**
```javascript
function fieldName(field) {
  return String(field.displayName || field.name || field.label || field.description || field.referenceId || field.fieldId || "");
}
```
- **Usage**: Extracts display name for sorting
- **Active**: YES ✅

**Line ~21: fieldId() helper**
```javascript
function fieldId(field) {
  return String(field.referenceId || field.fieldId || field.code || field.fieldName || field.name || field.value || "");
}
```
- **Usage**: Extracts unique identifier
- **Active**: YES ✅

**Line ~241: sortedCanonicalFields useMemo**
```javascript
const sortedCanonicalFields = useMemo(
  () => [...canonicalFields].sort((a, b) => fieldName(a).localeCompare(fieldName(b))),
  [canonicalFields]
);
```
- **Usage**: Sorts fields alphabetically by display name
- **Active**: YES ✅
- **Impact**: Only sorts, does NOT filter

**Line ~528-533: TreeMappingBuilder canonicalFields prop mapping**
```javascript
canonicalFields={sortedCanonicalFields.map(f => {
  const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
  const display = f.displayName || f.name || f.label || f.description || fieldNameValue;
  return { fieldName: fieldNameValue, displayName: display, name: display };
})}
```
- **Usage**: Transforms canonical fields for TreeMappingBuilder
- **Active**: YES ✅
- **Impact**: Creates new objects with normalized properties

---

### **4. src/components/shared/TreeMappingBuilder.jsx**

**Line ~195: Component receives canonicalFields prop**
```javascript
export default function TreeMappingBuilder({ 
  canonicalFields = [],
  ...
}) {
  // Logs received fields
  console.log('ALL FIELD NAMES:', canonicalFields.map(f => f.fieldName || f.name));
}
```
- **Usage**: Passes canonicalFields to CanonicalFieldSelect
- **Active**: YES ✅
- **Impact**: Direct pass-through to child component

---

### **5. src/components/shared/CanonicalFieldSelect.jsx**

**Line ~7: Component receives canonicalFields prop**
```javascript
export default function CanonicalFieldSelect({ 
  canonicalFields = [],
  ...
}) {
```

**Line ~78-82: Dropdown option rendering**
```javascript
{canonicalFields.map((field, idx) => {
  const fieldValue = field.fieldName || field.referenceId || field.name || field;
  const fieldLabel = field.displayName || field.display_name || field.fieldName || field.name || field;
  return <option key={idx} value={fieldValue}>{fieldLabel}</option>;
})}
```
- **Usage**: Renders each field as a dropdown option
- **Active**: YES ✅
- **Impact**: Final rendering - if field reaches here, it appears in dropdown

---

## CRITICAL FINDINGS

### **BOTTLENECK #1: unwrapFields() filter**
Location: `CanonicalFieldService.js` line ~60

```javascript
const filtered = mapped.filter(field => field.fieldName && field.displayName);
```

**Impact**: If the API returns fields where:
- `fieldName` is missing/empty/null/undefined
- `displayName` is missing/empty/null/undefined

These fields will be **REMOVED** from the array.

### **BOTTLENECK #2: Property Name Mismatches**
If the backend returns fields with different property names (e.g., `field_name` instead of `fieldName`), the extraction logic may fail:

**Backend might return:**
```json
{
  "field_name": "partnerTier",
  "display_name": "Partner Tier"
}
```

**But frontend expects:**
```json
{
  "fieldName": "partnerTier",
  "displayName": "Partner Tier"
}
```

The fallback chain attempts to handle this:
```javascript
item.fieldName || item.referenceId || item.fieldId || item.code || item.name
```

But if the backend property is `field_name` (with underscore), it won't match.

---

## ACTIVE CODE PATHS - ALL FILES

| File | Usage | Active | Can Filter? |
|------|-------|--------|-------------|
| `CanonicalFieldService.js` | Fetches & normalizes | YES ✅ | **YES** ⚠️ (line ~60) |
| `APIContext.jsx` | Caches data | YES ✅ | NO |
| `ManageFunctionsPage.jsx` | Sorts & transforms | YES ✅ | NO |
| `TreeMappingBuilder.jsx` | Pass-through | YES ✅ | NO |
| `CanonicalFieldSelect.jsx` | Renders dropdown | YES ✅ | NO |

---

## ROOT CAUSE HYPOTHESIS

Based on code analysis, fields can disappear at **ONE PRIMARY LOCATION**:

### **CanonicalFieldService.js - unwrapFields() function**

```javascript
const filtered = mapped.filter(field => field.fieldName && field.displayName);
```

If `partnerTier`, `customerSegment`, or `error` are missing from dropdowns:

1. ✅ Backend returns these fields
2. ❓ But they lack `fieldName` or `displayName` properties
3. ❌ They get filtered out in `unwrapFields()`
4. ❌ They never reach the components

---

## VERIFICATION STEPS

1. Check browser console for logs
2. Look for this pattern:

```
CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
RAW API DATA: {...}  ← Check if test fields exist here
EXTRACTED RAW ARRAY: [...]  ← Check if test fields exist here
AFTER FILTER: [...]  ← Check if test fields exist here
```

3. If fields exist in "RAW" but missing in "AFTER FILTER", the filter is removing them
4. If fields missing in "RAW", backend is not returning them

---

## STATUS

All code paths identified. Investigation logs in place. Ready for browser testing.
