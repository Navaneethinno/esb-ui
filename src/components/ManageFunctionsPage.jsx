import { useEffect, useMemo, useState } from "react";
import {
  getApiErrorMessage,
  upsertInboundConfiguration,
  upsertOutboundConfiguration,
} from "../services/esbApi";
import { fetchCanonicalFields } from "../services/CanonicalFieldService";
import { safeStringifyMasked } from "../utils/maskSensitive";
import AutoMatchPreviewModal from "./AutoMatchPreviewModal";
import { autoMatchFields } from "../utils/autoMatch";
import TreeMappingBuilder from "./shared/TreeMappingBuilder";

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

function getCanonicalProtectionMeta(field) {
  if (!field || typeof field !== "object") return null;
  const meta = field.protectionColumn ?? field.protection ?? field.pciProtection ?? field.pci_protection ?? field.security ?? field.sensitivity ?? field.sensitivityLevel ?? null;
  if (meta == null || meta === "") return null;
  if (typeof meta === "string") {
    return {
      required: true,
      source: meta,
      recommendedProtection: field.recommendedProtection || field.recommended_protection || field.defaultProtection || field.default_protection || "",
    };
  }
  if (typeof meta === "object") {
    return {
      required: true,
      source: meta.source || meta.column || meta.field || meta.name || "protectionColumn",
      recommendedProtection: meta.recommendedProtection || meta.recommended_protection || meta.defaultProtection || meta.default_protection || meta.strategy || meta.value || "",
    };
  }
  return {
    required: true,
    source: String(meta),
    recommendedProtection: field.recommendedProtection || field.recommended_protection || field.defaultProtection || field.default_protection || "",
  };
}

function getCanonicalFieldKey(field) {
  return String(field?.referenceId || field?.fieldId || field?.code || field?.name || field?.displayName || "").trim();
}

function getCanonicalFieldByName(fields, name) {
  const needle = String(name || "").trim().toLowerCase();
  if (!needle) return null;
  return fields.find((field) => {
    const key = getCanonicalFieldKey(field).toLowerCase();
    const display = String(field?.displayName || "").trim().toLowerCase();
    return key === needle || display === needle;
  }) || null;
}

function createRequestType() {
  return {
    requestName: "",
    requestPayload: "{\n  \n}",
    responsePayload: "{\n  \n}",
    requestExtractError: "",
    responseExtractError: "",
    requestExtractSuccess: "",
    responseExtractSuccess: "",
    requestMappings: {}, // Changed to object for tree mapping
    responseMappings: {}, // Changed to object for tree mapping
    protectionRules: {},
  };
}

function loadRequestTypeFromConfig(config) {
  // Convert backend canonical mapping format to frontend tree mapping format
  const requestMappings = {};
  const responseMappings = {};
  
  // Extract canonical mappings and remove <> wrappers
  Object.entries(config.requestCanonicalMapping || {}).forEach(([path, wrapped]) => {
    const raw = String(wrapped || "").trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed.targetField || parsed.pipeline)) {
        requestMappings[path] = {
          targetField: String(parsed.targetField || "").trim(),
          pipeline: Array.isArray(parsed.pipeline) ? parsed.pipeline : [],
        };
        return;
      }
    } catch {}
    const canonical = raw.replace(/[<>]/g, "").trim();
    if (canonical) requestMappings[path] = { targetField: canonical, pipeline: [] };
  });
  
  Object.entries(config.responseCanonicalMapping || {}).forEach(([path, wrapped]) => {
    const raw = String(wrapped || "").trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed.targetField || parsed.pipeline)) {
        responseMappings[path] = {
          targetField: String(parsed.targetField || "").trim(),
          pipeline: Array.isArray(parsed.pipeline) ? parsed.pipeline : [],
        };
        return;
      }
    } catch {}
    const canonical = raw.replace(/[<>]/g, "").trim();
    if (canonical) responseMappings[path] = { targetField: canonical, pipeline: [] };
  });
  
  return {
    requestName: config.requestName || "",
    requestPayload: JSON.stringify(config.requestSchema || {}, null, 2),
    responsePayload: JSON.stringify(config.responseSchema || {}, null, 2),
    requestExtractError: "",
    responseExtractError: "",
    requestExtractSuccess: "",
    responseExtractSuccess: "",
    requestMappings,
    responseMappings,
    protectionRules: config.protectionRules || {},
  };
}

function buildProtectionRulesForConfig(config, canonicalFields, protectionSelections) {
  const rules = {};
  const mappings = [
    ...(config.requestCanonicalMapping ? Object.entries(config.requestCanonicalMapping) : []),
    ...(config.responseCanonicalMapping ? Object.entries(config.responseCanonicalMapping) : []),
  ];

  for (const [sourceField, wrappedCanonical] of mappings) {
    let canonicalName = "";
    const raw = String(wrappedCanonical || "").trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && (parsed.targetField || parsed.pipeline)) {
          canonicalName = String(parsed.targetField || "").trim();
        }
      } catch {}
      if (!canonicalName) {
        canonicalName = raw.replace(/[<>]/g, "").trim();
      }
    }
    if (!canonicalName) continue;
    const canonicalField = getCanonicalFieldByName(canonicalFields, canonicalName);
    const meta = getCanonicalProtectionMeta(canonicalField);
    if (!meta) continue;

    const rule = protectionSelections[canonicalName] || protectionSelections[getCanonicalFieldKey(canonicalField)] || null;
    if (!rule) {
      rules[sourceField] = {
        canonicalField: canonicalName,
        strategy: "",
      };
      continue;
    }

    rules[sourceField] = {
      canonicalField: canonicalName,
      strategy: rule.strategy,
    };
  }

  return rules;
}

function buildRequestTypeConfig(item, protectionRules = {}) {
  // Convert tree mappings (object) to backend format
  const requestCanonicalMapping = {};
  const responseCanonicalMapping = {};
  
  Object.entries(item.requestMappings || {}).forEach(([path, canonical]) => {
    const targetField = typeof canonical === "string"
      ? canonical.trim()
      : String(canonical?.targetField || canonical?.target || "").trim();
    const pipeline = Array.isArray(canonical?.pipeline) ? canonical.pipeline : [];
    if (targetField) {
      requestCanonicalMapping[path] = JSON.stringify({ targetField, pipeline });
    }
  });
  
  Object.entries(item.responseMappings || {}).forEach(([path, canonical]) => {
    const targetField = typeof canonical === "string"
      ? canonical.trim()
      : String(canonical?.targetField || canonical?.target || "").trim();
    const pipeline = Array.isArray(canonical?.pipeline) ? canonical.pipeline : [];
    if (targetField) {
      responseCanonicalMapping[path] = JSON.stringify({ targetField, pipeline });
    }
  });

  // Build schemas from JSON payloads
  let requestSchema = {};
  let responseSchema = {};
  
  try {
    requestSchema = JSON.parse(item.requestPayload || "{}");
  } catch {
    requestSchema = {};
  }
  
  try {
    responseSchema = JSON.parse(item.responsePayload || "{}");
  } catch {
    responseSchema = {};
  }

  return {
    requestName: item.requestName.trim().toUpperCase(),
    requestSchema,
    responseSchema,
    requestCanonicalMapping,
    responseCanonicalMapping,
    ...(Object.keys(item.protectionRules || {}).length > 0 ? { protectionRules: item.protectionRules } : {}),
  };
}

function hasTestFields(fields) {
  const names = (fields || []).map((field) => String(field?.fieldName || field?.referenceId || field?.name || field || "").toLowerCase());
  return {
    partnerTier: names.includes("partnertier"),
    customerSegment: names.includes("customersegment"),
    error: names.includes("error"),
  };
}

export default function ManageFunctionsPage({ adapter, selectedUser, onBack, isOutbound = false, canonicalFields: propCanonicalFields = [], canonicalStatus: propCanonicalStatus = "idle", existingConfigurations = [], isEditMode = false }) {
  const [canonicalFields, setCanonicalFields] = useState(propCanonicalFields);
  const [canonicalStatus, setCanonicalStatus] = useState(propCanonicalStatus);
  const [requestTypes, setRequestTypes] = useState([createRequestType()]);
  const [saveStatus, setSaveStatus] = useState({ type: "idle", msg: "" });
  const [autoMatchModal, setAutoMatchModal] = useState(null); // { typeIndex, collection, matches }
  const [protectionModal, setProtectionModal] = useState(null); // { pending, selections, configPreview }
  const [initialized, setInitialized] = useState(false);

  const adapterId = adapter?.adapterId || adapter?.outboundId || adapter?.displayId || adapter?.id || "";
  const title = adapter?.displayName || adapter?.adapterName || adapter?.name || "Selected Adapter";
  const direction = adapter?.direction || "Inbound";
  const adapterFormat = adapter?.formatType || adapter?.type || "JSON";
  const normalizedCanonicalStatus = propCanonicalStatus === true
    ? "loading"
    : propCanonicalStatus === false || propCanonicalStatus == null
      ? "idle"
      : String(propCanonicalStatus);

  console.log("MANAGE_FUNCTIONS_RECEIVED", hasTestFields(propCanonicalFields));

  // Load existing configurations on mount ONLY if in edit mode
  useEffect(() => {
    if (!initialized && isEditMode && existingConfigurations && existingConfigurations.length > 0) {
      const loaded = existingConfigurations.map(config => loadRequestTypeFromConfig(config));
      setRequestTypes(loaded);
      setInitialized(true);
    } else if (!initialized) {
      setInitialized(true);
    }
  }, [initialized, existingConfigurations, isEditMode]);

  useEffect(() => {
    if (Array.isArray(propCanonicalFields) && propCanonicalFields.length > 0) {
      setCanonicalFields(propCanonicalFields);
      setCanonicalStatus(normalizedCanonicalStatus);
      return;
    }

    if (normalizedCanonicalStatus === "loading") {
      setCanonicalStatus("loading");
      return;
    }

    if (normalizedCanonicalStatus === "idle" && Array.isArray(propCanonicalFields) && propCanonicalFields.length === 0) {
      setCanonicalFields([]);
      setCanonicalStatus("idle");
      return;
    }

    let cancelled = false;
    setCanonicalStatus("loading");
    fetchCanonicalFields(adapterFormat)
      .then(data => {
        if (cancelled) return;
        setCanonicalFields(Array.isArray(data) ? data : []);
        setCanonicalStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setCanonicalFields([]);
        setCanonicalStatus("idle");
      });

    return () => {
      cancelled = true;
    };
  }, [adapterFormat, normalizedCanonicalStatus, propCanonicalFields]);

  // INVESTIGATION LOG: Track received canonicalFields
  console.log(
    "MANAGE_FUNCTIONS_RECEIVED",
    canonicalFields.length,
    canonicalFields.filter(f =>
      ["partnerTier","customerSegment","error"]
      .includes(f.fieldName)
    )
  );

  const sortedCanonicalFields = useMemo(
    () => {
      const sorted = [...canonicalFields].sort((a, b) => fieldName(a).localeCompare(fieldName(b)));
      
      console.log('═══════════════════════════════════════');
      console.log('CANONICAL_SOURCE: ManageFunctionsPage.sortedCanonicalFields');
      console.log('INPUT canonicalFields LENGTH:', canonicalFields.length);
      console.log('SORTED canonicalFields LENGTH:', sorted.length);
      console.log('ALL FIELD NAMES:', sorted.map(f => f.fieldName || f.name));
      
      // Check test fields
      const partnerTier = sorted.find(f => (f.fieldName || f.name || '').toLowerCase() === 'partnertier');
      const customerSegment = sorted.find(f => (f.fieldName || f.name || '').toLowerCase() === 'customersegment');
      const errorField = sorted.find(f => (f.fieldName || f.name || '').toLowerCase() === 'error');
      
      console.log('TEST FIELDS IN SORTED:');
      console.log('  - partnerTier:', partnerTier);
      console.log('  - customerSegment:', customerSegment);
      console.log('  - error:', errorField);
      console.log('═══════════════════════════════════════');
      
      return sorted;
    },
    [canonicalFields],
  );

  const payloadPreview = useMemo(() => {
    const configs = requestTypes.map(buildRequestTypeConfig);
    console.log("BEFORE_MAP", hasTestFields(canonicalFields));
    
    // Format the configs for better readability
    const formatted = configs.map(config => {
      // Group mappings by their root path for nested display
      const groupedRequestMapping = {};
      const groupedResponseMapping = {};
      
      // Process request mappings
      Object.entries(config.requestCanonicalMapping || {}).forEach(([path, canonical]) => {
        const parts = path.split('.');
        if (parts[0].includes('[]')) {
          // Nested array field
          const arrayRoot = parts[0];
          if (!groupedRequestMapping[arrayRoot]) {
            groupedRequestMapping[arrayRoot] = {};
          }
          const fieldName = parts.slice(1).join('.');
          groupedRequestMapping[arrayRoot][fieldName || arrayRoot] = canonical;
        } else {
          // Top-level field
          groupedRequestMapping[path] = canonical;
        }
      });
      
      // Process response mappings
      Object.entries(config.responseCanonicalMapping || {}).forEach(([path, canonical]) => {
        const parts = path.split('.');
        if (parts[0].includes('[]')) {
          // Nested array field
          const arrayRoot = parts[0];
          if (!groupedResponseMapping[arrayRoot]) {
            groupedResponseMapping[arrayRoot] = {};
          }
          const fieldName = parts.slice(1).join('.');
          groupedResponseMapping[arrayRoot][fieldName || arrayRoot] = canonical;
        } else {
          // Top-level field
          groupedResponseMapping[path] = canonical;
        }
      });
      
      return {
        ...config,
        requestCanonicalMapping: groupedRequestMapping,
        responseCanonicalMapping: groupedResponseMapping,
      };
    });
    console.log("AFTER_MAP", hasTestFields(canonicalFields));
    
    return safeStringifyMasked({
      configurations: formatted,
    });
  }, [requestTypes]);

  function collectProtectionCandidates() {
    const candidates = [];
    requestTypes.forEach((requestType, typeIndex) => {
      // Iterate through tree-based mappings
      Object.entries(requestType.requestMappings || {}).forEach(([path, canonicalName]) => {
        const canonicalLabel = String(canonicalName?.targetField || canonicalName || "").trim();
        const canonicalField = getCanonicalFieldByName(canonicalFields, canonicalLabel);
        const meta = getCanonicalProtectionMeta(canonicalField);
        if (!meta) return;
        candidates.push({
          typeIndex,
          direction: "request",
          sourceField: path,
          canonicalField: canonicalLabel,
          recommendedProtection: meta.recommendedProtection || "",
          canonicalFieldKey: getCanonicalFieldKey(canonicalField) || canonicalLabel,
        });
      });
      
      Object.entries(requestType.responseMappings || {}).forEach(([path, canonicalName]) => {
        const canonicalLabel = String(canonicalName?.targetField || canonicalName || "").trim();
        const canonicalField = getCanonicalFieldByName(canonicalFields, canonicalLabel);
        const meta = getCanonicalProtectionMeta(canonicalField);
        if (!meta) return;
        candidates.push({
          typeIndex,
          direction: "response",
          sourceField: path,
          canonicalField: canonicalLabel,
          recommendedProtection: meta.recommendedProtection || "",
          canonicalFieldKey: getCanonicalFieldKey(canonicalField) || canonicalLabel,
        });
      });
    });
    return candidates;
  }

  function openProtectionWizard(candidates) {
    const unique = [];
    const seen = new Set();
    candidates.forEach((candidate) => {
      const key = `${candidate.typeIndex}:${candidate.direction}:${candidate.sourceField}:${candidate.canonicalField}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(candidate);
    });
    setProtectionModal({
      candidates: unique,
      selections: unique.reduce((acc, candidate) => {
        const defaultStrategy = candidate.recommendedProtection || "";
        acc[`${candidate.typeIndex}:${candidate.direction}:${candidate.sourceField}:${candidate.canonicalField}`] = { strategy: defaultStrategy };
        return acc;
      }, {}),
    });
  }

  function updateProtectionSelection(candidateKey, strategy) {
    setProtectionModal(current => current ? {
      ...current,
      selections: {
        ...current.selections,
        [candidateKey]: { strategy },
      },
    } : current);
  }

  function applyProtectionSelections() {
    if (!protectionModal) return;
    const selections = protectionModal.selections || {};
    const invalid = protectionModal.candidates.some(candidate => {
      const key = `${candidate.typeIndex}:${candidate.direction}:${candidate.sourceField}:${candidate.canonicalField}`;
      const strategy = selections[key]?.strategy?.trim();
      return !strategy;
    });
    if (invalid) {
      setSaveStatus({ type: "error", msg: "Choose a protection strategy for every protected canonical field before saving." });
      return;
    }

    const protectionSelections = {};
    protectionModal.candidates.forEach((candidate) => {
      const key = `${candidate.typeIndex}:${candidate.direction}:${candidate.sourceField}:${candidate.canonicalField}`;
      const strategy = selections[key]?.strategy?.trim();
      protectionSelections[candidate.canonicalFieldKey] = { strategy };
    });

    setProtectionModal(null);
    handleSave({ skipWizard: true, protectionSelections });
  }

  function updateRequestType(typeIndex, updater) {
    setRequestTypes(current => current.map((item, index) => (
      index === typeIndex ? updater(item) : item
    )));
  }

  function setRequestTypeField(typeIndex, key, value) {
    updateRequestType(typeIndex, item => ({ ...item, [key]: value }));
  }

  function handleAutoMatch(typeIndex, collection) {
    const item = requestTypes[typeIndex];
    const currentMappings = item[collection] || {};
    
    // Get all leaf paths from the payload JSON
    const payload = collection === "requestMappings" ? item.requestPayload : item.responsePayload;
    let leafPaths = [];
    
    try {
      const parsed = JSON.parse(payload);
      const extractLeafPaths = (obj, path = "") => {
        if (!obj || typeof obj !== "object") return [path];
        if (Array.isArray(obj)) {
          if (obj.length === 0) return [`${path}[]`];
          if (typeof obj[0] === "object") return extractLeafPaths(obj[0], `${path}[]`);
          return [`${path}[]`];
        }
        const paths = [];
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (value === null || value === undefined || typeof value !== "object") {
            paths.push(currentPath);
          } else {
            paths.push(...extractLeafPaths(value, currentPath));
          }
        }
        return paths;
      };
      leafPaths = extractLeafPaths(parsed);
    } catch {
      setRequestTypeField(typeIndex, collection === "requestMappings" ? "requestExtractError" : "responseExtractError", "Invalid JSON for auto-match.");
      return;
    }

    // Get unmapped leaf paths
    const unmappedKeys = leafPaths.filter(path => !currentMappings[path]);

    if (unmappedKeys.length === 0) {
      setRequestTypeField(typeIndex, collection === "requestMappings" ? "requestExtractError" : "responseExtractError", "All fields are already mapped.");
      return;
    }

    const matches = autoMatchFields(unmappedKeys, canonicalFields);
    setAutoMatchModal({ typeIndex, collection, matches });
  }

  function applyAutoMatches(matches) {
    if (!autoMatchModal) return;
    const { typeIndex, collection } = autoMatchModal;
    const item = requestTypes[typeIndex];

    const matchMap = new Map(matches.map(m => [m.sourceKey, m.canonicalKey]));
    const updated = { ...item[collection] };

    matches.forEach(match => {
      if (match.sourceKey && match.canonicalKey) {
        updated[match.sourceKey] = { targetField: match.canonicalKey, pipeline: [] };
      }
    });

    updateRequestType(typeIndex, current => ({ ...current, [collection]: updated }));
    setAutoMatchModal(null);
  }

  function handleAddRequestType() {
    setRequestTypes(current => [...current, createRequestType()]);
  }

  function handleRemoveRequestType(typeIndex) {
    setRequestTypes(current => current.filter((_, index) => index !== typeIndex));
  }

  async function handleSave(override = {}) {
    const invalidNameIndex = requestTypes.findIndex(item => !item.requestName.trim());
    if (invalidNameIndex >= 0) {
      setSaveStatus({ type: "error", msg: `Request Type ${invalidNameIndex + 1}: request name is required.` });
      return;
    }

    const missingRequestIndex = requestTypes.findIndex(item => 
      Object.keys(item.requestMappings || {}).length === 0
    );
    if (missingRequestIndex >= 0) {
      setSaveStatus({ type: "error", msg: `Request Type ${missingRequestIndex + 1}: add at least one request payload field mapping.` });
      return;
    }

    // NEW VALIDATION: Check if all fields are mapped
    for (let typeIndex = 0; typeIndex < requestTypes.length; typeIndex++) {
      const item = requestTypes[typeIndex];
      
      // Get all leaf paths from request payload
      let requestLeafPaths = [];
      try {
        const parsed = JSON.parse(item.requestPayload || "{}");
        const extractLeafPaths = (obj, path = "") => {
          if (!obj || typeof obj !== "object") return [path];
          if (Array.isArray(obj)) {
            if (obj.length === 0) return [`${path}[]`];
            if (typeof obj[0] === "object") return extractLeafPaths(obj[0], `${path}[]`);
            return [`${path}[]`];
          }
          const paths = [];
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (value === null || value === undefined || typeof value !== "object") {
              paths.push(currentPath);
            } else {
              paths.push(...extractLeafPaths(value, currentPath));
            }
          }
          return paths;
        };
        requestLeafPaths = extractLeafPaths(parsed);
      } catch {}

      // Check if all request fields are mapped
      const unmappedRequestFields = requestLeafPaths.filter(path => !item.requestMappings[path] || !String(item.requestMappings[path]?.targetField || item.requestMappings[path] || "").trim());
      if (unmappedRequestFields.length > 0) {
        setSaveStatus({ 
          type: "error", 
          msg: `Request Type ${typeIndex + 1}: ${unmappedRequestFields.length} request field${unmappedRequestFields.length > 1 ? 's are' : ' is'} not mapped. All fields must be mapped to a canonical field.` 
        });
        return;
      }

      // Get all leaf paths from response payload
      let responseLeafPaths = [];
      try {
        const parsed = JSON.parse(item.responsePayload || "{}");
        const extractLeafPaths = (obj, path = "") => {
          if (!obj || typeof obj !== "object") return [path];
          if (Array.isArray(obj)) {
            if (obj.length === 0) return [`${path}[]`];
            if (typeof obj[0] === "object") return extractLeafPaths(obj[0], `${path}[]`);
            return [`${path}[]`];
          }
          const paths = [];
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (value === null || value === undefined || typeof value !== "object") {
              paths.push(currentPath);
            } else {
              paths.push(...extractLeafPaths(value, currentPath));
            }
          }
          return paths;
        };
        responseLeafPaths = extractLeafPaths(parsed);
      } catch {}

      // Check if all response fields are mapped
      const unmappedResponseFields = responseLeafPaths.filter(path => !item.responseMappings[path] || !String(item.responseMappings[path]?.targetField || item.responseMappings[path] || "").trim());
      if (unmappedResponseFields.length > 0) {
        setSaveStatus({ 
          type: "error", 
          msg: `Request Type ${typeIndex + 1}: ${unmappedResponseFields.length} response field${unmappedResponseFields.length > 1 ? 's are' : ' is'} not mapped. All fields must be mapped to a canonical field.` 
        });
        return;
      }
    }

    if (!adapterId) {
      setSaveStatus({ type: "error", msg: "Adapter ID is missing." });
      return;
    }

    if (!override.skipWizard) {
      const candidates = collectProtectionCandidates();
      if (candidates.length > 0) {
        openProtectionWizard(candidates);
        return;
      }
    }

    setSaveStatus({ type: "loading", msg: "" });

    try {
      const protectionSelections = override.protectionSelections || {};
      const configurations = requestTypes.map((item, index) => {
        const baseConfig = buildRequestTypeConfig(item);
        const protectionRules = buildProtectionRulesForConfig(baseConfig, canonicalFields, protectionSelections);
        const config = buildRequestTypeConfig(item, protectionRules);
        const label = config.requestName.replace(/\s+/g, "_");
        return {
          configId: `${adapterFormat}_${label || index + 1}`,
          sourceFormat: adapterFormat,
          targetFormat: adapterFormat,
          ...config,
        };
      });
      const payload = {
        adapterId,
        sourceFormat: adapterFormat,
        targetFormat: adapterFormat,
        configurations,
      };

      if (isOutbound) {
        await upsertOutboundConfiguration(adapterId, null, payload);
      } else {
        await upsertInboundConfiguration(adapterId, null, payload);
      }

      setSaveStatus({ type: "success", msg: "Request type configurations saved successfully." });
      setTimeout(() => {
        setSaveStatus({ type: "idle", msg: "" });
        onBack?.();
      }, 1200);
    } catch (error) {
      setSaveStatus({ type: "error", msg: getApiErrorMessage(error) });
    }
  }

  return (
    <div className="mf-page">
      <section className="rule-builder">
        {requestTypes.map((requestType, typeIndex) => {
          return (
            <div className="rule-row" key={typeIndex}>
              <div className="rule-fields" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 2 }}>
                  <div>
                    <p className="mf-eyebrow" style={{ marginBottom: 4 }}>Request Type {typeIndex + 1}</p>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--heading)" }}>
                      {adapter?.name || title}
                    </h3>
                  </div>
                  {requestTypes.length > 1 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ color: "var(--danger)", fontSize: 12 }}
                      onClick={() => handleRemoveRequestType(typeIndex)}
                    >
                      <i className="ti ti-trash" /> Remove
                    </button>
                  )}
                </div>

                <div className="field">
                  <label>Request Name</label>
                  <input
                    type="text"
                    value={requestType.requestName}
                    placeholder="e.g. BALANCE_ENQUIRY"
                    onChange={event => setRequestTypeField(typeIndex, "requestName", event.target.value)}
                  />
                </div>

                <div className="mf-code-window">
                  <div className="mf-code-bar">
                    <div>
                      <span style={{ background: "#ff5f57" }} />
                      <span style={{ background: "#febc2e" }} />
                      <span style={{ background: "#28c840" }} />
                    </div>
                    <strong><i className="ti ti-terminal" /> REQUEST TYPE DEFINITION</strong>
                  </div>
                  <textarea
                    value={requestType.requestPayload}
                    onChange={event => {
                      setRequestTypeField(typeIndex, "requestPayload", event.target.value);
                      setRequestTypeField(typeIndex, "requestExtractError", "");
                    }}
                    placeholder='{\n  "cust": "",\n  "mcc": "",\n  "amount": ""\n}'
                    spellCheck="false"
                    readOnly={String(adapterFormat).toUpperCase() === "ISO8583" || String(adapterFormat).toUpperCase() === "ISO20022"}
                  />
                  {(String(adapterFormat).toUpperCase() === "ISO8583" || String(adapterFormat).toUpperCase() === "ISO20022") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span className="mf-pci-badge"><i className="ti ti-shield-lock" /> PROTOCOL LOCK</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Free-text request schema is disabled in normal protocol mode.</span>
                    </div>
                  )}
                </div>
                {requestType.requestExtractError && <span className="field-error-msg">{requestType.requestExtractError}</span>}
                {requestType.requestExtractSuccess && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600, display: "block", marginTop: 8 }}>{requestType.requestExtractSuccess}</span>}

                <TreeMappingBuilder
                  payload={requestType.requestPayload}
                  mappings={requestType.requestMappings}
                  onMappingsChange={(updated) => setRequestTypeField(typeIndex, "requestMappings", updated)}
                  canonicalFields={(() => {
                    console.log('[BEFORE_MAP] sortedCanonicalFields length:', sortedCanonicalFields.length);
                    console.log('[BEFORE_MAP] Test fields in sortedCanonicalFields:', sortedCanonicalFields.filter(f => ["partnerTier","customerSegment","error"].includes(f.fieldName)));
                    
                    const mapped = sortedCanonicalFields.map(f => {
                      const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
                      const display = f.displayName || f.name || f.label || f.description || fieldNameValue;
                      // Debug: log the field structure
                      if (typeIndex === 0 && sortedCanonicalFields.indexOf(f) < 3) {
                        console.log('[DEBUG] Canonical field:', { fieldName: fieldNameValue, displayName: display, raw: f });
                      }
                      return { fieldName: fieldNameValue, displayName: display, name: display };
                    });
                    
                    console.log('[AFTER_MAP] mapped length:', mapped.length);
                    console.log('[AFTER_MAP] Test fields in mapped:', mapped.filter(f => ["partnerTier","customerSegment","error"].includes(f.fieldName)));
                    
                    return mapped;
                  })()}
                  label="Request Payload Schema"
                  onAutoMatch={() => handleAutoMatch(typeIndex, "requestMappings")}
                  onCanonicalFieldsRefresh={(newField) => {
                    if (!newField) return;
                    setCanonicalFields((current) => {
                      const next = Array.isArray(current) ? [...current] : [];
                      const fieldNameValue = newField.fieldName || newField.referenceId || newField.fieldId || newField.code || newField.name || "";
                      if (!fieldNameValue) return next;
                      const exists = next.some((field) => String(field.fieldName || field.referenceId || field.fieldId || field.code || field.name || "").toLowerCase() === String(fieldNameValue).toLowerCase());
                      if (exists) return next;
                      return [...next, newField];
                    });
                  }}
                />

                <div className="mf-code-window">
                  <div className="mf-code-bar">
                    <div>
                      <span style={{ background: "#ff5f57" }} />
                      <span style={{ background: "#febc2e" }} />
                      <span style={{ background: "#28c840" }} />
                    </div>
                    <strong><i className="ti ti-terminal" /> RESPONSE PAYLOAD DEFINITION</strong>
                  </div>
                  <textarea
                    value={requestType.responsePayload}
                    onChange={event => {
                      setRequestTypeField(typeIndex, "responsePayload", event.target.value);
                      setRequestTypeField(typeIndex, "responseExtractError", "");
                    }}
                    placeholder='{\n  "status": "",\n  "message": "",\n  "referenceNo": ""\n}'
                    spellCheck="false"
                    readOnly={String(adapterFormat).toUpperCase() === "ISO8583" || String(adapterFormat).toUpperCase() === "ISO20022"}
                  />
                  {(String(adapterFormat).toUpperCase() === "ISO8583" || String(adapterFormat).toUpperCase() === "ISO20022") && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span className="mf-pci-badge"><i className="ti ti-shield-lock" /> PROTOCOL LOCK</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Free-text response schema is disabled in normal protocol mode.</span>
                    </div>
                  )}
                </div>
                {requestType.responseExtractError && <span className="field-error-msg">{requestType.responseExtractError}</span>}
                {requestType.responseExtractSuccess && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600, display: "block", marginTop: 8 }}>{requestType.responseExtractSuccess}</span>}

                <TreeMappingBuilder
                  payload={requestType.responsePayload}
                  mappings={requestType.responseMappings}
                  onMappingsChange={(updated) => setRequestTypeField(typeIndex, "responseMappings", updated)}
                  canonicalFields={(() => {
                    const mapped = sortedCanonicalFields.map(f => {
                      const fieldNameValue = f.fieldName || f.referenceId || f.fieldId || f.code || f.name || "";
                      const display = f.displayName || f.name || f.label || f.description || fieldNameValue;
                      return { fieldName: fieldNameValue, displayName: display, name: display };
                    });
                    return mapped;
                  })()}
                  label="Response Payload Schema"
                  onAutoMatch={() => handleAutoMatch(typeIndex, "responseMappings")}
                  onCanonicalFieldsRefresh={(newField) => {
                    if (!newField) return;
                    setCanonicalFields((current) => {
                      const next = Array.isArray(current) ? [...current] : [];
                      const fieldNameValue = newField.fieldName || newField.referenceId || newField.fieldId || newField.code || newField.name || "";
                      if (!fieldNameValue) return next;
                      const exists = next.some((field) => String(field.fieldName || field.referenceId || field.fieldId || field.code || field.name || "").toLowerCase() === String(fieldNameValue).toLowerCase());
                      if (exists) return next;
                      return [...next, newField];
                    });
                  }}
                />

              </div>
            </div>
          );
        })}

        <div style={{ padding: "8px 0 0" }}>
          <button type="button" className="btn-ghost" onClick={handleAddRequestType}>
            <i className="ti ti-plus" /> Add Request Type
          </button>
        </div>

        {requestTypes.some(item => (
          Object.keys(item.requestMappings || {}).length > 0
          || Object.keys(item.responseMappings || {}).length > 0
          || Object.keys(item.protectionRules || {}).length > 0
        )) && (
          <div className="mf-code-window" style={{ marginTop: 16 }}>
            <div className="mf-code-bar">
              <div>
                <span style={{ background: "#ff5f57" }} />
                <span style={{ background: "#febc2e" }} />
                <span style={{ background: "#28c840" }} />
              </div>
              <strong>Grouped Payload Preview (Visual Only)</strong>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>Arrays are grouped for readability</span>
            </div>
            <pre>{payloadPreview}</pre>
          </div>
        )}
      </section>

      {/* Protection Rules Section - Moved to End */}
      <section className="rule-builder" style={{ marginTop: 20 }}>
        {requestTypes.map((requestType, typeIndex) => {
          const allFields = [
            ...Object.keys(requestType.requestMappings || {}).map(path => ({ name: path, source: "request" })),
            ...Object.keys(requestType.responseMappings || {}).map(path => ({ name: path, source: "response" }))
          ].filter(f => f.name?.trim());

          if (allFields.length === 0) return null;

          return (
            <div key={`protection-${typeIndex}`} className="rule-row">
              <div className="rule-fields" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
                <div className="mf-panel">
                  <div className="mf-panel-head">
                    <div>
                      <span>Protection Rules - {requestType.requestName || `Request Type ${typeIndex + 1}`}</span>
                      <p style={{ fontSize: 11, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.5 }}>
                        Select a protection strategy for each payload field.
                      </p>
                    </div>
                  </div>
                  <div className="mf-grid-row mf-grid-row--head" style={{ gridTemplateColumns: "1fr 180px" }}>
                    <span>Field</span>
                    <span>Protection</span>
                  </div>
                  {allFields.map((field, idx) => (
                    <div className="mf-grid-row" key={`${field.name}-${idx}`} style={{ gridTemplateColumns: "1fr 180px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
                        <strong style={{ fontSize: 12, fontFamily: "monospace", color: "var(--heading)" }}>{field.name}</strong>
                        <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>({field.source})</span>
                      </div>
                      <select
                        value={requestType.protectionRules[field.name] || "NONE"}
                        onChange={event => {
                          const strategy = event.target.value;
                          updateRequestType(typeIndex, item => ({
                            ...item,
                            protectionRules: {
                              ...item.protectionRules,
                              [field.name]: strategy
                            }
                          }));
                        }}
                      >
                        <option value="NONE">NONE</option>
                        <option value="MASK">MASK</option>
                        <option value="HASH">HASH</option>
                        <option value="ENCRYPT">ENCRYPT</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {protectionModal && (
        <div className="modal-backdrop" onClick={() => setProtectionModal(null)}>
          <div className="status-modal" style={{ width: "min(760px, 96vw)" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0 }}>PCI Protection Wizard</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Choose a protection strategy for each protected canonical field before saving.
                </p>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setProtectionModal(null)}>
                <i className="ti ti-x" /> Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto" }}>
              {protectionModal.candidates.map((candidate) => {
                const key = `${candidate.typeIndex}:${candidate.direction}:${candidate.sourceField}:${candidate.canonicalField}`;
                const current = protectionModal.selections[key]?.strategy || "";
                return (
                  <div key={key} style={{ padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-soft)", display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 800 }}>Field Name</p>
                        <strong>{candidate.sourceField}</strong>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 800 }}>Canonical Field</p>
                        <strong>{candidate.canonicalField}</strong>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 800 }}>Recommended Protection</p>
                        <strong>{candidate.recommendedProtection || "Review required"}</strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["MASK", "HASH", "ENCRYPT"].map((strategy) => (
                        <button
                          key={strategy}
                          type="button"
                          className={`btn-ghost ${current === strategy ? "active" : ""}`}
                          onClick={() => updateProtectionSelection(key, strategy)}
                          style={{
                            borderColor: current === strategy ? "var(--primary)" : "var(--border)",
                            background: current === strategy ? "var(--primary-soft)" : "transparent",
                            fontSize: 12,
                          }}
                        >
                          {strategy}
                          {candidate.recommendedProtection === strategy ? " (recommended)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-ghost" onClick={() => setProtectionModal(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={applyProtectionSelections}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "20px 0 0", borderTop: "1px solid var(--border)", marginTop: 8 }}>
        {saveStatus.type === "error" && <span style={{ color: "var(--danger)", fontSize: 14, marginRight: "auto" }}>{saveStatus.msg}</span>}
        {saveStatus.type === "success" && <span style={{ color: "var(--success)", fontSize: 14, marginRight: "auto" }}>{saveStatus.msg}</span>}
        <button type="button" className="btn-ghost" onClick={onBack}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSave()}
          disabled={saveStatus.type === "loading"}
        >
          {saveStatus.type === "loading"
            ? <><i className="ti ti-loader-2 spin" /> Saving...</>
            : <><i className="ti ti-check" /> Save Request Types</>}
        </button>
      </div>

      {autoMatchModal && (
        <AutoMatchPreviewModal
          matches={autoMatchModal.matches}
          onAccept={applyAutoMatches}
          onCancel={() => setAutoMatchModal(null)}
        />
      )}
    </div>
  );
}
