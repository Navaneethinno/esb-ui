import { useState } from "react";
import CreateCanonicalFieldModal from "./CreateCanonicalFieldModal";
import { invalidateCachePrefix } from "../../utils/apiCache";

export default function CanonicalFieldSelect({ 
  value, 
  onChange, 
  canonicalFields = [],
  placeholder = "-- Select canonical field --",
  required = false,
  onFieldCreated
}) {
  console.log('SELECT_RECEIVED', {
    partnerTier: canonicalFields.some(f => String(typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '')).toLowerCase() === 'partnertier'),
    customerSegment: canonicalFields.some(f => String(typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '')).toLowerCase() === 'customersegment'),
    error: canonicalFields.some(f => String(typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '')).toLowerCase() === 'error'),
  });
  
  console.log('═══════════════════════════════════════');
  console.log('DROPDOWN_RENDER: CanonicalFieldSelect');
  console.log('RECEIVED canonicalFields LENGTH:', canonicalFields?.length);
  console.log('RECEIVED canonicalFields (first 10):', canonicalFields?.slice(0, 10));
  console.log('ALL FIELD NAMES:', canonicalFields.map(f => {
    if (typeof f === 'string') return f;
    return f.fieldName || f.referenceId || f.name || f;
  }));
  
  // Check test fields
  const partnerTier = canonicalFields.find(f => {
    const fieldName = typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '');
    return fieldName.toLowerCase() === 'partnertier';
  });
  const customerSegment = canonicalFields.find(f => {
    const fieldName = typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '');
    return fieldName.toLowerCase() === 'customersegment';
  });
  const errorField = canonicalFields.find(f => {
    const fieldName = typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || '');
    return fieldName.toLowerCase() === 'error';
  });
  
  console.log('TEST FIELDS PRESENT IN DROPDOWN:');
  console.log('  - partnerTier:', partnerTier);
  console.log('  - customerSegment:', customerSegment);
  console.log('  - error:', errorField);
  console.log('═══════════════════════════════════════');
  
  const [showModal, setShowModal] = useState(false);

  function handleSelectChange(e) {
    if (e.target.value === "__CREATE_CUSTOM__") {
      setShowModal(true);
      e.target.value = value || "";
    } else {
      onChange?.(e.target.value);
    }
  }

  function handleFieldCreated(newField) {
    invalidateCachePrefix("canonical-fields");
    
    const fieldName = newField?.fieldName || newField?.referenceId || newField?.name || "";
    if (fieldName) {
      onChange?.(fieldName);
    }
    
    onFieldCreated?.(newField);
  }

  return (
    <>
      <select
        value={value || ""}
        onChange={handleSelectChange}
        style={{
          width: "100%",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          border: required && !value ? "2px solid #dc2626" : "1px solid var(--border)",
          background: required && !value ? "rgba(220, 38, 38, 0.05)" : "var(--panel)",
          color: "var(--heading)"
        }}
      >
        <option value="">{placeholder}</option>
        {canonicalFields.map((field, idx) => {
          const fieldValue = field.fieldName || field.referenceId || field.name || field;
          const fieldLabel = field.displayName || field.display_name || field.fieldName || field.name || field;
          return (
            <option key={idx} value={fieldValue}>
              {fieldLabel}
            </option>
          );
        })}
        <option 
          value="__CREATE_CUSTOM__"
          style={{
            borderTop: "2px solid var(--border)",
            marginTop: "4px",
            paddingTop: "4px",
            fontWeight: 700,
            color: "var(--primary)",
            background: "var(--primary-soft)"
          }}
        >
          + Create Custom Canonical Field
        </option>
      </select>

      {showModal && (
        <CreateCanonicalFieldModal
          onClose={() => setShowModal(false)}
          onCreated={handleFieldCreated}
        />
      )}
    </>
  );
}
