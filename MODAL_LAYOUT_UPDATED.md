# Create Custom Canonical Field Modal - Updated Layout

## Visual Representation (ASCII Art)

```
┌─────────────────────────────────────────────────────────────┐
│  + Create Custom Canonical Field                    [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Field Name                                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ e.g. custom_field_1                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  Display Name                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ e.g. Custom Field 1                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  Purpose (Optional)                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Describe the purpose of this field                    │  │
│  │                                                        │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  Data Type                                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ STRING                                              ▼ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                                      [ Cancel ] [ ✓ Create ] │
└─────────────────────────────────────────────────────────────┘
```

## Summary of Changes

### ✅ REMOVED
- Scope field (dropdown with GLOBAL/PROJECT/ADAPTER options)
- All associated UI elements
- Form state for scope

### ✅ KEPT
1. **Field Name** (required text input)
2. **Display Name** (required text input)
3. **Purpose** (optional textarea, 3 rows)
4. **Data Type** (required dropdown: STRING, NUMBER, BOOLEAN, DATE, OBJECT, ARRAY)

### ✅ Backend Integration
- Scope is set to `"custom"` internally in the payload
- Not exposed to the user
- Sent automatically with every submission

## Form Layout

**Spacing:** Natural compact layout with 16px gap between fields

**Fields (top to bottom):**
1. Field Name input
2. Display Name input
3. Purpose textarea (3 rows)
4. Data Type dropdown
5. Error message (if any)
6. Action buttons (Cancel | Create Field)

## Code Changes

**File:** `src/components/shared/CreateCanonicalFieldModal.jsx`

**Line 6-10:** Updated state initialization
```javascript
const [form, setForm] = useState({
  fieldName: "",
  displayName: "",
  purpose: "",
  dataType: "STRING"  // scope removed
});
```

**Line 24-30:** Updated payload with hardcoded scope
```javascript
const payload = {
  fieldName: form.fieldName.trim(),
  displayName: form.displayName.trim(),
  purpose: form.purpose.trim() || undefined,
  scope: "custom",  // ← Hardcoded, not from form
  dataType: form.dataType
};
```

**Lines 113-125:** Scope dropdown removed entirely
- No JSX for Scope field
- Form flows directly from Purpose to Data Type
- No empty space left behind

## Validation

**Required Fields:**
- Field Name (must not be empty after trim)
- Display Name (must not be empty after trim)

**Optional Fields:**
- Purpose (empty string sent as undefined)

**Hidden Fields:**
- Scope (always sent as "custom")

## User Experience

1. User clicks "+ Create Custom Canonical Field"
2. Modal opens with 4 visible fields
3. User fills Field Name, Display Name (required)
4. User optionally fills Purpose
5. User selects Data Type (defaults to STRING)
6. User clicks "Create Field"
7. Backend receives scope="custom" automatically

## API Payload Example

```json
{
  "fieldName": "custom_transaction_ref",
  "displayName": "Custom Transaction Reference",
  "purpose": "Used for tracking custom transactions",
  "scope": "custom",
  "dataType": "STRING"
}
```

Note: `scope` is always `"custom"` and not user-configurable.
