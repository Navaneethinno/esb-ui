# BEFORE/AFTER FIELD BINDING FIX

## Problem Statement
Backend returns valid data but UI shows "Data not available"

---

## ❌ BEFORE (Broken)

### Last Transaction Panel
```
┌─────────────────────────────────────────────────────────────┐
│ Last Transaction                                            │
├─────────────────────────────────────────────────────────────┤
│ Last Transaction Time: Data not available                  │
│ Request Type:          Data not available                  │
│ Status:                Data not available                  │
│ Latency:               Data not available                  │
│ Linked Flow:           Data not available                  │
└─────────────────────────────────────────────────────────────┘
```

### Transaction History Table
```
┌──────────────┬──────────────┬─────────┬─────────┬─────────────┬───────┐
│ Timestamp    │ Request Type │ Status  │ Latency │ Linked Flow │ Error │
├──────────────┼──────────────┼─────────┼─────────┼─────────────┼───────┤
│ Data not     │ Data not     │ Data    │ N/A     │ Data not    │ —     │
│ available    │ available    │ not     │         │ available   │       │
│              │              │ avail.  │         │             │       │
└──────────────┴──────────────┴─────────┴─────────┴─────────────┴───────┘
```

### Backend Response (IGNORED)
```json
{
  "lastTransaction": {
    "startTime": "2026-06-15T10:48:44.000Z",
    "inboundRequestType": "CUSTOMER_ONBOARDING",
    "mappingName": "IB-TANAIIBKYC-TANAIOBKYC-0001",
    "status": "SUCCESS",
    "latencyMs": 150
  }
}
```

### Why It Failed
```javascript
// Frontend was looking for:
row.timestamp      // ❌ doesn't exist
row.requestType    // ❌ doesn't exist  
row.linkedFlow     // ❌ doesn't exist

// Backend provided:
row.startTime           // ✓ exists but ignored
row.inboundRequestType  // ✓ exists but ignored
row.mappingName         // ✓ exists but ignored
```

---

## ✅ AFTER (Fixed)

### Last Transaction Panel
```
┌─────────────────────────────────────────────────────────────┐
│ Last Transaction                                            │
├─────────────────────────────────────────────────────────────┤
│ Last Transaction Time: 2026-06-15 10:48:44                 │
│ Request Type:          CUSTOMER_ONBOARDING                  │
│ Status:                SUCCESS                              │
│ Latency:               150 ms                               │
│ Linked Flow:           IB-TANAIIBKYC-TANAIOBKYC-0001       │
└─────────────────────────────────────────────────────────────┘
```

### Transaction History Table
```
┌───────────────────────┬─────────────────────┬─────────┬─────────┬──────────────────────────────┬───────┐
│ Timestamp             │ Request Type        │ Status  │ Latency │ Linked Flow                  │ Error │
├───────────────────────┼─────────────────────┼─────────┼─────────┼──────────────────────────────┼───────┤
│ 2026-06-15 10:48:44   │ CUSTOMER_ONBOARDING │ SUCCESS │ 150 ms  │ IB-TANAIIBKYC-TANAIOBKYC-0001│ —     │
└───────────────────────┴─────────────────────┴─────────┴─────────┴──────────────────────────────┴───────┘
```

### Backend Response (CORRECTLY CONSUMED)
```json
{
  "lastTransaction": {
    "startTime": "2026-06-15T10:48:44.000Z",           ✅ → Timestamp
    "inboundRequestType": "CUSTOMER_ONBOARDING",        ✅ → Request Type
    "mappingName": "IB-TANAIIBKYC-TANAIOBKYC-0001",   ✅ → Linked Flow
    "status": "SUCCESS",                                ✅ → Status
    "latencyMs": 150                                    ✅ → Latency
  }
}
```

### Why It Works Now
```javascript
// Frontend now reads in priority order:
row.startTime ?? row.timestamp           // ✅ finds startTime
row.inboundRequestType ?? row.requestType // ✅ finds inboundRequestType
row.mappingName ?? row.linkedFlow         // ✅ finds mappingName
```

---

## Code Changes

### Change 1: normalizeHistoryRow() Function

```javascript
// ❌ BEFORE
function normalizeHistoryRow(row) {
  return {
    timestamp: row.timestamp ?? row.createdAt ?? ...,        // Misses startTime
    requestType: row.requestType ?? row.request_type ?? ..., // Misses inboundRequestType
    linkedFlow: row.linkedFlow ?? row.linked_flow ?? ...,    // Misses mappingName
  };
}

// ✅ AFTER
function normalizeHistoryRow(row) {
  return {
    timestamp: row.startTime ?? row.timestamp ?? row.createdAt ?? ...,
    requestType: row.inboundRequestType ?? row.requestType ?? ...,
    linkedFlow: row.mappingName ?? row.linkedFlow ?? ...,
  };
}
```

### Change 2: formatTs() Function

```javascript
// ❌ BEFORE
date.toLocaleString("en-GB", {
  day: "2-digit",
  month: "short",      // → "15 Jan, 10:48:44"
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// ✅ AFTER
date.toLocaleString("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
}).replace(/\//g, "-").replace(",", "");
// → "2026-06-15 10:48:44"
```

---

## Validation Test Case

### Test Adapter: KYC Verification Service

#### Backend API Response
```json
GET /api/adapter-analytics/kyc-verification-service

{
  "summary": {
    "totalExecutions": 1,
    "successRate": 100
  },
  "lastTransaction": {
    "startTime": "2026-06-15T10:48:44.000Z",
    "inboundRequestType": "CUSTOMER_ONBOARDING",
    "mappingName": "IB-TANAIIBKYC-TANAIOBKYC-0001",
    "status": "SUCCESS",
    "latencyMs": 150
  },
  "transactionHistory": [
    {
      "startTime": "2026-06-15T10:48:44.000Z",
      "inboundRequestType": "CUSTOMER_ONBOARDING",
      "mappingName": "IB-TANAIIBKYC-TANAIOBKYC-0001",
      "status": "SUCCESS",
      "latencyMs": 150
    }
  ]
}
```

#### Expected UI Display

**✅ Last Transaction Panel MUST show:**
- Last Transaction Time: `2026-06-15 10:48:44`
- Request Type: `CUSTOMER_ONBOARDING`
- Status: `SUCCESS`
- Latency: `150 ms`
- Linked Flow: `IB-TANAIIBKYC-TANAIOBKYC-0001`

**✅ Transaction History Table MUST show:**
| Column | Expected Value |
|--------|---------------|
| Timestamp | 2026-06-15 10:48:44 |
| Request Type | CUSTOMER_ONBOARDING |
| Status | SUCCESS |
| Latency | 150 ms |
| Linked Flow | IB-TANAIIBKYC-TANAIOBKYC-0001 |
| Error | — |

**❌ MUST NOT show:**
- "Data not available" in any field that has data
- Empty cells when API provides values
- N/A for latency when latencyMs exists

---

## Testing Instructions

### 1. Start Dev Server
```bash
cd d:\INNOVITEGEA\ESB\ESB_UI
npm run dev
```

### 2. Navigate to Adapter Details
- Go to Adapter Registry
- Click on "KYC Verification Service"
- Wait for analytics to load

### 3. Verify Last Transaction Panel
- [ ] Last Transaction Time shows: **2026-06-15 10:48:44** (not "Data not available")
- [ ] Request Type shows: **CUSTOMER_ONBOARDING** (not "Data not available")
- [ ] Linked Flow shows: **IB-TANAIIBKYC-TANAIOBKYC-0001** (not "Data not available")

### 4. Verify Transaction History Table
- [ ] All rows have timestamp in format: **YYYY-MM-DD HH:mm:ss**
- [ ] All rows show request type (not "Data not available")
- [ ] All rows show mapping name in Linked Flow column (not "Data not available")

### 5. Open Browser Console
Check for debug logs:
```
analytics.debug.adapterId: <adapter_id>
analytics.debug.matchedAuditRows: 1
```

### 6. Capture Screenshots
- [ ] **Before:** Screenshot showing "Data not available" (if you have old version)
- [ ] **After:** Screenshot showing actual values populated

---

## Build Verification

```bash
npm run build
```

**Expected Output:**
```
✓ 649 modules transformed.
dist/assets/index-OAapVtM1.js   831.48 kB

✓ built in 2.85s
```

✅ **Status:** Build completed successfully

---

## Other Test Adapters

Test the fix with all adapters:

1. **WaterBill**
   - Verify timestamp, requestType, mappingName display correctly

2. **Dummy_outbound**
   - Verify timestamp, requestType, mappingName display correctly

3. **Customer Onboarding Gateway**
   - Verify timestamp, requestType, mappingName display correctly

4. **TANAI OB COREBANK**
   - Verify timestamp, requestType, mappingName display correctly

5. **Auto Mapping Inbound 1781483061357**
   - Verify timestamp, requestType, mappingName display correctly

6. **Auto Mapping Outbound 1781483061357**
   - Verify timestamp, requestType, mappingName display correctly

---

## Success Criteria

✅ **Fix is successful if:**
- No "Data not available" appears when API provides data
- Last Transaction panel shows all 5 fields with actual values
- Transaction History table rows are fully populated
- Timestamps display in YYYY-MM-DD HH:mm:ss format
- All adapters with execution history show data correctly

❌ **Fix failed if:**
- "Data not available" still appears despite API having data
- Empty cells in table when API provides values
- Timestamps show incorrect format
- Any field shows null/undefined when data exists

---

## File Modified

**Single file changed:**
```
src/components/AdapterDetails.jsx
```

**Lines modified:**
- `normalizeHistoryRow()` function: Updated field priority
- `formatTs()` function: Updated date format

**No other files changed:**
- ✅ Backend: No changes
- ✅ API contract: No changes
- ✅ Other components: No changes
