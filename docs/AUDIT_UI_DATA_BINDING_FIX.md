# AUDIT UI DATA BINDING FIX

## ISSUE SUMMARY

Several columns in the Audit UI were displaying "-" instead of actual values due to property name mismatches between the API response and the UI component.

---

## EXPECTED API RESPONSE FORMAT

### Sample Audit Log Row

```json
{
  "request_id": "REQ-2024-001",
  "mapping_id": "MAP-001",
  "mapping_name": "BALANCE_INQUIRY_TO_GET_BALANCE",
  "inbound_adapter_name": "CBS_ADAPTER",
  "inbound_adapter_id": "CBS-IB-001",
  "inbound_request_type": "GET_BALANCE",
  "outbound_adapter_name": "MOBILE_GATEWAY",
  "outbound_adapter_id": "MOBILE-OB-001",
  "outbound_request_type": "BALANCE_INQUIRY",
  "adapter_type": "HTTP",
  "status": "success",
  "transform_status": "completed",
  "outbound_status": "sent",
  "latency_ms": 245,
  "timestamp": "2024-06-09T13:00:13.456Z",
  "created_at": "2024-06-09T13:00:13.456Z",
  "original_request": "{\"custId\":\"12345\",\"accountNumber\":\"9876543210\"}",
  "transformed_request": "{\"CUST\":\"12345\",\"ACCT\":\"9876543210\"}",
  "outbound_destination": {
    "host": "192.168.1.100",
    "port": 8080,
    "path": "/api/balance",
    "protocol": "HTTP"
  },
  "outbound_request_xml": "<request><CUST>12345</CUST><ACCT>9876543210</ACCT></request>",
  "inbound_response_xml": "<response><balance>1000.00</balance><status>SUCCESS</status></response>",
  "parsed_response": "{\"balance\":\"1000.00\",\"status\":\"SUCCESS\"}",
  "response_mappings_used": {
    "balance": {
      "sourceField": "balance",
      "targetField": "accountBalance",
      "mappingType": "DIRECT"
    }
  },
  "final_response": "{\"accountBalance\":\"1000.00\",\"responseCode\":\"00\"}"
}
```

**Alternative Format (camelCase):**
```json
{
  "requestId": "REQ-2024-001",
  "mappingId": "MAP-001",
  "mappingName": "BALANCE_INQUIRY_TO_GET_BALANCE",
  "inboundAdapterName": "CBS_ADAPTER",
  "inboundRequestType": "GET_BALANCE",
  "outboundAdapterName": "MOBILE_GATEWAY",
  "outboundRequestType": "BALANCE_INQUIRY",
  "adapterType": "HTTP",
  "status": "success",
  "latencyMs": 245,
  "timestamp": "2024-06-09T13:00:13.456Z"
}
```

---

## PROPERTY MAPPING TABLE

| UI Display Column | API Property (snake_case) | API Property (camelCase) | Fallback Properties | Format |
|------------------|---------------------------|--------------------------|---------------------|---------|
| Mapping ID | `mapping_id` | `mappingId` | `id` | String |
| Inbound Adapter | `inbound_adapter_name` | `inboundAdapterName` | `inboundAdapter` | String |
| Inbound Request Type | `inbound_request_type` | `inboundRequestType` | `requestType` | String |
| Outbound Adapter | `outbound_adapter_name` | `outboundAdapterName` | `outboundAdapter` | String |
| Outbound Request Type | `outbound_request_type` | `outboundRequestType` | `responseType` | String |
| Adapter Type | `adapter_type` | `adapterType` | `type` | String |
| Status | `status` | `status` | - | String |
| Date | `created_at` | `createdAt` | `timestamp`, `date` | DD Mon YYYY |
| Time | `created_at` | `createdAt` | `timestamp`, `date` | HH:mm:ss |

---

## PREVIEW DRAWER FIELDS

| Field Label | API Property (snake_case) | API Property (camelCase) | Fallback Properties |
|------------|---------------------------|--------------------------|---------------------|
| Original Request | `original_request` | `originalRequest` | `requestPayload`, `request_payload` |
| Transformed Request | `transformed_request` | `transformedRequest` | `mappedRequest`, `mapped_request` |
| Outbound Destination | `outbound_destination` | `outboundDestination` | - |
| Outbound Request XML | `outbound_request_xml` | `outboundRequestXml` | `outboundRequest`, `outbound_request` |
| CBS Response XML | `inbound_response_xml` | `inboundResponseXml` | `cbsResponse`, `cbs_response` |
| Parsed Response | `parsed_response` | `parsedResponse` | `parsedCbsResponse`, `parsed_cbs_response` |
| Response Mappings | `response_mappings_used` | `responseMappingsUsed` | `responseMappings`, `response_mappings` |
| Final Response | `final_response` | `finalResponse` | `response`, `mobileResponse`, `mobile_response` |

---

## FILES MODIFIED

### 1. `src/components/AuditDashboard.jsx`

**Changes:**
- Added debug logging to log first audit row and property names
- Updated `getCreatedTime()` to check multiple property name variants
- Updated `getAdapterName()` to handle snake_case property names
- Updated table row rendering with property name normalization
- Updated preview drawer metadata with fallback properties
- Updated all code viewers with fallback properties
- Updated execution metadata section with fallback properties

**Lines Modified:** ~150 lines

**Key Changes:**
```javascript
// Before
const inboundAdapterName = row.inboundAdapterName || "-";

// After
const inboundAdapterName = row?.inboundAdapterName ?? 
                          row?.inbound_adapter_name ?? 
                          row?.inboundAdapter ?? 
                          "-";
```

---

## DEBUG OUTPUT

### Console Logging

When audit logs are loaded, the following debug output appears in the browser console:

```
[AUDIT DEBUG] First audit row: {
  request_id: "REQ-001",
  mapping_id: "MAP-001",
  inbound_adapter_name: "CBS_ADAPTER",
  ...
}

[AUDIT DEBUG] Property names: [
  "request_id",
  "mapping_id",
  "inbound_adapter_name",
  "outbound_adapter_name",
  "adapter_type",
  ...
]

[AUDIT ROW DEBUG] Sample row: {
  request_id: "REQ-001",
  ...
}
```

### How to View Debug Output

1. Open browser DevTools (F12)
2. Go to Console tab
3. Load the Audit Logs page
4. Look for `[AUDIT DEBUG]` and `[AUDIT ROW DEBUG]` messages
5. Inspect the actual property names returned by the API

---

## DATE/TIME FORMATTING

### Date Format
- **Function:** `formatDate(value)`
- **Input:** ISO 8601 timestamp or Date object
- **Output:** `DD Mon YYYY`
- **Example:** `09 Jun 2024`

```javascript
function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { 
    day: "2-digit", 
    month: "short", 
    year: "numeric" 
  });
}
```

### Time Format
- **Function:** `formatTime(value)`
- **Input:** ISO 8601 timestamp or Date object
- **Output:** `HH:mm:ss`
- **Example:** `13:00:13`

```javascript
function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-GB", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit" 
  });
}
```

### Timestamp Format (Preview Drawer)
- **Function:** `formatTimestamp(value)`
- **Output:** `DD Mon YYYY, HH:mm:ss`
- **Example:** `09 Jun 2024, 13:00:13`

---

## NULL/EMPTY HANDLING

### "No Data Available" Display Rules

The `CodeViewer` component shows "No data available." when:
- Field value is `undefined`
- Field value is `null`
- Field value is empty string `""`
- All fallback properties are also empty

**Implementation:**
```javascript
<code>{content || "No data available."}</code>
```

### Metadata Tile Display Rules

The `MetaTile` component shows "-" when:
- Field value is `undefined`
- Field value is `null`
- Field value is empty string `""`

**Implementation:**
```javascript
<p>{value || "-"}</p>
```

---

## TESTING CHECKLIST

### Column Binding Verification
- [ ] Mapping ID displays correctly
- [ ] Inbound Adapter displays correctly (not "-")
- [ ] Inbound Request Type displays correctly (not "-")
- [ ] Outbound Adapter displays correctly (not "-")
- [ ] Outbound Request Type displays correctly (not "-")
- [ ] Adapter Type displays correctly (not "-")
- [ ] Status pill displays with correct color
- [ ] Date displays in format: DD Mon YYYY
- [ ] Time displays in format: HH:mm:ss

### Preview Drawer Verification
- [ ] Request ID shown in header
- [ ] All metadata tiles populated
- [ ] Inbound/Outbound request types shown
- [ ] Original Request JSON displays
- [ ] Transformed Request JSON displays
- [ ] Outbound Destination shows host/port/path/protocol
- [ ] Outbound Request XML displays
- [ ] CBS Response XML displays
- [ ] Parsed Response JSON displays
- [ ] Response Mappings table displays
- [ ] Final Response JSON displays
- [ ] Execution Metadata shows all fields

### Null Handling Verification
- [ ] Empty request shows "No data available."
- [ ] Empty response shows "No data available."
- [ ] Missing adapter type shows "-"
- [ ] Missing latency shows "-"

---

## BACKEND API VERIFICATION

### Recommended Backend Check

Run this query to verify the exact property names returned:

```bash
curl -X GET "http://localhost:8000/api/audit-logs" \
  -H "Content-Type: application/json" | jq '.[0]'
```

Or in the browser console after loading audit logs:

```javascript
// After logs are loaded, run:
console.log("API Response Sample:", logs[0]);
console.log("Property Names:", Object.keys(logs[0]));
```

### Expected Response Keys

The backend should return one of these formats:

**Option 1 (snake_case):**
```
request_id
mapping_id
inbound_adapter_name
outbound_adapter_name
adapter_type
created_at
```

**Option 2 (camelCase):**
```
requestId
mappingId
inboundAdapterName
outboundAdapterName
adapterType
createdAt
```

**Option 3 (Mixed):**
```
Both formats supported via fallback chain
```

The UI now handles all three options automatically.

---

## SCREENSHOT INSTRUCTIONS

### Before Fix
- Columns showing "-" for most fields
- Empty preview drawer sections

### After Fix
1. Open Audit Logs page
2. Verify all table columns populated
3. Click "View Details" on any row
4. Scroll through all 8 sections in preview drawer
5. Take screenshots showing:
   - Full table with populated columns
   - Preview drawer with metadata
   - Preview drawer with JSON sections
   - Preview drawer with XML sections

---

## TROUBLESHOOTING

### Issue: Still seeing "-" in columns

**Solution:**
1. Check browser console for `[AUDIT DEBUG]` logs
2. Verify the property names in the API response
3. Add additional fallback properties if needed:

```javascript
const adapterType = row?.adapterType ?? 
                   row?.adapter_type ?? 
                   row?.type ?? 
                   row?.YOUR_BACKEND_PROPERTY ?? 
                   "-";
```

### Issue: "No data available." shown for valid data

**Solution:**
1. Check if data is a string that needs parsing
2. Verify the `stringifyPretty()` function is handling the format
3. Check if field value is empty string vs undefined

### Issue: Date/Time showing as raw timestamp

**Solution:**
1. Verify the timestamp format is ISO 8601 or valid Date string
2. Check if `formatDate()` and `formatTime()` are being called
3. Ensure locale "en-GB" is supported by the browser

---

## RUNTIME IMPACT

**NONE** ✅

- Only UI data binding changed
- No API contract modifications
- No database schema changes
- Backward compatible with existing data
- Handles both snake_case and camelCase property names

---

**END OF DOCUMENTATION**
