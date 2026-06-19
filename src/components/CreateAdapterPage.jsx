import { useState, useEffect } from "react";
import { createInboundAdapter, createOutboundAdapter, getApiErrorMessage, getFormats, getIso8583Mtis, getIso8583Fields, getIso20022Families, getIso20022Messages, getIso20022Fields } from "../services/esbApi";
import { invalidateCachePrefix } from "../utils/apiCache";
import { useAPI } from "../contexts/APIContext";

const PROTOCOLS = ["HTTP", "HTTPS", "TCP", "MQ", "KAFKA"];

export default function CreateAdapterPage({ selectedUsername, onCreated }) {
  const { clearAdapterCacheForUser } = useAPI();
  const [direction, setDirection] = useState("inbound");
  const [form, setForm] = useState({ adapterName: "", type: "", transportProtocol: "HTTP", name: "", protocol: "HTTP", endpointUrl: "", host: "", port: "", path: "", method: "POST", format: "", timeout: "30", connectionTimeout: "10", readTimeout: "30", isHeartbeat: false });
  const [auth, setAuth] = useState({ type: "NONE", username: "", password: "", bearerToken: "", jwtToken: "", apiKeyHeader: "", apiKeyValue: "", customHeaders: [] });
  const [transportHeaders, setTransportHeaders] = useState([]);
  const [status, setStatus] = useState({ type: "idle", msg: "" });
  const [formats, setFormats] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [protocolMeta, setProtocolMeta] = useState({ 
    mti: "", 
    responseMti: "",
    family: "", 
    messageId: "", 
    mtis: [], 
    families: [], 
    messages: [], 
    fields: [],
    loading: false, 
    loadingFields: false,
    error: "" 
  });

  useEffect(() => {
    getFormats()
      .then(data => { if (Array.isArray(data) && data.length > 0) setFormats(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fmt = String(form.type || "").toUpperCase();
    setProtocolMeta({ 
      mti: "", 
      responseMti: "",
      family: "", 
      messageId: "", 
      mtis: [], 
      families: [], 
      messages: [], 
      fields: [],
      loading: false, 
      loadingFields: false,
      error: "" 
    });

    if (fmt === "ISO8583" && direction === "inbound") {
      setProtocolMeta(current => ({ ...current, loading: true }));
      getIso8583Mtis()
        .then(list => setProtocolMeta(current => ({ ...current, loading: false, mtis: Array.isArray(list) ? list : [] })))
        .catch(() => setProtocolMeta(current => ({ ...current, loading: false, error: "Failed to load ISO8583 MTIs" })));
    }

    if (fmt === "ISO20022" && direction === "inbound") {
      setProtocolMeta(current => ({ ...current, loading: true }));
      getIso20022Families()
        .then(list => setProtocolMeta(current => ({ ...current, loading: false, families: Array.isArray(list) ? list : [] })))
        .catch(() => setProtocolMeta(current => ({ ...current, loading: false, error: "Failed to load ISO20022 families" })));
    }
  }, [form.type, direction]);

  async function handleMtiChange(mti) {
    setProtocolMeta(current => ({ ...current, mti, responseMti: "", fields: [], loadingFields: true, error: "" }));
    if (!mti) {
      setProtocolMeta(current => ({ ...current, loadingFields: false, fields: [] }));
      return;
    }
    try {
      const fields = await getIso8583Fields(mti);
      const fieldList = Array.isArray(fields) ? fields : [];
      
      // Auto-detect response MTI from MTI pattern
      let autoResponseMti = "";
      if (mti && mti.length === 4) {
        const firstDigit = mti.charAt(0);
        if (firstDigit === "0" || firstDigit === "1" || firstDigit === "2") {
          const responseFirst = String(parseInt(firstDigit) + 1);
          autoResponseMti = responseFirst + mti.substring(1);
        }
      }
      
      setProtocolMeta(current => ({ 
        ...current, 
        loadingFields: false, 
        fields: fieldList,
        responseMti: autoResponseMti
      }));
    } catch {
      setProtocolMeta(current => ({ ...current, loadingFields: false, error: "Failed to load ISO8583 fields for this MTI", fields: [] }));
    }
  }

  async function handleProtocolFamilyChange(family) {
    setProtocolMeta(current => ({ ...current, family, messageId: "", messages: [], fields: [], loading: true, error: "" }));
    if (!family) {
      setProtocolMeta(current => ({ ...current, loading: false, messages: [], fields: [] }));
      return;
    }
    try {
      const messages = await getIso20022Messages(family);
      setProtocolMeta(current => ({ ...current, loading: false, messages: Array.isArray(messages) ? messages : [] }));
    } catch {
      setProtocolMeta(current => ({ ...current, loading: false, error: "Failed to load messages for family" }));
    }
  }

  async function handleMessageIdChange(messageId) {
    setProtocolMeta(current => ({ ...current, messageId, fields: [], loadingFields: true, error: "" }));
    if (!messageId) {
      setProtocolMeta(current => ({ ...current, loadingFields: false, fields: [] }));
      return;
    }
    try {
      const fields = await getIso20022Fields(messageId);
      const fieldList = Array.isArray(fields) ? fields : [];
      setProtocolMeta(current => ({ ...current, loadingFields: false, fields: fieldList }));
    } catch {
      setProtocolMeta(current => ({ ...current, loadingFields: false, error: "Failed to load ISO20022 fields for this message", fields: [] }));
    }
  }

  function validateHostname(value) {
    if (!value || !value.trim()) return false;
    // Valid IP address pattern
    const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    // Valid hostname pattern
    const hostnamePattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
    return ipPattern.test(value.trim()) || hostnamePattern.test(value.trim());
  }

  function validatePort(value) {
    const num = Number(value);
    return Number.isInteger(num) && num >= 1 && num <= 65535;
  }

  function validateTimeout(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
  }

  function validateUrl(url) {
    if (!url || !url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function validateForm() {
    const errors = {};

    if (direction === "inbound") {
      // Adapter Name
      if (!form.adapterName || !form.adapterName.trim()) {
        errors.adapterName = "Adapter name is required";
      }

      // Type/Format
      if (!form.type) {
        errors.type = "Base format is required";
      }

      // ISO8583 specific
      if (String(form.type).toUpperCase() === "ISO8583" && !protocolMeta.mti) {
        errors.mti = "MTI is required for ISO8583 adapters";
      }

      // ISO20022 specific
      if (String(form.type).toUpperCase() === "ISO20022") {
        if (!protocolMeta.family) {
          errors.family = "Message family is required for ISO20022";
        }
        if (!protocolMeta.messageId) {
          errors.messageId = "Message type is required for ISO20022";
        }
      }

      // Timeout
      if (!validateTimeout(form.timeout)) {
        errors.timeout = "Timeout must be greater than 0";
      }
    } else {
      // Outbound validation
      // Name
      if (!form.name || !form.name.trim()) {
        errors.name = "Destination name is required";
      }

      // Protocol-specific validation
      if (form.transportProtocol === "HTTP" || form.transportProtocol === "HTTPS") {
        // HTTP/HTTPS: Validate endpointUrl
        if (!form.endpointUrl || !form.endpointUrl.trim()) {
          errors.endpointUrl = "Endpoint URL is required";
        } else if (!validateUrl(form.endpointUrl)) {
          errors.endpointUrl = "Invalid URL format (e.g. https://api.bank.com/heartbeat)";
        }
      } else if (form.transportProtocol === "TCP") {
        // TCP: Validate host and port
        if (!form.host || !form.host.trim()) {
          errors.host = "Host is required for TCP";
        } else if (!validateHostname(form.host)) {
          errors.host = "Invalid host address or hostname";
        }

        if (!form.port) {
          errors.port = "Port is required for TCP";
        } else if (!validatePort(form.port)) {
          errors.port = "Port must be between 1 and 65535";
        }
      }

      // Format
      if (!form.format) {
        errors.format = "Output format is required";
      }

      // Timeout validation based on protocol
      if (form.transportProtocol === "TCP") {
        if (!validateTimeout(form.connectionTimeout)) {
          errors.connectionTimeout = "Connection timeout must be greater than 0";
        }
        if (!validateTimeout(form.readTimeout)) {
          errors.readTimeout = "Read timeout must be greater than 0";
        }
      } else {
        if (!validateTimeout(form.timeout)) {
          errors.timeout = "Timeout must be greater than 0";
        }
      }

      // Authentication validation
      if (auth.type === "BASIC") {
        if (!auth.username || !auth.username.trim()) {
          errors.authUsername = "Username is required for BASIC authentication";
        }
        if (!auth.password || !auth.password.trim()) {
          errors.authPassword = "Password is required for BASIC authentication";
        }
      } else if (auth.type === "BEARER") {
        if (!auth.bearerToken || !auth.bearerToken.trim()) {
          errors.authBearerToken = "Bearer token is required";
        }
      } else if (auth.type === "JWT") {
        if (!auth.jwtToken || !auth.jwtToken.trim()) {
          errors.authJwtToken = "JWT token is required";
        }
      } else if (auth.type === "API_KEY") {
        if (!auth.apiKeyHeader || !auth.apiKeyHeader.trim()) {
          errors.authApiKeyHeader = "Header name is required for API Key authentication";
        }
        if (!auth.apiKeyValue || !auth.apiKeyValue.trim()) {
          errors.authApiKeyValue = "Header value is required for API Key authentication";
        }
      }
    }

    return errors;
  }

  function scrollToFirstError(errors) {
    const firstErrorKey = Object.keys(errors)[0];
    if (!firstErrorKey) return;

    // Map error keys to field names/IDs
    const fieldMap = {
      adapterName: "adapterName",
      type: "type",
      mti: "mti",
      family: "family",
      messageId: "messageId",
      timeout: "timeout",
      name: "name",
      endpointUrl: "endpointUrl",
      host: "host",
      port: "port",
      format: "format",
      connectionTimeout: "connectionTimeout",
      readTimeout: "readTimeout",
      authUsername: "authUsername",
      authPassword: "authPassword",
      authBearerToken: "authBearerToken",
      authJwtToken: "authJwtToken",
      authApiKeyHeader: "authApiKeyHeader",
      authApiKeyValue: "authApiKeyValue",
    };

    const fieldId = fieldMap[firstErrorKey];
    if (fieldId) {
      const element = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => element.focus(), 300);
      }
    }
  }

  function clearFieldError(fieldName) {
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }

  function set(k, v) { 
    setForm(f => ({ ...f, [k]: v })); 
    clearFieldError(k);
  }

  function getSuggestedHeaders() {
    const headers = [];
    const protocol = form.transportProtocol;
    const format = form.format?.toUpperCase();

    // Skip headers for TCP
    if (protocol === "TCP") return [];

    // Content-Type and Accept based on format
    if (format === "JSON") {
      headers.push({ key: "Content-Type", value: "application/json" });
      headers.push({ key: "Accept", value: "application/json" });
    } else if (format === "XML" || format === "ISO20022") {
      headers.push({ key: "Content-Type", value: "application/xml" });
      headers.push({ key: "Accept", value: "application/xml" });
    } else if (format === "CSV") {
      headers.push({ key: "Content-Type", value: "text/csv" });
      headers.push({ key: "Accept", value: "text/csv" });
    } else if (format === "ISO8583") {
      headers.push({ key: "Content-Type", value: "application/octet-stream" });
      headers.push({ key: "Accept", value: "application/octet-stream" });
    }

    // Authentication headers
    if (auth.type === "BASIC" && auth.username && auth.password) {
      const encoded = btoa(`${auth.username}:${auth.password}`);
      headers.push({ key: "Authorization", value: `Basic ${encoded}` });
    } else if (auth.type === "BEARER" && auth.bearerToken) {
      headers.push({ key: "Authorization", value: `Bearer ${auth.bearerToken}` });
    } else if (auth.type === "JWT" && auth.jwtToken) {
      headers.push({ key: "Authorization", value: `Bearer ${auth.jwtToken}` });
    } else if (auth.type === "API_KEY" && auth.apiKeyHeader && auth.apiKeyValue) {
      headers.push({ key: auth.apiKeyHeader, value: auth.apiKeyValue });
    } else if (auth.type === "CUSTOM" && auth.customHeaders.length > 0) {
      auth.customHeaders.forEach(h => {
        if (h.key?.trim() && h.value?.trim()) {
          headers.push({ key: h.key.trim(), value: h.value.trim() });
        }
      });
    }

    return headers;
  }

  const suggestedHeaders = direction === "outbound" ? getSuggestedHeaders() : [];

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    
    // Validate form
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const errorCount = Object.keys(errors).length;
      setStatus({ 
        type: "error", 
        msg: `Please correct ${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}.` 
      });
      scrollToFirstError(errors);
      return;
    }

    setStatus({ type: "loading", msg: "" });
    try {
      if (direction === "inbound") {
        const fmt = String(form.type).toUpperCase();

        const payload = {
          adapterName: form.adapterName.trim(),
          type: form.type,
          timeout_seconds: parseInt(form.timeout, 10) || 30,
          requestName: "BASE_ROUTER",
          username: selectedUsername,
          metadata: { username: selectedUsername },
        };

        if (fmt === "ISO8583") {
          payload.protocolMetadata = {
            protocol: "ISO8583",
            mti: protocolMeta.mti,
            responseMti: protocolMeta.responseMti || ""
          };
        }

        if (fmt === "ISO20022") {
          payload.protocolMetadata = {
            protocol: "ISO20022",
            family: protocolMeta.family,
            messageId: protocolMeta.messageId,
          };
        }

        await createInboundAdapter(payload);
      } else {
        const outboundPayload = {
          name: form.name.trim(),
          protocol: form.transportProtocol,
          transport_protocol: form.transportProtocol,
          format: form.format,
          is_heartbeat: form.isHeartbeat,
          username: selectedUsername,
          metadata: { 
            username: selectedUsername,
            authentication: auth.type !== "NONE" ? {
              type: auth.type,
              ...(auth.type === "BASIC" && { username: auth.username, password: auth.password }),
              ...(auth.type === "BEARER" && { bearerToken: auth.bearerToken }),
              ...(auth.type === "JWT" && { jwtToken: auth.jwtToken }),
              ...(auth.type === "API_KEY" && { apiKeyHeader: auth.apiKeyHeader, apiKeyValue: auth.apiKeyValue }),
              ...(auth.type === "CUSTOM" && { customHeaders: auth.customHeaders.filter(h => h.key?.trim() && h.value?.trim()) })
            } : undefined,
            transportHeaders: suggestedHeaders.length > 0 ? suggestedHeaders : undefined
          },
        };

        // Protocol-specific fields
        if (form.transportProtocol === "HTTP" || form.transportProtocol === "HTTPS") {
          // HTTP/HTTPS: Use endpointUrl
          outboundPayload.endpointUrl = form.endpointUrl.trim();
          outboundPayload.method = form.method || "POST";
          outboundPayload.timeout_seconds = parseInt(form.timeout, 10) || 30;
        } else if (form.transportProtocol === "TCP") {
          // TCP: Use host and port
          outboundPayload.host = form.host.trim();
          outboundPayload.port = Number(form.port);
          outboundPayload.connection_timeout = parseInt(form.connectionTimeout, 10) || 10;
          outboundPayload.read_timeout = parseInt(form.readTimeout, 10) || 30;
        } else {
          // Other protocols: Use host and port (legacy)
          outboundPayload.host = form.host.trim();
          outboundPayload.port = Number(form.port);
          outboundPayload.timeout_seconds = parseInt(form.timeout, 10) || 30;
        }

        await createOutboundAdapter(outboundPayload);
      }
      
      // Invalidate all adapter-related caches
      invalidateCachePrefix("adapters");
      invalidateCachePrefix("inbound");
      invalidateCachePrefix("outbound");
      invalidateCachePrefix("metrics");
      clearAdapterCacheForUser(selectedUsername);
      onCreated?.();
      
      setStatus({ type: "success", msg: `${direction === "inbound" ? "Inbound" : "Outbound"} adapter created successfully.` });
      setForm({ adapterName: "", type: "", transportProtocol: "HTTP", name: "", protocol: "HTTP", endpointUrl: "", host: "", port: "", path: "", method: "POST", format: "", timeout: "30", connectionTimeout: "10", readTimeout: "30", isHeartbeat: false });
      setAuth({ type: "NONE", username: "", password: "", bearerToken: "", jwtToken: "", apiKeyHeader: "", apiKeyValue: "", customHeaders: [] });
      setTransportHeaders([]);
      setValidationErrors({});
      setProtocolMeta({ 
        mti: "", 
        responseMti: "",
        family: "", 
        messageId: "", 
        mtis: [], 
        families: [], 
        messages: [], 
        fields: [],
        loading: false, 
        loadingFields: false,
        error: "" 
      });
    } catch (e) {
      const errorMsg = getApiErrorMessage(e);
      
      // Try to map backend errors to fields
      try {
        const errorData = e?.response?.data;
        if (errorData?.field) {
          const fieldName = errorData.field;
          setValidationErrors({ [fieldName]: errorData.message || "Invalid value" });
          scrollToFirstError({ [fieldName]: errorData.message });
        }
      } catch {}
      
      setStatus({ type: "error", msg: errorMsg });
    }
  }

  return (
    <div style={{ 
      height: "100%", 
      overflowY: "auto", 
      padding: "0 4px 8px",
      width: "100%"
    }}>
      <div style={{ 
        width: "100%",
        maxWidth: 1100, 
        margin: "0 auto", 
        display: "flex", 
        flexDirection: "column", 
        gap: 24, 
        paddingBottom: 40 
      }}>

      {/* Direction toggle */}
      <div className="ca-card">
        <p className="ca-eyebrow">Step 1</p>
        <h2 className="ca-title">Adapter Direction</h2>
        <p className="ca-sub">Is this adapter receiving data or sending it?</p>
        <div className="ca-toggle-row">
          {[
            { val: "inbound",  icon: "ti-arrow-bar-to-down", label: "Inbound",  desc: "Receives & transforms incoming payloads" },
            { val: "outbound", icon: "ti-arrow-bar-up",      label: "Outbound", desc: "Forwards processed data to a destination" },
          ].map(opt => (
            <button
              key={opt.val}
              type="button"
              className={`ca-dir-btn${direction === opt.val ? " ca-dir-btn--active" : ""}`}
              onClick={() => { setDirection(opt.val); setStatus({ type: "idle", msg: "" }); }}
            >
              <i className={`ti ${opt.icon} ca-dir-icon`} />
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <form className="ca-card" onSubmit={handleSubmit}>
        <p className="ca-eyebrow">Step 2</p>
        <h2 className="ca-title">{direction === "inbound" ? "Inbound" : "Outbound"} Details</h2>

        {direction === "inbound" ? (
          <>
            <div className="field">
              <label>Adapter Name</label>
              <input type="text" value={form.adapterName} placeholder="e.g. BANK_A_INBOUND"
                onChange={e => set("adapterName", e.target.value)} />
            </div>
            <div className="field">
              <label>Base Format</label>
              <select value={form.type} onChange={e => set("type", e.target.value)}>
                <option value="">Select format</option>
                {formats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {String(form.type).toUpperCase() === "ISO8583" && (
              <>
                <div style={{ 
                  marginTop: 16, 
                  padding: 16, 
                  border: "2px solid #6366f1", 
                  borderRadius: 10, 
                  background: "rgba(99, 102, 241, 0.05)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <i className="ti ti-shield-lock" style={{ fontSize: 18, color: "#6366f1" }} />
                    <strong style={{ fontSize: 14, color: "var(--heading)" }}>ISO8583 Protocol Configuration</strong>
                  </div>
                  
                  <div className="field">
                    <label>Message Type Indicator (MTI)</label>
                    <select 
                      value={protocolMeta.mti} 
                      onChange={e => handleMtiChange(e.target.value)} 
                      disabled={protocolMeta.loading}
                    >
                      <option value="">{protocolMeta.loading ? "Loading MTIs..." : "Select MTI"}</option>
                      {protocolMeta.mtis.map(item => (
                        <option key={item.mti} value={item.mti}>
                          {item.mti}{item.name ? ` - ${item.name}` : ""}
                        </option>
                      ))}
                    </select>
                    {protocolMeta.error && <span className="field-error-msg">{protocolMeta.error}</span>}
                  </div>

                  {protocolMeta.mti && (
                    <>
                      <div className="field">
                        <label>Response MTI</label>
                        <input
                          type="text"
                          value={protocolMeta.responseMti}
                          placeholder="e.g. 0210"
                          onChange={e => setProtocolMeta(current => ({ ...current, responseMti: e.target.value }))}
                        />
                        <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                          Response MTI auto-detected. Modify if needed.
                        </span>
                      </div>

                      {protocolMeta.loadingFields && (
                        <div style={{ padding: 12, textAlign: "center", color: "var(--muted)" }}>
                          <i className="ti ti-loader-2 spin" /> Loading field definitions...
                        </div>
                      )}

                      {!protocolMeta.loadingFields && protocolMeta.fields.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)", marginBottom: 8, display: "block" }}>
                            Available Data Elements ({protocolMeta.fields.length} fields)
                          </label>
                          <div style={{ 
                            maxHeight: 240, 
                            overflowY: "auto",
                            overflowX: "auto",
                            border: "1px solid var(--border)", 
                            borderRadius: 8,
                            background: "var(--panel)"
                          }}>
                            <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", fontSize: 11 }}>
                              <thead style={{ position: "sticky", top: 0, background: "var(--panel-soft)", zIndex: 1 }}>
                                <tr>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>DE</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Field Name</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Type</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Required</th>
                                </tr>
                              </thead>
                              <tbody>
                                {protocolMeta.fields.map((field, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 600, color: "var(--primary)" }}>
                                      DE{field.number}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "var(--heading)" }}>
                                      {field.name || "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "var(--muted)", fontFamily: "monospace", fontSize: 10 }}>
                                      {field.type || "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      {field.required ? (
                                        <span style={{ color: "#dc2626", fontSize: 10, fontWeight: 700 }}>✓ Required</span>
                                      ) : (
                                        <span style={{ color: "var(--muted)", fontSize: 10 }}>Optional</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {String(form.type).toUpperCase() === "ISO20022" && (
              <>
                <div style={{ 
                  marginTop: 16, 
                  padding: 16, 
                  border: "2px solid #10b981", 
                  borderRadius: 10, 
                  background: "rgba(16, 185, 129, 0.05)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <i className="ti ti-file-code" style={{ fontSize: 18, color: "#10b981" }} />
                    <strong style={{ fontSize: 14, color: "var(--heading)" }}>ISO20022 Protocol Configuration</strong>
                  </div>
                  
                  <div className="field">
                    <label>Message Family</label>
                    <select 
                      value={protocolMeta.family} 
                      onChange={e => handleProtocolFamilyChange(e.target.value)} 
                      disabled={protocolMeta.loading}
                    >
                      <option value="">{protocolMeta.loading ? "Loading families..." : "Select family"}</option>
                      {protocolMeta.families.map(item => (
                        <option key={item.family || item} value={item.family || item}>
                          {item.family || item}{item.description ? ` - ${item.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="field">
                    <label>Message Type</label>
                    <select 
                      value={protocolMeta.messageId} 
                      onChange={e => handleMessageIdChange(e.target.value)} 
                      disabled={!protocolMeta.family || protocolMeta.loading}
                    >
                      <option value="">{!protocolMeta.family ? "Select family first" : protocolMeta.loading ? "Loading messages..." : "Select message"}</option>
                      {protocolMeta.messages.map(item => (
                        <option key={item.messageId || item} value={item.messageId || item}>
                          {item.messageId || item}{item.name ? ` - ${item.name}` : ""}
                        </option>
                      ))}
                    </select>
                    {protocolMeta.error && <span className="field-error-msg">{protocolMeta.error}</span>}
                  </div>

                  {protocolMeta.messageId && (
                    <>
                      {protocolMeta.loadingFields && (
                        <div style={{ padding: 12, textAlign: "center", color: "var(--muted)" }}>
                          <i className="ti ti-loader-2 spin" /> Loading field definitions...
                        </div>
                      )}

                      {!protocolMeta.loadingFields && protocolMeta.fields.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)", marginBottom: 8, display: "block" }}>
                            Available Message Elements ({protocolMeta.fields.length} fields)
                          </label>
                          <div style={{ 
                            maxHeight: 240, 
                            overflowY: "auto",
                            overflowX: "auto",
                            border: "1px solid var(--border)", 
                            borderRadius: 8,
                            background: "var(--panel)"
                          }}>
                            <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", fontSize: 11 }}>
                              <thead style={{ position: "sticky", top: 0, background: "var(--panel-soft)", zIndex: 1 }}>
                                <tr>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Path</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Element Name</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Type</th>
                                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--border)", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", fontSize: 10 }}>Required</th>
                                </tr>
                              </thead>
                              <tbody>
                                {protocolMeta.fields.map((field, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 600, color: "var(--primary)", fontSize: 10 }}>
                                      {field.path || "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "var(--heading)" }}>
                                      {field.name || "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "var(--muted)", fontFamily: "monospace", fontSize: 10 }}>
                                      {field.type || "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      {field.required ? (
                                        <span style={{ color: "#dc2626", fontSize: 10, fontWeight: 700 }}>✓ Required</span>
                                      ) : (
                                        <span style={{ color: "var(--muted)", fontSize: 10 }}>Optional</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <div className="field">
              <label>Call Timeout (Seconds)</label>
              <input type="number" value={form.timeout} min="1" max="300" placeholder="30"
                onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                onChange={e => set("timeout", e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Destination Name</label>
              <input type="text" value={form.name} placeholder="e.g. CORE_BANKING_HTTP"
                onChange={e => set("name", e.target.value)} />
            </div>
            
            {/* Heartbeat Adapter Checkbox */}
            <div style={{ 
              padding: "12px 16px", 
              border: "1px solid var(--border)", 
              borderRadius: 8, 
              background: "var(--panel-soft)",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 10, 
                cursor: "pointer",
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                flex: 1
              }}>
                <input
                  type="checkbox"
                  checked={form.isHeartbeat}
                  onChange={e => set("isHeartbeat", e.target.checked)}
                  style={{ cursor: "pointer", width: 18, height: 18 }}
                />
                <i className="ti ti-heartbeat" style={{ fontSize: 18, color: form.isHeartbeat ? "var(--primary)" : "var(--muted)" }} />
                <span style={{ color: "var(--heading)" }}>Heartbeat Adapter</span>
              </label>
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
                Enable periodic health checks for this destination
              </span>
            </div>
            
            <div className="row-2">
              <div className="field">
                <label>Transport Protocol</label>
                <select value={form.transportProtocol} onChange={e => set("transportProtocol", e.target.value)}>
                  {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Message Format</label>
                <select value={form.format} onChange={e => set("format", e.target.value)}>
                  <option value="">Select format</option>
                  {formats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            {/* HTTP/HTTPS specific fields */}
            {(form.transportProtocol === "HTTP" || form.transportProtocol === "HTTPS") && (
              <>
                <div className="field">
                  <label>Endpoint URL *</label>
                  <input 
                    type="text" 
                    id="endpointUrl"
                    value={form.endpointUrl} 
                    placeholder="e.g. https://api.bank.com/heartbeat"
                    className={validationErrors.endpointUrl ? "input-error" : ""}
                    onChange={e => set("endpointUrl", e.target.value)} 
                  />
                  {validationErrors.endpointUrl && (
                    <span className="field-error-msg">{validationErrors.endpointUrl}</span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    Full URL including protocol, host, port, and path
                  </span>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Method</label>
                    <select value={form.method} onChange={e => set("method", e.target.value)}>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Timeout (Seconds)</label>
                    <input type="number" value={form.timeout} min="1" max="300" placeholder="30"
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("timeout", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* TCP specific fields */}
            {form.transportProtocol === "TCP" && (
              <>
                <div className="row-2">
                  <div className="field">
                    <label>Host</label>
                    <input 
                      type="text" 
                      id="host"
                      value={form.host} 
                      placeholder="e.g. 192.168.1.10"
                      className={validationErrors.host ? "input-error" : ""}
                      onChange={e => set("host", e.target.value)} 
                    />
                    {validationErrors.host && (
                      <span className="field-error-msg">{validationErrors.host}</span>
                    )}
                  </div>
                  <div className="field">
                    <label>Port</label>
                    <input 
                      type="number" 
                      id="port"
                      value={form.port} 
                      placeholder="e.g. 9001" 
                      min="1" 
                      max="65535"
                      className={validationErrors.port ? "input-error" : ""}
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("port", e.target.value)} 
                    />
                    {validationErrors.port && (
                      <span className="field-error-msg">{validationErrors.port}</span>
                    )}
                  </div>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Connection Timeout (Seconds)</label>
                    <input type="number" value={form.connectionTimeout} min="1" max="300" placeholder="10"
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("connectionTimeout", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Read Timeout (Seconds)</label>
                    <input type="number" value={form.readTimeout} min="1" max="300" placeholder="30"
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("readTimeout", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* FILE protocol */}
            {form.transportProtocol === "FILE" && (
              <div className="field">
                <label>File Path</label>
                <input type="text" value={form.path || ""} placeholder="e.g. /data/exports/transactions.json"
                  onChange={e => set("path", e.target.value)} />
              </div>
            )}

            {/* DATABASE protocol */}
            {form.transportProtocol === "DATABASE" && (
              <>
                <div className="row-2">
                  <div className="field">
                    <label>Database Host</label>
                    <input type="text" value={form.host} placeholder="e.g. db.example.com"
                      onChange={e => set("host", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Port</label>
                    <input type="number" value={form.port} placeholder="e.g. 5432" min="1" max="65535"
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("port", e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Connection Timeout (Seconds)</label>
                  <input type="number" value={form.timeout} min="1" max="300" placeholder="30"
                    onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                    onChange={e => set("timeout", e.target.value)} />
                </div>
              </>
            )}

            {/* MQ/KAFKA - generic fields */}
            {(form.transportProtocol === "MQ" || form.transportProtocol === "KAFKA") && (
              <>
                <div className="row-2">
                  <div className="field">
                    <label>Broker Host</label>
                    <input type="text" value={form.host} placeholder="e.g. broker.example.com"
                      onChange={e => set("host", e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Port</label>
                    <input type="number" value={form.port} placeholder="e.g. 9092" min="1" max="65535"
                      onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                      onChange={e => set("port", e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Timeout (Seconds)</label>
                  <input type="number" value={form.timeout} min="1" max="300" placeholder="30"
                    onKeyDown={e => ["e","E","+","-","."].includes(e.key) && e.preventDefault()}
                    onChange={e => set("timeout", e.target.value)} />
                </div>
              </>
            )}

            {/* Authentication Configuration */}
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              border: "2px solid #10b981", 
              borderRadius: 10, 
              background: "rgba(16, 185, 129, 0.05)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ti ti-lock" style={{ fontSize: 18, color: "#10b981" }} />
                <strong style={{ fontSize: 14, color: "var(--heading)" }}>Authentication Configuration</strong>
              </div>
              
              <div className="field">
                <label>Authentication Type</label>
                <select value={auth.type} onChange={e => setAuth({ type: e.target.value, username: "", password: "", bearerToken: "", jwtToken: "", apiKeyHeader: "", apiKeyValue: "", customHeaders: [] })}>
                  <option value="NONE">NONE</option>
                  <option value="BASIC">BASIC</option>
                  <option value="BEARER">BEARER</option>
                  <option value="JWT">JWT</option>
                  <option value="API_KEY">API_KEY</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>

              {auth.type === "BASIC" && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div className="field">
                    <label>Username</label>
                    <input type="text" value={auth.username} placeholder="Enter username" onChange={e => setAuth(a => ({ ...a, username: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input type="password" value={auth.password} placeholder="Enter password" onChange={e => setAuth(a => ({ ...a, password: e.target.value }))} />
                  </div>
                </div>
              )}

              {auth.type === "BEARER" && (
                <div style={{ marginTop: 12 }} className="field">
                  <label>Bearer Token</label>
                  <input type="password" value={auth.bearerToken} placeholder="Enter bearer token" onChange={e => setAuth(a => ({ ...a, bearerToken: e.target.value }))} />
                </div>
              )}

              {auth.type === "JWT" && (
                <div style={{ marginTop: 12 }} className="field">
                  <label>JWT Token</label>
                  <input type="password" value={auth.jwtToken} placeholder="Enter JWT token" onChange={e => setAuth(a => ({ ...a, jwtToken: e.target.value }))} />
                </div>
              )}

              {auth.type === "API_KEY" && (
                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div className="field">
                    <label>Header Name</label>
                    <input type="text" value={auth.apiKeyHeader} placeholder="e.g. X-API-Key" onChange={e => setAuth(a => ({ ...a, apiKeyHeader: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Header Value</label>
                    <input type="password" value={auth.apiKeyValue} placeholder="Enter API key" onChange={e => setAuth(a => ({ ...a, apiKeyValue: e.target.value }))} />
                  </div>
                </div>
              )}

              {auth.type === "CUSTOM" && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Custom Authentication Headers</label>
                    <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }} onClick={() => setAuth(a => ({ ...a, customHeaders: [...a.customHeaders, { key: "", value: "" }] }))}>
                      <i className="ti ti-plus" /> Add Header
                    </button>
                  </div>
                  {auth.customHeaders.length > 0 && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {auth.customHeaders.map((h, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8 }}>
                          <input type="text" value={h.key} placeholder="Header name" onChange={e => setAuth(a => ({ ...a, customHeaders: a.customHeaders.map((hdr, idx) => idx === i ? { ...hdr, key: e.target.value } : hdr) }))} />
                          <input type="text" value={h.value} placeholder="Header value" onChange={e => setAuth(a => ({ ...a, customHeaders: a.customHeaders.map((hdr, idx) => idx === i ? { ...hdr, value: e.target.value } : hdr) }))} />
                          <button type="button" className="ar-icon-btn ar-icon-btn-danger" style={{ opacity: 1 }} onClick={() => setAuth(a => ({ ...a, customHeaders: a.customHeaders.filter((_, idx) => idx !== i) }))}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Suggested Headers */}
            {form.transportProtocol !== "TCP" && suggestedHeaders.length > 0 && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                border: "2px solid #6366f1", 
                borderRadius: 10, 
                background: "rgba(99, 102, 241, 0.05)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <i className="ti ti-sparkles" style={{ fontSize: 18, color: "#6366f1" }} />
                  <strong style={{ fontSize: 14, color: "var(--heading)" }}>Suggested Transport Headers</strong>
                </div>
                <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  Auto-generated based on transport protocol ({form.transportProtocol}), format ({form.format || "Not selected"}), and authentication ({auth.type})
                </p>
                <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                  {suggestedHeaders.map((h, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, padding: "6px 0", borderBottom: i < suggestedHeaders.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <strong style={{ fontSize: 12, fontFamily: "monospace", color: "var(--primary)" }}>{h.key}:</strong>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--heading)" }}>{h.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {status.msg && (
          <p className={`status ${status.type}`}>{status.msg}</p>
        )}

        <div className="form-actions" style={{ paddingTop: 4 }}>
          <button type="submit" className="btn-primary" disabled={status.type === "loading"}>
            {status.type === "loading"
              ? <><i className="ti ti-loader-2 spin" /> Creating…</>
              : <><i className="ti ti-plus" /> Create {direction === "inbound" ? "Inbound" : "Outbound"} Adapter</>
            }
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
