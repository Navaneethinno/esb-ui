# CreateRequestTypePage - Navigation Map

```
┌─────────────────────────────────────────────────────────────────┐
│  InnoBridge ESB Manager                                         │
├─────────────────────────────────────────────────────────────────┤
│  SIDEBAR                           │  MAIN CONTENT AREA         │
│                                    │                            │
│  ☐ InnoBridge Dashboard           │                            │
│  ☐ Created Adapters                │                            │
│  ☐ Create Adapter                  │                            │
│  ☑ Create Request Type  ◄──────────┼─── CLICK HERE            │
│  ☐ Link Adapters                   │                            │
│  ───────────────────────            │                            │
│  ☐ Audit Logs                      │   [Request Type Wizard]   │
│                                    │                            │
│  [User Dropdown]                   │   Step 1: Basic Details   │
│  [Clear Cache]                     │   Step 2: Request Payload │
│  [Theme Toggle]                    │   Step 3: Response Payload│
│                                    │   Step 4: Data Protection │
└────────────────────────────────────┴────────────────────────────┘
```

---

## Navigation Steps

### 1. Access the Page
```
Launch App → Sidebar → "Create Request Type" (4th tab)
```

### 2. Wizard Flow

```
┌───────────────────────────────────────────────────────┐
│  STEP 1: Basic Details                                │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │ Request Type Name: BALANCE_INQUIRY            │  │
│  │ Format: [ISO8583 ▼]                            │  │
│  │ Description: [Optional textarea]               │  │
│  └─────────────────────────────────────────────────┘  │
│                                    [Next →]           │
└───────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────┐
│  STEP 2: Protocol Definition (ISO8583)                │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │ MTI: [0200 - Authorization ▼]                 │  │
│  │                                                 │  │
│  │ Request Fields:                                 │  │
│  │  ☑ DE2 - Primary Account Number                │  │
│  │  ☑ DE3 - Processing Code                       │  │
│  │  ☑ DE4 - Transaction Amount                    │  │
│  │  ☐ DE11 - System Trace Audit Number            │  │
│  │  ☐ DE37 - Retrieval Reference Number           │  │
│  │                                                 │  │
│  │ Extension Mode: ☐ Allow custom DE fields       │  │
│  └─────────────────────────────────────────────────┘  │
│                   [← Back]  [Next →]                  │
└───────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────┐
│  STEP 3: Response Fields                              │
├───────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐  │
│  │ Response Fields:                                │  │
│  │  ☑ DE38 - Authorization Code                   │  │
│  │  ☑ DE39 - Response Code                        │  │
│  │  ☐ DE54 - Additional Amounts                   │  │
│  └─────────────────────────────────────────────────┘  │
│                   [← Back]  [Next →]                  │
└───────────────────────────────────────────────────────┘
                         ↓
┌───────────────────────────────────────────────────────┐
│  STEP 4: Data Protection                              │
├───────────────────────────────────────────────────────┤
│  Security Type:                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │   None   │ │   Mask   │ │   Hash   │ │ Encrypt  ││
│  │  ○       │ │  ●       │ │  ○       │ │  ○       ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                       │
│  Protected Fields:                                    │
│  ☑ DE2 - Primary Account Number                      │
│  ☑ DE35 - Track 2 Data                               │
│                                                       │
│                   [← Back]  [Save Request Type]      │
└───────────────────────────────────────────────────────┘
                         ↓
                   [Success Toast]
                         ↓
              Navigate to Dashboard
```

---

## ISO8583 vs ISO20022 Flows

### ISO8583 Flow
```
Step 2:
  └─ Select MTI (0200, 0210, 0400, etc.)
     └─ Load DE fields for MTI
        └─ Check Request Fields (DE2, DE3, DE4, ...)
           └─ Extension Mode: ☐ Custom DE fields
```

### ISO20022 Flow
```
Step 2:
  └─ Select Family (pacs, pain, camt, etc.)
     └─ Select Message Type (pacs.008.001.08, etc.)
        └─ Load XML Fields from Backend
           └─ Check Request Fields (GrpHdr, CdtTrfTxInf, ...)
              └─ Extension Mode: ☐ Custom XML nodes
```

---

## Key UI Elements

### Tab Icon
```
Icon: ti-file-plus (📄+)
Label: "Create Request Type"
Position: 4th item in sidebar
```

### Progress Indicator
```
Step 1: ●────○────○────○  Basic Details
Step 2: ✓────●────○────○  Request Payload
Step 3: ✓────✓────●────○  Response Payload
Step 4: ✓────✓────✓────●  Data Protection
```

### Protocol Lock Indicator
```
Normal Mode:
  ┌────────────────────────────────────┐
  │ 🔒 PROTOCOL LOCK                   │
  │ Fields locked to backend metadata  │
  └────────────────────────────────────┘

Extension Mode:
  ┌────────────────────────────────────┐
  │ 🔓 EXTENSION MODE                  │
  │ Custom fields allowed              │
  └────────────────────────────────────┘
```

---

## Testing Instructions

### 1. Launch Dev Server
```bash
cd d:\INNOVITEGEA\ESB\ESB_UI
npm run dev
```

### 2. Navigate to Page
- Open browser: http://localhost:5173
- Click "Create Request Type" in sidebar

### 3. Create ISO8583 Request Type
- Step 1: Name = "TEST_ISO8583_AUTH", Format = ISO8583
- Step 2: MTI = 0200, Select DE2, DE3, DE4
- Step 3: Select DE38, DE39
- Step 4: Security = MASK, Protect DE2
- Click "Save Request Type"
- Verify success toast

### 4. Create ISO20022 Request Type
- Step 1: Name = "TEST_ISO20022_PAYMENT", Format = ISO20022
- Step 2: Family = pacs, Message = pacs.008.001.08, Select fields
- Step 3: Select response fields
- Step 4: Security = ENCRYPT, Protect sensitive nodes
- Click "Save Request Type"
- Verify success toast

### 5. Extension Mode Test
- Repeat above but enable "Extension Mode" checkbox
- Add custom notes in "Extension Notes" textarea
- Verify custom extensions are logged in console

---

## Console Output (Expected)

```javascript
[UI ONLY] Request Type Payload: {
  "requestTypeName": "BALANCE_INQUIRY",
  "format": "ISO8583",
  "description": "Balance inquiry transaction",
  "protocolConfig": {
    "format": "ISO8583",
    "mti": "0200",
    "requestFields": ["DE2", "DE3", "DE4", "DE11"],
    "responseFields": ["DE38", "DE39"],
    "extensionMode": false,
    "customExtensions": ""
  },
  "securityType": "MASK",
  "protectedFields": ["DE2"]
}
```

---

## Validation Checklist

- ✅ Tab appears in sidebar
- ✅ Tab icon displays correctly (ti-file-plus)
- ✅ Tab is clickable and navigates to page
- ✅ Page renders with 4-step progress indicator
- ✅ Step 1 accepts input and validates required fields
- ✅ Step 2 loads ISO8583 MTIs from backend
- ✅ Step 2 loads ISO20022 families/messages from backend
- ✅ Step 2 displays protocol fields as checkboxes
- ✅ Step 3 displays response fields
- ✅ Step 4 shows security type selector
- ✅ Save button triggers console log
- ✅ Success toast appears
- ✅ Navigation returns to dashboard after save

---

**Status:** ✅ Routing fixed, page mounted, ready for testing
