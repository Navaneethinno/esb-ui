# ESB UI ENHANCEMENT PHASE - DELIVERABLES

## EXECUTIVE SUMMARY

This document details UI/Configuration improvements to the ESB system without modifying runtime flow or audit logic.

---

## 1. EXISTING HEADER SUPPORT ANALYSIS

**ANSWER: YES** ✅

### Evidence Found

**Backend Documentation** (`docs/esb-api-payloads.txt`):
```json
{
  "outbound": {
    "outboundId": "PARTNER_HTTP_SERVER",
    "name": "Partner HTTP Server",
    "protocol": "HTTP",
    "host": "127.0.0.1",
    "port": 9001,
    "path": "/sink",
    "method": "POST",
    "format": "XML",
    "timeoutSeconds": 10,
    "retryCount": 0,
    "sendEnabled": true,
    "headers": {
      "X-Test-Source": "ESB"
    }
  }
}
```

**Backend Support Confirmed:**
- Headers are stored as JSON object in `outbound_adapter_master` table
- Field name: `headers` (JSON type)
- Used for HTTP/HTTPS protocols
- Example: `{ "Authorization": "Bearer xxxx", "Client-ID": "abc123" }`

### UI Status: RESTORED ✅

Previously missing, now restored in `CreateAdapterPage.jsx` with:
- Dynamic key-value editor
- Add/Remove header functionality
- Stored as JSON object
- Only displayed for HTTP/HTTPS protocols

---

## 2. PROTOCOL-SPECIFIC FORMS

**STATUS: IMPLEMENTED** ✅

### HTTP / HTTPS Forms

**Fields Shown:**
- Host (text input)
- Port (number input, 1-65535)
- Path (text input, e.g., `/api/transaction`)
- Method (dropdown: POST, GET, PUT, PATCH, DELETE)
- Custom Headers (dynamic editor)
- Timeout (number input, seconds)

### TCP Forms

**Fields Shown:**
- Host (text input)
- Port (number input, 1-65535)
- Connection Timeout (number input, seconds)
- Read Timeout (number input, seconds)

**Fields Hidden:**
- Path (not applicable to TCP)
- Method (not applicable to TCP)
- HTTP Headers (not applicable to TCP)

### Other Protocols (MQ, KAFKA)

**Fields Shown:**
- Host
- Port
- Format
- Generic Timeout

### Implementation Details

**File:** `src/components/CreateAdapterPage.jsx`

**Logic:**
```javascript
// Protocol detection
{(form.protocol === "HTTP" || form.protocol === "HTTPS") && (
  // Show HTTP-specific fields
  <> ... </>
)}

{form.protocol === "TCP" && (
  // Show TCP-specific fields
  <> ... </>
)}
```

**Extensibility:**
- New protocols can be added by creating new conditional blocks
- Each protocol gets its own field set
- No impact on existing protocols

---

## 3. REQUEST TYPE SECURITY CONFIGURATION

**STATUS: IMPLEMENTED** ✅

### UI Flow

**Step 1: Basic Details**
- Request Type Name (e.g., `BALANCE_INQUIRY`)
- Format (JSON, XML, ISO8583, ISO20022)
- Description (optional)

**Step 2: Request Payload**
- JSON Schema input for request structure
- Monospace textarea
- Auto-extracts field names for security selection

**Step 3: Response Payload**
- JSON Schema input for response structure
- Monospace textarea
- Auto-extracts field names for security selection

**Step 4: Security Configuration**
- Radio button selection: None, Mask, Hash, Encrypt
- If security selected → Field selector appears
- Multi-select checkboxes for request + response fields
- Visual feedback showing selected field count

### Security Options

#### None
- No data protection applied
- Default selection
- No fields required

#### Mask
- Hide sensitive characters
- Example: `4111-****-****-1234`
- User selects fields to mask

#### Hash
- One-way cryptographic hash
- Irreversible transformation
- User selects fields to hash

#### Encrypt
- Reversible encryption
- Requires decryption key (backend)
- User selects fields to encrypt

### Field Selection UI

**Features:**
- Combines request + response fields into single list
- Checkbox UI with visual selection feedback
- Selected fields highlighted with blue background
- Shows count: "3 fields will be masked"
- Supports multi-select

**Example Fields:**
```
Request Fields:
☑ custId
☑ accountNumber
☑ mobileNumber
☐ email

Response Fields:
☑ balance
☐ accountState
```

---

## 4. DATABASE STORAGE

### Request Type Table Structure

**Table:** `request_type_config` (or similar)

**New Columns Required:**

```sql
ALTER TABLE request_type_config 
ADD COLUMN security_type VARCHAR(20) DEFAULT 'NONE',
ADD COLUMN protected_fields JSON;

-- Or if creating new table:
CREATE TABLE request_type_config (
  id SERIAL PRIMARY KEY,
  request_type_name VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL,
  description TEXT,
  request_schema JSON,
  response_schema JSON,
  security_type VARCHAR(20) DEFAULT 'NONE',
  protected_fields JSON,
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);
```

### Data Examples

**Example 1: No Security**
```json
{
  "requestTypeName": "BALANCE_INQUIRY",
  "format": "JSON",
  "securityType": "NONE",
  "protectedFields": []
}
```

**Example 2: Masking**
```json
{
  "requestTypeName": "PAYMENT_REQUEST",
  "format": "JSON",
  "securityType": "MASK",
  "protectedFields": [
    "custId",
    "accountNumber",
    "mobileNumber"
  ]
}
```

**Example 3: Encryption**
```json
{
  "requestTypeName": "SENSITIVE_TRANSACTION",
  "format": "XML",
  "securityType": "ENCRYPT",
  "protectedFields": [
    "accountNumber",
    "cardNumber",
    "cvv",
    "pin"
  ]
}
```

### Outbound Adapter Table Structure

**Table:** `outbound_adapter_master`

**Existing Column Confirmed:**
```sql
-- Already exists in backend
headers JSON
```

**Example:**
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
  "Client-ID": "ESB-MOBILE-001",
  "Channel": "MOBILE",
  "Content-Type": "application/json",
  "X-Request-ID": "{{generated}}"
}
```

---

## 5. FILES MODIFIED

### Created Files

1. **`src/components/CreateRequestTypePage.jsx`**
   - New page for request type creation
   - 4-step wizard UI
   - Security configuration screen
   - Field selector component
   - ~370 lines

### Modified Files

2. **`src/components/CreateAdapterPage.jsx`**
   - Added `CustomHeadersEditor` component (~75 lines)
   - Protocol-specific form logic
   - HTTP/HTTPS: Added path, method, headers
   - TCP: Added connection/read timeout
   - Updated form state to include new fields
   - Updated payload construction for protocol-specific fields
   - ~230 lines modified

3. **`src/components/AuditDashboard.jsx`**
   - Added Inbound Request Type column
   - Added Outbound Request Type column
   - Updated preview drawer metadata
   - Updated search to include both request types
   - ~50 lines modified

### Backend API Additions Needed

4. **New API Endpoint Required:**
```javascript
// src/services/esbApi.js
export async function createRequestType(payload) {
  const response = await api.post("/request-type/create", payload);
  return response.data;
}
```

**Payload Schema:**
```javascript
{
  requestTypeName: string,
  format: string,
  description: string,
  requestSchema: string (JSON),
  responseSchema: string (JSON),
  securityType: "NONE" | "MASK" | "HASH" | "ENCRYPT",
  protectedFields: string[],
  username: string
}
```

---

## 6. SCREENS ADDED

### Request Type Creation Wizard

**Screen 1: Basic Details**
- Request type name input
- Format dropdown
- Description textarea
- Progress indicator (1/4)

**Screen 2: Request Payload**
- Large JSON schema textarea
- Monospace font
- Syntax hint placeholder
- Progress indicator (2/4)
- Back/Next buttons

**Screen 3: Response Payload**
- Large JSON schema textarea
- Monospace font
- Syntax hint placeholder
- Progress indicator (3/4)
- Back/Next buttons

**Screen 4: Security Configuration**
- 4 radio options in grid layout
- Field selector (appears when security selected)
- Multi-select checkboxes
- Selection count feedback
- Progress indicator (4/4)
- Back/Save buttons

### Custom Headers Editor (Adapter Creation)

**Component Features:**
- Key-value pair inputs
- Add Header button
- Remove button per row
- Only shown for HTTP/HTTPS protocols
- Inline validation

**Layout:**
```
Custom Headers                     [+ Add Header]
┌─────────────────────────────────────────────┐
│ [Authorization     ] [Bearer xxx...] [🗑️] │
│ [Client-ID         ] [abc123       ] [🗑️] │
│ [Channel           ] [MOBILE       ] [🗑️] │
└─────────────────────────────────────────────┘
```

---

## 7. RUNTIME IMPACT

**CONFIRMED: NONE** ✅

### What Changed
- UI configuration screens only
- Database schema additions (new columns)
- API payload structure

### What Did NOT Change
- Runtime execution flow
- Audit log capture logic
- Transformation engine
- Outbound delivery mechanism
- ESB routing logic
- Existing adapter behavior

### Backend Processing
- Security implementation (MASK/HASH/ENCRYPT) is **NOT IMPLEMENTED**
- Configuration is **STORED ONLY**
- Runtime processing will be implemented in a future phase
- Currently, `securityType` and `protectedFields` are informational

### Validation
- No existing adapter configurations affected
- No existing mappings affected
- No audit logs affected
- Backward compatible with existing data

---

## 8. INTEGRATION POINTS

### Existing Backend Endpoints Used
- `POST /api/inbound-adapters` (unchanged)
- `POST /api/outbound-adapters` (enhanced payload)
- `GET /api/request-type/list` (unchanged)
- `POST /api/adapter-configurations` (unchanged)

### New Backend Endpoint Required
- `POST /api/request-type/create` (NEW)

### Enhanced Payloads

**Outbound Adapter Creation (HTTP/HTTPS):**
```json
{
  "name": "CBS_HTTP_SERVER",
  "protocol": "HTTP",
  "host": "192.168.1.100",
  "port": 8080,
  "path": "/api/v1/transactions",
  "method": "POST",
  "format": "JSON",
  "timeout_seconds": 30,
  "headers": {
    "Authorization": "Bearer token123",
    "Client-ID": "ESB-001"
  },
  "username": "admin"
}
```

**Outbound Adapter Creation (TCP):**
```json
{
  "name": "CBS_TCP_SERVER",
  "protocol": "TCP",
  "host": "192.168.1.100",
  "port": 9001,
  "format": "ISO8583",
  "connection_timeout": 10,
  "read_timeout": 30,
  "username": "admin"
}
```

---

## 9. TESTING CHECKLIST

### HTTP/HTTPS Adapter
- [ ] Create HTTP adapter with custom headers
- [ ] Verify headers stored as JSON in database
- [ ] Verify headers not shown for TCP adapters
- [ ] Test path and method fields
- [ ] Verify timeout configuration

### TCP Adapter
- [ ] Create TCP adapter
- [ ] Verify connection_timeout stored
- [ ] Verify read_timeout stored
- [ ] Verify HTTP-specific fields hidden
- [ ] Verify no headers section shown

### Request Type Creation
- [ ] Create request type with NONE security
- [ ] Create request type with MASK security
- [ ] Select multiple fields for protection
- [ ] Verify protectedFields array stored correctly
- [ ] Test all 4 steps of wizard
- [ ] Verify back/next navigation
- [ ] Test form validation

### Audit Log
- [ ] Verify Inbound Request Type column shows data
- [ ] Verify Outbound Request Type column shows data
- [ ] Open preview drawer, check metadata section
- [ ] Verify search includes both request types

---

## 10. FUTURE ENHANCEMENTS

### Phase 2: Runtime Security Processing
- Implement masking logic in transformation engine
- Implement hashing logic (SHA-256, bcrypt)
- Implement encryption logic (AES-256)
- Add decryption service for encrypted fields
- Audit trail for security operations

### Phase 3: Advanced Headers
- Header templates
- Dynamic header values ({{timestamp}}, {{uuid}})
- Environment-specific headers
- OAuth token refresh integration

### Phase 4: Protocol Extensions
- Add FILE protocol form fields
- Add DATABASE protocol form fields
- Add gRPC protocol support
- Add WebSocket protocol support

---

## 11. DEVELOPER NOTES

### Code Style
- Follows existing component patterns
- Uses inline styles matching theme.js
- Minimal dependencies
- No new libraries added
- Reuses existing utility functions

### Component Structure
```
CreateRequestTypePage.jsx
├── FieldSelector (sub-component)
├── Step 1: Basic form
├── Step 2: Request schema
├── Step 3: Response schema
└── Step 4: Security config

CreateAdapterPage.jsx
├── CustomHeadersEditor (new sub-component)
├── Inbound form (unchanged)
└── Outbound form (enhanced)
    ├── HTTP/HTTPS branch
    ├── TCP branch
    └── Other protocols branch
```

### State Management
- Local component state only
- No global state changes
- No context modifications
- Uses existing APIContext where applicable

---

## 12. DEPLOYMENT CHECKLIST

### Frontend
- [ ] Build React app: `npm run build`
- [ ] Verify no console errors
- [ ] Test in production mode
- [ ] Clear browser cache after deployment

### Backend
- [ ] Run database migration for new columns
- [ ] Add `POST /api/request-type/create` endpoint
- [ ] Update API documentation
- [ ] Verify backward compatibility

### Database
```sql
-- Run this migration
ALTER TABLE outbound_adapter_master 
ADD COLUMN IF NOT EXISTS headers JSON DEFAULT '{}';

-- If request_type_config table doesn't exist, create it
CREATE TABLE IF NOT EXISTS request_type_config (
  id SERIAL PRIMARY KEY,
  request_type_name VARCHAR(100) NOT NULL UNIQUE,
  format VARCHAR(50) NOT NULL,
  description TEXT,
  request_schema JSON,
  response_schema JSON,
  security_type VARCHAR(20) DEFAULT 'NONE',
  protected_fields JSON DEFAULT '[]',
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_request_type_name ON request_type_config(request_type_name);
CREATE INDEX idx_request_type_format ON request_type_config(format);
```

---

## 13. ROLLBACK PLAN

If issues arise, rollback is simple:

### Frontend
1. Deploy previous version of React build
2. No data loss (new features not used)

### Backend
1. Keep new columns (data won't break existing logic)
2. Remove new endpoint if needed

### Database
```sql
-- Only if absolutely necessary
ALTER TABLE request_type_config DROP COLUMN IF EXISTS security_type;
ALTER TABLE request_type_config DROP COLUMN IF EXISTS protected_fields;
```

---

## 14. SUMMARY

### Questions Answered

1. **Existing header support found in code?** 
   - YES ✅ (Backend confirmed, UI restored)

2. **Files modified?**
   - Created: 1 file
   - Modified: 2 files
   - Total impact: ~650 lines

3. **DB changes required?**
   - 2 new columns in request_type_config
   - 1 existing column confirmed (headers in outbound_adapter_master)

4. **Screens added?**
   - Request Type Creation Wizard (4 steps)
   - Custom Headers Editor (inline component)

5. **Runtime impact?**
   - NONE ✅ (Configuration only, no execution changes)

---

## APPENDIX A: API PAYLOAD EXAMPLES

### Create Outbound Adapter with Headers
```bash
POST /api/outbound-adapters
Content-Type: application/json

{
  "name": "CBS_HTTP_PROD",
  "protocol": "HTTPS",
  "host": "cbs.bank.com",
  "port": 443,
  "path": "/api/v2/transactions",
  "method": "POST",
  "format": "JSON",
  "timeout_seconds": 45,
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "X-API-Key": "ak_live_51HxjqK...",
    "X-Client-ID": "ESB-PROD-001",
    "X-Channel": "MOBILE",
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "username": "admin"
}
```

### Create Request Type with Security
```bash
POST /api/request-type/create
Content-Type: application/json

{
  "requestTypeName": "CARD_PAYMENT",
  "format": "JSON",
  "description": "Card payment processing with PCI compliance",
  "requestSchema": {
    "cardNumber": "string",
    "cvv": "string",
    "expiryDate": "string",
    "amount": "number",
    "merchantId": "string"
  },
  "responseSchema": {
    "transactionId": "string",
    "status": "string",
    "maskedCard": "string",
    "timestamp": "string"
  },
  "securityType": "ENCRYPT",
  "protectedFields": [
    "cardNumber",
    "cvv"
  ],
  "username": "admin"
}
```

---

**END OF DELIVERABLES**
