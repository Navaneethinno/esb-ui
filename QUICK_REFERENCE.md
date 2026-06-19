# INVESTIGATION QUICK REFERENCE

## TEST FIELDS TO TRACK
1. **partnerTier**
2. **customerSegment**
3. **error**

---

## CONSOLE LOG SEARCH STRINGS

Copy these into browser console filter to find relevant logs:

```
CANONICAL_SOURCE
DROPDOWN_RENDER
TEST FIELDS
partnerTier
customerSegment
```

---

## DATA FLOW (6 LAYERS)

```
Layer 1: Backend API
  ↓  GET /api/canonical/fields
Layer 2: CanonicalFieldService.unwrapFields()  ⚠️ FILTERS HERE
  ↓  normalized array
Layer 3: APIContext.loadCanonicalFields()
  ↓  cached array
Layer 4: ManageFunctionsPage.sortedCanonicalFields
  ↓  sorted array
Layer 5: TreeMappingBuilder
  ↓  prop pass-through
Layer 6: CanonicalFieldSelect
  ↓  <select> rendered
```

---

## CRITICAL FILTER LOCATION

**File**: `src/services/CanonicalFieldService.js`
**Function**: `unwrapFields()`
**Line**: ~60

```javascript
const filtered = mapped.filter(field => field.fieldName && field.displayName);
```

**Impact**: Removes any field where:
- `fieldName` is falsy (null, undefined, "", 0, false)
- OR `displayName` is falsy

---

## PROPERTY NAME EXTRACTION CHAIN

Fields are extracted using fallback chains:

### fieldName:
```javascript
item.fieldName || item.referenceId || item.fieldId || item.code || item.name
```

### displayName:
```javascript
item.displayName || item.name || item.fieldName || item.referenceId || item.fieldId || item.code
```

**If backend returns different property names**, extraction fails.

---

## MOST LIKELY ROOT CAUSES

### Cause 1: Backend Not Returning Fields (70% probability)
**Symptom**: Fields missing in Network tab response
**Fix Location**: Backend API

### Cause 2: Wrong Property Names (20% probability)
**Symptom**: Fields exist in raw API data but extracted as empty strings
**Example**: Backend sends `field_name` but frontend expects `fieldName`
**Fix Location**: `CanonicalFieldService.js` - add more fallbacks

### Cause 3: Missing Required Properties (10% probability)
**Symptom**: Fields have `referenceId` but no `fieldName` or `displayName`
**Result**: Filtered out by `field.fieldName && field.displayName` check
**Fix Location**: Backend to include both properties OR frontend to use referenceId as fallback

---

## CONSOLE OUTPUT COMPARISON

### ✅ HEALTHY OUTPUT (Fields Present)
```
CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
EXTRACTED RAW ARRAY: [79]
TEST FIELDS IN RAW:
  - partnerTier: { fieldName: "partnerTier", displayName: "Partner Tier", ... }
  - customerSegment: { fieldName: "customerSegment", displayName: "Customer Segment", ... }
  - error: { fieldName: "error", displayName: "Error", ... }
AFTER FILTER (first 5): [...]
FILTERED ARRAY LENGTH: 79
```

### ❌ UNHEALTHY OUTPUT (Fields Missing After Filter)
```
CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
EXTRACTED RAW ARRAY: [79]
TEST FIELDS IN RAW:
  - partnerTier: { referenceId: "partnerTier", name: "Partner Tier", ... }  ← NO fieldName/displayName
  - customerSegment: { referenceId: "customerSegment", ... }
  - error: { referenceId: "error", ... }
AFTER FILTER (first 5): [...]
FILTERED ARRAY LENGTH: 76  ← 3 fields removed!

TEST FIELDS AFTER FILTER:
  - partnerTier: undefined  ← FILTERED OUT
  - customerSegment: undefined  ← FILTERED OUT
  - error: undefined  ← FILTERED OUT
```

### ❌ UNHEALTHY OUTPUT (Fields Never From Backend)
```
CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
EXTRACTED RAW ARRAY: [76]  ← Only 76, not 79
TEST FIELDS IN RAW:
  - partnerTier: undefined  ← NOT IN API RESPONSE
  - customerSegment: undefined  ← NOT IN API RESPONSE
  - error: undefined  ← NOT IN API RESPONSE
```

---

## TESTING PROCEDURE

### 1. Open Browser
Navigate to: `Adapter Registry → Select Any Adapter → Manage Functions`

### 2. Open Console
`F12` or `Ctrl+Shift+I`

### 3. Filter Console
Type: `CANONICAL` in the console filter box

### 4. Identify Where Fields Disappear

Copy this checklist and mark where fields are FOUND vs MISSING:

```
[ ] Layer 1: Network Tab - /api/canonical/fields response
[ ] Layer 2: unwrapFields() - RAW ARRAY
[ ] Layer 2: unwrapFields() - AFTER FILTER
[ ] Layer 3: APIContext - TEST FIELDS IN APIContext
[ ] Layer 4: ManageFunctionsPage - TEST FIELDS IN SORTED
[ ] Layer 5: TreeMappingBuilder - TEST FIELDS IN TreeMappingBuilder
[ ] Layer 6: CanonicalFieldSelect - TEST FIELDS PRESENT IN DROPDOWN
```

**First layer marked as MISSING = Root Cause Location**

---

## EXPECTED FIELD COUNT

Backend should return **79 canonical fields** (based on existing logs in code).

If you see different counts:
- **< 79 in API response** → Backend issue
- **79 in API, < 79 after filter** → Frontend filter removing fields
- **79 everywhere but not in dropdown** → Rendering/mapping issue

---

## PROPERTY STRUCTURE CHECK

Open Network tab, find `/api/canonical/fields`, look for one of the test fields.

### Expected Structure:
```json
{
  "fieldName": "partnerTier",
  "displayName": "Partner Tier",
  "dataType": "STRING",
  ...
}
```

### Alternative Structures That Will FAIL:
```json
{
  "field_name": "partnerTier",  ← Wrong property name (underscore)
  "display_name": "Partner Tier"
}
```
```json
{
  "referenceId": "partnerTier",  ← Missing fieldName/displayName
  "name": "Partner Tier"
}
```
```json
{
  "code": "partnerTier",  ← Missing fieldName/displayName
  "label": "Partner Tier"
}
```

---

## IMMEDIATE ACTIONS

1. ✅ Browser → Manage Functions page
2. ✅ Console → Filter "CANONICAL"
3. ✅ Network → Check `/api/canonical/fields` response
4. ✅ Console → Find first layer where fields are `undefined`
5. ✅ Report findings (don't fix yet)

---

## REPORT FORMAT

When reporting findings, use this template:

```
ROOT CAUSE FOUND AT: [Layer Name]

EVIDENCE:
- Layer X shows: [field exists / field undefined]
- Layer Y shows: [field exists / field undefined]

API RESPONSE SAMPLE:
[paste one test field object from network tab]

CONSOLE LOGS:
[paste relevant console section]

HYPOTHESIS:
[explain why fields disappear at this layer]

RECOMMENDED FIX:
[suggest fix location and approach]
```

---

## FILES TO CHECK

All console logs already added to:
- ✅ `src/services/CanonicalFieldService.js`
- ✅ `src/contexts/APIContext.jsx`
- ✅ `src/components/ManageFunctionsPage.jsx`
- ✅ `src/components/shared/TreeMappingBuilder.jsx`
- ✅ `src/components/shared/CanonicalFieldSelect.jsx`

**No code changes needed. Investigation logs complete.**

---

## STATUS: READY FOR BROWSER TESTING ✅
