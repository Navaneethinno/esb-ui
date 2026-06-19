# Diagnostic Instructions: Track 'error' Field Through Runtime

## Prerequisites
1. Ensure the `error` field exists in the database
2. Verify `GET /api/canonical/fields` returns the `error` field

## Evidence Collection Steps

### A. API Response Evidence
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Find the request to `/api/canonical/fields`
5. **Screenshot required**: Response body showing `error` field

**Expected format in response:**
```json
[
  {
    "fieldName": "error",
    "displayName": "Error",
    ...
  },
  ...
]
```

### B. Console Log Evidence - Service Layer
Open the Console tab in DevTools and look for these logs:

#### CanonicalFieldService Logs:
```
[CanonicalFieldService] unwrapFields - RAW API DATA: {...}
[CanonicalFieldService] unwrapFields - EXTRACTED RAW: [...]
[CanonicalFieldService] unwrapFields - ERROR FIELD IN RAW: {...}
[CanonicalFieldService] unwrapFields - AFTER MAPPING: [...]
[CanonicalFieldService] unwrapFields - AFTER FILTER: [...]
[CanonicalFieldService] unwrapFields - ERROR FIELD AFTER FILTER: {...}
[CanonicalFieldService] fetchCanonicalFields - API RESPONSE: {...}
[CanonicalFieldService] fetchCanonicalFields - UNWRAPPED RESULT: [...]
[CanonicalFieldService] fetchCanonicalFields - ERROR FIELD IN FINAL RESULT: {...}
[CanonicalFieldService] fetchCanonicalFields - ALL FIELD NAMES: [...]
[CanonicalFieldService] fetchCanonicalFields - onData CALLBACK - RESULT: [...]
[CanonicalFieldService] fetchCanonicalFields - ERROR FIELD IN CALLBACK: {...}
[CanonicalFieldService] fetchCanonicalFields - FINAL RETURN VALUE: [...]
[CanonicalFieldService] fetchCanonicalFields - ERROR FIELD IN FINAL RETURN: {...}
```

**Copy and paste all these logs**

### C. Console Log Evidence - Context Layer
Look for APIContext logs:
```
[APIContext] Loaded canonical fields:
```

**Copy the full array output**

### D. Console Log Evidence - Component Layer
Look for ManageFunctionsPage logs:
```
[ManageFunctionsPage] Raw canonical fields received:
[ManageFunctionsPage] Processing canonical field:
[ManageFunctionsPage] Transformed canonical fields:
[ManageFunctionsPage] ALL fieldName values:
```

**Copy all these logs**

### E. Console Log Evidence - Dropdown Layer
Look for CanonicalFieldSelect logs:
```
[CanonicalFieldSelect] Dropdown canonicalFields:
[CanonicalFieldSelect] ALL FIELD NAMES:
[CanonicalFieldSelect] ERROR FIELD PRESENT:
```

**Copy all these logs**

### F. Visual Evidence - Dropdown
1. Navigate to the page with the canonical field dropdown
2. Click to open the dropdown
3. Scroll through all options
4. **Screenshot required**: Full dropdown showing all available options
5. Use browser's Find in Page (Ctrl+F) to search for "error" in the dropdown

### G. Filtering Logic Check
If `error` appears in logs but not in dropdown, check:

1. **Search in ManageFunctionsPage.jsx** for any `.filter()` calls on canonical fields
2. **Search in TreeMappingBuilder.jsx** for any `.filter()` calls on canonical fields  
3. **Search for** any hardcoded exclusion lists like:
   ```javascript
   const EXCLUDED_FIELDS = [...]
   const SYSTEM_FIELDS = [...]
   ```

## Expected Runtime Path

```
Database (error exists)
    ↓
GET /api/canonical/fields (returns error)
    ↓
CanonicalFieldService.unwrapFields() (transforms error)
    ↓
APIContext.loadCanonicalFields() (stores error)
    ↓
ManageFunctionsPage.jsx (transforms error)
    ↓
TreeMappingBuilder.jsx (passes error)
    ↓
CanonicalFieldSelect.jsx (renders error in <option>)
    ↓
Browser DOM (error visible in dropdown)
```

## Key Questions to Answer

1. **Does `error` appear in the Network response?**
   - Yes → Continue to #2
   - No → Backend issue

2. **Does `error` appear in CanonicalFieldService logs?**
   - Yes → Continue to #3
   - No → Check `unwrapFields()` filter logic

3. **Does `error` appear in APIContext logs?**
   - Yes → Continue to #4
   - No → Check APIContext transformation

4. **Does `error` appear in ManageFunctionsPage logs?**
   - Yes → Continue to #5
   - No → **ROOT CAUSE: ManageFunctionsPage transformation**

5. **Does `error` appear in CanonicalFieldSelect logs?**
   - Yes → Continue to #6
   - No → Check props passing in TreeMappingBuilder

6. **Is `error` visible in the dropdown?**
   - Yes → ✅ WORKING
   - No → Check browser rendering or CSS `display: none`

## Common Failure Points

### Filter in unwrapFields()
```javascript
.filter(field => field.fieldName && field.displayName)
```
- Checks if `error` has both `fieldName` and `displayName`
- If either is empty string, field is removed

### Transformation in ManageFunctionsPage
```javascript
return {
  fieldName: fieldNameValue,
  displayName: display,
  name: display
};
```
- Checks if `fieldNameValue` is properly extracted
- Checks if `display` is not empty

### Case Sensitivity Issues
- Check if any code does `.toUpperCase()` or `.toLowerCase()` comparisons
- Check if "error" vs "Error" vs "ERROR" matters

## Report Template

Copy this template and fill in your findings:

---

### Evidence Report: 'error' Field Tracking

**A. Network Evidence**
- Request URL: `/api/canonical/fields`
- Response Status: [200/404/500]
- `error` field present in response: [YES/NO]
- Screenshot attached: [YES/NO]

**B. CanonicalFieldService Logs**
```
[Paste all CanonicalFieldService logs here]
```

**C. APIContext Logs**
```
[Paste APIContext logs here]
```

**D. ManageFunctionsPage Logs**
```
[Paste ManageFunctionsPage logs here]
```

**E. CanonicalFieldSelect Logs**
```
[Paste CanonicalFieldSelect logs here]
```

**F. Dropdown Visual**
- Dropdown contains `error`: [YES/NO]
- Screenshot attached: [YES/NO]
- Browser Find result: [FOUND/NOT FOUND]

**G. Failure Point Identified**
- Layer: [Service/Context/Component/Dropdown/None]
- Reason: [Empty fieldName/Empty displayName/Filtered out/Transform issue/Other]
- Specific code location: [File:Line]

---

## Next Steps After Evidence Collection

1. Share the completed Evidence Report
2. Identify the exact failure point
3. Implement targeted fix
4. Re-test with same evidence collection process
