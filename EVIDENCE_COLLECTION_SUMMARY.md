# Evidence Collection Summary - 'error' Field Tracking

## Changes Made to Enable Diagnostics

### 1. CanonicalFieldService.js
**Location:** `src/services/CanonicalFieldService.js`

**Added Logging:**
- Raw API response data
- Extracted raw array
- Error field presence in raw data
- After mapping transformation
- After filter operation
- Error field in final result
- All field names list

**Key Functions Logged:**
- `unwrapFields()` - Transforms API response
- `fetchCanonicalFields()` - Fetches and caches data

### 2. CanonicalFieldSelect.jsx
**Location:** `src/components/shared/CanonicalFieldSelect.jsx`

**Added Logging:**
- All canonical fields received by dropdown
- All field names in the dropdown
- Specific check for 'error' field presence

### 3. Existing Logs (Already in place from previous fixes)
- APIContext.jsx - Line with console.log for loaded canonical fields
- ManageFunctionsPage.jsx - Lines 696-738 with canonical field transformation logs

## Diagnostic Tools Created

### Tool 1: Step-by-Step Instructions
**File:** `DIAGNOSTIC_ERROR_FIELD_TRACKING.md`

**Purpose:** Comprehensive guide for collecting runtime evidence

**Sections:**
- A: Network evidence (API response screenshot)
- B: Service layer console logs
- C: Context layer console logs
- D: Component layer console logs
- E: Dropdown layer console logs
- F: Visual evidence (dropdown screenshot)
- G: Filtering logic identification

### Tool 2: Browser Console Test Script
**File:** `BROWSER_DIAGNOSTIC_TEST.js`

**Purpose:** Automated diagnostic test to run in browser console

**What it does:**
1. Fetches `/api/canonical/fields` directly
2. Checks if 'error' field exists in response
3. Simulates `unwrapFields()` transformation
4. Checks if field would pass filter
5. Inspects React component state
6. Checks actual DOM for select elements

**Usage:**
```
1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy contents of BROWSER_DIAGNOSTIC_TEST.js
4. Paste into console and press Enter
5. Wait 3 seconds for all tests to complete
6. Review output
```

### Tool 3: Database Diagnostic Queries
**File:** `DATABASE_DIAGNOSTIC_QUERIES.md`

**Purpose:** SQL queries to verify database state

**Queries:**
1. Check if 'error' field exists
2. Get all canonical fields (structure verification)
3. Get 'error' field details
4. Check for duplicates
5. Check scope/filtering
6. Compare 'error' with working fields
7. Verification query (detects empty strings, NULL, whitespace)

## Evidence Collection Process

### Step 1: Database Verification
Run queries from `DATABASE_DIAGNOSTIC_QUERIES.md`

**Required Output:**
```sql
-- Query result showing 'error' field
field_name | display_name | field_name_length | display_name_length | field_name_status | display_name_status
-----------+--------------+-------------------+---------------------+-------------------+--------------------
error      | Error        | 5                 | 5                   | OK                | OK
```

### Step 2: Network Verification
1. Open browser DevTools → Network tab
2. Refresh page
3. Find `/api/canonical/fields` request
4. Check Response tab

**Required Screenshot:** Response showing 'error' field

**Expected JSON:**
```json
[
  {
    "fieldName": "error",
    "displayName": "Error",
    ...
  }
]
```

### Step 3: Browser Console Automated Test
1. Open browser DevTools → Console tab
2. Copy/paste `BROWSER_DIAGNOSTIC_TEST.js`
3. Press Enter
4. Wait 3 seconds

**Required Output:** Copy all test results

### Step 4: Manual Console Log Review
Look for these specific logs in Console:

```
[CanonicalFieldService] fetchCanonicalFields - ALL FIELD NAMES: [...]
[APIContext] Loaded canonical fields: [...]
[ManageFunctionsPage] ALL fieldName values: [...]
[CanonicalFieldSelect] ALL FIELD NAMES: [...]
[CanonicalFieldSelect] ERROR FIELD PRESENT: {...}
```

**Required:** Copy each log output

### Step 5: Visual Verification
1. Navigate to page with canonical field dropdown
2. Click dropdown to open
3. Scroll through all options
4. Use Ctrl+F to search for "error"

**Required Screenshot:** Dropdown showing all options

## Expected Results at Each Layer

### Layer 1: Database
```
✅ 'error' field exists with:
- field_name = 'error' (not NULL, not empty)
- display_name = 'Error' (not NULL, not empty)
```

### Layer 2: API Response
```
✅ GET /api/canonical/fields returns:
{
  "fieldName": "error",
  "displayName": "Error"
}
```

### Layer 3: CanonicalFieldService
```
✅ unwrapFields() output includes:
{
  fieldName: "error",
  displayName: "Error"
}

✅ Filter passes because:
- fieldName is truthy
- displayName is truthy
```

### Layer 4: APIContext
```
✅ canonicalFields state includes:
{
  fieldName: "error",
  displayName: "Error"
}
```

### Layer 5: ManageFunctionsPage
```
✅ Transformed fields include:
{
  fieldName: "error",
  displayName: "Error",
  name: "Error"
}
```

### Layer 6: CanonicalFieldSelect
```
✅ canonicalFields prop includes:
{
  fieldName: "error",
  displayName: "Error"
}

✅ Dropdown renders:
<option value="error">Error</option>
```

## Failure Point Analysis

### If 'error' missing at Layer 1 (Database)
**Problem:** Field not in database or incorrectly structured
**Solution:** Insert field with correct structure

### If 'error' missing at Layer 2 (API)
**Problem:** Backend endpoint filtering or query issue
**Solution:** Check backend API code

### If 'error' missing at Layer 3 (Service)
**Problem:** unwrapFields() filter removing field
**Cause:** Empty fieldName or displayName
**Solution:** Check API response structure

### If 'error' missing at Layer 4 (Context)
**Problem:** APIContext transformation issue
**Solution:** Check APIContext.jsx

### If 'error' missing at Layer 5 (Component)
**Problem:** ManageFunctionsPage transformation
**Cause:** Incorrect mapping logic
**Solution:** Verify lines 696-738 in ManageFunctionsPage.jsx

### If 'error' missing at Layer 6 (Dropdown)
**Problem:** Props not passing correctly
**Solution:** Check TreeMappingBuilder.jsx prop passing

### If 'error' in Layer 6 but not visible
**Problem:** CSS hiding or browser rendering issue
**Solution:** Check CSS display property, inspect DOM

## Common Issues and Solutions

### Issue 1: Empty fieldName or displayName
**Symptom:** Field filtered out at unwrapFields()
**Check:** Database query shows NULL or empty string
**Fix:** Update database record

### Issue 2: Wrong property names
**Symptom:** Field exists but mapping uses wrong property
**Check:** API returns `field_name` but code expects `fieldName`
**Fix:** Update unwrapFields() mapping logic

### Issue 3: Scope filtering
**Symptom:** Field excluded by scope
**Check:** Database shows scope = 'admin' but only 'system' shown
**Fix:** Update scope or remove scope filtering

### Issue 4: Case sensitivity
**Symptom:** Field 'Error' exists but search for 'error' fails
**Check:** Exact string matching without toLowerCase()
**Fix:** Add .toLowerCase() to comparisons

## Evidence Report Template

```
=== EVIDENCE REPORT ===
Date: [YYYY-MM-DD]
Time: [HH:MM]
Browser: [Chrome/Firefox/Edge]
User: [Username]

DATABASE VERIFICATION:
[Paste SQL query results]

NETWORK EVIDENCE:
Request: GET /api/canonical/fields
Status: [200/404/500]
Response includes 'error': [YES/NO]
[Paste JSON response or attach screenshot]

SERVICE LAYER LOGS:
[Paste all CanonicalFieldService logs]

CONTEXT LAYER LOGS:
[Paste APIContext logs]

COMPONENT LAYER LOGS:
[Paste ManageFunctionsPage logs]

DROPDOWN LAYER LOGS:
[Paste CanonicalFieldSelect logs]

BROWSER TEST RESULTS:
[Paste output from BROWSER_DIAGNOSTIC_TEST.js]

VISUAL VERIFICATION:
Dropdown contains 'error': [YES/NO]
[Attach dropdown screenshot]
Browser Find (Ctrl+F) found 'error': [YES/NO]

FAILURE POINT:
Layer: [Database/API/Service/Context/Component/Dropdown/Unknown]
Reason: [Detailed explanation]
Code Location: [File:Line]

NEXT STEPS:
[Proposed fix based on findings]
```

## Quick Checklist

- [ ] Database query confirms 'error' field exists
- [ ] fieldName and displayName are not NULL/empty
- [ ] API response includes 'error' field
- [ ] CanonicalFieldService logs show 'error'
- [ ] APIContext logs show 'error'
- [ ] ManageFunctionsPage logs show 'error'
- [ ] CanonicalFieldSelect logs show 'error'
- [ ] Dropdown visually shows 'error' option
- [ ] Evidence report completed
- [ ] Failure point identified
- [ ] Fix implemented
- [ ] Re-tested and verified

## Files Modified for Diagnostics

1. `src/services/CanonicalFieldService.js` - Added comprehensive logging
2. `src/components/shared/CanonicalFieldSelect.jsx` - Added field tracking logs

## Files to Review Based on Failure Point

- **Service Layer:** `src/services/CanonicalFieldService.js`
- **Context Layer:** `src/contexts/APIContext.jsx`
- **Component Layer:** `src/components/ManageFunctionsPage.jsx`
- **Mapping Layer:** `src/components/shared/TreeMappingBuilder.jsx`
- **Dropdown Layer:** `src/components/shared/CanonicalFieldSelect.jsx`

## Support Files Created

1. `DIAGNOSTIC_ERROR_FIELD_TRACKING.md` - Detailed instructions
2. `BROWSER_DIAGNOSTIC_TEST.js` - Automated browser test
3. `DATABASE_DIAGNOSTIC_QUERIES.md` - SQL verification queries
4. `EVIDENCE_COLLECTION_SUMMARY.md` - This file

---

**Next Action:** Run diagnostic tools and collect evidence following the instructions in `DIAGNOSTIC_ERROR_FIELD_TRACKING.md`
