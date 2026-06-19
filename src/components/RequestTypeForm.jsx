import { useState, useEffect } from "react";

/**
 * REQUEST TYPE FORM COMPONENT
 * 
 * Allows users to define request types with:
 * - Request name
 * - Request payload definition (JSON schema)
 * - Response payload definition (JSON schema)
 * - Extract key functionality to select important fields
 * - Protection marking for sensitive fields
 */

function extractKeysFromJSON(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    const keys = [];
    
    function traverse(obj, path = "") {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          keys.push(currentPath);
          if (obj[key] && typeof obj[key] === "object") {
            traverse(obj[key], currentPath);
          }
        });
      } else if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
        traverse(obj[0], path + "[0]");
      }
    }
    
    traverse(parsed);
    return keys;
  } catch {
    return [];
  }
}

export default function RequestTypeForm({ 
  initialData = null,
  onSubmit,
  onCancel,
  requestType = "Dummy_outbound"
}) {
  const [requestName, setRequestName] = useState(initialData?.requestName || "");
  const [requestDefinition, setRequestDefinition] = useState(
    initialData?.requestDefinition || JSON.stringify({
      "logout": false,
      "success": true,
      "status_code": 100,
      "message": "Success",
      "data": [
        {
          "account_no": "9301234567",
          "currency_id": "1",
          "bank_account_type": "WALLET",
          "first_name": "John",
          "last_name": "Doe",
          "bank_account_status": "Active",
          "id": "12345"
        }
      ]
    }, null, 2)
  );
  const [responseDefinition, setResponseDefinition] = useState(
    initialData?.responseDefinition || "{}"
  );
  const [extractedKeys, setExtractedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(initialData?.selectedKeys || []);
  const [protectedFields, setProtectedFields] = useState(initialData?.protectedFields || []);
  const [showKeyExtractor, setShowKeyExtractor] = useState(false);
  const [showProtectionPanel, setShowProtectionPanel] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Extract keys whenever request definition changes
  useEffect(() => {
    const keys = extractKeysFromJSON(requestDefinition);
    setExtractedKeys(keys);
  }, [requestDefinition]);

  function toggleKeySelection(key) {
    setSelectedKeys(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  }

  function toggleFieldProtection(key) {
    setProtectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  }

  function validateJSON(jsonStr) {
    try {
      JSON.parse(jsonStr);
      return true;
    } catch {
      return false;
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setValidationError("");

    // Validation
    if (!requestName.trim()) {
      setValidationError("Request name is required");
      return;
    }

    if (!validateJSON(requestDefinition)) {
      setValidationError("Request definition must be valid JSON");
      return;
    }

    if (responseDefinition && !validateJSON(responseDefinition)) {
      setValidationError("Response definition must be valid JSON");
      return;
    }

    const formData = {
      requestName: requestName.trim(),
      requestDefinition,
      responseDefinition,
      selectedKeys,
      protectedFields,
      requestType
    };

    onSubmit?.(formData);
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: 20,
      padding: "24px",
      maxWidth: 1200,
      margin: "0 auto"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--heading)" }}>
            Add Request Type
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Request Type: <strong>{requestType}</strong>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Request Name */}
        <div className="ca-card">
          <div className="field">
            <label>Request Name</label>
            <input 
              type="text" 
              value={requestName}
              onChange={e => setRequestName(e.target.value)}
              placeholder="e.g. BALANCE_ENQUIRY"
              style={{ fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
              Unique identifier for this request type
            </span>
          </div>
        </div>

        {/* Request Definition */}
        <div className="ca-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Request Type Definition</label>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setShowKeyExtractor(!showKeyExtractor)}
            >
              <i className="ti ti-key" /> {showKeyExtractor ? "Hide" : "Extract Keys"}
            </button>
          </div>
          
          <textarea
            value={requestDefinition}
            onChange={e => setRequestDefinition(e.target.value)}
            placeholder="Paste valid JSON to see the schema tree"
            style={{
              width: "100%",
              minHeight: 300,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              color: "var(--heading)",
              resize: "vertical"
            }}
          />
          
          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, display: "block" }}>
            Paste valid JSON to see the schema tree
          </span>

          {/* Key Extractor Panel */}
          {showKeyExtractor && extractedKeys.length > 0 && (
            <div style={{
              marginTop: 16,
              padding: 16,
              border: "2px solid #6366f1",
              borderRadius: 10,
              background: "rgba(99, 102, 241, 0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ti ti-key" style={{ fontSize: 18, color: "#6366f1" }} />
                <strong style={{ fontSize: 14, color: "var(--heading)" }}>
                  Extracted Keys ({selectedKeys.length} selected)
                </strong>
              </div>
              
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  onClick={() => setSelectedKeys(extractedKeys)}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                  onClick={() => setSelectedKeys([])}
                >
                  Clear All
                </button>
              </div>

              <div style={{
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--panel)"
              }}>
                {extractedKeys.map((key, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom: idx < extractedKeys.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer",
                      fontSize: 12
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(key)}
                      onChange={() => toggleKeySelection(key)}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ 
                      fontFamily: "monospace", 
                      color: selectedKeys.includes(key) ? "var(--primary)" : "var(--heading)",
                      fontWeight: selectedKeys.includes(key) ? 700 : 400
                    }}>
                      {key}
                    </span>
                    {protectedFields.includes(key) && (
                      <span style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(220, 38, 38, 0.1)",
                        color: "#dc2626",
                        fontWeight: 700
                      }}>
                        <i className="ti ti-shield-lock" /> Protected
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Field Protection Panel */}
        {selectedKeys.length > 0 && (
          <div className="ca-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Field Protection</label>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setShowProtectionPanel(!showProtectionPanel)}
              >
                <i className="ti ti-shield-lock" /> {showProtectionPanel ? "Hide" : "Manage Protection"}
              </button>
            </div>

            {showProtectionPanel && (
              <div style={{
                padding: 16,
                border: "2px solid #dc2626",
                borderRadius: 10,
                background: "rgba(220, 38, 38, 0.05)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <i className="ti ti-shield-lock" style={{ fontSize: 18, color: "#dc2626" }} />
                  <strong style={{ fontSize: 14, color: "var(--heading)" }}>
                    Mark Sensitive Fields ({protectedFields.length} protected)
                  </strong>
                </div>
                
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Protected fields will be masked in logs and audit trails for security compliance.
                </p>

                <div style={{
                  maxHeight: 240,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--panel)"
                }}>
                  {selectedKeys.map((key, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: idx < selectedKeys.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={protectedFields.includes(key)}
                        onChange={() => toggleFieldProtection(key)}
                        style={{ cursor: "pointer" }}
                      />
                      <i 
                        className={protectedFields.includes(key) ? "ti ti-shield-lock" : "ti ti-shield"} 
                        style={{ 
                          fontSize: 16, 
                          color: protectedFields.includes(key) ? "#dc2626" : "var(--muted)" 
                        }} 
                      />
                      <span style={{ 
                        fontFamily: "monospace", 
                        color: protectedFields.includes(key) ? "#dc2626" : "var(--heading)",
                        fontWeight: protectedFields.includes(key) ? 700 : 400
                      }}>
                        {key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Response Definition */}
        <div className="ca-card">
          <label style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "block" }}>
            Response Payload Definition
          </label>
          
          <textarea
            value={responseDefinition}
            onChange={e => setResponseDefinition(e.target.value)}
            placeholder="Paste valid JSON to see the schema tree"
            style={{
              width: "100%",
              minHeight: 200,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              padding: 12,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              color: "var(--heading)",
              resize: "vertical"
            }}
          />
          
          <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, display: "block" }}>
            Paste valid JSON to see the schema tree
          </span>
        </div>

        {/* API Payload Preview Summary */}
        {(requestName || selectedKeys.length > 0 || protectedFields.length > 0) && (
          <div className="ca-card" style={{
            border: "2px solid #10b981",
            background: "rgba(16, 185, 129, 0.02)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <i className="ti ti-file-code" style={{ fontSize: 20, color: "#10b981" }} />
              <div>
                <strong style={{ fontSize: 16, color: "var(--heading)", display: "block" }}>
                  API Payload Preview
                </strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  Review what will be sent to the server
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 16
            }}>
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <i className="ti ti-key" style={{ color: "#6366f1", fontSize: 16 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Extracted Keys</span>
                </div>
                <strong style={{ fontSize: 24, color: "var(--heading)" }}>{selectedKeys.length}</strong>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(220, 38, 38, 0.08)",
                border: "1px solid rgba(220, 38, 38, 0.2)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <i className="ti ti-shield-lock" style={{ color: "#dc2626", fontSize: 16 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Protected Fields</span>
                </div>
                <strong style={{ fontSize: 24, color: "var(--heading)" }}>{protectedFields.length}</strong>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <i className="ti ti-check-circle" style={{ color: "#10b981", fontSize: 16 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>Status</span>
                </div>
                <strong style={{ fontSize: 14, color: "#10b981" }}>
                  {requestName ? "Ready" : "Incomplete"}
                </strong>
              </div>
            </div>

            {/* Detailed Mapping Preview */}
            {selectedKeys.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid var(--border)"
                }}>
                  <i className="ti ti-list-details" style={{ color: "#6366f1" }} />
                  <strong style={{ fontSize: 13, color: "var(--heading)" }}>Mapped Fields</strong>
                </div>
                <div style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: "var(--panel)"
                }}>
                  {selectedKeys.map((key, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderBottom: idx < selectedKeys.length - 1 ? "1px solid var(--border)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: protectedFields.includes(key) ? "#dc2626" : "#6366f1",
                          flexShrink: 0
                        }} />
                        <code style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--heading)",
                          fontWeight: 600
                        }}>
                          {key}
                        </code>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {protectedFields.includes(key) && (
                          <span style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(220, 38, 38, 0.1)",
                            color: "#dc2626",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 4
                          }}>
                            <i className="ti ti-shield-lock" style={{ fontSize: 10 }} />
                            PROTECTED
                          </span>
                        )}
                        <span style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(99, 102, 241, 0.1)",
                          color: "#6366f1",
                          fontWeight: 700
                        }}>
                          MAPPED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON Payload Preview */}
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border)"
              }}>
                <i className="ti ti-code" style={{ color: "#10b981" }} />
                <strong style={{ fontSize: 13, color: "var(--heading)" }}>Complete API Payload</strong>
              </div>
              <pre style={{
                background: "#1e1e2e",
                color: "#cdd6f4",
                padding: 16,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "monospace",
                maxHeight: 300,
                overflowY: "auto",
                margin: 0,
                border: "1px solid var(--border)"
              }}>
                <code>{(() => {
                  try {
                    const parsedRequest = requestDefinition && validateJSON(requestDefinition) ? JSON.parse(requestDefinition) : "<not provided>";
                    const parsedResponse = responseDefinition && responseDefinition !== "{}" && validateJSON(responseDefinition) ? JSON.parse(responseDefinition) : null;
                    
                    return JSON.stringify({
                      requestType: requestType,
                      requestName: requestName || "<not provided>",
                      requestDefinition: parsedRequest,
                      responseDefinition: parsedResponse,
                      mappedFields: selectedKeys.length > 0 ? selectedKeys : [],
                      protectedFields: protectedFields.length > 0 ? protectedFields : [],
                      metadata: {
                        totalMappedFields: selectedKeys.length,
                        totalProtectedFields: protectedFields.length,
                        hasResponseDefinition: responseDefinition && responseDefinition !== "{}",
                        timestamp: new Date().toISOString()
                      }
                    }, null, 2);
                  } catch (error) {
                    return JSON.stringify({
                      error: "Invalid JSON in request/response definition",
                      message: error.message
                    }, null, 2);
                  }
                })()}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div style={{
            padding: 12,
            border: "1px solid #dc2626",
            borderRadius: 8,
            background: "rgba(220, 38, 38, 0.05)",
            color: "#dc2626",
            fontSize: 13
          }}>
            <i className="ti ti-alert-circle" /> {validationError}
          </div>
        )}

        {/* Actions */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "flex-end",
          paddingTop: 8 
        }}>
          {onCancel && (
            <button
              type="button"
              className="btn-ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn-primary"
          >
            <i className="ti ti-plus" /> Add Request Type
          </button>
        </div>
      </form>
    </div>
  );
}
