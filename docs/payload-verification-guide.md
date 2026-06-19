# API Payload Verification Guide

## Overview
This guide helps you verify that the ManageFunctionsPage and AdapterRegistry components are sending the correct payload shapes to the backend.

---

## 1. Save Request Rule Flow (ManageFunctionsPage)

### Navigation Path
1. Open UI → Select User
2. Navigate to "Created Adapters"
3. Click "Manage Function" on any Inbound Adapter
4. Fill in the form:
   - Request Name: e.g., `BALANCE_ENQUIRY`
   - Add Alias Mappings (e.g., `cust_id` → `customerId`)
   - Add Custom Fields with Fee Calculation:
     - Target Field: Select a canonical field
     - Function: `Calculate Fee`
     - Parameters: e.g., `5.00` or `0-100:5`
5. Click "Save Request Rule"

### Expected API Call
**Endpoint:** `POST /api/inbound-adapters/{adapterId}/configurations`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body (Example with Fee Calculation):**
```json
{
  "requestName": "BALANCE_ENQUIRY",
  "canonicalMapping": {
    "cust_id": "customerId",
    "amount": "amount",
    "fee": "CALC_FEE(amount_type=FLAT, calc_type=FIXED, value=5.00)"
  },
  "outboundId": ""
}
```

**Request Body (Example with SLAB Fee):**
```json
{
  "requestName": "PAYMENT_REQUEST",
  "canonicalMapping": {
    "customer_id": "customerId",
    "txn_amount": "amount",
    "transaction_fee": "CALC_FEE(amount_type=SLAB, calc_type=FIXED, value=0-100:5)"
  },
  "outboundId": ""
}
```

### Verification Steps
1. Open Browser DevTools → Network Tab
2. Filter by "configurations"
3. Click "Save Request Rule"
4. Verify:
   - ✅ Method: `POST`
   - ✅ URL: `/api/inbound-adapters/{adapterId}/configurations`
   - ✅ Status: `200` or `201`
   - ✅ Payload matches expected structure above

### Expected Response
```json
{
  "status": "success",
  "configId": "JSON_BALANCE_ENQUIRY",
  "message": "Configuration saved successfully"
}
```

---

## 2. Test Trigger Flow (AdapterRegistry)

### Navigation Path
1. Open UI → Select User
2. Navigate to "Created Adapters"
3. Click "Test" button on any Inbound Adapter
4. Enter test payload in the modal:
```json
{
  "cust_id": "C001",
  "amount": 150,
  "currency": "USD"
}
```
5. Click "Send Test Request"

### Expected API Call
**Endpoint:** `POST /api/inbound-adapters/{adapterId}/trigger`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "adapterName": "BANK_A_INBOUND",
  "payload": {
    "cust_id": "C001",
    "amount": 150,
    "currency": "USD"
  },
  "meta": {
    "requestId": "TEST-1234567890",
    "timestamp": "2026-05-11T10:00:00.000Z"
  }
}
```

### Verification Steps
1. Open Browser DevTools → Network Tab
2. Filter by "trigger"
3. Click "Send Test Request"
4. Verify:
   - ✅ Method: `POST`
   - ✅ URL: `/api/inbound-adapters/{adapterId}/trigger`
   - ✅ Status: `200`
   - ✅ Payload includes `adapterName`, `payload`, and `meta`

### Expected Response (Success)
```json
{
  "status": "success",
  "processedCount": 1,
  "results": [
    {
      "fileId": "file-1",
      "configId": "JSON_BALANCE_ENQUIRY",
      "requestName": "BALANCE_ENQUIRY",
      "transformType": "JSON_TO_XML",
      "status": "success",
      "transformStatus": "success",
      "outboundStatus": "sent",
      "routing": {
        "outboundId": "PARTNER_HTTP_SERVER",
        "destination": "http://127.0.0.1:9001/sink",
        "protocol": "HTTP"
      },
      "delivery": {
        "status": "sent",
        "statusCode": 200
      }
    }
  ]
}
```

### Expected Response (Error - No Config)
```json
{
  "status": "error",
  "message": "No configuration found for this adapter"
}
```

---

## 3. Common Issues & Troubleshooting

### Issue: 500 Internal Server Error on Save
**Possible Causes:**
- Backend expects different field names (e.g., `canonical_mapping` vs `canonicalMapping`)
- Missing required fields in payload
- Invalid function syntax in `canonicalMapping`

**Solution:**
Check backend logs and verify the exact field names expected by the API.

### Issue: 404 Not Found on Trigger
**Possible Causes:**
- Adapter ID is incorrect
- Adapter doesn't exist in database
- API route is not registered

**Solution:**
Verify the adapter exists by calling `GET /api/inbound-adapters/{adapterId}` first.

### Issue: Fee Calculation Not Applied
**Possible Causes:**
- Function syntax is incorrect
- Backend doesn't recognize `CALC_FEE` function
- Parameters are malformed

**Solution:**
Verify the backend supports the function format:
```
CALC_FEE(amount_type=FLAT, calc_type=FIXED, value=5.00)
```

---

## 4. Code Changes Summary

### ManageFunctionsPage.jsx
**Added:**
- `handleSaveRule()` function that calls `upsertInboundConfiguration`
- Save button with loading state
- Error/success message display
- Proper payload construction with `canonicalMapping` object

**Key Code:**
```javascript
const payload = {
  requestName: rule.requestName.trim(),
  canonicalMapping,
  outboundId: ""
};

await upsertInboundConfiguration(adapterId, null, payload);
```

### AdapterRegistry.jsx
**Added:**
- Test trigger modal with payload input
- `handleTestTrigger()` function that calls `triggerInboundAdapter`
- JSON payload editor
- Success/error feedback

**Key Code:**
```javascript
const response = await triggerInboundAdapter(adapterId, {
  adapterName: testModal.displayName,
  payload,
  meta: {
    requestId: `TEST-${Date.now()}`,
    timestamp: new Date().toISOString()
  }
});
```

---

## 5. Manual Testing Checklist

### Save Request Rule
- [ ] Open ManageFunctionsPage
- [ ] Fill in Request Name
- [ ] Add at least one alias mapping
- [ ] Add custom field with CALC_FEE function
- [ ] Click "Save Request Rule"
- [ ] Verify Network tab shows POST to `/configurations`
- [ ] Verify payload structure matches expected format
- [ ] Verify response is 200/201
- [ ] Verify success message appears

### Test Trigger
- [ ] Open AdapterRegistry
- [ ] Click "Test" on an adapter with saved configuration
- [ ] Enter valid JSON payload
- [ ] Click "Send Test Request"
- [ ] Verify Network tab shows POST to `/trigger`
- [ ] Verify payload includes `adapterName`, `payload`, `meta`
- [ ] Verify response is 200
- [ ] Verify success message appears

### Error Handling
- [ ] Try saving without Request Name → Should show error
- [ ] Try saving without mappings → Should show error
- [ ] Try triggering with invalid JSON → Should show error
- [ ] Try triggering non-existent adapter → Should show 404

---

## 6. Backend Expectations (from esb-api-payloads.txt)

### upsertInboundConfiguration Expected Payload
```json
{
  "configId": "JSON_TO_XML_PAYMENT",
  "type": "JSON",
  "requestName": "PAYMENT_REQUEST",
  "sourceFormat": "JSON",
  "targetFormat": "XML",
  "transformType": "JSON_TO_XML",
  "outboundId": "PARTNER_HTTP_SERVER"
}
```

**Note:** The current implementation sends a simplified payload. If backend expects additional fields like `configId`, `type`, `sourceFormat`, `targetFormat`, and `transformType`, these need to be added to the `handleSaveRule` function.

### triggerInboundAdapter Expected Payload
```json
{
  "adapterName": "BANK_A_INBOUND",
  "configId": "JSON_TO_XML_PAYMENT",
  "payload": {
    "customerId": "C100",
    "amount": 1250,
    "currency": "INR"
  },
  "meta": {
    "requestId": "REQ-TEST-001",
    "timestamp": "2026-05-11T10:00:00Z"
  }
}
```

**Note:** The current implementation doesn't include `configId`. If backend requires it, add a config selector to the test modal.

---

## Confirmation

Once you've completed the manual testing:

✅ **Payload shapes match backend expectations**
✅ **Save Request Rule successfully creates configuration**
✅ **Test Trigger successfully fires without 500 error**
✅ **Fee Calculation function is properly formatted**
✅ **Error handling works correctly**

If any issues arise, check the backend logs and compare the actual payload structure with the expected format documented in `esb-api-payloads.txt`.
