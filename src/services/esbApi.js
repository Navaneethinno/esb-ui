import axios from "axios";
import { APP_CONFIG } from "../config/theme";
import { cachedFetch } from "../utils/apiCache";

const browserOrigin =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost:5173";

const baseURL =
  import.meta.env.VITE_ESB_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : APP_CONFIG.api.fallbackBaseUrl);

console.log("API BASE:", baseURL);

const rootBaseURL = (() => {
  if (import.meta.env.VITE_ESB_ROOT_BASE_URL) {
    return import.meta.env.VITE_ESB_ROOT_BASE_URL;
  }
  return import.meta.env.DEV ? browserOrigin : baseURL.replace(/\/api\/?$/, "");
})();

const api = axios.create({
  baseURL,
  timeout: 15000, // Reduced from 30s to 15s
  headers: {
    "Content-Type": "application/json",
  },
});

const rootApi = axios.create({
  baseURL: rootBaseURL,
  timeout: 15000, // Reduced from 30s to 15s
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (APP_CONFIG.api.enableDebugLogs) {
    const requestUrl = `${config.baseURL || ""}${config.url || ""}`;
    console.info("[InnoBridge API] Request", config.method?.toUpperCase(), requestUrl);
    console.log("REQUEST URL:", requestUrl);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (APP_CONFIG.api.enableDebugLogs) {
      console.info(
        "[InnoBridge API] Response",
        response.status,
        response.config.method?.toUpperCase(),
        response.config.url,
      );
    }
    return response;
  },
  (error) => {
    if (APP_CONFIG.api.enableDebugLogs) {
      console.error(
        "[InnoBridge API] Error",
        error.response?.status || "NO_RESPONSE",
        error.config?.method?.toUpperCase(),
        error.config?.url,
        getApiErrorMessage(error),
      );
    }
    return Promise.reject(error);
  },
);

rootApi.interceptors.request.use((config) => {
  if (APP_CONFIG.api.enableDebugLogs) {
    const requestUrl = `${config.baseURL || ""}${config.url || ""}`;
    console.info("[InnoBridge API] Request", config.method?.toUpperCase(), requestUrl);
    console.log("REQUEST URL:", requestUrl);
  }
  return config;
});

rootApi.interceptors.response.use(
  (response) => {
    if (APP_CONFIG.api.enableDebugLogs) {
      console.info(
        "[InnoBridge API] Response",
        response.status,
        response.config.method?.toUpperCase(),
        response.config.url,
      );
    }
    return response;
  },
  (error) => {
    if (APP_CONFIG.api.enableDebugLogs) {
      console.error(
        "[InnoBridge API] Error",
        error.response?.status || "NO_RESPONSE",
        error.config?.method?.toUpperCase(),
        error.config?.url,
        getApiErrorMessage(error),
      );
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please check your connection and try again.";
  }

  if (!error.response) {
    return "Unable to reach the service. Please try again in a moment.";
  }

  const status = error.response.status;
  const backendMessage =
    error.response.data?.message ||
    error.response.data?.detail ||
    error.response.data?.error;

  if (backendMessage && typeof backendMessage === "string" && !backendMessage.toLowerCase().includes("traceback") && !backendMessage.toLowerCase().includes("exception")) {
    return backendMessage;
  }

  if (status === 400) return "Some of the information provided is invalid. Please review and try again.";
  if (status === 401 || status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return "The requested resource could not be found.";
  if (status === 409) return "A configuration with this name already exists. Please use a different name.";
  if (status === 422) return "Please fill in all required fields correctly before submitting.";
  if (status >= 500) return "Something went wrong. Please try again or contact support if the issue persists.";

  return "The request could not be completed. Please try again.";
}

function unwrapList(data) {
  data = parseJsonString(data);
  if (Array.isArray(data)) {
    return data;
  }
  return data?.adapters || data?.fees || data?.data || data?.items || data?.results || [];
}

function normalizeFeeRecord(fee) {
  if (!fee || typeof fee !== "object") {
    return fee;
  }

  const normalizedFeeId = fee.feeId ?? fee.id ?? fee.fee_id ?? null;
  const normalizedCreatedBy = fee.createdBy ?? fee.createdByUser ?? fee.created_by_user ?? fee.created_by ?? fee.username ?? null;
  const normalizedUpdatedBy = fee.updatedBy ?? fee.updatedByUser ?? fee.updated_by_user ?? fee.updated_by ?? fee.username ?? null;
  const normalizedCalculationType = fee.calculationType ?? fee.calcType ?? fee.feeType ?? fee.fee_type ?? null;

  return {
    ...fee,
    ...(normalizedFeeId !== null ? { feeId: normalizedFeeId } : {}),
    ...(normalizedCreatedBy !== null ? { createdBy: normalizedCreatedBy } : {}),
    ...(normalizedUpdatedBy !== null ? { updatedBy: normalizedUpdatedBy } : {}),
    ...(normalizedCalculationType !== null ? { calculationType: normalizedCalculationType, calcType: normalizedCalculationType } : {}),
  };
}

function parseJsonString(data) {
  if (typeof data !== "string") {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export async function listInboundAdapters(username) {
  const cacheKey = `inbound-adapters:${username || "all"}`;
  let result = [];

  await cachedFetch(
    cacheKey,
    async () => {
      const response = await api.get("/inbound-adapters", {
        params: username ? { username } : undefined,
      });
      return unwrapList(response.data);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  );

  return result;
}

export async function getInboundAdapter(adapterId) {
  const response = await api.get(`/inbound-adapters/${adapterId}`);
  return response.data;
}

export async function createInboundAdapter(payload) {
  const response = await api.post("/inbound-adapters", payload);
  return response.data;
}

export async function updateInboundAdapter(adapterId, payload) {
  const response = await api.put(`/inbound-adapters/${adapterId}`, payload);
  return response.data;
}

export async function upsertInboundConfiguration(adapterId, configId, payload) {
  const path = configId
    ? `/inbound-adapters/${adapterId}/configurations/${configId}`
    : `/inbound-adapters/${adapterId}/configurations`;
  const method = configId ? "put" : "post";
  const response = await api[method](path, payload);
  return response.data;
}

export async function getInboundAdapterConfigurations(adapterId) {
  const response = await api.get(`/inbound-adapters/${adapterId}`);
  const data = parseJsonString(response.data);
  console.log('[getInboundAdapterConfigurations] Full response.data:', response.data);
  console.log('[getInboundAdapterConfigurations] Parsed data:', data);
  console.log('[getInboundAdapterConfigurations] data.configurations:', data?.configurations);
  console.log('[getInboundAdapterConfigurations] data.configs:', data?.configs);
  console.log('[getInboundAdapterConfigurations] data.data?.configurations:', data?.data?.configurations);
  console.log('[getInboundAdapterConfigurations] data.adapter?.configurations:', data?.adapter?.configurations);
  
  const configs = data?.configurations || data?.configs || data?.data?.configurations || data?.adapter?.configurations || [];
  console.log('[getInboundAdapterConfigurations] Final extracted configs:', configs);
  return Array.isArray(configs) ? configs : [];
}

export async function startAdapter(adapterId) {
  const response = await api.post(`/inbound-adapters/${adapterId}/start`);
  return response.data;
}

export async function stopAdapter(adapterId) {
  const response = await api.post(`/inbound-adapters/${adapterId}/stop`);
  return response.data;
}

export async function triggerInboundAdapter(adapterId, payload) {
  const response = await api.post(`/inbound-adapters/${adapterId}/trigger`, payload);
  return response.data;
}

export async function triggerRuntimeAdapter(adapterName, requestType, payload) {
  const response = await api.post(`/runtime/${encodeURIComponent(adapterName)}/${encodeURIComponent(requestType)}`, payload);
  return response.data;
}

export async function listOutboundAdapters(username) {
  const cacheKey = `outbound-adapters:${username || "all"}`;
  let result = [];

  await cachedFetch(
    cacheKey,
    async () => {
      const response = await api.get("/outbound-adapters", {
        params: username ? { username } : undefined,
      });
      return unwrapList(response.data);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  );

  return result;
}

export async function getOutboundAdapter(outboundId) {
  const response = await api.get(`/outbound-adapters/${outboundId}`);
  return response.data;
}

export async function getOutboundAdapterConfigurations(outboundId) {
  const response = await api.get(`/outbound-adapters/${outboundId}`);
  const data = parseJsonString(response.data);
  console.log('[getOutboundAdapterConfigurations] Full response.data:', response.data);
  console.log('[getOutboundAdapterConfigurations] Parsed data:', data);
  console.log('[getOutboundAdapterConfigurations] data.configurations:', data?.configurations);
  console.log('[getOutboundAdapterConfigurations] data.configs:', data?.configs);
  console.log('[getOutboundAdapterConfigurations] data.data?.configurations:', data?.data?.configurations);
  console.log('[getOutboundAdapterConfigurations] data.adapter?.configurations:', data?.adapter?.configurations);
  
  const configs = data?.configurations || data?.configs || data?.data?.configurations || data?.adapter?.configurations || [];
  console.log('[getOutboundAdapterConfigurations] Final extracted configs:', configs);
  return Array.isArray(configs) ? configs : [];
}

export async function getAdapterConfigurationBundle(adapterId) {
  const response = await api.get(`/adapter-configurations/${adapterId}`);
  return response.data;
}

export async function createOutboundConfiguration(outboundId, payload) {
  const response = await api.post(`/outbound-adapters/${outboundId}/configurations`, payload);
  return response.data;
}

export async function updateOutboundConfiguration(outboundId, configId, payload) {
  const response = await api.put(`/outbound-adapters/${outboundId}/configurations/${configId}`, payload);
  return response.data;
}

export async function upsertOutboundConfiguration(outboundId, configId, payload) {
  const path = configId
    ? `/outbound-adapters/${outboundId}/configurations/${configId}`
    : `/outbound-adapters/${outboundId}/configurations`;
  const method = configId ? "put" : "post";
  const response = await api[method](path, payload);
  return response.data;
}

export async function createOutboundAdapter(payload) {
  const response = await api.post("/outbound-adapters", payload);
  return response.data;
}

export async function updateOutboundAdapter(outboundId, payload) {
  const response = await api.put(`/outbound-adapters/${outboundId}`, payload);
  return response.data;
}

export async function createAdapterConfig(payload) {
  const response = await api.post("/adapter-configs", payload);
  return response.data;
}

export async function createLinkedAdapterConfiguration(payload) {
  const response = await api.post("/adapter-configurations", payload);
  return response.data;
}

export async function saveLinkedAdapterMapping(payload) {
  const response = await api.post("/adapter-configurations/save-mapping", payload);
  return response.data;
}

export async function listLinkedAdapterConfigurations() {
  let result = [];

  await cachedFetch(
    "linked-adapter-configurations",
    async () => {
      const response = await api.get("/adapter-configurations");
      return unwrapList(response.data);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  );

  return result;
}

export async function getAdapterConfiguration(adapterId) {
  const response = await api.get(`/adapter-configurations/${adapterId}`);
  return response.data;
}

export async function deleteAdapterConfiguration(adapterId) {
  const response = await api.delete(`/adapter-configurations/${adapterId}`);
  return response.data;
}

export async function listUsers() {
  let result = [];

  await cachedFetch(
    "users",
    async () => {
      const response = await api.get("/users");
      return response.data?.users || unwrapList(response.data);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 10 * 60 * 1000, // 10 minutes
    },
  );

  return result;
}

export async function listUserAdapters(username) {
  const response = await api.get(`/users/${encodeURIComponent(username)}/adapters`);
  return response.data?.adapters || unwrapList(response.data);
}

export async function getMetrics(username) {
  const response = await rootApi.get("/metrics", {
    params: username ? { username } : undefined,
  });
  return parseJsonString(response.data);
}

export async function getHealth(username) {
  const response = await rootApi.get("/health", {
    params: username ? { username } : undefined,
  });
  return parseJsonString(response.data);
}

export async function getRecentLogs(username) {
  const cacheKey = `recent-logs:${username || "all"}`;
  let result = [];

  await cachedFetch(
    cacheKey,
    async () => {
      const response = await api.get("/logs/recent", {
        params: username ? { username } : undefined,
      });
      return unwrapList(response.data);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 2 * 60 * 1000, // 2 minutes
    },
  );

  return result;
}

export async function updateLinkedAdapterConfiguration(adapterId, payload) {
  const response = await api.put(`/adapter-configurations/${adapterId}`, payload);
  return response.data;
}

export async function listRequestTypes(options = {}) {
  const { format, adapterId, side } = options || {};
  const params = {};
  if (format) params.format = format;
  if (adapterId) params.adapterId = adapterId;
  if (side) params.side = side;
  const response = await api.get("/request-type/list", {
    params: Object.keys(params).length ? params : undefined,
  });
  return unwrapList(response.data);
}

export async function getRequestTypeContract(requestType) {
  const response = await api.get(`/request-type/contract/${requestType}`);
  return response.data;
}

export async function resolveRequestAliases(payload) {
  const response = await api.post("/request-type/resolve", payload);
  return response.data;
}

export async function suggestCanonicalMapping(payload) {
  const response = await api.post("/canonical/suggest", payload);
  return response.data;
}

export async function validateCustomFunction(payload) {
  const response = await api.post("/validate-custom-function", payload);
  return response.data;
}

export async function transformPayload(payload) {
  const response = await api.post("/v1/esb/transform", payload);
  return response.data;
}

export async function executePayload(payload) {
  const response = await api.post("/v1/esb/execute", payload);
  return response.data;
}

export async function uploadInputFile(formData) {
  const response = await api.post("/v1/esb/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function listAllAdapters() {
  const response = await api.get("/adapter-configurations");
  const data = response.data;
  return Array.isArray(data) ? data : data?.adapters || data?.data || data?.items || data?.results || [];
}

export async function getAuditLogs(username) {
  const response = await api.get("/audit-logs", {
    params: username ? { username } : undefined,
  });
  const data = response.data;
  return Array.isArray(data) ? data : data?.audit_logs ?? [];
}

export async function getAdapterExecutions(adapterId) {
  const response = await api.get(`/adapter-configurations/${adapterId}/executions`);
  const data = response.data;
  return Array.isArray(data)
    ? data
    : data?.executions ?? data?.data ?? data?.items ?? data?.results ?? [];
}

export async function getAdapterExecutionsBundle(adapterId) {
  const response = await api.get(`/adapter-configurations/${adapterId}/executions`);
  return response.data;
}

export async function getAdapterAnalytics(adapterId) {
  const response = await api.get(`/adapter-analytics/${adapterId}`);
  return response.data;
}

export async function getAuditLogsForAdapter(username, adapterName) {
  const response = await api.get("/audit-logs", {
    params: username ? { username } : undefined,
  });
  const data = response.data;
  const rows = Array.isArray(data) ? data : data?.audit_logs ?? [];
  const normalizedName = String(adapterName || "").trim().toLowerCase();
  if (!normalizedName) return rows;

  return rows.filter((row) => {
    const inboundName = String(row?.inboundAdapterName ?? row?.inbound_adapter_name ?? row?.inboundAdapter ?? "").trim().toLowerCase();
    const outboundName = String(row?.outboundAdapterName ?? row?.outbound_adapter_name ?? row?.outboundAdapter ?? "").trim().toLowerCase();
    return inboundName === normalizedName || outboundName === normalizedName;
  });
}

export async function getCanonicalFields(format) {
  const { fetchCanonicalFields } = await import("./CanonicalFieldService");
  return fetchCanonicalFields(format);
}

export async function getFormats() {
  const response = await api.get("/request-type/formats");
  const data = response.data;
  // API returns array of {code, displayName} objects or a wrapper {formats: [...]}
  const raw = Array.isArray(data) ? data : data?.formats || data?.data || data?.items || data?.results || [];
  return raw.map(item => typeof item === "string" ? item : (item.code || item.displayName || "")).filter(Boolean);
}

export async function getFormatSubtypes(format) {
  const response = await api.get(`/request-type/formats/${format}/subtypes`);
  const data = response.data;
  const raw = Array.isArray(data) ? data : data?.subtypes || data?.data || data?.items || data?.results || [];
  return raw.map(item => typeof item === "string" ? item : (item.requestType || item.id || item.code || item.displayName || "")).filter(Boolean);
}

function unwrapMetadataList(data, keys = []) {
  const parsed = parseJsonString(data);
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }
  return parsed.data || parsed.items || parsed.results || [];
}

export async function getIso8583Mtis() {
  const response = await api.get("/protocols/iso8583/mtis");
  const raw = unwrapMetadataList(response.data, ["mtis", "mtiList", "messages", "data", "items", "results"]);
  const mapped = raw.map((item) => {
    if (typeof item === "string") {
      return {
        mti: item.trim(),
        name: "",
        type: "",
        direction: "",
        raw: item,
      };
    }
    return {
      mti: String(item?.mti || item?.code || item?.value || item?.id || "").trim(),
      name: String(item?.name || item?.displayName || item?.label || "").trim(),
      type: String(item?.type || item?.category || item?.direction || "").trim(),
      direction: String(item?.direction || "").trim(),
      raw: item,
    };
  }).filter(item => item.mti);

  if (mapped.length > 0) return mapped;

  return [
    { mti: "0200", name: "Financial Transaction Request", type: "request", direction: "request", raw: { mti: "0200" } },
    { mti: "0210", name: "Financial Transaction Response", type: "response", direction: "response", raw: { mti: "0210" } },
    { mti: "0420", name: "Reversal Advice", type: "request", direction: "request", raw: { mti: "0420" } },
    { mti: "0430", name: "Reversal Response", type: "response", direction: "response", raw: { mti: "0430" } },
    { mti: "0800", name: "Network Management Request", type: "request", direction: "request", raw: { mti: "0800" } },
    { mti: "0810", name: "Network Management Response", type: "response", direction: "response", raw: { mti: "0810" } },
  ];
}

export async function getIso8583Fields(mti) {
  const response = await api.get(`/protocols/iso8583/mtis/${encodeURIComponent(mti)}/fields`);
  return unwrapMetadataList(response.data, ["fields", "dataElements", "de", "elements"]).map(item => ({
    number: String(item.number || item.de || item.fieldNumber || item.id || "").trim(),
    name: String(item.name || item.label || item.displayName || "").trim(),
    required: Boolean(item.required),
    optional: item.optional == null ? !Boolean(item.required) : Boolean(item.optional),
    type: String(item.type || item.format || item.valueType || "").trim(),
    maxLength: item.maxLength ?? item.length ?? item.size ?? "",
    responseOnly: Boolean(item.responseOnly),
    raw: item,
  })).filter(item => item.number || item.name);
}

export async function getIso20022Families() {
  const response = await api.get("/protocols/iso20022/families");
  return unwrapMetadataList(response.data, ["families", "familyList"]).map(item => ({
    family: String(item.family || item.code || item.id || "").trim(),
    description: String(item.description || item.name || item.label || "").trim(),
    raw: item,
  })).filter(item => item.family);
}

export async function getIso20022Messages(family) {
  const response = await api.get(`/protocols/iso20022/families/${encodeURIComponent(family)}/messages`);
  return unwrapMetadataList(response.data, ["messages", "messageTypes", "subtypes"]).map(item => ({
    messageId: String(item.messageId || item.code || item.id || "").trim(),
    version: String(item.version || item.msgVersion || "").trim(),
    name: String(item.name || item.displayName || item.label || "").trim(),
    description: String(item.description || "").trim(),
    responseOnly: Boolean(item.responseOnly),
    raw: item,
  })).filter(item => item.messageId);
}

export async function getIso20022Fields(messageId) {
  const response = await api.get(`/protocols/iso20022/messages/${encodeURIComponent(messageId)}/fields`);
  return unwrapMetadataList(response.data, ["fields", "nodes", "elements"]).map(item => ({
    path: String(item.path || item.xpath || item.node || item.name || "").trim(),
    name: String(item.name || item.label || item.displayName || "").trim(),
    required: Boolean(item.required),
    optional: item.optional == null ? !Boolean(item.required) : Boolean(item.optional),
    type: String(item.type || item.format || item.valueType || "").trim(),
    responseOnly: Boolean(item.responseOnly),
    extensionAllowed: Boolean(item.extensionAllowed || item.isExtension),
    raw: item,
  })).filter(item => item.path || item.name);
}

export async function deleteInboundConfiguration(adapterId, configId) {
  const response = await api.delete(`/inbound-adapters/${adapterId}/configurations/${configId}`);
  return response.data;
}

export async function deleteOutboundConfiguration(outboundId, configId) {
  const response = await api.delete(`/outbound-adapters/${outboundId}/configurations/${configId}`);
  return response.data;
}

export async function listFees() {
  let result = [];
  await cachedFetch(
    "fees",
    async () => {
      const response = await api.get("/fees");
      return unwrapList(response.data).map(normalizeFeeRecord);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  );
  return result;
}

export async function getFees(username) {
  let result = [];
  await cachedFetch(
    `fees:${username || "all"}`,
    async () => {
      const response = await api.get("/fees", {
        params: username ? { username } : undefined,
      });
      return unwrapList(response.data).map(normalizeFeeRecord);
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
      },
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  );
  return result;
}

export async function getFee(feeId) {
  const response = await api.get(`/fees/${feeId}`);
  return normalizeFeeRecord(response.data);
}

export async function getFeeUsage(feeId) {
  const response = await api.get(`/fees/${feeId}/usage`);
  return response.data;
}

export async function createFee(payload) {
  const response = await api.post("/fees", payload);
  return response.data;
}

export async function updateFee(feeId, payload) {
  const response = await api.put(`/fees/${feeId}`, payload);
  return response.data;
}

export async function deleteFee(feeId) {
  const response = await api.delete(`/fees/${feeId}`);
  return response.data;
}
