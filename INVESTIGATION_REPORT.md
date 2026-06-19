# FRONTEND ROOT CAUSE INVESTIGATION REPORT

## OBJECTIVE
Identify the exact source used by every canonical dropdown and determine where `partnerTier`, `customerSegment`, and `error` fields disappear.

---

## SCREENS USING CANONICAL DROPDOWNS

### 1. **Manage Functions Page** (`ManageFunctionsPage.jsx`)
   - Uses: `TreeMappingBuilder` component
   - Contains: Request and Response mapping dropdowns for each request type
   - Source: `sortedCanonicalFields` (derived from `canonicalFields` state)

### 2. **Tree Mapping Builder** (`TreeMappingBuilder.jsx`)
   - Uses: `CanonicalFieldSelect` component
   - Contains: Dropdown for each leaf node in the JSON schema tree
   - Source: `canonicalFields` prop passed from parent

### 3. **Canonical Field Select** (`CanonicalFieldSelect.jsx`)
   - Reusable dropdown component
   - Contains: Single dropdown with all canonical fields + "Create Custom" option
   - Source: `canonicalFields` prop passed from parent

---

## DATA FLOW CHAIN (Complete Trace)

```
Backend API (/api/canonical/fields)
  ↓
CanonicalFieldService.fetchCanonicalFields()
  ↓
unwrapFields() - Normalizes API response
  ↓
APIContext.loadCanonicalFields() - Caches data
  ↓
ManageFunctionsPage - Receives via useEffect or props
  ↓
sortedCanonicalFields (useMemo) - Sorts fields
  ↓
TreeMappingBuilder (prop: canonicalFields)
  ↓
CanonicalFieldSelect (prop: canonicalFields)
  ↓
<select> dropdown rendered
```

---

## CONSOLE LOGS ADDED

### **Step 1: Service Layer** (`CanonicalFieldService.js`)
- Location: `fetchCanonicalFields()` function
- Logs:
  - Raw API response data
  - Extracted array length
  - Test fields presence (partnerTier, customerSegment, error)
  - All field names

### **Step 2: Context Layer** (`APIContext.jsx`)
- Location: `loadCanonicalFields()` function
- Logs:
  - Response length after fetch
  - Test fields presence
  - All field names

### **Step 3: Component Layer** (`ManageFunctionsPage.jsx`)
- Location: `sortedCanonicalFields` useMemo
- Logs:
  - Input/output array lengths
  - Test fields presence after sorting
  - All field names

### **Step 4: Tree Builder** (`TreeMappingBuilder.jsx`)
- Location: Component initialization
- Logs:
  - Received canonicalFields length
  - Test fields presence
  - All field names

### **Step 5: Dropdown Component** (`CanonicalFieldSelect.jsx`)
- Location: Component render
- Logs:
  - Received canonicalFields length
  - All field names (extracted from various field properties)
  - Test fields presence before rendering
  - What gets rendered in dropdown options

---

## TESTING INSTRUCTIONS

### **Open Browser Console**

### **Navigate to each screen:**

#### 1. **Manage Functions Page**
   - Path: Adapter Registry → Select Adapter → "Manage Functions"
   - Expected Console Output:
     ```
     CANONICAL_SOURCE: fetchCanonicalFields
     CANONICAL_SOURCE: CanonicalFieldService.unwrapFields
     CANONICAL_SOURCE: APIContext.loadCanonicalFields
     CANONICAL_SOURCE: ManageFunctionsPage.sortedCanonicalFields
     CANONICAL_SOURCE: TreeMappingBuilder (x2 - request & response)
     DROPDOWN_RENDER: CanonicalFieldSelect (multiple times for each field)
     ```

#### 2. **For Each Console Block:**
   - Check: `Length` or `COUNT` values
   - Check: `TEST FIELDS PRESENT` or `TEST FIELDS IN [section]`
   - Check: If `partnerTier`, `customerSegment`, `error` appear with valid data

---

## FIELD NAME EXTRACTION LOGIC

The code checks multiple property names to extract field values:

### **In CanonicalFieldService.js:**
```javascript
fieldName: item.fieldName || item.referenceId || item.fieldId || item.code || item.name
displayName: item.displayName || item.name || item.fieldName
```

### **In ManageFunctionsPage.jsx:**
```javascript
fieldName: f.fieldName || f.referenceId || f.fieldId || f.code || f.name
displayName: f.displayName || f.name || f.label || f.description || fieldNameValue
```

### **In CanonicalFieldSelect.jsx:**
```javascript
fieldValue: field.fieldName || field.referenceId || field.name || field
fieldLabel: field.displayName || field.display_name || field.fieldName || field.name || field
```

---

## EXPECTED OUTCOMES

### **Scenario A: Data Never Loaded**
- Console shows: `LENGTH: 0` at service layer
- Root Cause: Backend not returning data OR API call failing
- Action: Check network tab for failed API calls

### **Scenario B: Data Loaded But Custom Fields Missing**
- Console shows: LENGTH > 0 at service layer
- Console shows: Test fields NOT FOUND at service/context layer
- Root Cause: Backend not returning partnerTier, customerSegment, error
- Action: Verify backend `/api/canonical/fields` response

### **Scenario C: Data Loaded Including Custom Fields But Dropdown Filters Them**
- Console shows: Test fields FOUND at service/context layer
- Console shows: Test fields NOT FOUND at component/dropdown layer
- Root Cause: Frontend filtering/transformation removing fields
- Action: Check `unwrapFields()`, sorting, or component prop mapping

### **Scenario D: Data Loaded But Wrong Property Names**
- Console shows: Test fields exist as objects but NOT detected
- Root Cause: Field properties don't match extraction logic
- Action: Check actual property names in API response vs extraction logic

---

## CRITICAL INSPECTION POINTS

### **1. unwrapFields() in CanonicalFieldService.js**
```javascript
const filtered = mapped.filter(field => field.fieldName && field.displayName);
```
⚠️ **CRITICAL**: If `fieldName` or `displayName` are empty after mapping, fields will be REMOVED

### **2. sortedCanonicalFields in ManageFunctionsPage.jsx**
```javascript
const sorted = [...canonicalFields].sort((a, b) => fieldName(a).localeCompare(fieldName(b)));
```
✓ Only sorts, doesn't filter - should preserve all fields

### **3. CanonicalFieldSelect mapping**
```javascript
canonicalFields.map(f => {
  const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
  const display = f.displayName || f.name || f.label || f.description || fieldNameValue;
  return { fieldName: fieldNameValue, displayName: display, name: display };
})
```
⚠️ **CRITICAL**: If all fallback properties are missing, field will have empty string

---

## NEXT STEPS AFTER CONSOLE INVESTIGATION

Once you capture the console output, determine:

1. **At which layer do the test fields disappear?**
   - Service → Context → Component → Dropdown

2. **What are the actual property names in the API response?**
   - Check raw API data logged at service layer

3. **Do the fields pass the filter conditions?**
   - Check if `fieldName && displayName` both exist

4. **Are the fields being transformed incorrectly?**
   - Compare field structure at each layer

---

## FILES MODIFIED (Console Logs Added)

✅ `src/services/CanonicalFieldService.js` - Service layer logging
✅ `src/contexts/APIContext.jsx` - Context layer logging  
✅ `src/components/ManageFunctionsPage.jsx` - Component layer logging
✅ `src/components/shared/TreeMappingBuilder.jsx` - Tree builder logging
✅ `src/components/shared/CanonicalFieldSelect.jsx` - Dropdown logging

---

## TESTING CHECKLIST

- [ ] Open Browser Console
- [ ] Navigate to Manage Functions page
- [ ] Capture all console logs with prefix `CANONICAL_SOURCE` or `DROPDOWN_RENDER`
- [ ] Search logs for `partnerTier`, `customerSegment`, `error`
- [ ] Note at which layer these fields:
  - [ ] Exist with proper data
  - [ ] Exist but missing properties
  - [ ] Disappear completely
- [ ] Check Network tab for `/api/canonical/fields` response
- [ ] Compare API response structure with extraction logic
- [ ] Document findings in this file

---

## STATUS: READY FOR TESTING

All console logs have been added. No fixes implemented yet - investigation only.
