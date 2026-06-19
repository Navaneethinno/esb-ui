import { useState } from "react";
import { createCanonicalField } from "../../services/CanonicalFieldService";
import { invalidateCachePrefix } from "../../utils/apiCache";

export default function CreateCanonicalFieldModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    fieldName: "",
    displayName: "",
    purpose: "",
    dataType: "STRING"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.fieldName.trim() || !form.displayName.trim()) {
      setError("Field Name and Display Name are required");
      return;
    }
    
    setLoading(true);
    setError("");

    const payload = {
      fieldName: form.fieldName.trim(),
      displayName: form.displayName.trim(),
      purpose: form.purpose.trim() || undefined,
      scope: "custom",
      dataType: form.dataType
    };

    createCanonicalField(payload)
      .then(data => {
        invalidateCachePrefix("canonical-fields");
        onCreated?.(data);
        onClose();
      })
      .catch(() => {
        setError("Failed to create canonical field. Please try again.");
        setLoading(false);
      });
  }

  return (
    <div 
      className="modal-backdrop" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="modal-card"
        style={{
          width: "min(480px, 92vw)",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          overflow: "hidden"
        }}
      >
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--heading)" }}>
            <i className="ti ti-plus" /> Create Custom Canonical Field
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontSize: 18,
              color: "var(--muted)",
              lineHeight: 1,
              padding: 4
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label>Field Name</label>
            <input
              type="text"
              value={form.fieldName}
              onChange={e => setForm(f => ({ ...f, fieldName: e.target.value }))}
              placeholder="e.g. custom_field_1"
              autoFocus
              style={{ fontSize: 13 }}
            />
          </div>

          <div className="field">
            <label>Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="e.g. Custom Field 1"
              style={{ fontSize: 13 }}
            />
          </div>

          <div className="field">
            <label>Purpose (Optional)</label>
            <textarea
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="Describe the purpose of this field"
              rows={3}
              style={{ fontSize: 13, resize: "vertical" }}
            />
          </div>

          <div className="field">
            <label>Data Type</label>
            <select
              value={form.dataType}
              onChange={e => setForm(f => ({ ...f, dataType: e.target.value }))}
              style={{ fontSize: 13 }}
            >
              <option value="STRING">STRING</option>
              <option value="NUMBER">NUMBER</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="DATE">DATE</option>
              <option value="OBJECT">OBJECT</option>
              <option value="ARRAY">ARRAY</option>
            </select>
          </div>

          {error && (
            <div style={{
              padding: 10,
              borderRadius: 6,
              background: "rgba(220, 38, 38, 0.1)",
              color: "#dc2626",
              fontSize: 12,
              border: "1px solid rgba(220, 38, 38, 0.3)"
            }}>
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}

          <div style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            paddingTop: 8
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={loading}
              style={{ fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ fontSize: 13 }}
            >
              {loading ? (
                <><i className="ti ti-loader-2 spin" /> Creating...</>
              ) : (
                <><i className="ti ti-check" /> Create Field</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
