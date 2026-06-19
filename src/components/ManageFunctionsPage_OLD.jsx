import { useEffect, useMemo, useState } from "react";
import {
  getApiErrorMessage,
  getCanonicalFields,
  listOutboundAdapters,
  upsertInboundConfiguration,
  upsertOutboundConfiguration,
  createOutboundConfiguration,
  updateOutboundConfiguration,
  getInboundAdapter,
  getOutboundAdapter,
} from "../services/esbApi";

function fieldName(field) {
  if (field == null) return "";
  if (typeof field !== "object") return String(field);
  return String(field.displayName || field.name || field.label || field.description || field.referenceId || field.fieldId || "");
}

function fieldId(field) {
  if (field == null) return "";
  if (typeof field !== "object") return String(field);
  return String(field.referenceId || field.fieldId || field.code || field.fieldName || field.name || field.value || "");
}

function getAdapterId(adapter) {
  return adapter?.displayId || adapter?.adapterId || adapter?.id || adapter?._id || "";
}

function getAdapterFormat(adapter) {
  return adapter?.formatType || adapter?.inboundFormat || adapter?.type || "JSON";
}

export default function ManageFunctionsPage({
  adapter,
  selectedUser,
  canonicalFields: propCanonicalFields = [],
  canonicalStatus: propCanonicalStatus = "idle",
  onBack,
  isOutbound = false,
}) {
  const [canonicalFields, setCanonicalFields] = useState(propCanonicalFields);
  const [canonicalStatus, setCanonicalStatus] = useState(propCanonicalStatus);
  const [outboundAdapters, setOutboundAdapters] = useState([]);

  const [requestName, setRequestName] = useState("");
  const [samplePayload, setSamplePayload] = useState("{\n  \n}");
  const [responseSamplePayload, setResponseSamplePayload] = useState("{\n  \n}");
  const [extractError, setExtractError] = useState("");
  const [responseExtractError, setResponseExtractError] = useState("");
  const [mappings, setMappings] = useState([]);
  const [responseMappings, setResponseMappings] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [dynamicFunctions, setDynamicFunctions] = useState([]);
  const [outboundId, setOutboundId] = useState("");
  const [saveStatus, setSaveStatus] = useState({ type: "idle", msg: "" });

  useEffect(() => {
    if (propCanonicalFields.length > 0) {
      setCanonicalFields(propCanonicalFields);
      setCanonicalStatus(propCanonicalStatus);
      return;
    }

    setCanonicalStatus("loading");
    getCanonicalFields(getAdapterFormat(adapter))
      .then(data => {
        setCanonicalFields(Array.isArray(data) ? data : []);
        setCanonicalStatus("idle");
      })
      .catch(() => setCanonicalStatus("error"));
  }, [adapter, propCanonicalFields, propCanonicalStatus]);

  // Load existing configurations when opening an adapter
  useEffect(() => {
    const adapterId = getAdapterId(adapter);
    if (!adapterId) return;

    // Load existing configs for both inbound and outbound from configurations endpoint
    const fetchAdapter = isOutbound ? getOutboundAdapter(adapterId) : getInboundAdapter(adapterId);
    
    fetchAdapter
      .then(response => {
        const unwrappedAdapter = response?.adapter || response;
        const configs = unwrappedAdapter?.configurations || [];
        
        // If there are existing configs, load the first one into the form
        if (configs.length > 0) {
          const firstConfig = configs[0];
          setRequestName(firstConfig.requestName || firstConfig.request_name || "");

          // Load canonicalMapping into mappings
          if (firstConfig.canonicalMapping && typeof firstConfig.canonicalMapping === "object") {
            const canonicalMappings = Object.entries(firstConfig.canonicalMapping)
              .filter(([_, value]) => typeof value === "string" && value.startsWith("<") && value.endsWith(">"))
              .map(([sourceKey, canonicalValue]) => ({
                sourceKey,
                canonicalKey: canonicalValue.replace(/^<|>$/g, ""),
              }));
            setMappings(canonicalMappings.length > 0 ? canonicalMappings : []);
          }

          // Load customFields if present
          if (firstConfig.customFields && typeof firstConfig.customFields === "object") {
            const customFieldsArray = Object.entries(firstConfig.customFields).map(([customFieldName, value]) => ({
              customFieldName,
              canonicalKey: "", // Placeholder, update if backend provides mapping
              value,
            }));
            setCustomFields(customFieldsArray);
          }

          // Load dynamicFunctions if present
          if (firstConfig.canonicalMapping && typeof firstConfig.canonicalMapping === "object") {
            const dynFuncs = Object.entries(firstConfig.canonicalMapping)
              .filter(([_, value]) => typeof value === "string" && value.includes("CALC_FEE"))
              .map(([outputField, funcDef]) => {
                // Parse CALC_FEE placeholder
                const match = funcDef.match(/CALC_FEE\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+value=([^\s]+)(?:\s+min=([^\s]+))?(?:\s+max=([^\s]+))?/);
                if (match) {
                  return {
                    name: outputField,
                    functionName: "CALC_FEE",
                    baseField: match[1],
                    outputField,
                    outputMode: match[1] === outputField ? "overwrite" : "new",
                    amountType: match[2],
                    calcType: match[3],
                    args: match[4],
                    minCap: match[5] || "",
                    maxCap: match[6] || "",
                    slabMin: "",
                    slabMax: "",
                  };
                }
                return null;
              })
              .filter(Boolean);
            setDynamicFunctions(dynFuncs.length > 0 ? dynFuncs : []);
          }
        }
      })
      .catch(err => {
        console.error('[ManageFunctionsPage] Error loading configurations:', err);
      });
  }, [adapter, isOutbound]);

  useEffect(() => {
    listOutboundAdapters(selectedUser?.username)
      .then(list => setOutboundAdapters(Array.isArray(list) ? list : []))
      .catch(() => setOutboundAdapters([]));
  }, [selectedUser?.username]);

  const sortedCanonicalFields = useMemo(
    () => [...canonicalFields].sort((a, b) => fieldName(a).localeCompare(fieldName(b))),
    [canonicalFields],
  );

  const title = adapter?.displayName || adapter?.adapterName || adapter?.name || "Selected Adapter";
  const adapterId = getAdapterId(adapter);
  const direction = adapter?.direction || "Inbound";

  const payloadPreview = useMemo(() => {
    const canonicalPreview = {};
    const customFieldsPreview = {};
    
    // Alias mappings go to canonicalMapping
    mappings.forEach(({ sourceKey, canonicalKey }) => {
      if (sourceKey?.trim() && canonicalKey?.trim()) {
        canonicalPreview[sourceKey.trim()] = `<${canonicalKey.trim()}>`;
      }
    });
    
    // Custom fields go to separate customFields object
    customFields.forEach(({ customFieldName, value }) => {
      if (customFieldName?.trim() && value?.trim()) {
        customFieldsPreview[customFieldName.trim()] = value.trim();
      }
    });
    
    // Dynamic functions go to canonicalMapping
    dynamicFunctions.forEach(fn => {
      const outputField = fn.outputField?.trim();
      if (!outputField || !fn.functionName) return;
      if (fn.functionName === "CALC_FEE") {
        const value = fn.amountType === "SLAB" ? `${fn.slabMin || "0"}-${fn.slabMax || "0"}:${fn.args || "0"}` : fn.args || "0";
        canonicalPreview[outputField] = `<CALC_FEE ${fn.baseField || "auto"} ${fn.amountType || "FLAT"} ${fn.calcType || "FIXED"} value=${value} min=${fn.calcType === "PERCENTAGE" && fn.minCap ? fn.minCap : "none"} max=${fn.calcType === "PERCENTAGE" && fn.maxCap ? fn.maxCap : "none"}>`;
        return;
      }
      canonicalPreview[outputField] = `<${fn.functionName}${fn.args ? `:${fn.args}` : ""}>`;
    });
    
    // Build the full payload preview showing separation
    const preview = {};
    if (Object.keys(canonicalPreview).length > 0) {
      preview.canonicalMapping = canonicalPreview;
    }
    if (Object.keys(customFieldsPreview).length > 0) {
      preview.customFields = customFieldsPreview;
    }
    
    return Object.keys(preview).length ? JSON.stringify(preview, null, 2) : "{\n  \n}";
  }, [customFields, dynamicFunctions, mappings]);

  const payloadKeys = useMemo(
    () => mappings.map(mapping => mapping.sourceKey).filter(Boolean),
    [mappings],
  );

  function handleExtractKeys() {
    setExtractError("");
    const trimmed = samplePayload.trim();
    if (!trimmed || trimmed === "{\n  \n}") return;

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setExtractError("Paste a JSON object with named fields.");
        return;
      }

      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        setExtractError("No keys found in payload.");
        return;
      }

      const existing = new Set(mappings.map(mapping => mapping.sourceKey));
      const newRows = keys
        .filter(key => !existing.has(key))
        .map(key => ({ sourceKey: key, canonicalKey: "" }));

      if (newRows.length === 0) {
        setExtractError("All payload keys are already in the mapping list.");
        return;
      }

      setMappings(current => [...current, ...newRows]);
    } catch {
      setExtractError("Invalid JSON. Fix syntax errors and try again.");
    }
  }

  function handleExtractResponseKeys() {
    setResponseExtractError("");
    const trimmed = responseSamplePayload.trim();
    if (!trimmed || trimmed === "{\n  \n}") return;

    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setResponseExtractError("Paste a JSON object with named fields.");
        return;
      }

      const keys = Object.keys(parsed);
      if (keys.length === 0) {
        setResponseExtractError("No keys found in payload.");
        return;
      }

      const existing = new Set(responseMappings.map(mapping => mapping.sourceKey));
      const newRows = keys
        .filter(key => !existing.has(key))
        .map(key => ({ sourceKey: key, canonicalKey: "" }));

      if (newRows.length === 0) {
        setResponseExtractError("All payload keys are already in the mapping list.");
        return;
      }

      setResponseMappings(current => [...current, ...newRows]);
    } catch {
      setResponseExtractError("Invalid JSON. Fix syntax errors and try again.");
    }
  }

  function updateMapping(index, key, value) {
    setMappings(current => current.map((mapping, i) => (
      i === index ? { ...mapping, [key]: value } : mapping
    )));
  }

  function removeMapping(index) {
    setMappings(current => current.filter((_, i) => i !== index));
  }

  function updateResponseMapping(index, key, value) {
    setResponseMappings(current => current.map((mapping, i) => (
      i === index ? { ...mapping, [key]: value } : mapping
    )));
  }

  function removeResponseMapping(index) {
    setResponseMappings(current => current.filter((_, i) => i !== index));
  }

  function updateCustomField(index, key, value) {
    setCustomFields(current => current.map((field, i) => (
      i === index ? { ...field, [key]: value } : field
    )));
  }

  function removeCustomField(index) {
    setCustomFields(current => current.filter((_, i) => i !== index));
  }

  function updateDynamicFunction(index, key, value) {
    setDynamicFunctions(current => current.map((fn, i) => {
      if (i !== index) return fn;
      const next = { ...fn, [key]: value };
      if (key === "functionName" && value === "CALC_FEE") {
        next.amountType = next.amountType || "FLAT";
        next.calcType = next.calcType || "FIXED";
        next.args = next.args || "";
        next.outputMode = next.outputMode || "";
      }
      if (key === "baseField" && next.outputMode === "overwrite") {
        next.outputField = value;
      }
      if (key === "outputMode" && value === "overwrite") {
        next.outputField = next.baseField || "";
      }
      if (key === "outputMode" && value === "new") {
        next.outputField = "";
      }
      if (key === "amountType" && value === "FLAT") {
        next.slabMin = "";
        next.slabMax = "";
      }
      if (key === "calcType" && value !== "PERCENTAGE") {
        next.minCap = "";
        next.maxCap = "";
      }
      return next;
    }));
  }

  function removeDynamicFunction(index) {
    setDynamicFunctions(current => current.filter((_, i) => i !== index));
  }

  function buildFunctionDefinition(item) {
    if (item.functionName === "CALC_FEE") {
      const parts = [];
      if (item.baseField?.trim()) {
        parts.push(`base_field=${item.baseField.trim()}`);
      }
      parts.push(`amount_type=${item.amountType || "FLAT"}`);
      parts.push(`calc_type=${item.calcType || "FIXED"}`);
      const value = item.amountType === "SLAB"
        ? `${item.slabMin || "0"}-${item.slabMax || "0"}:${item.args || "0"}`
        : item.args || "0";
      parts.push(`value=${value}`);
      if (item.calcType === "PERCENTAGE") {
        if (item.minCap?.trim()) {
          parts.push(`min=${item.minCap.trim()}`);
        }
        if (item.maxCap?.trim()) {
          parts.push(`max=${item.maxCap.trim()}`);
        }
      }
      return `CALC_FEE(${parts.join(", ")})`;
    }
    if (item.functionName === "STATIC") {
      return item.args ? `STATIC(${item.args})` : "STATIC";
    }
    if (item.args) {
      return `${item.functionName}(${item.args})`;
    }
    return item.functionName;
  }

  async function handleSave() {
    if (!requestName.trim()) {
      setSaveStatus({ type: "error", msg: "Request name is required." });
      return;
    }

    const confirmedMappings = mappings.filter(mapping => mapping.sourceKey.trim() && mapping.canonicalKey.trim());
    const confirmedResponseMappings = responseMappings.filter(mapping => mapping.sourceKey.trim() && mapping.canonicalKey.trim());
    const confirmedCustomFields = customFields.filter(field => field.customFieldName?.trim() && field.canonicalKey?.trim() && field.value?.trim());
    const confirmedDynamicFunctions = dynamicFunctions.filter(fn => {
      if (!fn.functionName?.trim() || !fn.outputField?.trim()) return false;
      if (fn.functionName !== "CALC_FEE") return true;
      if (!fn.name?.trim() || !fn.baseField?.trim()) return false;
      if (fn.amountType === "SLAB" && (!fn.slabMin?.trim() || !fn.slabMax?.trim())) return false;
      return Boolean(fn.args?.trim());
    });

    if (confirmedMappings.length === 0 && confirmedCustomFields.length === 0 && confirmedDynamicFunctions.length === 0) {
      setSaveStatus({ type: "error", msg: "Add at least one request mapping, custom field, or dynamic function." });
      return;
    }

    if (!adapterId) {
      setSaveStatus({ type: "error", msg: "Adapter ID is missing. Please go back and reopen this adapter." });
      return;
    }

    setSaveStatus({ type: "loading", msg: "" });

    try {
      // Build request schema from request mappings
      const requestSchema = {};
      confirmedMappings.forEach(({ sourceKey }) => {
        requestSchema[sourceKey.trim()] = "";
      });

      // Build response schema from response mappings
      const responseSchema = {};
      confirmedResponseMappings.forEach(({ sourceKey }) => {
        responseSchema[sourceKey.trim()] = "";
      });

      // Build canonicalMapping
      const canonicalMapping = Object.fromEntries(
        confirmedMappings.map(({ sourceKey, canonicalKey }) => [sourceKey.trim(), `<${canonicalKey.trim()}>`]),
      );
      
      // Build separate customFields object
      const customFieldsObj = {};
      confirmedCustomFields.forEach(field => {
        customFieldsObj[field.customFieldName.trim()] = field.value.trim();
      });
      
      // Add dynamic functions to canonicalMapping
      confirmedDynamicFunctions.forEach(fn => {
        canonicalMapping[fn.outputField.trim()] = buildFunctionDefinition(fn);
      });
      
      const label = requestName.trim().toUpperCase().replace(/\s+/g, "_");
      const fmt = getAdapterFormat(adapter);

      const payload = {
        adapterId,
        configId: `${fmt}_${label}`,
        type: fmt,
        requestName: requestName.trim().toUpperCase(),
        sourceFormat: fmt,
        targetFormat: outboundId || fmt,
        transformType: `${fmt}_TO_${outboundId || fmt}`,
        requestSchema,
        responseSchema,
        canonicalMapping,
        customFields: customFieldsObj,
        routingRules: { required_fields: Object.keys(canonicalMapping) },
        ...(outboundId && { outboundAdapterId: outboundId }),
      };

      // Use unified API for both inbound and outbound
      if (isOutbound) {
        await upsertOutboundConfiguration(adapterId, null, payload);
      } else {
        await upsertInboundConfiguration(adapterId, null, payload);
      }

      setSaveStatus({ type: "success", msg: "Request rule saved successfully." });
      setTimeout(() => {
        setSaveStatus({ type: "idle", msg: "" });
        onBack?.();
      }, 1200);
    } catch (error) {
      console.error('[ManageFunctionsPage] Save error:', error);
      setSaveStatus({ type: "error", msg: getApiErrorMessage(error) });
    }
  }

  return (
    <div className="mf-page">
      <div className="mf-header">
        <button type="button" className="btn-ghost" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back to Registry
        </button>
        <div>
          <p className="mf-eyebrow">{direction} Request Routing</p>
          <h2>{title}</h2>
          <span>{adapterId}{selectedUser?.username ? ` | ${selectedUser.username}` : ""}</span>
          {isOutbound && (
            <span style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 6, background: "var(--success-soft)", color: "var(--success)", fontSize: 11, fontWeight: 700 }}>
              OUTBOUND MODE
            </span>
          )}
        </div>
      </div>

      <section className="rule-builder">
        <div className="rule-builder-header">
          <span>Request Routing Rules</span>
          <span className="rule-count">Mapping Builder</span>
        </div>

        <div className="rule-row">
          <div className="rule-index">1</div>
          <div className="rule-fields" style={{ gridTemplateColumns: "1fr" }}>
            <div className="field">
              <label>Request Name</label>
              <input
                type="text"
                value={requestName}
                placeholder="e.g. BALANCE_ENQUIRY"
                onChange={event => setRequestName(event.target.value)}
              />
            </div>

            <div className="mf-code-window">
              <div className="mf-code-bar">
                <div>
                  <span style={{ background: "#ff5f57" }} />
                  <span style={{ background: "#febc2e" }} />
                  <span style={{ background: "#28c840" }} />
                </div>
                <strong><i className="ti ti-terminal" /> QUICK PASTE TERMINAL - payload.json</strong>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleExtractKeys}
                  style={{ 
                    fontSize: 13, 
                    padding: "6px 16px", 
                    background: "var(--primary)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)"
                  }}
                >
                  <i className="ti ti-wand" /> Extract Keys
                </button>
              </div>
              <textarea
                value={samplePayload}
                onChange={event => {
                  setSamplePayload(event.target.value);
                  setExtractError("");
                }}
                spellCheck="false"
              />
            </div>
            {extractError && <span className="field-error-msg">{extractError}</span>}

            <div className="alias-mapping-builder">
              <div className="alias-mapping-header">
                <p className="alias-mapping-title"><i className="ti ti-arrows-exchange" /> Alias Mapping Builder</p>
                <p className="alias-mapping-sub">
                  {canonicalStatus === "loading"
                    ? "Loading canonical fields..."
                    : isOutbound
                    ? "Map canonical fields to the destination outbound payload keys."
                    : "Map each extracted key to a canonical field using the dropdown."}
                </p>
              </div>

              {mappings.length > 0 && (
                <div className="alias-mapping-rows">
                  <div className="alias-mapping-rows-head" style={{ gridTemplateColumns: "1fr auto 1fr 32px" }}>
                    {isOutbound ? (
                      <>
                        <span>Canonical Field</span>
                        <span>Maps To Outbound Payload Key</span>
                        <span />
                      </>
                    ) : (
                      <>
                        <span>Incoming Payload Key</span>
                        <span>Maps To Canonical Field</span>
                        <span />
                      </>
                    )}
                  </div>
                  {mappings.map((mapping, index) => (
                    <div
                      className="alias-mapping-row"
                      key={`${mapping.sourceKey}-${index}`}
                      style={{ gridTemplateColumns: "1fr auto 1fr auto" }}
                    >
                      <input
                        type="text"
                        value={mapping.sourceKey}
                        placeholder={isOutbound ? "e.g. customerId" : "e.g. cust_id"}
                        onChange={event => updateMapping(index, "sourceKey", event.target.value)}
                      />
                      <i className="ti ti-arrow-right alias-mapping-arrow" />
                      <select
                        value={mapping.canonicalKey}
                        onChange={event => updateMapping(index, "canonicalKey", event.target.value)}
                      >
                        <option value="">{isOutbound ? "-- Target outbound key --" : "-- Select canonical field --"}</option>
                        {sortedCanonicalFields.map((field, fieldIndex) => {
                          const name = fieldName(field);
                          return <option key={fieldId(field) || fieldIndex} value={name}>{name}</option>;
                        })}
                      </select>
                      <button
                        type="button"
                        className="ar-icon-btn ar-icon-btn-danger"
                        style={{ opacity: 1 }}
                        onClick={() => removeMapping(index)}
                        title="Remove mapping"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {mappings.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", padding: "12px 0" }}>
                  Paste JSON above and click Extract Keys, or add rows manually.
                </p>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setMappings(current => [...current, { sourceKey: "", canonicalKey: "" }])}
                >
                  <i className="ti ti-plus" /> Add Mapping Row
                </button>
                {mappings.length > 0 && mappings.some(m => m.sourceKey && m.canonicalKey) && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ 
                      fontSize: 13, 
                      padding: "8px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 700
                    }}
                    onClick={() => {
                      const confirmed = mappings.filter(m => m.sourceKey.trim() && m.canonicalKey.trim());
                      if (confirmed.length > 0) {
                        alert(`✓ Confirmed ${confirmed.length} mapping${confirmed.length !== 1 ? 's' : ''}!\n\nYou can now proceed with Custom Fields or Dynamic Functions.`);
                      }
                    }}
                  >
                    <i className="ti ti-check" /> Confirm Mappings ({mappings.filter(m => m.sourceKey && m.canonicalKey).length})
                  </button>
                )}
              </div>
            </div>

            <div className="mf-panel">
              <div className="mf-panel-head">
                <span>Inject Custom Fields <em>(optional)</em></span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setCustomFields(current => [
                    ...current,
                    { customFieldName: "", canonicalKey: "", value: "" },
                  ])}
                >
                  <i className="ti ti-plus" /> Add Field
                </button>
              </div>
              {customFields.length > 0 && (
                <>
                  <div className="mf-grid-row mf-grid-row--head">
                    <span>Custom Field Name</span>
                    <span>Map to Canonical Field</span>
                    <span>Add Value</span>
                    <span />
                  </div>
                  {customFields.map((field, index) => (
                    <div className="mf-grid-row" key={index}>
                      <input
                        type="text"
                        value={field.customFieldName || ""}
                        placeholder="e.g. merchant_category_code"
                        onChange={event => updateCustomField(index, "customFieldName", event.target.value)}
                      />
                      <select
                        value={field.canonicalKey}
                        onChange={event => updateCustomField(index, "canonicalKey", event.target.value)}
                      >
                        <option value="">-- Map to canonical --</option>
                        {sortedCanonicalFields.map((canonicalField, fieldIndex) => {
                          const name = fieldName(canonicalField);
                          return <option key={fieldId(canonicalField) || fieldIndex} value={name}>{name}</option>;
                        })}
                      </select>
                      <input
                        type="text"
                        value={field.value || ""}
                        placeholder="e.g. 5411 or static value"
                        onChange={event => updateCustomField(index, "value", event.target.value)}
                      />
                      <button
                        type="button"
                        className="ar-icon-btn ar-icon-btn-danger"
                        style={{ opacity: 1 }}
                        onClick={() => removeCustomField(index)}
                        title="Remove custom field"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="mf-panel">
              <div className="mf-panel-head">
                <span>Dynamic Functions <em>(optional)</em></span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDynamicFunctions(current => [
                    ...current,
                    {
                      name: "",
                      functionName: "",
                      baseField: "",
                      outputMode: "",
                      outputField: "",
                      amountType: "FLAT",
                      calcType: "FIXED",
                      args: "",
                      minCap: "",
                      maxCap: "",
                      slabMin: "",
                      slabMax: "",
                    },
                  ])}
                >
                  <i className="ti ti-plus" /> Add Function
                </button>
              </div>
              {dynamicFunctions.length > 0 && (
                <>
                  <div className="mf-grid-row mf-grid-row--head mf-function-choice-head">
                    <span>Which Function</span>
                    <span />
                  </div>
                  {dynamicFunctions.map((fn, index) => (
                    <div className="mf-function-block" key={index}>
                      <div className="mf-grid-row mf-function-choice-row">
                        <select
                          value={fn.functionName}
                          onChange={event => updateDynamicFunction(index, "functionName", event.target.value)}
                        >
                          <option value="">Which function?</option>
                          <option value="CALC_FEE">Fee</option>
                        </select>
                        {false && fn.outputField && fn.baseField && fn.outputField === fn.baseField && (
                          <span style={{ fontSize: 11, color: "var(--primary)", marginTop: 4, display: "block", fontStyle: "italic" }}>
                            ℹ️ Same as input field — will overwrite the original value
                          </span>
                        )}
                        {false && fn.outputField && fn.baseField && fn.outputField !== fn.baseField && (
                          <span style={{ fontSize: 11, color: "var(--success)", marginTop: 4, display: "block", fontStyle: "italic" }}>
                            ✓ Different from input field — will create/inject new field
                          </span>
                        )}
                        <button
                          type="button"
                          className="ar-icon-btn ar-icon-btn-danger"
                          style={{ opacity: 1 }}
                          onClick={() => removeDynamicFunction(index)}
                          title="Remove function"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>

                      {fn.functionName === "STATIC" && (
                        <div className="mf-function-detail">
                          <label>Static Value</label>
                          <input
                            value={fn.args || ""}
                            placeholder="Enter static value..."
                            onChange={event => updateDynamicFunction(index, "args", event.target.value)}
                          />
                        </div>
                      )}

                      {fn.functionName === "CALC_FEE" && (
                        <div className="mf-fee-builder">
                          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, fontStyle: "italic" }}>Complete the following steps to configure fee calculation:</p>
                          
                          <div className="mf-fee-primary-row">
                            <div className="field">
                              <label>Fee Name</label>
                              <input
                                value={fn.name || ""}
                                placeholder="e.g. txnFee"
                                onChange={event => updateDynamicFunction(index, "name", event.target.value)}
                              />
                            </div>
                            <div className="field">
                              <label>Input Field</label>
                              <select
                                value={fn.baseField || ""}
                                onChange={event => updateDynamicFunction(index, "baseField", event.target.value)}
                              >
                                <option value="">{payloadKeys.length ? "-- Select input field --" : "Extract payload keys first"}</option>
                                {payloadKeys.map(key => <option key={`fee-base-${key}`} value={key}>{key}</option>)}
                              </select>
                            </div>
                          </div>

                          {fn.name?.trim() && fn.baseField && (
                            <>
                              {/* Step 3: Output Field Mode */}
                              <div className="field">
                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ background: "var(--primary)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>3</span>
                                  Output Field
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateDynamicFunction(index, "outputMode", "overwrite");
                                      updateDynamicFunction(index, "outputField", fn.baseField);
                                    }}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: (fn.outputMode || "overwrite") === "overwrite" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: (fn.outputMode || "overwrite") === "overwrite" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: (fn.outputMode || "overwrite") === "overwrite" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    Overwrite {fn.baseField}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateDynamicFunction(index, "outputMode", "new");
                                      updateDynamicFunction(index, "outputField", "");
                                    }}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: fn.outputMode === "new" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: fn.outputMode === "new" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: fn.outputMode === "new" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    New Field
                                  </button>
                                </div>
                              </div>

                              {fn.outputMode === "new" && (
                                <div className="field">
                                  <label>New Field Name</label>
                                  <input
                                    value={fn.outputField || ""}
                                    placeholder="e.g. TotalAmount"
                                    onChange={event => updateDynamicFunction(index, "outputField", event.target.value)}
                                  />
                                </div>
                              )}
                            </>
                          )}

                          {fn.name?.trim() && fn.baseField && fn.outputField && (
                            <>
                              {/* Step 4: FLAT or SLAB */}
                              <div className="field">
                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ background: "var(--primary)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>4</span>
                                  Amount Type
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => updateDynamicFunction(index, "amountType", "FLAT")}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: (fn.amountType || "FLAT") === "FLAT" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: (fn.amountType || "FLAT") === "FLAT" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: (fn.amountType || "FLAT") === "FLAT" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    FLAT
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDynamicFunction(index, "amountType", "SLAB")}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: fn.amountType === "SLAB" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: fn.amountType === "SLAB" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: fn.amountType === "SLAB" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    SLAB
                                  </button>
                                </div>
                              </div>

                              {fn.amountType === "SLAB" && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                  <div className="field">
                                    <label>Min Value</label>
                                    <input
                                      type="number"
                                      value={fn.slabMin || ""}
                                      placeholder="e.g. 0"
                                      onChange={event => updateDynamicFunction(index, "slabMin", event.target.value)}
                                    />
                                  </div>
                                  <div className="field">
                                    <label>Max Value</label>
                                    <input
                                      type="number"
                                      value={fn.slabMax || ""}
                                      placeholder="e.g. 1000"
                                      onChange={event => updateDynamicFunction(index, "slabMax", event.target.value)}
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {fn.name?.trim() && fn.baseField && fn.outputField && (fn.amountType === "FLAT" || (fn.amountType === "SLAB" && fn.slabMin && fn.slabMax)) && (
                            <>
                              {/* Step 5: Fee Type */}
                              <div className="field">
                                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ background: "var(--primary)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>5</span>
                                  Fee Type
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    type="button"
                                    onClick={() => updateDynamicFunction(index, "calcType", "FIXED")}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: (fn.calcType || "FIXED") === "FIXED" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: (fn.calcType || "FIXED") === "FIXED" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: (fn.calcType || "FIXED") === "FIXED" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    Fixed Amount
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDynamicFunction(index, "calcType", "PERCENTAGE")}
                                    style={{
                                      flex: 1, padding: "10px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                      border: fn.calcType === "PERCENTAGE" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                      background: fn.calcType === "PERCENTAGE" ? "var(--primary-soft)" : "var(--panel-soft)",
                                      color: fn.calcType === "PERCENTAGE" ? "var(--primary)" : "var(--muted)",
                                    }}
                                  >
                                    Percentage
                                  </button>
                                </div>
                              </div>

                              {/* Fee Value */}
                              <div className="field">
                                <label>{fn.calcType === "PERCENTAGE" ? "Fee Percentage (%)" : "Fee Amount"}</label>
                                <input
                                  type="number"
                                  value={fn.args || ""}
                                  placeholder={fn.calcType === "PERCENTAGE" ? "e.g. 1.5" : "e.g. 5.00"}
                                  onChange={event => updateDynamicFunction(index, "args", event.target.value)}
                                />
                              </div>

                              {/* Min & Max Caps (only for PERCENTAGE) */}
                              {fn.calcType === "PERCENTAGE" && (
                                <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 12, background: "var(--panel-soft)" }}>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontWeight: 700 }}>
                                    <span style={{ background: "var(--primary)", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>6</span>
                                    Min & Max Caps (Optional)
                                  </label>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                      <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Min Cap</label>
                                      <input
                                        type="number"
                                        value={fn.minCap || ""}
                                        placeholder="e.g. 10"
                                        onChange={event => updateDynamicFunction(index, "minCap", event.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Max Cap</label>
                                      <input
                                        type="number"
                                        value={fn.maxCap || ""}
                                        placeholder="e.g. 200"
                                        onChange={event => updateDynamicFunction(index, "maxCap", event.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {(mappings.some(mapping => mapping.sourceKey && mapping.canonicalKey) || customFields.length > 0 || dynamicFunctions.length > 0) && (
              <div className="mf-code-window">
                <div className="mf-code-bar">
                  <div>
                    <span style={{ background: "#ff5f57" }} />
                    <span style={{ background: "#febc2e" }} />
                    <span style={{ background: "#28c840" }} />
                  </div>
                  <strong>Generated Payload Preview</strong>
                  <span />
                </div>
                <pre>{payloadPreview}</pre>
              </div>
            )}
          </div>
        </div>
      </section>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 0", borderTop: "1px solid var(--border)" }}>
        {saveStatus.type === "error" && <span style={{ color: "var(--danger)", fontSize: 14, marginRight: "auto" }}>{saveStatus.msg}</span>}
        {saveStatus.type === "success" && <span style={{ color: "var(--success)", fontSize: 14, marginRight: "auto" }}>{saveStatus.msg}</span>}
        <button type="button" className="btn-ghost" onClick={onBack}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saveStatus.type === "loading"}
        >
          {saveStatus.type === "loading"
            ? <><i className="ti ti-loader-2 spin" /> Saving...</>
            : <><i className="ti ti-check" /> Save Request Rule</>}
        </button>
      </div>
    </div>
  );
}
