# Output Field: Strict Dropdown Implementation

## Rule: No Free-Text Typing Allowed

The Output Field in Dynamic Functions is now a **strict searchable dropdown** with no free-text input capability.

## Dropdown Structure

The dropdown contains two groups:
1. **Incoming Payload Keys** - Fields extracted from the sample payload
2. **Canonical Registry Fields** - Fields from the canonical dictionary

## Overwrite vs. New Field Logic

The backend automatically determines the behavior based on the user's selection:

### Overwrite (Same Field)
- **User selects:** Same field as the Base Amount Field
- **Backend behavior:** Overwrites the original field value
- **Example:** 
  - Base Amount Field: `transactionAmount`
  - Output Field: `transactionAmount`
  - Result: Original `transactionAmount` is replaced with calculated fee

### New Field Injection (Different Field)
- **User selects:** Different field from Base Amount Field
- **Backend behavior:** Creates/injects a new field in the payload
- **Example:**
  - Base Amount Field: `transactionAmount`
  - Output Field: `feeAmount` (from Canonical Registry)
  - Result: New field `feeAmount` is added to payload with calculated fee

## UI Feedback

The UI provides intelligent hints:
- **Blue info icon:** "Same as input field — will overwrite the original value"
- **Green checkmark:** "Different from input field — will create/inject new field"

## Benefits

1. **Clean UI** - No clunky radio buttons asking "Overwrite or New"
2. **Fast** - Single dropdown selection determines behavior
3. **Strict** - Tied to canonical dictionary, no arbitrary field names
4. **Intuitive** - Backend logic is transparent to the user
5. **Searchable** - Users can quickly find fields in large lists

## Implementation Details

### Frontend
- Output Field is always a `<select>` element
- Contains `<optgroup>` for Incoming Payload Keys and Canonical Registry Fields
- Conditional hints appear below the dropdown based on selection
- No text input allowed

### Backend Payload
The output field name is used directly in the `canonicalMapping`:
```json
{
  "canonicalMapping": {
    "transactionAmount": "CALC_FEE(base_field=transactionAmount, amount_type=FLAT, calc_type=PERCENTAGE, value=1.5, min=10, max=200)"
  }
}
```

Or for new field injection:
```json
{
  "canonicalMapping": {
    "feeAmount": "CALC_FEE(base_field=transactionAmount, amount_type=FLAT, calc_type=PERCENTAGE, value=1.5, min=10, max=200)"
  }
}
```

The backend determines overwrite vs. new based on whether the output field matches an existing payload field.

## User Workflow

1. User extracts keys from sample payload (e.g., `transactionAmount`, `customerId`)
2. User adds Dynamic Function with type "Fee Calculation"
3. User selects Base Amount Field: `transactionAmount`
4. User selects Output Field from dropdown:
   - Option A: Select `transactionAmount` → Overwrite
   - Option B: Select `feeAmount` from Canonical Registry → New Field
5. UI shows hint indicating the behavior
6. User completes remaining fee configuration steps
7. On save, backend receives the output field name and determines behavior automatically

## Migration Notes

- Removed radio buttons for "Overwrite Existing Field OR Create New Field"
- Removed free-text input for output field name
- Output field is now strictly controlled by dropdown selection
- Backend logic remains unchanged - it already handles overwrite vs. new based on field names
