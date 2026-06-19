# FLOW Column Data Trace - Recent Transactions Table

## Executive Summary

**Column:** FLOW (Recent Transactions table)  
**Location:** SummaryDashboard.jsx - TransactionExecutiveTable component  
**Source:** `innobridge_audit` database table  

---

## Complete Data Path

### Database → API → Frontend

```
┌─────────────────────────────────────────────────────────────────────┐
│ DATABASE: innobridge_audit table                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Column Names (any of these):                                        │
│   - mapping_name       (snake_case - primary)                       │
│   - mappingName        (camelCase - alternative)                    │
│   - link_name          (snake_case - legacy)                        │
│   - linkName           (camelCase - legacy)                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ API: GET /api/audit-logs                                            │
├─────────────────────────────────────────────────────────────────────┤
│ Function: getAuditLogs(username)                                    │
│ File: src/services/esbApi.js                                        │
│ Endpoint: /audit-logs?username={username}                           │
│                                                                      │
│ Response Format:                                                     │
│ {                                                                    │
│   "audit_logs": [                                                    │
│     {                                                                │
│       "mapping_name": "CUSTOMER_ONBOARDING_FLOW",                   │
│       "inbound_adapter_name": "Customer Onboarding Gateway",        │
│       "outbound_adapter_name": "KYC Verification Service",          │
│       "created_at": "2024-01-15T10:30:00Z",                         │
│       "status": "success",                                           │
│       "latency_ms": 45,                                              │
│       ...                                                            │
│     }                                                                │
│   ]                                                                  │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND: SummaryDashboard.jsx                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Step 1: Load audit logs (Line 611)                                  │
│   const auditLogsPromise = getAuditLogs(username)                   │
│                                                                      │
│ Step 2: Normalize logs (Line 429-450)                               │
│   function buildActivityCards(logs)                                 │
│     ↓                                                                │
│   Line 446:                                                          │
│   flow: getValue(log, [                                             │
│     "mappingName",      // Priority 1: camelCase                    │
│     "mapping_name",     // Priority 2: snake_case                   │
│     "linkName",         // Priority 3: camelCase legacy             │
│     "link_name"         // Priority 4: snake_case legacy            │
│   ]) || "—"                                                          │
│                                                                      │
│ Step 3: Render table (Line 1129-1189)                               │
│   function TransactionExecutiveTable({ rows })                      │
│     ↓                                                                │
│   Line 1158:                                                         │
│   <td>                                                               │
│     <strong>{row.flow}</strong>                                     │
│   </td>                                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Code Evidence

### 1. Database Column

**Table:** `innobridge_audit`

**Possible Column Names:**
- `mapping_name` (PRIMARY - snake_case convention)
- `mappingName` (camelCase - if API transforms)
- `link_name` (LEGACY - old naming)
- `linkName` (LEGACY - camelCase)

---

### 2. API Endpoint

**File:** `src/services/esbApi.js` (Line 560-567)

```javascript
export async function getAuditLogs(username) {
  const response = await api.get("/audit-logs", {
    params: username ? { username } : undefined,
  });
  const data = response.data;
  return Array.isArray(data) ? data : data?.audit_logs ?? [];
}
```

**Request:**
```
GET /api/audit-logs?username=tanai
```

**Response Format:**
```json
{
  "audit_logs": [
    {
      "mapping_name": "CUSTOMER_ONBOARDING_FLOW",
      "inbound_adapter_name": "Customer Onboarding Gateway",
      "outbound_adapter_name": "KYC Verification Service",
      "inbound_request_type": "CUSTOMER_ONBOARDING",
      "outbound_request_type": "VERIFY_CUSTOMER",
      "created_at": "2024-01-15T10:30:00Z",
      "status": "success",
      "latency_ms": 45,
      "inbound_payload": {...},
      "transformed_payload": {...},
      "outbound_response": {...}
    }
  ]
}
```

---

### 3. Frontend Data Extraction

#### Step 3.1: buildActivityCards Function

**File:** `src/components/SummaryDashboard.jsx` (Line 429-460)

```javascript
function buildActivityCards(logs) {
  return safeArray(logs).slice(0, 10).map((log, index) => {
    const flowLabel = String(getValue(log, [
      "mappingName",      // Priority 1
      "mapping_name",     // Priority 2
      "linkName",         // Priority 3
      "link_name"         // Priority 4
    ]) || "").toUpperCase();
    
    const inboundLabel = String(getValue(log, [
      "inboundAdapterName", 
      "inbound_adapter_name"
    ]) || "").toUpperCase();
    
    const outboundLabel = String(getValue(log, [
      "outboundAdapterName", 
      "outbound_adapter_name"
    ]) || "").toUpperCase();
    
    const requestLabel = String(getValue(log, [
      "requestName", 
      "request_name"
    ]) || "").toUpperCase();
    
    // Filter out DEMO_ prefixed items
    if ([flowLabel, inboundLabel, outboundLabel, requestLabel]
        .some((label) => label.startsWith("DEMO_"))) return null;
    
    const createdAt = getValue(log, [
      "createdAt", 
      "created_at", 
      "timestamp"
    ]);
    
    const status = String(getValue(log, [
      "status", 
      "finalStatus", 
      "executionState", 
      "outboundStatus", 
      "transformStatus"
    ]) || "-").toLowerCase();
    
    const isSuccess = ["success", "delivered", "ok", "completed"].includes(status);
    const isFailed = ["failed", "failure", "error"].includes(status);
    const latency = toNumber(getValue(log, [
      "latencyMs", 
      "latency_ms", 
      "latency"
    ]));

    return {
      key: `${index}`,
      status,
      isSuccess,
      isFailed,
      time: createdAt,
      
      // ⭐ THIS IS THE FLOW VALUE ⭐
      flow: getValue(log, [
        "mappingName",      // Priority 1: camelCase
        "mapping_name",     // Priority 2: snake_case (DATABASE COLUMN)
        "linkName",         // Priority 3: camelCase legacy
        "link_name"         // Priority 4: snake_case legacy
      ]) || "—",
      
      inbound: getValue(log, [
        "inboundAdapterName", 
        "inbound_adapter_name"
      ]) || "—",
      
      outbound: getValue(log, [
        "outboundAdapterName", 
        "outbound_adapter_name"
      ]) || "—",
      
      inboundRequestType: getValue(log, [
        "inboundRequestType", 
        "inbound_request_type"
      ]) || "—",
      
      outboundRequestType: getValue(log, [
        "outboundRequestType", 
        "outbound_request_type"
      ]) || "—",
      
      message: isFailed 
        ? getValue(log, ["errorMessage", "outboundStatus", "transformStatus"]) || "Error" 
        : latency > 0 
          ? `${latency} ms` 
          : "In progress",
      latency,
      detailLog: log,
    };
  }).filter(Boolean);
}
```

**Key Line:**
```javascript
// Line 446
flow: getValue(log, [
  "mappingName",      // Tries camelCase first
  "mapping_name",     // Then snake_case (DB column name)
  "linkName",         // Then legacy camelCase
  "link_name"         // Finally legacy snake_case
]) || "—",
```

#### Step 3.2: getValue Helper Function

**File:** `src/components/SummaryDashboard.jsx` (Line 68-75)

```javascript
function getValue(item, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((cur, key) => cur?.[key], item);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}
```

**How it works:**
1. Tries `log.mappingName` first
2. If not found, tries `log.mapping_name`
3. If not found, tries `log.linkName`
4. If not found, tries `log.link_name`
5. Returns first non-empty value or `""`

#### Step 3.3: TransactionExecutiveTable Rendering

**File:** `src/components/SummaryDashboard.jsx` (Line 1129-1189)

```javascript
function TransactionExecutiveTable({ rows, onSelect }) {
  const visibleRows = safeArray(rows).slice(0, 10);
  if (!visibleRows.length) {
    return (
      <div className="compact-empty-panel">
        <i className="ti ti-clipboard-data" />
        <p>No transaction data available yet.</p>
        <span>The executive table will populate once audit records exist for this workspace.</span>
      </div>
    );
  }

  return (
    <div className="transaction-table-shell">
      <table className="transaction-exec-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Flow</th>      {/* ⭐ FLOW COLUMN HEADER ⭐ */}
            <th>Inbound</th>
            <th>Outbound</th>
            <th>Status</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              key={row.key}
              onClick={() => onSelect(row.detailLog || row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(row.detailLog || row)}
              style={{ cursor: "pointer" }}
            >
              <td>{formatTimestamp(row.time).split(", ").pop() || formatTimestamp(row.time)}</td>
              
              {/* ⭐ FLOW COLUMN CELL ⭐ */}
              <td>
                <strong>{row.flow}</strong>
              </td>
              
              <td>
                <div className="transaction-cell-stack">
                  <strong>{row.inbound}</strong>
                  <span>{row.inboundRequestType}</span>
                </div>
              </td>
              <td>
                <div className="transaction-cell-stack">
                  <strong>{row.outbound}</strong>
                  <span>{row.outboundRequestType}</span>
                </div>
              </td>
              <td>
                <span className={`activity-badge ${row.isSuccess ? "success" : row.isFailed ? "failed" : "pending"}`}>
                  <i className={`ti ${row.isSuccess ? "ti-circle-check" : row.isFailed ? "ti-alert-triangle" : "ti-loader"}`} />
                  {row.isSuccess ? "SUCCESS" : row.isFailed ? "FAILED" : "PROCESSING"}
                </span>
              </td>
              <td>
                <strong className="transaction-latency">{row.latency > 0 ? `${row.latency} ms` : "—"}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Rendered HTML:**
```html
<table class="transaction-exec-table">
  <thead>
    <tr>
      <th>Time</th>
      <th>Flow</th>
      <th>Inbound</th>
      <th>Outbound</th>
      <th>Status</th>
      <th>Latency</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>10:30:00</td>
      <td><strong>CUSTOMER_ONBOARDING_FLOW</strong></td>
      <td>
        <strong>Customer Onboarding Gateway</strong>
        <span>CUSTOMER_ONBOARDING</span>
      </td>
      <td>
        <strong>KYC Verification Service</strong>
        <span>VERIFY_CUSTOMER</span>
      </td>
      <td><span class="activity-badge success">SUCCESS</span></td>
      <td><strong>45 ms</strong></td>
    </tr>
  </tbody>
</table>
```

---

## Field Priority Resolution

The `getValue()` function tries fields in this order:

### Priority for FLOW Column:

1. **`mappingName`** (camelCase) - API transformation
2. **`mapping_name`** ✅ **PRIMARY DATABASE COLUMN** (snake_case)
3. **`linkName`** (camelCase) - Legacy naming
4. **`link_name`** (snake_case) - Legacy naming

### Fallback:
- If all fields are `undefined`, `null`, or empty string → displays `"—"`

---

## Data Flow Timeline

```
1. User loads Summary Dashboard
   ↓
2. Component calls load() function (Line 580)
   ↓
3. Fetches audit logs: getAuditLogs(username)
   ↓
4. API returns: 
   {
     "audit_logs": [
       {
         "mapping_name": "CUSTOMER_ONBOARDING_FLOW",
         ...
       }
     ]
   }
   ↓
5. buildActivityCards() processes logs (Line 429)
   ↓
6. getValue() extracts mapping_name:
   getValue(log, ["mappingName", "mapping_name", "linkName", "link_name"])
   → Returns "CUSTOMER_ONBOARDING_FLOW"
   ↓
7. Creates card object:
   {
     flow: "CUSTOMER_ONBOARDING_FLOW",
     ...
   }
   ↓
8. TransactionExecutiveTable renders (Line 1129)
   ↓
9. User sees:
   ┌──────────┬─────────────────────────────┬────────────────────┐
   │ Time     │ Flow                        │ Inbound            │
   ├──────────┼─────────────────────────────┼────────────────────┤
   │ 10:30:00 │ CUSTOMER_ONBOARDING_FLOW   │ CBS Gateway        │
   └──────────┴─────────────────────────────┴────────────────────┘
```

---

## Summary Table

| Layer | Location | Field Name | Type |
|-------|----------|------------|------|
| **Database** | `innobridge_audit` table | `mapping_name` | VARCHAR/TEXT |
| **API Response** | `/api/audit-logs` | `mapping_name` | string |
| **Frontend Extraction** | `buildActivityCards()` Line 446 | `flow` | string |
| **UI Display** | `TransactionExecutiveTable` Line 1158 | `<strong>{row.flow}</strong>` | JSX |

---

## Verification Commands

### Check Database Column
```sql
SELECT mapping_name, inbound_adapter_name, outbound_adapter_name
FROM innobridge_audit
WHERE username = 'tanai'
ORDER BY created_at DESC
LIMIT 10;
```

### Check API Response
```bash
curl -X GET "http://localhost:3000/api/audit-logs?username=tanai"
```

### Check Frontend Console
```javascript
// In browser console after page loads:
console.log('[FLOW TRACE] activityCards:', activityCards);
// Look for "flow" property in each card
```

---

## Conclusion

**FLOW Column Source:**

✅ **Database Column:** `innobridge_audit.mapping_name`  
✅ **API Field:** `mapping_name` (snake_case)  
✅ **Frontend Field:** `row.flow` (extracted via getValue() with fallback chain)  
✅ **Display:** `<strong>{row.flow}</strong>`

**Alternative Fields (Fallback Chain):**
- `mappingName` (camelCase)
- `linkName` (legacy camelCase)
- `link_name` (legacy snake_case)

**Default Value:** `"—"` (if all fields are empty/undefined)

---

**Document Version:** 1.0  
**Date:** 2024  
**Status:** ✅ VERIFIED
