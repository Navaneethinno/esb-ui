# FRONTEND ANALYTICS VALIDATION GUIDE

## Objective
Verify that the UI is correctly consuming the new analytics endpoint `/api/adapter-analytics/<adapter_id>` and not hiding valid data.

---

## PREPARATION

### 1. Identify Adapter IDs

Navigate to the Adapter Registry and collect the adapter IDs for:
- WaterBill
- Dummy_outbound
- Customer Onboarding Gateway
- TANAI OB COREBANK
- Auto Mapping Inbound 1781483061357
- Auto Mapping Outbound 1781483061357

### 2. Open Browser DevTools

1. Open the ESB UI application
2. Press F12 to open DevTools
3. Go to the **Network** tab
4. Enable "Preserve log" checkbox
5. Clear existing network requests

---

## STEP 1 - NETWORK VALIDATION

For each adapter in the list:

### 1.1 Navigate to Adapter Details
- Click on the adapter from the registry
- Wait for the details page to load

### 1.2 Capture Network Request
In the Network tab, filter by "adapter-analytics" and verify:

**Expected:**
```
GET /api/adapter-analytics/<adapter_id>
Status: 200 OK
```

**Capture:**
- Adapter Name
- Request URL
- Response Status
- Response Time

### 1.3 Example Log Format
```
Adapter: WaterBill
URL: /api/adapter-analytics/123
Status: 200 OK
Time: 245ms
```

---

## STEP 2 - RESPONSE VALIDATION

For each successful request (Status 200):

### 2.1 Inspect Response Body
Click on the request in Network tab → Preview/Response

### 2.2 Extract Key Fields
Capture the following from the response:

```json
{
  "summary": {
    "totalExecutions": <number>,
    "successRate": <number>,
    "failedTransactions": <number>,
    "averageLatencyMs": <number>
  },
  "charts": {
    "requestTypeVolume": [array],
    "latencyTrend": [array],
    "auditOutcomeSplit": [array]
  },
  "debug": {
    "matchedAuditRows": <number>,
    "matchedIdentifiers": [array],
    "adapterId": <string>
  },
  "transactionHistory": [array],
  "linkedFlow": <string>
}
```

### 2.3 Example Capture
```
Adapter: WaterBill
summary.totalExecutions: 25
summary.successRate: 92.5
charts.requestTypeVolume: [{"requestType": "bill_inquiry", "count": 15}, ...]
charts.latencyTrend: [{"timestamp": "...", "latencyMs": 150}, ...]
debug.matchedAuditRows: 25
```

---

## STEP 3 - UI RENDER VALIDATION

For each adapter details page:

### 3.1 Verify KPI Cards
Check if the following metrics are displayed:

**Total Executions Card:**
- Should display: `summary.totalExecutions`
- UI Location: Top KPI row, first card

**Success Rate Card:**
- Should display: `summary.successRate%`
- UI Location: Top KPI row, second card

**Failed Transactions Card:**
- Should display: `summary.failedTransactions`
- UI Location: Top KPI row, third card

**Average Latency Card:**
- Should display: `summary.averageLatencyMs` formatted as "XXX ms" or "N/A"
- UI Location: Top KPI row, fourth card

### 3.2 Verify Charts Rendering

**Request Type Volume Chart:**
- Should render if: `charts.requestTypeVolume` has data
- Should NOT render if: `charts.requestTypeVolume` is empty AND `totalExecutions === 0`
- Chart Type: Bar chart

**Latency Trend Chart:**
- Should render if: `charts.latencyTrend` has data
- Should NOT render if: `charts.latencyTrend` is empty AND `totalExecutions === 0`
- Chart Type: Line chart

**Audit Outcome Split Chart:**
- Should render if: `charts.auditOutcomeSplit` has data
- Should NOT render if: `charts.auditOutcomeSplit` is empty AND `totalExecutions === 0`
- Chart Type: Pie chart

### 3.3 Verify Zero-State Handling

**If totalExecutions === 0:**

✅ Should Show:
```
"No execution history available yet.
Run a test transaction to begin collecting analytics."
```

❌ Should Hide:
- Request Type Volume Chart
- Latency Trend Chart
- Audit Outcome Split Chart
- Linked Flow section

✅ Should Display:
- Total Executions = 0
- Success Rate = 0%
- Failed Transactions = 0
- Avg Latency = N/A

### 3.4 Verify Error Handling

**If API returns 404:**

✅ Should Show:
```
"Unable to load adapter analytics."
```

✅ Should Provide:
- [Retry] button
- [Back to Registry] button

❌ Should NOT:
- Stay in loading shimmer indefinitely

---

## STEP 4 - IDENTIFY UI BUGS

Report ONLY if one of these conditions is met:

### Bug Type 1: Data Exists but UI Shows Empty
```
API Response: totalExecutions = 25
UI Display: Shows "No execution history" message
```

### Bug Type 2: Data Exists but Chart Not Rendered
```
API Response: requestTypeVolume = [{"requestType": "bill_inquiry", "count": 15}]
UI Display: Chart area is blank or not visible
```

### Bug Type 3: Value Mismatch
```
API Response: totalExecutions = 25
UI Display: Total Executions = 12
```

### Bug Type 4: Infinite Loading
```
API Response: 404 Not Found
UI Display: Still showing loading shimmer after 10+ seconds
```

---

## AUTOMATED VALIDATION (OPTIONAL)

### Run the validation script:

1. Load the adapter details page
2. Open browser console
3. Load the validation script:
```javascript
// Copy and paste the contents of analytics-validation-test.js
```

4. Run validation:
```javascript
await window.runAnalyticsValidation({
  "WaterBill": "123",
  "Dummy_outbound": "456",
  "Customer Onboarding Gateway": "789",
  "TANAI OB COREBANK": "101",
  "Auto Mapping Inbound 1781483061357": "102",
  "Auto Mapping Outbound 1781483061357": "103"
});
```

5. Review console output for PASS/FAIL results

---

## FINAL REPORT TEMPLATE

For each adapter, provide:

```
========================================
Adapter: <adapter_name>
========================================

NETWORK:
- Request URL: /api/adapter-analytics/<id>
- Response Status: <status>

API RESPONSE:
- Total Executions: <number>
- Success Rate: <number>%
- Request Type Count: <number> types
- Latency Trend Count: <number> points
- Matched Audit Rows: <number>

UI RENDERING:
- Total Executions Displayed: <value>
- Success Rate Displayed: <value>
- Request Type Chart Status: RENDERED / NOT RENDERED / EMPTY STATE
- Latency Chart Status: RENDERED / NOT RENDERED / EMPTY STATE
- Zero State Shown: YES / NO

VALIDATION:
- Pass/Fail: PASS / FAIL
- Issues Found: <list any mismatches>

========================================
```

---

## OVERALL RESULT

```
PASS: All adapters correctly consume API and render data
FAIL: <number> adapters have UI rendering issues
```

---

## DEBUG CONSOLE LOGS

The UI automatically logs debug information. Check browser console for:

```
analytics.debug.adapterId: <adapter_id>
analytics.debug.matchedAuditRows: <number>
analytics.debug.matchedIdentifiers: [array]
```

This confirms the UI is receiving the correct adapter ID and backend matching data.

---

## SCREENSHOTS REQUIRED

1. **Adapter with executions** - showing all KPIs and charts populated
2. **Adapter with zero executions** - showing zero-state message
3. **No infinite shimmer** - showing error state with retry buttons (if 404 occurs)
4. **Network tab** - showing successful GET request to `/api/adapter-analytics/<id>`
5. **Console logs** - showing debug output with matchedAuditRows
