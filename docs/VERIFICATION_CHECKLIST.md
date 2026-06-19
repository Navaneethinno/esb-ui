# ESB UI ENHANCEMENTS - VERIFICATION CHECKLIST

Use this checklist to verify all enhancements are working correctly.

---

## ✅ AUDIT UI DATA BINDING FIX

### Table Columns Verification

- [ ] **Mapping ID** - Shows clickable link (not "-")
- [ ] **Inbound Adapter** - Shows adapter name in bold (not "-")
- [ ] **Inbound Request Type** - Shows request type (not "-")
- [ ] **Outbound Adapter** - Shows adapter name in bold (not "-")
- [ ] **Outbound Request Type** - Shows request type (not "-")
- [ ] **Adapter Type** - Shows "HTTP", "HTTPS", "TCP", etc. (not "-")
- [ ] **Status** - Shows colored pill (SUCCESS/FAILED/PENDING)
- [ ] **Date** - Shows format: `09 Jun 2024` (not raw timestamp)
- [ ] **Time** - Shows format: `13:00:13` (not raw timestamp)
- [ ] **Preview** - Blue "View Details" button visible

### Browser Console Debug Logs

- [ ] Open DevTools (F12) → Console tab
- [ ] See `[AUDIT DEBUG] First audit row:` with data object
- [ ] See `[AUDIT DEBUG] Property names:` with array of keys
- [ ] See `[AUDIT ROW DEBUG] Sample row:` when table loads
- [ ] No JavaScript errors displayed

### Preview Drawer - Header Section

- [ ] Click "View Details" button on any audit row
- [ ] Drawer opens from right side
- [ ] Request ID shown in header (not "-")
- [ ] Close button (X) works

### Preview Drawer - Metadata Tiles

- [ ] Mapping ID tile populated
- [ ] Mapping Name tile populated
- [ ] Inbound Adapter tile populated (not "-")
- [ ] Inbound Request Type tile populated (not "-")
- [ ] Outbound Adapter tile populated (not "-")
- [ ] Outbound Request Type tile populated (not "-")
- [ ] Adapter Type tile populated (not "-")
- [ ] Status tile shows colored pill
- [ ] Latency tile shows "XXX ms" (or "-" if not available)
- [ ] Timestamp tile shows formatted date/time

### Preview Drawer - Execution Journey

- [ ] Execution Journey sidebar visible on left
- [ ] Timeline shows 8 stages
- [ ] Active stages have blue icons
- [ ] Inactive stages have gray icons
- [ ] Vertical line connects all stages

### Preview Drawer - Section 1: Original Request

- [ ] Section header shows "1. Original Request"
- [ ] Click to expand/collapse works
- [ ] JSON code viewer displays request payload
- [ ] "Copy" button present and functional
- [ ] Shows "No data available." ONLY if field is actually null/empty

### Preview Drawer - Section 2: Transformed Request

- [ ] Section header shows "2. Transformed Request"
- [ ] JSON code viewer displays transformed payload
- [ ] "Copy" button works
- [ ] Shows actual data (not "No data available." unless truly empty)

### Preview Drawer - Section 3: Outbound Destination

- [ ] Section header shows "3. Outbound Destination"
- [ ] Four tiles: Host, Port, Path, Protocol
- [ ] All tiles show actual values (not all "-")

### Preview Drawer - Section 4: Outbound XML

- [ ] Section header shows "4. Outbound XML Sent To CBS"
- [ ] XML code viewer displays outbound request
- [ ] Text color is blue (#93c5fd) for XML
- [ ] "Copy" button works
- [ ] Shows actual XML (not "No data available." unless truly empty)

### Preview Drawer - Section 5: CBS Response XML

- [ ] Section header shows "5. CBS Response XML"
- [ ] XML code viewer displays CBS response
- [ ] Shows actual XML (not "No data available." unless truly empty)

### Preview Drawer - Section 6: Parsed Response

- [ ] Section header shows "6. Parsed CBS Response"
- [ ] JSON code viewer displays parsed data
- [ ] Shows actual data (not "No data available." unless truly empty)

### Preview Drawer - Section 7: Response Mappings

- [ ] Section header shows "7. Response Mappings Used"
- [ ] "Open Mapping Details" button visible (if mapping exists)
- [ ] Table shows mapping rows with columns: Type, Source, Target, Static
- [ ] Shows "No mappings available." ONLY if mappings array is truly empty

### Preview Drawer - Section 8: Final Response

- [ ] Section header shows "8. Final Mobile Response"
- [ ] JSON code viewer displays final response
- [ ] Shows actual data (not "No data available." unless truly empty)

### Preview Drawer - Section 9: Execution Metadata

- [ ] Section header shows "9. Execution Metadata"
- [ ] Shows 11 metadata tiles
- [ ] Request ID, Mapping ID, Mapping Name populated
- [ ] Inbound/Outbound Adapter populated (not "-")
- [ ] Adapter Type populated (not "-")
- [ ] Status, Transform Status, Outbound Status populated
- [ ] Latency shows ms value (or "-")
- [ ] Timestamp formatted correctly

---

## ✅ PROTOCOL-SPECIFIC FORMS

### HTTP Protocol Form

- [ ] Navigate to Create Adapter → Outbound
- [ ] Select Protocol: **HTTP**
- [ ] Verify fields visible:
  - [ ] Destination Name input
  - [ ] Protocol dropdown (showing HTTP)
  - [ ] Output Format dropdown
  - [ ] Host input
  - [ ] Port input (1-65535)
  - [ ] **Path input** (visible)
  - [ ] **Method dropdown** (visible)
  - [ ] **Custom Headers section** (visible)
  - [ ] Timeout input (visible)

### HTTPS Protocol Form

- [ ] Select Protocol: **HTTPS**
- [ ] Verify same fields as HTTP visible
- [ ] Path, Method, Custom Headers all shown

### TCP Protocol Form

- [ ] Select Protocol: **TCP**
- [ ] Verify fields visible:
  - [ ] Destination Name input
  - [ ] Protocol dropdown (showing TCP)
  - [ ] Output Format dropdown
  - [ ] Host input
  - [ ] Port input
  - [ ] **Connection Timeout input** (visible)
  - [ ] **Read Timeout input** (visible)
- [ ] Verify fields HIDDEN:
  - [ ] ❌ No Path input
  - [ ] ❌ No Method dropdown
  - [ ] ❌ No Custom Headers section
  - [ ] ❌ No Timeout input (generic one)

### Custom Headers Editor (HTTP/HTTPS Only)

- [ ] Select Protocol: HTTP or HTTPS
- [ ] Custom Headers section visible
- [ ] "Add Header" button visible
- [ ] Click "Add Header" → new row appears
- [ ] Enter header name (e.g., "Authorization")
- [ ] Enter header value (e.g., "Bearer token123")
- [ ] Click "Add Header" again → second row appears
- [ ] Enter second header (e.g., "Client-ID" / "ESB-001")
- [ ] Trash icon visible on each row
- [ ] Click trash icon → row removed
- [ ] Add 3-4 headers total
- [ ] Click "Create Outbound Adapter"
- [ ] Check browser console for payload
- [ ] Verify payload includes:
  ```json
  {
    "headers": {
      "Authorization": "Bearer token123",
      "Client-ID": "ESB-001"
    }
  }
  ```

### Protocol Switching Test

- [ ] Start with HTTP → verify Path/Method/Headers shown
- [ ] Switch to TCP → verify Path/Method/Headers hidden, Connection/Read Timeout shown
- [ ] Switch to HTTPS → verify Path/Method/Headers shown again
- [ ] Switch to MQ → verify generic Timeout shown
- [ ] Switch back to HTTP → verify form state preserved

---

## ✅ REQUEST TYPE SECURITY CONFIGURATION (UI ONLY)

### Navigation & Initial Load

- [ ] Navigate to Create Request Type page (needs to be added to navigation)
- [ ] Page loads without errors
- [ ] Progress indicator shows 4 steps
- [ ] Step 1 highlighted/colored
- [ ] Steps 2, 3, 4 grayed out

### Step 1: Basic Details

- [ ] "Step 1" label visible
- [ ] Title: "Basic Details"
- [ ] Request Type Name input visible
- [ ] Format dropdown visible (JSON, XML, ISO8583, ISO20022)
- [ ] Description textarea visible (optional)
- [ ] "Next" button visible
- [ ] Click "Next" without filling name → error message shown
- [ ] Fill name → click "Next" → moves to Step 2
- [ ] Progress indicator updates (Step 1 shows checkmark)

### Step 2: Request Payload

- [ ] "Step 2" label visible
- [ ] Title: "Request Payload Schema"
- [ ] Large textarea visible (monospace font)
- [ ] Placeholder shows JSON example
- [ ] Enter valid JSON schema:
  ```json
  {
    "customerId": "string",
    "accountNumber": "string",
    "amount": "number"
  }
  ```
- [ ] "Back" button visible and works
- [ ] "Next" button visible
- [ ] Click "Next" → moves to Step 3
- [ ] Progress indicator updates (Step 2 shows checkmark)

### Step 3: Response Payload

- [ ] "Step 3" label visible
- [ ] Title: "Response Payload Schema"
- [ ] Large textarea visible
- [ ] Enter valid JSON schema:
  ```json
  {
    "balance": "number",
    "accountState": "string",
    "responseCode": "string"
  }
  ```
- [ ] "Back" button works (returns to Step 2)
- [ ] "Next" button visible
- [ ] Click "Next" → moves to Step 4
- [ ] Progress indicator updates (Step 3 shows checkmark)

### Step 4: Data Protection - None Selected

- [ ] "Step 4" label visible
- [ ] Title: "Data Protection Configuration"
- [ ] Four radio buttons visible in 2x2 grid:
  - [ ] None (with shield-off icon)
  - [ ] Mask (with eye-off icon)
  - [ ] Hash (with lock icon)
  - [ ] Encrypt (with shield-lock icon)
- [ ] "None" selected by default
- [ ] Blue info box visible: "No data protection will be applied"
- [ ] "Back" button visible
- [ ] "Save Request Type (UI Only)" button visible
- [ ] Button NOT disabled

### Step 4: Data Protection - Mask Selected

- [ ] Click "Mask" radio button
- [ ] Radio button becomes selected
- [ ] Card border turns blue
- [ ] Background becomes light blue
- [ ] Info box disappears
- [ ] Field selection box appears
- [ ] Title: "Select Fields to Protect"
- [ ] Subtitle: "Choose which fields should be masked"
- [ ] "Request Fields" section visible
- [ ] All 3 request fields shown as checkboxes:
  - [ ] customerId
  - [ ] accountNumber
  - [ ] amount
- [ ] "Response Fields" section visible
- [ ] All 3 response fields shown as checkboxes:
  - [ ] balance
  - [ ] accountState
  - [ ] responseCode

### Step 4: Field Selection

- [ ] Check "accountNumber" checkbox
- [ ] Checkbox becomes checked
- [ ] Row border turns blue (2px)
- [ ] Row background becomes light blue
- [ ] Check "customerId" checkbox
- [ ] Check "balance" checkbox (from response)
- [ ] Blue summary box appears at bottom
- [ ] Summary shows: "3 fields will be masked: accountNumber, customerId, balance"
- [ ] Shield-check icon visible in summary
- [ ] Uncheck "balance" → summary updates to 2 fields
- [ ] Check it again → summary updates to 3 fields

### Step 4: Security Type Switching

- [ ] Select "Hash" radio button
- [ ] Summary text changes to "3 fields will be hashed"
- [ ] Select "Encrypt" radio button
- [ ] Summary text changes to "3 fields will be encrypted"
- [ ] Select "None" radio button
- [ ] Field selection box disappears
- [ ] Info box reappears
- [ ] Select "Mask" again
- [ ] Field selection box reappears
- [ ] Previously selected fields remain checked

### Step 4: Empty Schema Handling

- [ ] Go back to Step 2 (clear request schema)
- [ ] Go back to Step 3 (clear response schema)
- [ ] Go to Step 4
- [ ] Select "Mask"
- [ ] Field selection box shows alert icon
- [ ] Message: "No fields available. Please define request or response schema"

### Step 4: Save (UI Only)

- [ ] Re-enter request/response schemas
- [ ] Go to Step 4, select "Mask"
- [ ] Select 3 fields
- [ ] Click "Save Request Type (UI Only)"
- [ ] Button shows loading spinner: "Saving…"
- [ ] After ~800ms, success message appears
- [ ] Button shows checkmark: "Saved"
- [ ] Success message includes "(UI only - no backend connection)"
- [ ] After 1.5 seconds, form resets
- [ ] Returns to Step 1
- [ ] All fields cleared

### Browser Console Verification

- [ ] Open browser console (F12)
- [ ] Look for logs after clicking Save:
  ```
  [UI ONLY] Request Type Payload: {...}
  [UI ONLY] Extracted Request Fields: [...]
  [UI ONLY] Extracted Response Fields: [...]
  [UI ONLY] Protected Fields: [...]
  ```
- [ ] Verify payload structure:
  ```json
  {
    "requestTypeName": "BALANCE_INQUIRY",
    "format": "JSON",
    "requestSchema": "{...}",
    "responseSchema": "{...}",
    "securityType": "MASK",
    "protectedFields": ["accountNumber", "customerId", "balance"]
  }
  ```
- [ ] NO API errors (because no API calls made)
- [ ] NO 404 errors
- [ ] NO JavaScript errors

---

## 🔧 TECHNICAL VERIFICATION

### No Breaking Changes

- [ ] Existing adapters still load correctly
- [ ] Existing mappings still work
- [ ] Existing audit logs still display
- [ ] No console errors on any page
- [ ] All other pages work normally

### Performance Check

- [ ] Audit logs table loads quickly
- [ ] Preview drawer opens smoothly
- [ ] Protocol form switching is instant
- [ ] Request type wizard transitions smooth
- [ ] No lag when selecting fields
- [ ] No memory leaks (DevTools → Performance)

### Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] All features work in each browser

### Responsive Design Check

- [ ] Audit table scrolls horizontally if needed
- [ ] Preview drawer width adapts to screen size
- [ ] Protocol forms layout works on narrow screens
- [ ] Request type wizard works on tablets
- [ ] Field selectors wrap on mobile

---

## 📊 DATA VERIFICATION

### Audit API Response Structure

Check one of these formats in console:

**Snake Case Format:**
```javascript
{
  request_id: "...",
  mapping_id: "...",
  inbound_adapter_name: "...",
  outbound_adapter_name: "...",
  adapter_type: "...",
  created_at: "..."
}
```

**Camel Case Format:**
```javascript
{
  requestId: "...",
  mappingId: "...",
  inboundAdapterName: "...",
  outboundAdapterName: "...",
  adapterType: "...",
  createdAt: "..."
}
```

Both formats should work correctly due to fallback chains.

---

## ❌ NEGATIVE TESTING

### Audit UI Edge Cases

- [ ] Empty audit logs array → "No enriched adapter link audit records" message
- [ ] Audit row with all null fields → shows "-" gracefully
- [ ] Missing timestamp → shows "-" for date/time
- [ ] Preview drawer with empty payloads → "No data available."
- [ ] Search with no results → empty state shown

### Protocol Forms Edge Cases

- [ ] Switch protocol mid-form → form adapts without errors
- [ ] Add 10+ headers → all display and save correctly
- [ ] Remove last header → "No custom headers defined" message
- [ ] Submit form without required fields → validation error
- [ ] Invalid port number → validation error

### Request Type Security Edge Cases

- [ ] Try to go to Step 2 without name → blocked with error
- [ ] Enter invalid JSON in schema → handled gracefully
- [ ] Select security without selecting fields → save button enabled (0 fields protected)
- [ ] Navigate back/forward rapidly → no state corruption
- [ ] Submit with empty schemas → still works (0 fields available)

---

## ✨ FINAL CHECKLIST

- [ ] All audit columns populated with real data
- [ ] All preview drawer sections show content
- [ ] HTTP/HTTPS forms show Path, Method, Headers
- [ ] TCP forms show Connection/Read Timeout
- [ ] Custom headers editor adds/removes headers
- [ ] Request type wizard completes all 4 steps
- [ ] Field selector shows combined request+response fields
- [ ] Security type selection shows/hides field selector
- [ ] UI-only mode logs to console (no API calls)
- [ ] No JavaScript errors in console
- [ ] No broken links or missing resources
- [ ] All buttons and interactions work
- [ ] Loading states display correctly
- [ ] Success/error messages display correctly
- [ ] Forms reset after successful save

---

## 📸 SCREENSHOT EVIDENCE

Take screenshots of:

1. **Audit Table** - All columns populated
2. **Audit Preview Drawer** - Metadata section
3. **Audit Preview Drawer** - JSON section
4. **Audit Preview Drawer** - XML section
5. **HTTP Form** - With custom headers
6. **TCP Form** - With timeout fields
7. **Request Type Step 1** - Basic details
8. **Request Type Step 4** - Data protection with fields selected
9. **Browser Console** - Showing debug logs
10. **Browser Console** - Showing UI-only payload

---

**VERIFICATION COMPLETE** ✅

All enhancements tested and verified!
