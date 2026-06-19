# ELIMINATION TABLE - TEST INSTRUCTIONS

## Console Logs Added

All targeted logs are now in place. Open browser console and look for:

1. **MANAGE_FUNCTIONS_RECEIVED** - Raw canonicalFields received by ManageFunctionsPage
2. **CANONICAL_SOURCE: ManageFunctionsPage.sortedCanonicalFields** - After sorting
3. **[BEFORE_MAP]** - Before transformation in ManageFunctionsPage
4. **[AFTER_MAP]** - After transformation in ManageFunctionsPage
5. **TREE_MAPPING_RECEIVED** - Received by TreeMappingBuilder
6. **SELECT_RECEIVED** - Received by CanonicalFieldSelect

---

## ELIMINATION TABLE

Fill in YES/NO based on console logs:

| Layer | partnerTier | customerSegment | error | Count |
|-------|-------------|-----------------|-------|-------|
| **APIContext** (from CanonicalFieldService) | ? | ? | ? | ? |
| **ManageFunctionsPage** (canonicalFields state) | ? | ? | ? | ? |
| **sortedCanonicalFields** (after sort) | ? | ? | ? | ? |
| **[BEFORE_MAP]** (before transformation) | ? | ? | ? | ? |
| **[AFTER_MAP]** (after transformation) | ? | ? | ? | ? |
| **TreeMappingBuilder** (received prop) | ? | ? | ? | ? |
| **CanonicalFieldSelect** (received prop) | ? | ? | ? | ? |
| **DOM** (visible in dropdown) | ? | ? | ? | ? |

---

## HOW TO FILL

### For each layer, check console:

**Example for "MANAGE_FUNCTIONS_RECEIVED":**
```javascript
MANAGE_FUNCTIONS_RECEIVED 79 [
  { fieldName: "partnerTier", ... },
  { fieldName: "customerSegment", ... },
  { fieldName: "error", ... }
]
```
✅ Mark **YES** for all 3 fields, Count = 79

**Example if field missing:**
```javascript
MANAGE_FUNCTIONS_RECEIVED 76 []
```
❌ Mark **NO** for all 3 fields, Count = 76

---

## IDENTIFICATION RULES

### If fields disappear between APIContext → ManageFunctionsPage:
**ROOT CAUSE**: State not updating or useEffect issue

### If fields disappear between sortedCanonicalFields → [BEFORE_MAP]:
**ROOT CAUSE**: useMemo filtering or corruption

### If fields disappear between [BEFORE_MAP] → [AFTER_MAP]:
**ROOT CAUSE**: Transformation map() removing fields (likely empty fieldName after extraction)

### If fields disappear between [AFTER_MAP] → TreeMappingBuilder:
**ROOT CAUSE**: Prop not passed correctly

### If fields disappear between TreeMappingBuilder → CanonicalFieldSelect:
**ROOT CAUSE**: Prop not passed to child

### If fields exist in CanonicalFieldSelect but not in DOM:
**ROOT CAUSE**: Rendering issue (CSS, conditional rendering, etc.)

---

## EXPECTED DIAGNOSIS

Based on code review, most likely:

**HYPOTHESIS**: Fields disappear at **[BEFORE_MAP] → [AFTER_MAP]** layer

**REASON**: The transformation extracts `fieldName` from properties:
```javascript
const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
```

If the API returns fields with different property structure (e.g., custom fields with only `referenceId` but missing `fieldName`), the extraction may succeed but create duplicates or empty values.

---

## NEXT STEPS AFTER DIAGNOSIS

Once you identify the exact layer:

1. **If APIContext layer**: Backend issue
2. **If transformation layer**: Fix extraction logic in ManageFunctionsPage
3. **If prop passing layer**: Fix component prop structure
4. **If rendering layer**: Fix CanonicalFieldSelect or TreeNode component

---

## READY FOR TESTING

Open Manage Functions page and capture console output.
