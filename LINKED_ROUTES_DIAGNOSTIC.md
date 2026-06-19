# Linked Routes Diagnostic Investigation

## Investigation Tasks

### 1. Capture API Response
**Endpoint:** `/api/audit-logs` or `/api/logs/recent`

**Instructions:**
1. Open Browser DevTools (F12)
2. Navigate to Network tab
3. Refresh the Dashboard page
4. Find the audit-logs request
5. Copy the complete raw JSON response
6. Paste below:

```json
[PASTE RAW API RESPONSE HERE]
```

**What to verify:**
- Total count of objects in response array
- Find "BALANCE_INQUIRY" entries
- Check exact values for:
  - `mapping_name` or `mappingName`
  - `inbound_request_type` or `inboundRequestType`
  - `outbound_request_type` or `outboundRequestType`
  - `inbound_adapter_name` or `inboundAdapterName`
  - `outbound_adapter_name` or `outboundAdapterName`

---

### 2. Count Verification

#### API Response Count
- Total rows returned: [COUNT]

#### UI Rendered Count  
- Total route cards visible: [COUNT]

#### Comparison
- Match: YES / NO
- If NO, difference: [NUMBER]

---

### 3. Route Filtering Analysis

**Code Reference:** `SummaryDashboard.jsx` line 445-490

```javascript
function buildRouteGroupsFromAudit(logs) {
  const groups = new Map();
  const now = Date.now();
  safeArray(logs).forEach((row) => {
    const key = getRouteKey(row);
    const flowLabel = String(getValue(row, ["mappingName", "mapping_name"]) || "").toUpperCase();
    const inboundLabel = String(getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "").toUpperCase();
    const outboundLabel = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "").toUpperCase();
    const requestLabel = String(getValue(row, ["requestName", "request_name"]) || "").toUpperCase();
    
    // FILTER 1: DEMO_ prefix filter
    if (!key || [flowLabel, inboundLabel, outboundLabel, requestLabel].some((label) => label.startsWith("DEMO_"))) return;
    
    // ... grouping logic ...
  });

  return [...groups.values()]
    .filter((group) => group.executionCount > 0)  // FILTER 2: Only routes with executions
    .sort((a, b) => (b.executionCount - a.executionCount) || (b.recentTs - a.recentTs));
}
```

**Active Filters:**
1. ✅ DEMO_ prefix exclusion (line 450-451)
2. ✅ Execution count > 0 (line 478)
3. ❌ NO user ownership filter
4. ❌ NO recent activity filter (24h)
5. ❌ NO active route filter

**Question:** Is CBS_CORE being filtered out?
- Check if "CBS_CORE" contains "DEMO_": [YES/NO]
- Check if CBS_CORE has executionCount > 0: [YES/NO]

---

### 4. CBS_CORE → Unlinked Adapter Verification

#### Database Query 1: adapter_link_mapping
```sql
SELECT 
    mapping_id,
    mapping_name,
    inbound_adapter_id,
    outbound_adapter_id,
    inbound_request_name,
    outbound_request_name,
    created_at,
    updated_at
FROM adapter_link_mapping
WHERE inbound_adapter_id LIKE '%CBS_CORE%' 
   OR outbound_adapter_id LIKE '%CBS_CORE%'
   OR mapping_name LIKE '%CBS_CORE%';
```

**Result:**
- Records found: [COUNT]
- Data: [PASTE QUERY RESULT]

#### Database Query 2: adapter_link_audit
```sql
SELECT 
    audit_id,
    mapping_name,
    inbound_adapter_name,
    outbound_adapter_name,
    inbound_request_type,
    outbound_request_type,
    created_at,
    COUNT(*) OVER (PARTITION BY mapping_name) as execution_count
FROM adapter_link_audit
WHERE inbound_adapter_name LIKE '%CBS_CORE%'
   OR outbound_adapter_name LIKE '%CBS_CORE%'
   OR mapping_name LIKE '%CBS_CORE%'
ORDER BY created_at DESC
LIMIT 10;
```

**Result:**
- Records found: [COUNT]
- Execution count: [NUMBER]
- Data: [PASTE QUERY RESULT]

---

### 5. Encoding Corruption Verification

#### Database Level Check
```sql
-- Check raw bytes for corrupted field
SELECT 
    mapping_name,
    HEX(mapping_name) as hex_bytes,
    LENGTH(mapping_name) as byte_length,
    CHAR_LENGTH(mapping_name) as char_length,
    inbound_request_type,
    HEX(inbound_request_type) as request_type_hex,
    outbound_request_type,
    HEX(outbound_request_type) as response_type_hex
FROM adapter_link_audit
WHERE mapping_name LIKE '%BALANCE_INQUIRY%'
   OR inbound_adapter_name LIKE '%BALANCE_INQUIRY%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected vs Actual:**
- `→` (arrow) should be: `E2 86 92` (UTF-8)
- `–` (en dash) should be: `E2 80 93` (UTF-8)
- `â€˜` corrupted is: `C3 A2 E2 80 98` (double encoding)

**Database Result:**
[PASTE HEX OUTPUT]

#### API Response Level Check
From the captured Network response above:
1. Find the BALANCE_INQUIRY entry
2. Copy the exact raw JSON string
3. Check character encoding:

```javascript
// In browser console, paste the raw string:
const str = "BALANCE_INQUIRY_[EXACT_STRING_FROM_API]";
console.log('Char codes:', [...str].map(c => c.charCodeAt(0).toString(16)));
console.log('Is valid UTF-8:', /^[\x00-\x7F]*$/.test(str) || /^[\u0080-\uFFFF]*$/.test(str));
```

**API Response Character Codes:**
[PASTE CONSOLE OUTPUT]

#### UI Rendering Level Check
From browser console while viewing the page:

```javascript
// Find the corrupted text element
document.querySelectorAll('.active-route-card').forEach(card => {
  const text = card.innerText;
  if (text.includes('BALANCE_INQUIRY')) {
    console.log('Card text:', text);
    console.log('Char codes:', [...text].map(c => c.charCodeAt(0).toString(16)));
  }
});
```

**UI Rendered Character Codes:**
[PASTE CONSOLE OUTPUT]

---

## Evidence Summary Table

| Check | Database | API Response | UI Render | Match |
|-------|----------|--------------|-----------|-------|
| Route Count | [N] | [N] | [N] | [Y/N] |
| CBS_CORE exists | [Y/N] | [Y/N] | [Y/N] | [Y/N] |
| BALANCE_INQUIRY text | [VALUE] | [VALUE] | [VALUE] | [Y/N] |
| Encoding (hex) | [HEX] | [HEX] | [HEX] | [Y/N] |
| Execution Count | [N] | [N] | [N] | [Y/N] |

---

## Root Cause Determination

Once all evidence is collected, the root cause will be:

- [ ] Database stores corrupted UTF-8
- [ ] API response corrupts during JSON serialization
- [ ] Frontend corrupts during rendering
- [ ] Route is filtered intentionally by code logic
- [ ] Route exists but has zero executions (filtered out)

**Next Actions:** [WILL BE DETERMINED AFTER EVIDENCE COLLECTION]
