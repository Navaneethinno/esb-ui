# COMPLETE DATA FLOW TRACE FOR ALL SCREENS

## SCREEN-BY-SCREEN BREAKDOWN

---

## SCREEN 1: MANAGE FUNCTIONS PAGE

**File**: `src/components/ManageFunctionsPage.jsx`

### Data Flow
```
1. Backend API
   GET /api/canonical/fields
   ↓
2. CanonicalFieldService.fetchCanonicalFields()
   - Calls API
   - Passes to unwrapFields()
   - Returns normalized array
   ↓
3. APIContext.loadCanonicalFields()
   - Caches response
   - Sets canonicalFields state
   ↓
4. ManageFunctionsPage useEffect
   - Fetches via fetchCanonicalFields(adapterFormat)
   - Sets local canonicalFields state
   ↓
5. sortedCanonicalFields useMemo
   - Sorts by displayName
   - Returns sorted array
   ↓
6. TreeMappingBuilder (Request)
   - Receives sortedCanonicalFields as prop
   - Maps to { fieldName, displayName, name }
   ↓
7. CanonicalFieldSelect (for each leaf node)
   - Renders <select> dropdown
   - Maps to <option> elements
```

### Console Output Pattern
```
═══════════════════════════════════════
CANONICAL_SOURCE: fetchCanonicalFields
FORMAT PARAM: [adapter format]
═══════════════════════════════════════

═══════════════════════════════════════
CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
RAW API DATA: [full response object]
EXTRACTED RAW ARRAY: [array length]
TEST FIELDS IN RAW:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
AFTER MAPPING (first 5): [...]
AFTER FILTER (first 5): [...]
FILTERED ARRAY LENGTH: [number]
═══════════════════════════════════════

═══════════════════════════════════════
CANONICAL_SOURCE: APIContext.loadCanonicalFields
APIContext - RESPONSE LENGTH: [number]
TEST FIELDS IN APIContext:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════

═══════════════════════════════════════
CANONICAL_SOURCE: ManageFunctionsPage.sortedCanonicalFields
INPUT canonicalFields LENGTH: [number]
SORTED canonicalFields LENGTH: [number]
TEST FIELDS IN SORTED:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════

═══════════════════════════════════════
CANONICAL_SOURCE: TreeMappingBuilder
RECEIVED canonicalFields LENGTH: [number]
TEST FIELDS IN TreeMappingBuilder:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════

═══════════════════════════════════════
DROPDOWN_RENDER: CanonicalFieldSelect
RECEIVED canonicalFields LENGTH: [number]
ALL FIELD NAMES: [array of field names]
TEST FIELDS PRESENT IN DROPDOWN:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════
```

### Test Fields Visibility
- **partnerTier**: Should appear in request/response dropdowns ❓
- **customerSegment**: Should appear in request/response dropdowns ❓
- **error**: Should appear in request/response dropdowns ❓

---

## SCREEN 2: TREE MAPPING BUILDER (Standalone)

**File**: `src/components/shared/TreeMappingBuilder.jsx`

### Data Flow
```
1. Parent Component
   - Passes canonicalFields prop
   ↓
2. TreeMappingBuilder
   - Receives prop
   - Logs received fields
   ↓
3. TreeNode (for each leaf)
   - Receives canonicalFields
   ↓
4. CanonicalFieldSelect
   - Renders dropdown
```

### Console Output Pattern
```
═══════════════════════════════════════
CANONICAL_SOURCE: TreeMappingBuilder
RECEIVED canonicalFields LENGTH: [number]
ALL FIELD NAMES: [array]
TEST FIELDS IN TreeMappingBuilder:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════

═══════════════════════════════════════
DROPDOWN_RENDER: CanonicalFieldSelect
RECEIVED canonicalFields LENGTH: [number]
TEST FIELDS PRESENT IN DROPDOWN:
  - partnerTier: [object or undefined]
  - customerSegment: [object or undefined]
  - error: [object or undefined]
═══════════════════════════════════════
```

### Test Fields Visibility
- **partnerTier**: Should appear in leaf node dropdowns ❓
- **customerSegment**: Should appear in leaf node dropdowns ❓
- **error**: Should appear in leaf node dropdowns ❓

---

## SCREEN 3: REQUEST TYPE CONFIGURATION

**File**: `src/components/RequestTypeForm.jsx`

### Notes
This component does NOT use canonical field dropdowns. It only handles:
- Request name input
- Request/response JSON definitions
- Key extraction
- Field protection

**No canonical dropdowns in this screen**. ✅

---

## SCREEN 4: EDIT MAPPING (ManageFunctionsPage in Edit Mode)

**File**: `src/components/ManageFunctionsPage.jsx` (same as Screen 1)

### Data Flow
Same as Screen 1 (Manage Functions Page), but with `isEditMode=true`

### Additional Behavior
- Loads existing configurations
- Pre-populates mappings from backend
- Uses same dropdowns as Screen 1

---

## SCREEN 5: AUTO MAPPING

**File**: `src/utils/autoMatch.js` + Components using it

### Notes
Auto-mapping uses the same `canonicalFields` array passed to `autoMatchFields()` function.

The function receives fields from ManageFunctionsPage:
```javascript
const matches = autoMatchFields(unmappedKeys, canonicalFields);
```

So the data source is the SAME as Screen 1.

---

## SUMMARY TABLE

| Screen | Component | Uses Canonical Dropdown? | Data Source | Critical Function |
|--------|-----------|-------------------------|-------------|-------------------|
| **Manage Functions** | ManageFunctionsPage | YES ✅ | fetchCanonicalFields() → sortedCanonicalFields | unwrapFields() |
| **Tree Mapping Builder** | TreeMappingBuilder | YES ✅ | Parent prop → CanonicalFieldSelect | None (pass-through) |
| **Request Type Configuration** | RequestTypeForm | NO ❌ | N/A | N/A |
| **Edit Mapping** | ManageFunctionsPage | YES ✅ | Same as Manage Functions | Same as Manage Functions |
| **Auto Mapping** | autoMatchFields() | NO (internal) | canonicalFields array | None (matching only) |

---

## CANONICAL DROPDOWN RENDER COUNT

For a typical Manage Functions page with 1 Request Type:

1. Request Payload Tree
   - N dropdowns (N = number of leaf nodes in request JSON)
2. Response Payload Tree
   - M dropdowns (M = number of leaf nodes in response JSON)

**Total**: N + M dropdowns per request type

If the request has 5 leaf fields and response has 3 leaf fields:
- **8 dropdowns total**
- Each calls `CanonicalFieldSelect` component
- Each logs to console

---

## ROOT CAUSE DETERMINATION CHECKLIST

### If partnerTier, customerSegment, error are MISSING from dropdowns:

#### ☐ Check Layer 1: Backend API
```
Network Tab → /api/canonical/fields → Response
```
**Question**: Do the 3 fields exist in the API response?
- YES → Go to Layer 2
- NO → **ROOT CAUSE: Backend not returning fields**

#### ☐ Check Layer 2: Service Layer (unwrapFields)
```
Console → "CANONICAL_SOURCE: CanonicalFieldService.unwrapFields"
→ Look at "EXTRACTED RAW ARRAY"
→ Look at "AFTER FILTER"
```
**Question**: Do the 3 fields exist in RAW but missing in AFTER FILTER?
- YES → **ROOT CAUSE: Filter removing fields (missing fieldName or displayName)**
- NO → Go to Layer 3

#### ☐ Check Layer 3: Context Layer (APIContext)
```
Console → "CANONICAL_SOURCE: APIContext.loadCanonicalFields"
→ Look at "TEST FIELDS IN APIContext"
```
**Question**: Do the 3 fields exist here?
- NO → **ROOT CAUSE: Context not receiving fields from service**
- YES → Go to Layer 4

#### ☐ Check Layer 4: Component Layer (ManageFunctionsPage)
```
Console → "CANONICAL_SOURCE: ManageFunctionsPage.sortedCanonicalFields"
→ Look at "TEST FIELDS IN SORTED"
```
**Question**: Do the 3 fields exist here?
- NO → **ROOT CAUSE: Component state not updated**
- YES → Go to Layer 5

#### ☐ Check Layer 5: Tree Builder Layer
```
Console → "CANONICAL_SOURCE: TreeMappingBuilder"
→ Look at "TEST FIELDS IN TreeMappingBuilder"
```
**Question**: Do the 3 fields exist here?
- NO → **ROOT CAUSE: Props not passed correctly**
- YES → Go to Layer 6

#### ☐ Check Layer 6: Dropdown Component Layer
```
Console → "DROPDOWN_RENDER: CanonicalFieldSelect"
→ Look at "TEST FIELDS PRESENT IN DROPDOWN"
```
**Question**: Do the 3 fields exist here?
- NO → **ROOT CAUSE: Final prop transformation losing fields**
- YES → **ROOT CAUSE: Fields exist but not visible in UI (CSS/rendering issue)**

---

## NEXT ACTIONS

1. ✅ Open browser console
2. ✅ Navigate to Manage Functions page
3. ✅ Copy ALL console output
4. ✅ Follow checklist above
5. ✅ Identify exact layer where fields disappear
6. ⏭️ Report findings (DO NOT FIX YET)

---

## FILES WITH CONSOLE LOGS

- ✅ `src/services/CanonicalFieldService.js`
- ✅ `src/contexts/APIContext.jsx`
- ✅ `src/components/ManageFunctionsPage.jsx`
- ✅ `src/components/shared/TreeMappingBuilder.jsx`
- ✅ `src/components/shared/CanonicalFieldSelect.jsx`

All files already have comprehensive logging. **Ready for testing**.
