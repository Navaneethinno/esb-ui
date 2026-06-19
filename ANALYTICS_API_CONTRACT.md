# FRONTEND ANALYTICS API CONTRACT

## Endpoint
```
GET /api/adapter-analytics/<adapter_id>
```

## Expected Response Structure

The frontend `AdapterDetails.jsx` component expects the following response structure:

```json
{
  "summary": {
    "totalExecutions": <number>,
    "successRate": <number>,
    "failedTransactions": <number>,
    "averageLatencyMs": <number | null>
  },
  "charts": {
    "requestTypeVolume": [
      {
        "requestType": "<string>",
        "count": <number>
      }
    ],
    "latencyTrend": [
      {
        "timestamp": "<ISO8601 string>",
        "latencyMs": <number>
      }
    ],
    "auditOutcomeSplit": [
      {
        "status": "<string>",
        "count": <number>
      }
    ],
    "linkedFlow": "<string | null>"
  },
  "transactionHistory": [
    {
      "timestamp": "<ISO8601 string>",
      "requestType": "<string>",
      "status": "<string>",
      "latencyMs": <number | null>,
      "linkedFlow": "<string>",
      "errorMessage": "<string>"
    }
  ],
  "linkedFlow": "<string | null>",
  "lastTransaction": {
    "timestamp": "<ISO8601 string>",
    "requestType": "<string>",
    "status": "<string>",
    "latencyMs": <number | null>,
    "linkedFlow": "<string>",
    "errorMessage": "<string>"
  },
  "debug": {
    "adapterId": "<string>",
    "matchedAuditRows": <number>,
    "matchedIdentifiers": [<array>]
  }
}
```

---

## Field Mappings (Frontend Normalization)

The frontend normalizes various field name variations:

### Summary Metrics
- `summary.totalExecutions` → displayed as integer
- `summary.successRate` → displayed as percentage (1 decimal)
- `summary.failedTransactions` → displayed as integer
- `summary.averageLatencyMs` → formatted as "XXX ms" or "N/A"

### Charts
- `charts.requestTypeVolume[]` → Bar chart
  - Accepts: `item.requestType` or `item.name`
  - Accepts: `item.count` or `item.value`

- `charts.latencyTrend[]` → Line chart
  - Accepts: `item.timestamp` or `item.label`
  - Accepts: `item.latencyMs` or `item.value`

- `charts.auditOutcomeSplit[]` → Pie chart
  - Accepts: `item.status` or `item.name`
  - Accepts: `item.count` or `item.value`

### Transaction History
- Accepts multiple timestamp field names:
  - `timestamp`, `createdAt`, `created_at`, `executedAt`, `executed_at`
- Accepts multiple request type field names:
  - `requestType`, `request_type`, `requestName`, `request_name`
- Accepts multiple status field names:
  - `status`, `finalStatus`, `final_status`
- Accepts multiple latency field names:
  - `latencyMs`, `latency_ms`, `processingTimeMs`, `processing_time_ms`
- Accepts multiple flow field names:
  - `linkedFlow`, `linked_flow`, `flowName`, `flow_name`
- Accepts multiple error field names:
  - `errorMessage`, `error_message`, `error`

### Debug
- `debug.adapterId` → logged to console
- `debug.matchedAuditRows` or `debug.auditRowCount` → logged to console
- `debug.matchedIdentifiers` → logged to console

---

## Zero-State Handling

**Condition:** `summary.totalExecutions === 0`

**UI Behavior:**
- ✅ Show message: "No execution history available yet. Run a test transaction to begin collecting analytics."
- ❌ Hide all charts (requestTypeVolume, latencyTrend, auditOutcomeSplit, linkedFlow)
- ✅ Show KPIs with zero values:
  - Total Executions = 0
  - Success Rate = 0%
  - Failed Transactions = 0
  - Avg Latency = N/A

---

## Error Handling

### 404 Not Found
**UI Behavior:**
- ❌ Exit loading shimmer
- ✅ Show error message: "Unable to load adapter analytics."
- ✅ Show [Retry] button
- ✅ Show [Back to Registry] button

### Other Errors (500, timeout, network)
**UI Behavior:**
- ❌ Exit loading shimmer
- ✅ Show error message from `getApiErrorMessage(err)`
- ✅ Show [Retry] button
- ✅ Show [Back to Registry] button

---

## Console Debug Logs

The frontend ALWAYS logs to console:

```javascript
console.log('analytics.debug.adapterId', <adapter_id>);
console.log('analytics.debug.matchedAuditRows', <number | null>);
console.log('analytics.debug.matchedIdentifiers', <array | null>);
```

These logs appear even on API errors (with null values).

---

## Data Display Rules

### KPI Cards
1. **Total Executions**: Direct number display
2. **Success Rate**: Formatted with 1 decimal + "%" symbol
3. **Failed Transactions**: Direct number display
4. **Average Latency**: 
   - If null or totalExecutions === 0: "N/A"
   - Otherwise: Rounded to integer + " ms"

### Charts Visibility
- All charts are hidden if `totalExecutions === 0`
- Charts render if corresponding data array has length > 0
- Empty arrays with totalExecutions > 0 should still attempt to render (may show empty chart)

### Last Transaction Panel
- Shows if `lastTransaction` object exists OR first item from `transactionHistory`
- Displays: timestamp, requestType, status, latencyMs, linkedFlow

### Transaction History Table
- Shows up to first 10 items from `transactionHistory` array
- If array is empty: shows "No transaction data available yet."

### Linked Flow Panel
- Only renders if `hasCharts === true` (i.e., totalExecutions > 0)
- Displays: `analytics.linkedFlow` or `analytics.charts.linkedFlow`
- If value is object: JSON.stringify with 2-space indent
- If no value: shows "Data not available"

---

## Required vs Optional Fields

### Required for Zero Errors:
```json
{
  "summary": {
    "totalExecutions": 0
  }
}
```

### All Other Fields are Optional
The frontend safely handles missing fields with fallbacks:
- Missing numbers → default to 0
- Missing arrays → default to []
- Missing strings → show "Data not available" or "N/A"

---

## Validation Test Cases

### Test Case 1: Adapter with Executions
**API Response:**
```json
{
  "summary": {
    "totalExecutions": 25,
    "successRate": 92.5,
    "failedTransactions": 2,
    "averageLatencyMs": 150.5
  },
  "charts": {
    "requestTypeVolume": [
      {"requestType": "bill_inquiry", "count": 15},
      {"requestType": "payment", "count": 10}
    ],
    "latencyTrend": [
      {"timestamp": "2024-01-01T10:00:00Z", "latencyMs": 150},
      {"timestamp": "2024-01-01T11:00:00Z", "latencyMs": 145}
    ],
    "auditOutcomeSplit": [
      {"status": "SUCCESS", "count": 23},
      {"status": "FAILED", "count": 2}
    ]
  },
  "transactionHistory": [...],
  "debug": {
    "adapterId": "123",
    "matchedAuditRows": 25
  }
}
```

**Expected UI:**
- ✅ Total Executions = 25
- ✅ Success Rate = 92.5%
- ✅ All charts rendered
- ✅ Transaction history table populated

### Test Case 2: Adapter with Zero Executions
**API Response:**
```json
{
  "summary": {
    "totalExecutions": 0,
    "successRate": 0,
    "failedTransactions": 0,
    "averageLatencyMs": null
  },
  "charts": {
    "requestTypeVolume": [],
    "latencyTrend": [],
    "auditOutcomeSplit": []
  },
  "transactionHistory": [],
  "debug": {
    "adapterId": "456",
    "matchedAuditRows": 0
  }
}
```

**Expected UI:**
- ✅ Zero-state message shown
- ✅ Total Executions = 0
- ✅ Success Rate = 0%
- ✅ Avg Latency = N/A
- ✅ All charts hidden

### Test Case 3: 404 Error
**API Response:**
```
HTTP 404 Not Found
```

**Expected UI:**
- ✅ No infinite shimmer
- ✅ Error message: "Unable to load adapter analytics."
- ✅ Retry and Back buttons visible
