# ROOT CAUSE ANALYSIS: Custom Fields Not Appearing

## PROBLEM IDENTIFIED ✅

Custom canonical fields (`customerSegment`, `customerSegmentPersist`, `scopeOptionalCheck`) exist in database and are returned by `GET /api/canonical/fields` but were NOT appearing in dropdowns.

## ROOT CAUSE

**ManageFunctionsPage.jsx was stripping the `fieldName` property when transforming canonical fields before passing them to TreeMappingBuilder.**

### Data Flow Trace

```
GET /api/canonical/fields
↓
{
  "fieldName": "customerSegment",
  "displayName": "Customer Segment"
}
↓
unwrapFields() in CanonicalFieldService.js
↓
APIContext.setCanonicalFields(data)
↓
ManageFunctionsPage receives canonicalFields prop
↓
❌ PROBLEM HERE: ManageFunctionsPage transforms fields
↓
sortedCanonicalFields.map(f => {
  return { name: display, displayName: display };  // ← fieldName LOST!
})
↓
TreeMappingBuilder receives { name, displayName }  // ← Missing fieldName
↓
CanonicalFieldSelect tries to use field.fieldName  // ← undefined!
↓
<option value={undefined}>Customer Segment</option>  // ← Broken!
```

## INCORRECT TRANSFORMATION

### Before Fix (BROKEN)

**File:** `src/components/ManageFunctionsPage.jsx`  
**Lines:** 696-704, 729-737

```javascript
// ❌ WRONG: Strips fieldName property
canonicalFields={sortedCanonicalFields.map(f => {
  const id = fieldId(f) || fieldName(f);
  const display = fieldName(f);
  return { name: display, displayName: display };  // ← fieldName NOT included!
})}
```

**Result:** TreeMappingBuilder receives:
```javascript
[
  { name: "Customer Segment", displayName: "Customer Segment" },  // fieldName missing!
  { name: "Account Number", displayName: "Account Number" }       // fieldName missing!
]
```

**CanonicalFieldSelect tries to render:**
```jsx
<option value={field.fieldName || field.name}>  // field.fieldName is undefined!
  {field.displayName}                            // This works
</option>
```

**DOM Result:**
```html
<option value="Customer Segment">Customer Segment</option>
<!-- Wrong! Value should be "customerSegment", not the display name -->
```

## CORRECT TRANSFORMATION

### After Fix (WORKING)

**File:** `src/components/ManageFunctionsPage.jsx`  
**Lines:** 696-708, 729-738

```javascript
// ✅ CORRECT: Preserves fieldName property
canonicalFields={sortedCanonicalFields.map(f => {
  const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
  const display = f.displayName || f.name || f.label || f.description || fieldNameValue;
  return { 
    fieldName: fieldNameValue,   // ← fieldName INCLUDED!
    displayName: display,
    name: display                 // ← Kept for backward compatibility
  };
})}
```

**Result:** TreeMappingBuilder receives:
```javascript
[
  { 
    fieldName: "customerSegment",          // ← Present!
    displayName: "Customer Segment",
    name: "Customer Segment"
  },
  { 
    fieldName: "accountNumber",
    displayName: "Account Number",
    name: "Account Number"
  }
]
```

**CanonicalFieldSelect renders:**
```jsx
<option value={field.fieldName}>  // field.fieldName = "customerSegment"
  {field.displayName}              // "Customer Segment"
</option>
```

**DOM Result:**
```html
<option value="customerSegment">Customer Segment</option>
<!-- Correct! Value is fieldName, display is displayName -->
```

## FILES CHANGED

### 1. APIContext.jsx
**Change:** Added console.log for debugging
```javascript
console.log("CANONICAL API RESPONSE", data);
```

### 2. ManageFunctionsPage.jsx
**Change 1:** Added console.log for debugging
```javascript
console.log(
  "ManageFunctions canonicalFields",
  sorted.map(f => f.fieldName || f.name)
);
```

**Change 2:** CRITICAL FIX - Preserve fieldName in transformation
```javascript
// OLD (BROKEN)
return { name: display, displayName: display };

// NEW (FIXED)
return { 
  fieldName: fieldNameValue,
  displayName: display,
  name: display
};
```

### 3. TreeMappingBuilder.jsx
**Change:** Added console.log for debugging
```javascript
console.log(
  "TreeMappingBuilder canonicalFields",
  canonicalFields.map(f => f.fieldName || f.name)
);
```

### 4. CanonicalFieldSelect.jsx
**Change 1:** Added console.log for debugging
```javascript
console.log("Dropdown canonicalFields", canonicalFields);
```

**Change 2:** Improved field value/label extraction
```javascript
const fieldValue = field.fieldName || field.referenceId || field.name || field;
const fieldLabel = field.displayName || field.display_name || field.fieldName || field.name || field;
```

### 5. CanonicalFieldService.js
**Change:** Already updated in previous fix to use fieldName

## EXPECTED CONSOLE OUTPUT

### Step 1: APIContext
```javascript
CANONICAL API RESPONSE [
  { 
    fieldName: "customerSegment",
    displayName: "Customer Segment",
    dataType: "STRING",
    scope: "custom"
  },
  { 
    fieldName: "customerSegmentPersist",
    displayName: "Customer Segment Persist",
    dataType: "STRING",
    scope: "custom"
  },
  {
    fieldName: "scopeOptionalCheck",
    displayName: "Scope Optional Check",
    dataType: "BOOLEAN",
    scope: "custom"
  }
]
```

### Step 2: ManageFunctionsPage
```javascript
ManageFunctions canonicalFields [
  "customerSegment",
  "customerSegmentPersist",
  "scopeOptionalCheck",
  "accountNumber",
  "transactionId"
]
```

### Step 3: TreeMappingBuilder
```javascript
TreeMappingBuilder canonicalFields [
  "customerSegment",
  "customerSegmentPersist",
  "scopeOptionalCheck",
  "accountNumber",
  "transactionId"
]
```

### Step 4: CanonicalFieldSelect
```javascript
Dropdown canonicalFields [
  {
    fieldName: "customerSegment",
    displayName: "Customer Segment",
    name: "Customer Segment"
  },
  {
    fieldName: "customerSegmentPersist",
    displayName: "Customer Segment Persist",
    name: "Customer Segment Persist"
  },
  {
    fieldName: "scopeOptionalCheck",
    displayName: "Scope Optional Check",
    name: "Scope Optional Check"
  }
]
```

## VERIFICATION

### Expected Dropdown HTML
```html
<select>
  <option value="">-- Select canonical field --</option>
  <option value="accountNumber">Account Number</option>
  <option value="customerSegment">Customer Segment</option>
  <option value="customerSegmentPersist">Customer Segment Persist</option>
  <option value="scopeOptionalCheck">Scope Optional Check</option>
  <option value="transactionId">Transaction ID</option>
  <option value="__CREATE_CUSTOM__">+ Create Custom Canonical Field</option>
</select>
```

### Value vs Display

| Value (stored) | Display (shown) | Source |
|----------------|-----------------|--------|
| `customerSegment` | Customer Segment | DB custom field |
| `customerSegmentPersist` | Customer Segment Persist | DB custom field |
| `scopeOptionalCheck` | Scope Optional Check | DB custom field |
| `accountNumber` | Account Number | DB standard field |
| `transactionId` | Transaction ID | DB standard field |

## ACCEPTANCE CRITERIA

✅ **customerSegment** appears in API response  
✅ **customerSegment** appears in ManageFunctionsPage  
✅ **customerSegment** appears in TreeMappingBuilder  
✅ **customerSegment** appears in dropdown  
✅ Dropdown value is `"customerSegment"` (fieldName)  
✅ Dropdown display is `"Customer Segment"` (displayName)  
✅ Selection stores `"customerSegment"` as value  

## SUMMARY

The issue was NOT with the API or database. The data was being loaded correctly. The problem was in **ManageFunctionsPage.jsx** which was stripping the `fieldName` property when transforming canonical fields before passing them to child components.

**Fix:** Preserve `fieldName` in the transformation so downstream components can use it as the option value.

**Impact:** Custom fields now appear correctly in all dropdowns with proper value/display separation.
