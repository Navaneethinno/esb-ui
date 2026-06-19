# FIX: CREATE REQUEST TYPE SHOULD START BLANK

## Issue
When clicking "Create Request Type" button, the form was pre-populated with existing configurations instead of starting with a blank form.

## Root Cause
The `useEffect` in ManageFunctionsPage was loading `existingConfigurations` unconditionally whenever they existed, regardless of whether the user wanted to create new or edit existing request types.

## Solution
Added `isEditMode` flag to distinguish between:
- **Create new request type:** `isEditMode = false` → Start with blank form
- **Edit existing request type:** `isEditMode = true` → Load existing configurations

## Changes Made

### File 1: `src/components/ManageFunctionsPage.jsx`

**Added `isEditMode` prop:**
```javascript
export default function ManageFunctionsPage({ 
  adapter, 
  selectedUser, 
  onBack, 
  isOutbound = false, 
  canonicalFields: propCanonicalFields = [], 
  canonicalStatus: propCanonicalStatus = "idle", 
  existingConfigurations = [], 
  isEditMode = false  // NEW
}) {
```

**Updated useEffect to respect isEditMode:**
```javascript
// BEFORE
useEffect(() => {
  if (!initialized && existingConfigurations && existingConfigurations.length > 0) {
    const loaded = existingConfigurations.map(config => loadRequestTypeFromConfig(config));
    setRequestTypes(loaded);
    setInitialized(true);
  }
}, [initialized, existingConfigurations]);

// AFTER
useEffect(() => {
  if (!initialized && isEditMode && existingConfigurations && existingConfigurations.length > 0) {
    const loaded = existingConfigurations.map(config => loadRequestTypeFromConfig(config));
    setRequestTypes(loaded);
    setInitialized(true);
  } else if (!initialized) {
    setInitialized(true);
  }
}, [initialized, existingConfigurations, isEditMode]);
```

### File 2: `src/App.jsx`

**Set `isEditMode = false` for Create flow:**
```javascript
<ManageFunctionsPage
  adapter={selectedFunctionAdapter}
  selectedUser={selectedUser}
  canonicalFields={canonicalFields}
  canonicalStatus={canonicalLoading ? "loading" : "idle"}
  onBack={() => setActiveTab("create_adapter")}
  isOutbound={selectedFunctionAdapter?.direction === "Outbound"}
  existingConfigurations={selectedFunctionAdapter?._raw?.configurations || []}
  isEditMode={false}  // Always create new
/>
```

## Behavior Now

### ✅ When Clicking "Create Request Type":
- Form starts **completely blank**
- Request Name: empty
- Request Payload: `{\n  \n}`
- Response Payload: `{\n  \n}`
- No mappings pre-loaded
- User creates fresh configuration from scratch

### 🔮 Future: When Adding "Edit Request Type" Button:
```javascript
// In AdapterRegistry.jsx - add new button
<button onClick={() => openEditRequestType(row)}>
  Edit Request Type
</button>

// Pass isEditMode = true
<ManageFunctionsPage
  isEditMode={true}  // Load existing configs
  existingConfigurations={adapter._raw.configurations}
/>
```

## Build Status
```
✓ 653 modules transformed
✓ built in 756ms
```

## Testing

### Test Case 1: Create New Request Type (Your Issue)
1. Go to "Created Adapters"
2. Click any adapter
3. Click "Create Request Type" button
4. **Expected:** ✅ Form is completely blank
5. **Expected:** ✅ No pre-populated data
6. **Expected:** ✅ Empty JSON payloads
7. **Expected:** ✅ No mappings loaded

### Test Case 2: Future Edit Mode (Not Yet Implemented)
1. Go to "Created Adapters"  
2. Click adapter with existing configs
3. Click "Edit Request Type" (future button)
4. **Expected:** Form pre-populated with existing data
5. **Expected:** Mappings loaded in dropdowns
6. User can modify and save

## Summary
- **Problem:** "Create Request Type" showed existing data
- **Solution:** Added `isEditMode` flag to control loading behavior
- **Result:** Create flow always starts blank, edit flow can load existing (when implemented)
