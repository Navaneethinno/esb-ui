# Custom Canonical Field Creation - Developer Quick Reference

## Quick Integration Guide

### Step 1: Import the Component

```jsx
import { CanonicalFieldSelect } from '../components/shared';
// or
import CanonicalFieldSelect from '../components/shared/CanonicalFieldSelect';
```

### Step 2: Replace Existing Dropdown

**Before:**
```jsx
<select value={field} onChange={e => setField(e.target.value)}>
  <option value="">-- Select canonical field --</option>
  {canonicalFields.map(f => (
    <option key={f.name} value={f.name}>
      {f.displayName}
    </option>
  ))}
</select>
```

**After:**
```jsx
<CanonicalFieldSelect
  value={field}
  onChange={setField}
  canonicalFields={canonicalFields}
  required={true}
  onFieldCreated={(newField) => {
    // Optional: refresh your canonical fields list
    refreshCanonicalFields();
  }}
/>
```

### Step 3: That's It!

The component automatically handles:
- ✅ Displaying all canonical fields
- ✅ "Create Custom" option at bottom
- ✅ Opening modal
- ✅ Submitting to API
- ✅ Invalidating cache
- ✅ Auto-selecting new field
- ✅ Closing modal

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | string | No | "" | Currently selected field name |
| `onChange` | function | Yes | - | Callback when field is selected: `(fieldName: string) => void` |
| `canonicalFields` | array | No | [] | Array of canonical field objects |
| `placeholder` | string | No | "-- Select canonical field --" | Placeholder text |
| `required` | boolean | No | false | Shows red border if true and value is empty |
| `onFieldCreated` | function | No | - | Callback after field creation: `(newField: object) => void` |

## Canonical Field Object Structure

The component expects fields in this format:

```javascript
{
  referenceId: "field_id",      // or name
  displayName: "Field Name",    // or name or referenceId
  name: "field_name"           // fallback
}
```

Or simple string array:
```javascript
["field1", "field2", "field3"]
```

## Styling

The component automatically applies:
- Required field styling (red border when empty)
- Visual separation for "Create Custom" option
- Consistent sizing (width: 100%)
- Theme-aware colors

## Cache Management

Cache is automatically invalidated after field creation using:
```javascript
invalidateCachePrefix("canonical-fields")
```

This clears all cache entries starting with "canonical-fields", ensuring all components get fresh data.

## API Endpoint

The backend must implement:

```
POST /api/canonical/fields
Content-Type: application/json

Request:
{
  "fieldName": "string (required)",
  "displayName": "string (required)",
  "purpose": "string (optional)",
  "scope": "GLOBAL | PROJECT | ADAPTER (required)",
  "dataType": "STRING | NUMBER | BOOLEAN | DATE | OBJECT | ARRAY (required)"
}

Response:
{
  "fieldName": "string",
  "displayName": "string",
  "referenceId": "string",
  ...
}
```

## Examples

### Basic Usage
```jsx
<CanonicalFieldSelect
  value={selectedField}
  onChange={setSelectedField}
  canonicalFields={fields}
/>
```

### With Required Validation
```jsx
<CanonicalFieldSelect
  value={selectedField}
  onChange={setSelectedField}
  canonicalFields={fields}
  required={true}
/>
```

### With Custom Placeholder
```jsx
<CanonicalFieldSelect
  value={selectedField}
  onChange={setSelectedField}
  canonicalFields={fields}
  placeholder="Choose a field..."
/>
```

### With Field Creation Callback
```jsx
<CanonicalFieldSelect
  value={selectedField}
  onChange={setSelectedField}
  canonicalFields={fields}
  onFieldCreated={(newField) => {
    console.log('Created:', newField);
    // Refresh your canonical fields
    fetchCanonicalFields().then(setFields);
  }}
/>
```

### In Tree Mapping Builder
```jsx
<CanonicalFieldSelect
  value={mappings[path]}
  onChange={(value) => updateMapping(path, value)}
  canonicalFields={canonicalFields}
  required={isRequiredField}
  onFieldCreated={handleFieldCreated}
/>
```

## Troubleshooting

### Field not appearing after creation
- Check network tab for successful POST to `/api/canonical/fields`
- Verify cache invalidation is working
- Ensure parent component re-fetches canonical fields

### Modal not opening
- Check browser console for errors
- Verify CreateCanonicalFieldModal is properly imported
- Check modal backdrop z-index (9999)

### New field not auto-selected
- Verify API response includes `fieldName`, `referenceId`, or `name`
- Check onChange callback is firing
- Verify field name matches the format expected by parent component

## Integration Checklist

- [ ] Import CanonicalFieldSelect
- [ ] Replace existing dropdown
- [ ] Pass canonicalFields array
- [ ] Implement onChange handler
- [ ] Add required prop if needed
- [ ] Add onFieldCreated callback if parent needs refresh
- [ ] Test field creation flow
- [ ] Verify cache invalidation
- [ ] Test auto-selection of new field
- [ ] Verify no console errors

## Common Patterns

### Pattern 1: Simple Replacement
```jsx
// Old
<select value={field} onChange={e => setField(e.target.value)}>
  {/* ... options */}
</select>

// New
<CanonicalFieldSelect
  value={field}
  onChange={setField}
  canonicalFields={canonicalFields}
/>
```

### Pattern 2: With Form Validation
```jsx
<div className="field">
  <label>Canonical Field {isRequired && '*'}</label>
  <CanonicalFieldSelect
    value={formData.canonicalField}
    onChange={(value) => setFormData({ ...formData, canonicalField: value })}
    canonicalFields={canonicalFields}
    required={isRequired}
  />
  {errors.canonicalField && (
    <span className="error">{errors.canonicalField}</span>
  )}
</div>
```

### Pattern 3: Dynamic Field Lists
```jsx
function MyComponent() {
  const [fields, setFields] = useState([]);
  
  useEffect(() => {
    fetchCanonicalFields().then(setFields);
  }, []);
  
  return (
    <CanonicalFieldSelect
      value={selected}
      onChange={setSelected}
      canonicalFields={fields}
      onFieldCreated={() => {
        // Refresh the list
        fetchCanonicalFields().then(setFields);
      }}
    />
  );
}
```

## Next Steps

1. Replace existing canonical field dropdowns with CanonicalFieldSelect
2. Test the integration in your component
3. Add to Request Type Builder
4. Add to any other mapping components
5. Document any component-specific usage patterns
