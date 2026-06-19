# ESB UI Enhancement - Quick Reference Guide

## 🎯 What Changed

### 1. Custom Headers Support (RESTORED)
**Location:** Create Adapter → Outbound → HTTP/HTTPS

**How to Use:**
1. Select protocol: HTTP or HTTPS
2. Scroll to "Custom Headers" section
3. Click "+ Add Header"
4. Enter header name (e.g., "Authorization")
5. Enter header value (e.g., "Bearer token123")
6. Click "+ Add Header" to add more
7. Click trash icon to remove a header

**Storage:** JSON object in `outbound_adapter_master.headers`

**Example:**
```json
{
  "Authorization": "Bearer xxxx",
  "Client-ID": "ESB-001",
  "Channel": "MOBILE"
}
```

---

### 2. Protocol-Specific Forms
**Location:** Create Adapter → Outbound

#### HTTP/HTTPS Shows:
- Host, Port
- **Path** (e.g., `/api/v1/transactions`)
- **Method** (POST, GET, PUT, PATCH, DELETE)
- **Custom Headers**
- Timeout

#### TCP Shows:
- Host, Port
- **Connection Timeout**
- **Read Timeout**
- ❌ No Path
- ❌ No Method
- ❌ No Headers

#### Other Protocols:
- Host, Port
- Format
- Generic Timeout

---

### 3. Request Type Security Configuration
**Location:** New page → Create Request Type (needs to be added to navigation)

#### 4-Step Wizard:

**Step 1: Basic Details**
- Request Type Name: `BALANCE_INQUIRY`
- Format: JSON / XML / ISO8583 / ISO20022
- Description (optional)

**Step 2: Request Payload**
- JSON Schema for request structure
- Example:
```json
{
  "customerId": "string",
  "accountNumber": "string",
  "amount": "number"
}
```

**Step 3: Response Payload**
- JSON Schema for response structure
- Example:
```json
{
  "balance": "number",
  "accountState": "string",
  "responseCode": "string"
}
```

**Step 4: Security Configuration**
- Select protection type:
  - ⭕ None (default)
  - ⭕ Mask (e.g., `****1234`)
  - ⭕ Hash (SHA-256)
  - ⭕ Encrypt (AES-256)
  
- If security selected:
  - Select fields to protect (checkboxes)
  - Combined list from request + response schemas

**Storage:**
```json
{
  "securityType": "MASK",
  "protectedFields": ["accountNumber", "custId"]
}
```

---

### 4. Audit Log Enhancement
**Location:** Audit Logs → Table

**New Columns:**
- Inbound Request Type
- Outbound Request Type

**Preview Drawer Shows:**
- Inbound Request Type
- Outbound Request Type

**Example:**
```
BALANCE_INQUIRY → GET_BALANCE
```

---

## 🔧 For Developers

### Files Created
1. `src/components/CreateRequestTypePage.jsx` (370 lines)

### Files Modified
1. `src/components/CreateAdapterPage.jsx` (+230 lines)
   - Added `CustomHeadersEditor` component
   - Protocol-specific form logic
   
2. `src/components/AuditDashboard.jsx` (+50 lines)
   - Added request type columns

3. `src/services/esbApi.js` (+5 lines)
   - Added `createRequestType` function

### Database Changes
```sql
-- New table
CREATE TABLE request_type_config (
  security_type VARCHAR(20),
  protected_fields JSON,
  ...
);

-- Enhanced columns
ALTER TABLE outbound_adapter_master 
ADD COLUMN headers JSON,
ADD COLUMN connection_timeout INTEGER,
ADD COLUMN read_timeout INTEGER;
```

---

## 📝 API Payloads

### Create Outbound Adapter with Headers
```http
POST /api/outbound-adapters
Content-Type: application/json

{
  "name": "CBS_HTTP",
  "protocol": "HTTP",
  "host": "192.168.1.100",
  "port": 8080,
  "path": "/api/transactions",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer xxx",
    "Client-ID": "ESB-001"
  },
  "timeout_seconds": 30
}
```

### Create Request Type
```http
POST /api/request-type/create
Content-Type: application/json

{
  "requestTypeName": "BALANCE_INQUIRY",
  "format": "JSON",
  "requestSchema": "{...}",
  "responseSchema": "{...}",
  "securityType": "MASK",
  "protectedFields": ["accountNumber", "custId"]
}
```

---

## ✅ Testing Checklist

### Custom Headers
- [ ] Create HTTP adapter with 3 headers
- [ ] Edit adapter, add 2 more headers
- [ ] Remove 1 header
- [ ] Create HTTPS adapter with headers
- [ ] Create TCP adapter → verify no headers shown
- [ ] Verify headers saved as JSON in DB

### Protocol Forms
- [ ] Create HTTP adapter → verify path/method fields shown
- [ ] Create HTTPS adapter → verify path/method fields shown
- [ ] Create TCP adapter → verify connection/read timeout shown
- [ ] Create TCP adapter → verify NO path/method/headers shown
- [ ] Create MQ adapter → verify generic fields shown

### Request Type Security
- [ ] Create request type with security = NONE
- [ ] Create request type with security = MASK
- [ ] Select 3 fields for masking
- [ ] Verify protectedFields array in DB
- [ ] Navigate back/next through all 4 steps
- [ ] Submit form and verify success message

### Audit Logs
- [ ] Open audit logs
- [ ] Verify "Inbound Request Type" column exists
- [ ] Verify "Outbound Request Type" column exists
- [ ] Click "View Details" on any row
- [ ] Verify both request types shown in preview drawer

---

## 🚨 Important Notes

### Runtime Impact: NONE ✅
- Security configuration is **stored only**
- No actual masking/hashing/encryption happens yet
- Backend processing will be implemented later
- All existing functionality unchanged

### Backward Compatibility: YES ✅
- Existing adapters work normally
- New columns have default values
- Headers field defaults to `{}`
- No breaking changes

### Future Implementation Required
- Masking logic in transformation engine
- Hashing logic (SHA-256)
- Encryption/Decryption service (AES-256)
- Audit trail for security operations

---

## 📞 Support

### Questions?
- Check `docs/ESB_UI_ENHANCEMENT_DELIVERABLES.md` for full details
- Check `docs/esb-api-payloads.txt` for API contracts

### Issues?
- Verify database migration ran successfully
- Check browser console for errors
- Verify API endpoint `/api/request-type/create` exists
- Check backend logs for validation errors

---

**End of Quick Reference**
