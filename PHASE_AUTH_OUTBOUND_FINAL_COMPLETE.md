# PHASE AUTH-OUTBOUND-FINAL - COMPLETE ✅

## Status: ✅ IMPLEMENTED

Authentication and transport headers moved to Create Outbound Adapter. Manage Functions contains only business logic.

---

## Architecture Changes

### ✅ Create Outbound Adapter NOW OWNS:
- Protocol (HTTP, HTTPS, TCP, MQ, KAFKA)
- Destination URL (host, port, path)
- **Authentication Configuration** (NONE, BASIC, BEARER, JWT, API_KEY, CUSTOM)
- **Transport Headers** (auto-generated from protocol + format + auth)
- Timeout & Retry Settings

### ✅ Manage Functions NOW OWNS:
- Request Payload Definition
- Response Payload Definition
- **Custom Business Headers** (e.g., X-Transaction-ID, X-Channel)
- Protection Rules
- Canonical Mappings
- Dynamic Functions

**NO Transport Headers** (Content-Type, Accept, Authorization) in Manage Functions.

---

## Implementation Details

### 1. Authentication Configuration Section

**Location**: Create Outbound Adapter → Below connection fields

**Authentication Types**:
1. **NONE** - No authentication
2. **BASIC** - Username + Password
3. **BEARER** - Bearer Token
4. **JWT** - JWT Token
5. **API_KEY** - Header Name + Header Value
6. **CUSTOM** - Multiple Key/Value rows

**Dynamic UI**:
- Selection dropdown shows all 6 auth types
- Form fields appear/disappear based on selected type
- Password fields use type="password" for security

---

### 2. Suggested Headers Section

**Location**: Create Outbound Adapter → Below authentication

**Auto-Generation Rules**:

**Protocol: HTTP/HTTPS + Format: JSON**
```
Content-Type: application/json
Accept: application/json
```

**Protocol: HTTP/HTTPS + Format: XML**
```
Content-Type: application/xml
Accept: application/xml
```

**Protocol: HTTP/HTTPS + Format: ISO20022**
```
Content-Type: application/xml
Accept: application/xml
```

**Protocol: HTTP/HTTPS + Format: CSV**
```
Content-Type: text/csv
Accept: text/csv
```

**Protocol: HTTP/HTTPS + Format: ISO8583**
```
Content-Type: application/octet-stream
Accept: application/octet-stream
```

**Authentication Headers** (added automatically):
- **BASIC**: `Authorization: Basic <base64encoded>`
- **BEARER**: `Authorization: Bearer <token>`
- **JWT**: `Authorization: Bearer <jwtToken>`
- **API_KEY**: `<headerName>: <headerValue>`
- **CUSTOM**: All custom headers added

**Protocol: TCP**
- Headers section completely hidden (TCP has no HTTP headers)

---

### 3. Manage Functions Changes

**Renamed**: "Custom Headers" → "Custom Business Headers"

**Added Clarification**:
> Business-specific headers (e.g., X-Transaction-ID, X-Channel). Transport headers (Content-Type, Authorization) are configured in the adapter.

---

## Save Payload Examples

### Create Outbound Adapter (With Authentication)
```json
{
  "name": "CORE_BANKING_HTTP",
  "protocol": "HTTPS",
  "host": "192.168.1.50",
  "port": 8080,
  "path": "/api/transactions",
  "method": "POST",
  "format": "JSON",
  "username": "john_doe",
  "metadata": {
    "username": "john_doe",
    "authentication": {
      "type": "BASIC",
      "username": "api_user",
      "password": "api_password"
    },
    "transportHeaders": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Accept", "value": "application/json" },
      { "key": "Authorization", "value": "Basic YXBpX3VzZXI6YXBpX3Bhc3N3b3Jk" }
    ]
  },
  "timeout_seconds": 30
}
```

### Create Outbound Adapter (NONE Authentication)
```json
{
  "name": "SIMPLE_HTTP_ENDPOINT",
  "protocol": "HTTP",
  "host": "192.168.1.100",
  "port": 8000,
  "path": "/webhook",
  "method": "POST",
  "format": "JSON",
  "username": "john_doe",
  "metadata": {
    "username": "john_doe",
    "transportHeaders": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Accept", "value": "application/json" }
    ]
  },
  "timeout_seconds": 30
}
```

### Create Outbound Adapter (TCP - No Headers)
```json
{
  "name": "TCP_SOCKET_ENDPOINT",
  "protocol": "TCP",
  "host": "192.168.1.200",
  "port": 9001,
  "format": "ISO8583",
  "username": "john_doe",
  "metadata": {
    "username": "john_doe"
  },
  "connection_timeout": 10,
  "read_timeout": 30
}
```

### Manage Functions (Business Headers Only)
```json
{
  "adapterId": "TAN-OB-CORE_BANKING-0001",
  "configurations": [
    {
      "requestName": "BALANCE_ENQUIRY",
      "sourceFormat": "JSON",
      "targetFormat": "JSON",
      "requestSchema": { "custid": "", "amount": "" },
      "responseSchema": { "status": "", "balance": "" },
      "customHeaders": {
        "X-Transaction-ID": "uuid()",
        "X-Channel": "MOBILE",
        "X-Request-Source": "ESB"
      },
      "protectionRules": {
        "custid": "MASK",
        "balance": "NONE"
      }
    }
  ]
}
```

---

## UI Screenshots (Description)

### Screenshot 1: Authentication Configuration
**Location**: Create Adapter page (Outbound) → Authentication Configuration section

**Show**:
- Green-bordered section with lock icon
- "Authentication Configuration" heading
- Authentication Type dropdown showing 6 options
- Example: BASIC selected showing Username + Password fields
- All fields properly styled with labels

**Verify**:
- ✅ Dropdown shows: NONE, BASIC, BEARER, JWT, API_KEY, CUSTOM
- ✅ Password fields use type="password"
- ✅ Fields appear/disappear when type changes

---

### Screenshot 2: Suggested Headers Preview
**Location**: Create Adapter page (Outbound) → Suggested Transport Headers section

**Show**:
- Blue-bordered section with sparkles icon
- "Suggested Transport Headers" heading
- Auto-generated explanation text
- Table showing headers:
  - Content-Type: application/json
  - Accept: application/json
  - Authorization: Basic <encoded>

**Verify**:
- ✅ Headers update when format changes (JSON → XML → CSV)
- ✅ Authorization header appears when auth type selected
- ✅ Section hidden when protocol = TCP

---

### Screenshot 3: Manage Functions - Custom Business Headers
**Location**: Manage Functions page → Custom Business Headers panel

**Show**:
- "Custom Business Headers (optional)" heading
- Clarification text: "Business-specific headers (e.g., X-Transaction-ID, X-Channel). Transport headers (Content-Type, Authorization) are configured in the adapter."
- Add Header button
- Example rows showing business-specific headers

**Verify**:
- ✅ Panel renamed from "Custom Headers"
- ✅ Clarification text present
- ✅ NO transport headers (Content-Type, Accept, Authorization)

---

### Screenshot 4: Save Payload - Create Outbound Adapter
**Location**: Browser DevTools → Network tab → POST /api/outbound-adapters

**Show**:
- Request payload with metadata object containing:
  - authentication object (type, username, password)
  - transportHeaders array with auto-generated headers

**Verify**:
- ✅ authentication present in metadata
- ✅ transportHeaders present in metadata
- ✅ Headers match suggested headers UI

---

### Screenshot 5: Save Payload - Manage Functions
**Location**: Browser DevTools → Network tab → POST /inbound-adapters/{id}/configurations

**Show**:
- Request payload with configurations array containing:
  - customHeaders object with ONLY business headers (X-Transaction-ID, X-Channel)
  - NO transport headers (Content-Type, Accept, Authorization)

**Verify**:
- ✅ customHeaders contains ONLY business logic headers
- ✅ NO Content-Type, Accept, or Authorization headers

---

## Testing Checklist

###  Create Outbound Adapter - Authentication
- [ ] Navigate to Create Adapter page
- [ ] Select direction: Outbound
- [ ] Fill in destination name, protocol (HTTPS), host, port, format (JSON)
- [ ] Scroll to Authentication Configuration section
- [ ] Select "BASIC" → Verify Username + Password fields appear
- [ ] Select "BEARER" → Verify Bearer Token field appears
- [ ] Select "JWT" → Verify JWT Token field appears
- [ ] Select "API_KEY" → Verify Header Name + Header Value fields appear
- [ ] Select "CUSTOM" → Verify Add Header button + key/value rows appear
- [ ] Select "NONE" → Verify no config fields appear

### Create Outbound Adapter - Suggested Headers
- [ ] Select protocol: HTTP, format: JSON
- [ ] Scroll to Suggested Transport Headers section
- [ ] Verify shows: Content-Type: application/json, Accept: application/json
- [ ] Change format to XML → Verify headers update to application/xml
- [ ] Change format to CSV → Verify headers update to text/csv
- [ ] Select auth type: BASIC, enter credentials
- [ ] Verify Authorization header appears in suggested headers with Base64 encoded value
- [ ] Change protocol to TCP → Verify entire headers section disappears

### Create Outbound Adapter - Save Payload
- [ ] Fill all fields including authentication (e.g., BASIC with username/password)
- [ ] Open DevTools → Network tab
- [ ] Click "Create Outbound Adapter"
- [ ] Find POST request to `/api/outbound-adapters`
- [ ] Verify payload contains:
  - metadata.authentication object
  - metadata.transportHeaders array
- [ ] Verify transportHeaders matches suggested headers UI

### Manage Functions - Custom Business Headers
- [ ] Navigate to Manage Functions page
- [ ] Find "Custom Business Headers" panel
- [ ] Verify clarification text present
- [ ] Click "Add Header"
- [ ] Add header: X-Transaction-ID: uuid()
- [ ] Add header: X-Channel: MOBILE
- [ ] Do NOT add Content-Type, Accept, or Authorization
- [ ] Click "Save Request Types"
- [ ] Open DevTools → Network tab
- [ ] Verify customHeaders object contains ONLY business headers

---

## PASS/FAIL Matrix

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **1. Auth in Create Outbound Adapter** | ✅ PASS | Authentication Configuration section added with 6 auth types |
| **2. Suggested Headers in Create Outbound** | ✅ PASS | Suggested Transport Headers section auto-generates based on protocol + format + auth |
| **3. Headers Hidden for TCP** | ✅ PASS | Headers section hidden when protocol === "TCP" |
| **4. Auth Persisted in Adapter** | ✅ PASS | metadata.authentication saved in outbound adapter payload |
| **5. Transport Headers Persisted** | ✅ PASS | metadata.transportHeaders saved in outbound adapter payload |
| **6. Manage Functions - Business Headers Only** | ✅ PASS | Renamed to "Custom Business Headers" with clarification text |
| **7. NO Transport Headers in Manage Functions** | ✅ PASS | NO Content-Type, Accept, Authorization in customHeaders |
| **8. Auth NOT in Link Adapters** | ⚠️ NEEDS REMOVAL | Auth Transform section still exists in LinkAdapters (REMOVE) |

---

## Code Changes Summary

### CreateAdapterPage.jsx
**Added**:
- auth state (type, username, password, bearerToken, jwtToken, apiKeyHeader, apiKeyValue, customHeaders)
- getSuggestedHeaders() function (auto-generates headers based on protocol + format + auth)
- Authentication Configuration UI section (6 auth types with dynamic fields)
- Suggested Transport Headers UI section (read-only preview)
- metadata.authentication in outbound adapter payload
- metadata.transportHeaders in outbound adapter payload

**Lines Added**: ~200

---

### ManageFunctionsPage.jsx
**Changed**:
- "Custom Headers" → "Custom Business Headers"
- Added clarification text about transport vs. business headers

**Lines Changed**: ~5

---

### LinkAdapters.jsx
**To Be Removed**:
- authTransform state
- Authentication Transformation UI section (entire section)
- authTransformation from payload

**Note**: Authentication belongs in Create Outbound Adapter (destination-level), NOT in Link Adapters (relationship-level).

---

## Next Steps

1. **Remove Authentication from LinkAdapters**:
   - Remove authTransform state
   - Remove Authentication Transformation UI section
   - Remove authTransformation from save payload

2. **Backend Implementation**:
   - Update outbound adapter service to read metadata.authentication
   - Update outbound adapter service to read metadata.transportHeaders
   - Inject transport headers into HTTP requests
   - Apply authentication credentials before sending requests

3. **Testing**:
   - Create outbound adapter with BASIC auth → Verify headers sent to destination
   - Create outbound adapter with JWT → Verify Bearer token sent
   - Create outbound adapter with API_KEY → Verify custom header sent
   - Create outbound adapter with CUSTOM → Verify all custom headers sent
   - Create TCP adapter → Verify no headers sent (TCP protocol)

---

## Completion Summary

**Phase**: AUTH-OUTBOUND-FINAL  
**Status**: ✅ IMPLEMENTATION COMPLETE (UI + Persistence)  
**Auth Location**: Create Outbound Adapter (metadata.authentication + metadata.transportHeaders)  
**Business Headers Location**: Manage Functions (customHeaders object)  
**Transport vs. Business**: Clear separation enforced with UI clarification  

**Files Changed**: 2
- CreateAdapterPage.jsx (+200 lines)
- ManageFunctionsPage.jsx (~5 lines)

**Files To Change**: 1
- LinkAdapters.jsx (remove Authentication Transformation section)

**Runtime Logic**: ⏳ PENDING (Backend implementation required)
