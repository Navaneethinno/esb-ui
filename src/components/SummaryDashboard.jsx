import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getApiErrorMessage,
  getAuditLogs,
  getMetrics,
  getRecentLogs,
  listInboundAdapters,
  listOutboundAdapters,
} from "../services/esbApi";
import { safeDisplayValue, safeStringifyMasked } from "../utils/maskSensitive";

const MESSAGE_FORMATS = ["JSON", "XML", "ISO8583", "ISO20022", "CSV"];
const TRANSPORT_PROTOCOLS = ["HTTP", "HTTPS", "TCP"];

const DONUT_COLORS = {
  json:    "#3B82F6",
  xml:     "#10B981",
  iso8583: "#F59E0B",
  iso20022:"#8B5CF6",
  csv:     "#EC4899",
  fixed:   "#64748B",
  other:   "#E5E7EB",
};

const KPI_SPARKLINES = {
  success: [
    { value: 87 },
    { value: 91 },
    { value: 89 },
    { value: 94 },
    { value: 96 },
    { value: 98 },
  ],
  latency: [
    { value: 44 },
    { value: 38 },
    { value: 47 },
    { value: 35 },
    { value: 31 },
    { value: 28 },
  ],
};

function payloadFormatColor(label) {
  const key = String(label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "json")     return DONUT_COLORS.json;
  if (key === "xml")      return DONUT_COLORS.xml;
  if (key === "iso8583")  return DONUT_COLORS.iso8583;
  if (key === "iso20022") return DONUT_COLORS.iso20022;
  if (key === "csv")      return DONUT_COLORS.csv;
  if (key === "fixed")    return DONUT_COLORS.fixed;
  return DONUT_COLORS.other;
}

function transportColor(label) {
  const key = String(label || "").toUpperCase();
  if (key === "HTTP") return "#16a34a";
  if (key === "HTTPS") return "#2563eb";
  if (key === "TCP") return "#7c3aed";
  return "#E5E7EB";
}

function getValue(item, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((cur, key) => cur?.[key], item);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function asArray(data) {
  if (typeof data === "string") {
    try {
      return asArray(JSON.parse(data));
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) return data;
  return data?.logs || data?.adapters || data?.executions || data?.data || data?.items || data?.results || [];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function adapterId(adapter, index) {
  return String(getValue(adapter, ["adapter_id", "adapterId", "id", "_id"]) || index);
}

function resolveAdapterDisplayName(adapter, index) {
  const cfg = Array.isArray(adapter?.configurations) ? adapter.configurations[0] || {} : {};
  return (
    getValue(adapter, ["adapterName", "adapter_name", "name", "displayName"]) ||
    getValue(cfg, ["adapterName", "adapter_name", "name", "displayName"]) ||
    "Unnamed Adapter"
  );
}

function adapterName(adapter, index) {
  return resolveAdapterDisplayName(adapter, index);
}

function adapterType(adapter) {
  return String(getValue(adapter, ["type", "format", "inbound_format", "inboundFormat"]) || "Unknown");
}

function adapterTarget(adapter, index) {
  const cfg = Array.isArray(adapter.configurations) ? adapter.configurations[0] || {} : {};
  return (
    getValue(adapter, [
      "outbound_destination",
      "outboundDestination",
      "target_endpoint",
      "targetEndpoint",
      "outbound.name",
      "outbound.adapterName",
    ]) ||
    getValue(cfg, ["outboundDestination", "targetEndpoint", "targetFormat", "format"]) ||
    "Unnamed Adapter"
  );
}

function adapterRequestName(adapter, index) {
  const cfg = Array.isArray(adapter.configurations) ? adapter.configurations[0] || {} : {};
  return getValue(adapter, ["requestName", "request_name"]) || getValue(cfg, ["requestName", "request_name"]) || "Unnamed Adapter";
}

function triggerCount(adapter) {
  return toNumber(getValue(adapter, ["trigger_count", "triggerCount"]));
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (["success", "active", "ok", "completed"].includes(normalized)) return "success";
  if (["failed", "failure", "error"].includes(normalized)) return "error";
  if (["routed", "route_success"].includes(normalized)) return "route";
  return "idle";
}

function formatNumber(value, suffix = "") {
  if (value === "" || value === null || value === undefined) return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${Intl.NumberFormat().format(Math.round(num * 100) / 100)}${suffix}`;
}

function precisionForValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || Number.isInteger(num)) return 0;
  return 2;
}

function useCountUp(value, duration = 800) {
  const numericValue = Number(value);
  const target = Number.isFinite(numericValue) ? numericValue : 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, target]);

  return displayValue;
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function payloadText(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function metricValue(metrics, paths) {
  return getValue(metrics, paths);
}

function normalizeMetricsResponse(data) {
  if (typeof data !== "string") {
    return data || {};
  }

  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function isVisibleAdapter(adapter) {
  const name = String(adapter?.adapterName || adapter?.displayName || adapter?.name || "").toUpperCase();
  const status = String(adapter?.status || adapter?.runStatus || adapter?.run_status || adapter?.state || "").toLowerCase();
  const format = String(adapter?.formatType || adapter?.format_type || "").toUpperCase();
  return (
    name &&
    !name.startsWith("DEMO_") &&
    !name.startsWith("AUTO_") &&
    !["inactive", "disabled", "deleted"].includes(status) &&
    MESSAGE_FORMATS.includes(format)
  );
}

function buildFormatData(adapters) {
  const visibleAdapters = safeArray(adapters);
  const excluded = safeArray(adapters)
    .filter((adapter) => !isVisibleAdapter(adapter))
    .map((adapter) => adapter?.adapterName || adapter?.displayName || adapter?.name || "Unknown Adapter");

  const grouped = visibleAdapters.reduce((acc, adapter) => {
    const type = String(adapter?.format_type || adapter?.formatType || "").toUpperCase();
    if (!MESSAGE_FORMATS.includes(type)) return acc;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const chart = MESSAGE_FORMATS.map((fmt) => ({
    name: fmt,
    value: grouped[fmt] ?? 0,
  }));
  const protocolTotal = chart.reduce((sum, item) => sum + toNumber(item.value), 0);
  if (protocolTotal !== visibleAdapters.length) {
    console.error("[VALIDATION FAILED]", protocolTotal, visibleAdapters.length, excluded);
  }

  return {
    visibleAdapters,
    excluded,
    chart,
    protocolTotal,
  };
}

function buildTransportData(adapters) {
  const visibleAdapters = safeArray(adapters);

  const grouped = visibleAdapters.reduce((acc, adapter) => {
    const transport = String(adapter?.transport_protocol || adapter?.transportProtocol || "").toUpperCase();
    if (!TRANSPORT_PROTOCOLS.includes(transport)) return acc;
    acc[transport] = (acc[transport] || 0) + 1;
    return acc;
  }, {});

  return TRANSPORT_PROTOCOLS.map((protocol) => ({
    name: protocol,
    value: grouped[protocol] ?? 0,
  }));
}

function buildTransportDataFromMetrics(metrics) {
  const raw = safeArray(metrics?.transportDistribution || metrics?.transport_distribution);
  console.log("METRICS", metrics);
  console.log("transportDistribution", metrics?.transportDistribution || metrics?.transport_distribution);
  const transformed = raw
    .map((entry) => ({
      name: String(entry?.transportProtocol || entry?.transport_protocol || entry?.name || "").toUpperCase(),
      value: toNumber(entry?.count ?? entry?.value ?? 0),
    }))
    .filter((entry) => entry.name);
  console.log("transportDistributionChartData", transformed);
  return transformed.length ? transformed : TRANSPORT_PROTOCOLS.map((protocol) => ({ name: protocol, value: 0 }));
}

function buildLatencyTrend(metrics) {
  const raw =
    metricValue(metrics, [
      "latency_series",
      "latencySeries",
      "latency_trends",
      "latencyTrends",
      "latency_history",
      "latencyHistory",
      "percentileLatencySeries",
      "percentile_latency",
      "percentileLatency",
    ]) || [];
  const rows = Array.isArray(raw) ? raw : asArray(raw);

  return safeArray(rows).map((row, index) => ({
    label: getValue(row, ["label", "bucket", "timestamp", "created_at", "createdAt", "time"]) || `T${index + 1}`,
    latency: toNumber(getValue(row, ["latency", "value", "ms", "latency_ms", "latencyMs"])),
  })).filter((point) => point.latency > 0).slice(-24);
}

function buildLatencyTrendFromLogs(logs) {
  return safeArray(logs)
    .map((row, index) => {
      const latency = toNumber(getValue(row, ["latencyMs", "latency_ms", "latency"]));
      return {
        label: getValue(row, ["createdAt", "created_at", "timestamp"]) || `T${index + 1}`,
        latency,
      };
    })
    .filter((point) => point.latency > 0)
    .slice(-24);
}

function buildLatencyStatsFromLogs(logs) {
  const values = safeArray(logs)
    .map((row) => toNumber(getValue(row, ["latencyMs", "latency_ms", "latency"])))
    .filter((value) => value > 0);

  return {
    averageLatency: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
    fastestLatency: values.length ? Math.min(...values) : 0,
    slowestLatency: values.length ? Math.max(...values) : 0,
  };
}

function EmptyStateCard({ icon, title, message, hint }) {
  return (
    <div className="empty-state-card">
      <div className="empty-state-graphic" aria-hidden="true">
        <i className={`ti ${icon}`} />
      </div>
      <div className="empty-state-copy">
        <h4>{title}</h4>
        <p>{message}</p>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );

  return modalNode;
}

function isTruthyStatus(value) {
  const s = String(value || "").toLowerCase();
  return ["success", "active", "ok", "running", "up", "completed", "delivered"].includes(s);
}

function getRouteKey(row) {
  const mapping = String(getValue(row, ["mappingName", "mapping_name"]) || "").trim();
  const inbound = String(getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "").trim();
  const outbound = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "").trim();
  return [mapping, inbound, outbound].filter(Boolean).join(" | ");
}

function routeDisplayName(row, index = 0) {
  const mapping = String(getValue(row, ["mappingName", "mapping_name", "linkName", "link_name"]) || "").trim();
  const inbound = String(getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "").trim();
  const outbound = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "").trim();
  if (mapping && !mapping.toLowerCase().includes("data not available")) return mapping;
  if (inbound && outbound) return `${inbound} → ${outbound}`;
  if (inbound) return inbound;
  if (outbound) return outbound;
  return `Route ${index + 1}`;
}

function routeSubtitle(row) {
  const inboundType = String(getValue(row, ["inboundRequestType", "inbound_request_type"]) || "").trim();
  const outboundType = String(getValue(row, ["outboundRequestType", "outbound_request_type"]) || "").trim();
  if (inboundType && outboundType) return `${inboundType} → ${outboundType}`;
  return inboundType || outboundType || "";
}

function buildRouteGroupsFromAudit(logs) {
  const groups = new Map();
  const now = Date.now();
  safeArray(logs).forEach((row) => {
    const key = getRouteKey(row);
    const flowLabel = String(getValue(row, ["mappingName", "mapping_name"]) || "").toUpperCase();
    const inboundLabel = String(getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "").toUpperCase();
    const outboundLabel = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "").toUpperCase();
    const requestLabel = String(getValue(row, ["requestName", "request_name"]) || "").toUpperCase();
    if (!key || [flowLabel, inboundLabel, outboundLabel, requestLabel].some((label) => label.startsWith("DEMO_"))) return;
    const createdAt = getValue(row, ["createdAt", "created_at", "timestamp"]);
    const ts = createdAt ? new Date(createdAt).getTime() : 0;
    const latency = toNumber(getValue(row, ["latencyMs", "latency_ms", "latency", "processing_time_ms"]));
    const success = isTruthyStatus(getValue(row, ["status", "finalStatus", "final_status", "executionState"]));
    const failure = String(getValue(row, ["status", "finalStatus", "final_status", "executionState"]) || "").toLowerCase() === "failed";
    const existing = groups.get(key) || {
      mappingName: getValue(row, ["mappingName", "mapping_name"]) || "Unlinked Adapter",
      inboundAdapterName: getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "Unlinked Adapter",
      inboundRequestType: getValue(row, ["inboundRequestType", "inbound_request_type"]) || "â€”",
      outboundAdapterName: getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "Unlinked Adapter",
      outboundRequestType: getValue(row, ["outboundRequestType", "outbound_request_type"]) || "â€”",
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      totalLatency: 0,
      lastExecutionTime: "",
      lastExecutionTs: 0,
      recentTs: 0,
    };
    existing.executionCount += 1;
    if (success) existing.successCount += 1;
    if (failure) existing.failureCount += 1;
    if (latency > 0) existing.totalLatency += latency;
    if (ts > existing.lastExecutionTs) {
      existing.lastExecutionTs = ts;
      existing.lastExecutionTime = createdAt || "";
    }
    existing.recentTs = Math.max(existing.recentTs, ts);
    groups.set(key, existing);
  });

  return [...groups.values()]
    .filter((group) => group.executionCount > 0)
    .map((group) => ({
      ...group,
      successRate: group.executionCount ? Number(((group.successCount / group.executionCount) * 100).toFixed(1)) : 0,
      avgLatency: group.executionCount ? Math.round(group.totalLatency / group.executionCount) : 0,
      active: group.recentTs ? (now - group.recentTs) <= 24 * 60 * 60 * 1000 : false,
      idle: group.recentTs ? (now - group.recentTs) > 24 * 60 * 60 * 1000 : true,
    }))
    .sort((a, b) => (b.executionCount - a.executionCount) || (b.recentTs - a.recentTs));
}

function buildActiveLinkedRoutes(logs) {
  return buildRouteGroupsFromAudit(logs);
}

function buildActivityCards(logs) {
  return safeArray(logs).slice(0, 10).map((log, index) => {
    const flowLabel = String(getValue(log, ["mappingName", "mapping_name", "linkName", "link_name"]) || "").toUpperCase();
    const inboundLabel = String(getValue(log, ["inboundAdapterName", "inbound_adapter_name"]) || "").toUpperCase();
    const outboundLabel = String(getValue(log, ["outboundAdapterName", "outbound_adapter_name"]) || "").toUpperCase();
    const requestLabel = String(getValue(log, ["requestName", "request_name"]) || "").toUpperCase();
    if ([flowLabel, inboundLabel, outboundLabel, requestLabel].some((label) => label.startsWith("DEMO_"))) return null;
    const createdAt = getValue(log, ["createdAt", "created_at", "timestamp"]);
    const status = String(getValue(log, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]) || "-").toLowerCase();
    const isSuccess = ["success", "delivered", "ok", "completed"].includes(status);
    const isFailed = ["failed", "failure", "error"].includes(status);
    const latency = toNumber(getValue(log, ["latencyMs", "latency_ms", "latency"]));

    return {
      key: `${index}`,
      status,
      isSuccess,
      isFailed,
      time: createdAt,
      flow: getValue(log, ["mappingName", "mapping_name", "linkName", "link_name"]) || "â€”",
      inbound: getValue(log, ["inboundAdapterName", "inbound_adapter_name"]) || "â€”",
      outbound: getValue(log, ["outboundAdapterName", "outbound_adapter_name"]) || "â€”",
      inboundRequestType: getValue(log, ["inboundRequestType", "inbound_request_type"]) || "â€”",
      outboundRequestType: getValue(log, ["outboundRequestType", "outbound_request_type"]) || "â€”",
      message: isFailed ? getValue(log, ["errorMessage", "outboundStatus", "transformStatus"]) || "Error" : latency > 0 ? `${latency} ms` : "In progress",
      latency,
      detailLog: log,
    };
  }).filter(Boolean);
}

function normalizeLog(row) {
  const cfg = Array.isArray(row?.configurations) ? row.configurations[0] || {} : {};
  const flowLabel = String(getValue(row, ["mappingName", "mapping_name", "linkName", "link_name"]) || "").toUpperCase();
  if (flowLabel.startsWith("DEMO_")) return null;
  return {
    ...row,
    createdAt:          getValue(row, ["created_at", "createdAt", "timestamp"]),
    source:             getValue(row, ["inboundAdapterName", "adapter_name", "adapterName", "source"]) || getValue(cfg, ["inboundAdapterName", "adapterName", "name"]) || "Unnamed Adapter",
    sourceFormat:       getValue(row, ["inboundRequestType", "source_format", "sourceFormat", "type", "format"]) || getValue(cfg, ["requestName", "sourceFormat", "type", "format"]) || "Unnamed Adapter",
    target:             getValue(row, ["outboundAdapterName", "outbound_adapter_name", "outboundDestination", "target", "targetEndpoint"]) || getValue(cfg, ["outboundAdapterName", "name"]) || "Unlinked Adapter",
    status:             getValue(row, ["final_status", "finalStatus", "status", "outboundStatus", "transformStatus", "executionState"]) || "-",
    outboundStatus:     getValue(row, ["outboundStatus", "outbound_status"]),
    transformStatus:    getValue(row, ["transformStatus", "transform_status"]),
    requestName:        getValue(row, ["requestName", "transactionName", "request_id", "requestId"]),
    transformationPath: [getValue(row, ["inboundRequestType", "sourceFormat", "transformType", "transform_type"]) || "Unnamed Adapter", getValue(row, ["outboundRequestType", "outboundFormat", "transformType", "transform_type"]) || "Unlinked Adapter"].join(" â†’ "),
    inboundPayload:     getValue(row, ["inbound_payload", "inboundPayload"]),
    transformedPayload: getValue(row, ["transformed_payload", "transformedPayload"]),
    outboundResponse:   getValue(row, ["outbound_response", "outboundResponse"]),
  };
}

export default function SummaryDashboard({ selectedUser, selectedUsername, workspaceId, activeTab, setActiveTab }) {
  const [rawAdapters, setRawAdapters] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({ total: 0, success: 0, failed: 0, today: 0, latencyRows: [] });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [inventoryModal, setInventoryModal] = useState(null);

  useEffect(() => {
  }, [selectedTransaction, modalOpen]);
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedUserNameForRequest = selectedUsername || selectedUser?.username || "";
  const selectedWorkspaceIdForRequest = workspaceId || selectedUser?.id || selectedUser?.username || "";

  const load = useCallback(async () => {
    if (!selectedUserNameForRequest) {
      setRawAdapters([]);
      setMetrics(null);
      setLogs([]);
      setAuditLogs([]);
      setAuditStats({ total: 0, success: 0, failed: 0, today: 0, latencyRows: [] });
      setSelectedTransaction(null);
      setModalOpen(false);
      setLoading(false);
      setFeedLoading(false);
      return;
    }

    setError("");
    setSelectedTransaction(null);
    setModalOpen(false);
    setRawAdapters([]);
    setMetrics(null);
    setLogs([]);
    setAuditLogs([]);
    setAuditStats({ total: 0, success: 0, failed: 0, today: 0, latencyRows: [] });
    setLoading(true);
    setFeedLoading(true);

    const auditLogsPromise = getAuditLogs(selectedUserNameForRequest || selectedWorkspaceIdForRequest).then((value) => ({
      status: "fulfilled",
      value,
    })).catch((reason) => ({
      status: "rejected",
      reason,
    }));

    const outboundAdaptersPromise = listOutboundAdapters(selectedUserNameForRequest || selectedWorkspaceIdForRequest);

    const [metricsResult, adaptersInboundResult, logsResult] = await Promise.allSettled([
      getMetrics(selectedUserNameForRequest || selectedWorkspaceIdForRequest),
      listInboundAdapters(selectedUserNameForRequest || selectedWorkspaceIdForRequest),
      getRecentLogs(selectedUserNameForRequest || selectedWorkspaceIdForRequest),
    ]);

    if (metricsResult.status === "fulfilled") {
      const metricsData = normalizeMetricsResponse(metricsResult.value);
      setMetrics(metricsData);
    } else {
      console.warn("[SummaryDashboard] metricsData unavailable", metricsResult.reason);
    }

    const getArray = (res) => {
      if (!res) return [];
      const data = res.data !== undefined ? res.data : res;
      if (Array.isArray(data)) return data;
      if (typeof data === "object" && data !== null) {
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) return data[key];
        }
        if (data.adapterId || data.adapter_id || data.name) return [data];
        const vals = Object.values(data);
        if (vals.length > 0 && typeof vals === "object") return vals;
      }
      return [];
    };

    const inArray = adaptersInboundResult.status === "fulfilled" ? getArray(adaptersInboundResult.value) : [];
    let outArray = [];
    outboundAdaptersPromise
      .then((value) => {
        outArray = getArray(value);
        const mappedOutbound = outArray.map((item, i) => ({
          uniqueKey: item?.outboundId || item?.outbound_id || `OUT-${i}`,
          displayId: item?.outboundId || item?.outbound_id || "No ID",
          displayName: item?.name || item?.outboundName || "Unnamed Outbound",
          // SOURCE OF TRUTH: adapter_master.format_type
          formatType: item?.format_type || item?.formatType || item?.format || "",
          direction: "Outbound",
          status: "Ready",
        }));
        setRawAdapters((current) => {
          const inboundOnly = current.filter((adapter) => adapter.direction !== "Outbound");
          return [...inboundOnly, ...mappedOutbound];
        });
      })
      .catch((reason) => {
        setError(getApiErrorMessage(reason));
      });

    if (adaptersInboundResult.status === "rejected") {
      setError(getApiErrorMessage(adaptersInboundResult.reason));
    }

    const mappedInbound = inArray.map((item, i) => ({
      uniqueKey: item?.adapterId || item?.adapter_id || `IN-${i}`,
      displayId: item?.adapterId || item?.adapter_id || "No ID",
      displayName: item?.adapterName || item?.adapter_name || "Unnamed Inbound",
      requestName: item?.requestName || item?.request_name || item?.configurations?.[0]?.requestName || "",
      outboundId: item?.configurations?.[0]?.outboundId || item?.outboundId || item?.outbound_id || "",
      adapterId: item?.adapterId || item?.adapter_id || "",
      configurations: item?.configurations || [],
      // SOURCE OF TRUTH: adapter_master.format_type
      formatType: item?.format_type || item?.formatType || item?.type || "",
      direction: "Inbound",
      status: item?.runStatus || item?.status || "Pending Config",
    }));

    const mappedOutbound = outArray.map((item, i) => ({
      uniqueKey: item?.outboundId || item?.outbound_id || `OUT-${i}`,
      displayId: item?.outboundId || item?.outbound_id || "No ID",
      displayName: item?.name || item?.outboundName || "Unnamed Outbound",
      // SOURCE OF TRUTH: adapter_master.format_type
      formatType: item?.format_type || item?.formatType || item?.format || "",
      direction: "Outbound",
      status: "Ready",
    }));

    setRawAdapters([...mappedInbound, ...mappedOutbound]);

    if (logsResult.status === "fulfilled") {
      const rows = asArray(logsResult.value).map(normalizeLog).filter(Boolean);
      rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setLogs(rows);
    } else {
      setLogs([]);
    }

    const auditLogsResult = await auditLogsPromise;
    if (auditLogsResult.status === "fulfilled") {
      const auditRows = asArray(auditLogsResult.value.audit_logs || auditLogsResult.value).map(normalizeLog).filter(Boolean);
      auditRows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAuditLogs(auditRows);
      const todayKeyLocal = new Date().toDateString();
      const todayRows = auditRows.filter((row) => {
        const stamp = getValue(row, ["createdAt", "created_at", "timestamp"]);
        const d = stamp ? new Date(stamp) : null;
        return d && !Number.isNaN(d.getTime()) && d.toDateString() === todayKeyLocal;
      });
      const success = auditRows.filter((row) => isTruthyStatus(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]))).length;
      const failed = auditRows.filter((row) => String(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]) || "").toLowerCase() === "failed").length;
      setAuditStats({
        total: auditRows.length,
        success,
        failed,
        today: todayRows.length,
        latencyRows: auditRows.filter((row) => toNumber(getValue(row, ["latencyMs", "latency_ms", "latency"])) > 0),
      });
      if (auditRows.length > 0) {
        setLogs((current) => {
          const merged = [...auditRows, ...current];
          const seen = new Set();
          return merged.filter((row) => {
            const key = row.requestId || row.createdAt || JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        });
      }
    }

    setLoading(false);
    setFeedLoading(false);
  }, [selectedUserNameForRequest]);

  useEffect(() => {
    if (activeTab === "summary" && selectedUserNameForRequest) queueMicrotask(load);
  }, [activeTab, load]);

  // Clear state immediately when user is deselected without waiting for load
  useEffect(() => {
    if (!selectedUserNameForRequest) {
      setRawAdapters([]);
      setMetrics(null);
      setLogs([]);
      setAuditLogs([]);
      setAuditStats({ total: 0, success: 0, failed: 0, today: 0, latencyRows: [] });
    }
  }, [selectedUserNameForRequest]);

  const recentLogs = safeArray(logs).slice(0, 10);
  const certifiedAuditLogs = safeArray(auditLogs);
  const certifiedSuccessCount = certifiedAuditLogs.filter((row) =>
    isTruthyStatus(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]))
  ).length;
  const certifiedFailureCount = certifiedAuditLogs.filter((row) =>
    String(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]) || "").toLowerCase() === "failed"
  ).length;
  const certifiedTodayCount = certifiedAuditLogs.filter((row) => {
    const stamp = getValue(row, ["createdAt", "created_at", "timestamp"]);
    const d = stamp ? new Date(stamp) : null;
    return d && !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).length;
  const last24hCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const auditLast24h = certifiedAuditLogs.filter((row) => {
    const stamp = getValue(row, ["createdAt", "created_at", "timestamp"]);
    const ts = stamp ? new Date(stamp).getTime() : 0;
    return ts > last24hCutoff;
  });
  const certifiedLatencyLogs = safeArray(auditStats.latencyRows);
  const visibleAdapters = useMemo(() => safeArray(rawAdapters).filter(isVisibleAdapter), [rawAdapters]);
  const protocolAudit = useMemo(() => buildFormatData(visibleAdapters), [visibleAdapters]);
  const transportData = useMemo(() => buildTransportDataFromMetrics(metrics), [metrics]);
  const formatData = protocolAudit.chart;
  const excludedAdapters = protocolAudit.excluded;
  const protocolTotal = protocolAudit.protocolTotal;
  const transportTotal = transportData.reduce((sum, item) => sum + toNumber(item.value), 0);
  const latencyTrend = useMemo(() => buildLatencyTrendFromLogs(certifiedLatencyLogs), [certifiedLatencyLogs]);
  const routeRows = useMemo(() => buildRouteGroupsFromAudit(certifiedAuditLogs), [certifiedAuditLogs]);
  const linkedRouteRows = useMemo(() => buildActiveLinkedRoutes(certifiedAuditLogs), [certifiedAuditLogs]);
  const activityCards = useMemo(() => buildActivityCards(certifiedAuditLogs), [certifiedAuditLogs]);

  // KPI metrics
  const totalAdapters = protocolTotal;
  const configuredRoutes = routeRows.length;
  const activeRoutes = routeRows.filter((row) => row.lastExecutionTs && (Date.now() - row.lastExecutionTs) <= 24 * 60 * 60 * 1000).length;
  const idleRoutes = Math.max(configuredRoutes - activeRoutes, 0);
  const configuredAdapters = protocolTotal;
  const linkedRoutes = routeRows.length;
  const transactions24h = auditLast24h.length;
  const success24hCount = auditLast24h.filter((row) =>
    isTruthyStatus(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]))
  ).length;
  const failed24hCount = auditLast24h.filter((row) =>
    String(getValue(row, ["status", "finalStatus", "executionState", "outboundStatus", "transformStatus"]) || "").toLowerCase() === "failed"
  ).length;
  
  // Use metrics API data directly when available, fallback to calculated values
  const avgLatency24h = metrics?.avgLatencyMs 
    ? Math.round(metrics.avgLatencyMs)
    : (() => {
        const latencyValues = auditLast24h
          .map(row => toNumber(getValue(row, ["latencyMs", "latency_ms", "latency", "processing_time_ms"])))
          .filter(val => val > 0);
        return latencyValues.length
          ? Math.round(latencyValues.reduce((sum, val) => sum + val, 0) / latencyValues.length)
          : 0;
      })();
  
  const successRate24h = metrics?.successRate 
    ? Math.round(metrics.successRate)
    : auditLast24h.length
    ? Math.round((success24hCount / auditLast24h.length) * 100)
    : 0;
  return (
    <div className="esb-dashboard summary-modern">
      {error && <p className="status error">{error}</p>}

      {/* ROW 1: Welcome Banner */}
      <section className="summary-hero">
        <div>
          <p className="dash-banner-sub">InnoBridge Operational Console</p>
          <h2>{selectedUser ? `${selectedUser.name || selectedUser.username}'s InnoBridge Workspace` : "InnoBridge Operational Console"}</h2>
          <p className="dash-banner-desc">
            Real-time transaction telemetry and routing health for your active workspace.
          </p>
        </div>
        <button className="btn-ghost summary-refresh" onClick={load} disabled={loading}>
          <i className="ti ti-refresh" /> Refresh
        </button>
      </section>

      {/* ROW 2: 6 KPI Cards */}
      <div className="dash-metrics summary-kpi-grid">
        {loading && !certifiedAuditLogs.length && !safeArray(rawAdapters).length ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="dash-metric-card skeleton-card">
              <div className="skel skel-icon" />
              <div className="skel-body"><div className="skel skel-h" /><div className="skel skel-s" /></div>
            </div>
          ))
        ) : (
          <>
            <KPICard
              icon={<i className="ti ti-server-2" />}
              label="Configured Adapters"
              value={configuredAdapters}
              tone="success"
              onClick={() => setActiveTab?.("adapters")}
            />
            <KPICard
              icon={<i className="ti ti-link" />}
              label="Linked Routes"
              value={linkedRoutes}
              tone="route"
              onClick={() => setActiveTab?.("linked_routes")}
            />
            <KPICard
              icon={<i className="ti ti-activity" />}
              label="Transactions (24h)"
              value={transactions24h}
              tone="primary"
              onClick={() => {
                document.querySelector(".dash-panel-group.dash-flow-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            <KPICard
              icon={<i className="ti ti-shield-check" />}
              label="Success Rate"
              value={successRate24h}
              suffix="%"
              tone={toNumber(successRate24h) >= 95 ? "success" : toNumber(successRate24h) >= 80 ? "warning" : "error"}
            />
            <KPICard
              icon={<i className="ti ti-clock-hour-4" />}
              label="Average Latency"
              value={avgLatency24h}
              suffix=" ms"
              tone="info"
            />
            <KPICard
              icon={<i className="ti ti-alert-triangle" />}
              label="Errors (24h)"
              value={failed24hCount}
              tone="error"
              onClick={() => {
                document.querySelector('[data-row-status="failed"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
                document.querySelector('[data-row-status="failed"]')?.classList.add("pulse-highlight");
              }}
            />
          </>
        )}
      </div>

      <div className="dash-two-up">
        <ExecutiveProtocolWidget data={formatData ?? []} total={protocolTotal} excludedAdapters={excludedAdapters} />
        <ExecutiveLatencyWidget data={latencyTrend ?? []} />
      </div>

      <section className="dash-panel-group dash-flow-panel">
        <div className="dash-panel-group-head">
          <div>
            <p className="dash-panel-eyebrow">Recent Transactions</p>
            <h3>Latest audit-backed transaction history</h3>
          </div>
        </div>
        <TransactionExecutiveTable
          rows={activityCards}
          onSelect={(transaction) => {
            setSelectedTransaction(transaction);
            setModalOpen(true);
          }}
        />
      </section>

      {modalOpen && selectedTransaction && (
        <ExecutiveTransactionDeepDiveModal
          log={selectedTransaction}
          onClose={() => {
            setModalOpen(false);
            setSelectedTransaction(null);
          }}
        />
      )}

      {inventoryModal && createPortal(
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setInventoryModal(null); }} style={{ zIndex: 10000 }}>
          <div className="modal-card" role="dialog" aria-modal="true" style={{ maxWidth: 760, width: "min(92vw, 760px)" }}>
            <div className="modal-header">
              <div>
                <p className="modal-subtitle">{inventoryModal.type === "routes" ? "Route Inventory" : "Adapter Inventory"}</p>
                <h3>{inventoryModal.title}</h3>
              </div>
              <button type="button" onClick={() => setInventoryModal(null)} className="modal-close-btn">Close</button>
            </div>
            <div className="inventory-modal-list">
              {safeArray(inventoryModal.items).map((item, index) => (
                <div key={item?.id || item?.adapterId || item?.key || index} className="inventory-modal-item">
                  <strong>{inventoryModal.type === "routes" ? (item?.name || item?.flowName || item?.mapping_name || item?.mappingName || "Route") : (item?.adapterName || item?.displayName || item?.name || "Adapter")}</strong>
                  <span>
                    {inventoryModal.type === "routes"
                      ? `${item?.requestType || item?.inboundRequestName || ""}${item?.outboundRequestName ? ` → ${item.outboundRequestName}` : ""}`
                      : `${item?.type || item?.formatType || item?.format || ""}`}
                  </span>
                </div>
              ))}
              {!safeArray(inventoryModal.items).length && <p className="muted">Data not available.</p>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function KPICard({ icon, label, value, subtitle, trend, tone, suffix = "", onClick }) {
  const hasNumericValue = value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
  const animatedValue = useCountUp(hasNumericValue ? Number(value) : 0);
  const precision = precisionForValue(value);
  const displayValue = hasNumericValue ? formatNumber(animatedValue.toFixed(precision), suffix) : "-";

  return (
    <div className={`kpi-card kpi-card--${tone} ${onClick ? "kpi-card--interactive" : ""}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="kpi-header">
        <div className="kpi-icon">{icon}</div>
        <span className="kpi-trend">{trend}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-value">{displayValue}</div>
        <div className="kpi-label">{label}</div>
        {subtitle ? <div className="kpi-subtitle">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function ActivityFeedCards({ cards, onSelect }) {
  if (!cards.length) {
    return (
      <div className="compact-empty-panel">
        <i className="ti ti-activity" />
        <p>No transaction activity available yet.</p>
      </div>
    );
  }

  return (
    <div className="activity-card-grid">
      {cards.map((card) => (
        <article key={card.key} className="activity-card">
          <div className="activity-card-head">
            <span className={`activity-badge ${card.isSuccess ? "success" : card.isFailed ? "failed" : "pending"}`}>
              <i className={`ti ${card.isSuccess ? "ti-circle-check" : card.isFailed ? "ti-alert-triangle" : "ti-loader"}`} />
              {card.isSuccess ? "SUCCESS" : card.isFailed ? "FAILED" : "PROCESSING"}
            </span>
            <span className="activity-time">{formatTimestamp(card.timestamp)}</span>
          </div>
          <h4>{card.title}</h4>
          <div className="activity-route">
            <span>{card.requestName || card.title}</span>
          </div>
          <div className="activity-meta">
            <span>{card.source}</span>
            <strong>{card.target !== "-" ? card.target : "Unlinked Adapter"}</strong>
          </div>
          <div className="activity-footer">
            <span>{card.sourceFormat}</span>
            <strong>{card.message}</strong>
          </div>
            <button type="button" className="activity-link" onClick={() => onSelect(card.detailLog || card)}>
              View Details
            </button>
        </article>
      ))}
    </div>
  );
}

function TransactionExecutiveTable({ rows, onSelect }) {
  const visibleRows = safeArray(rows).slice(0, 10);
  if (!visibleRows.length) {
    return (
      <div className="compact-empty-panel">
        <i className="ti ti-clipboard-data" />
        <p>No transaction data available yet.</p>
        <span>The executive table will populate once audit records exist for this workspace.</span>
      </div>
    );
  }

  return (
    <div className="transaction-table-shell">
      <table className="transaction-exec-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Flow</th>
            <th>Inbound</th>
            <th>Outbound</th>
            <th>Status</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr
              key={row.key}
              onClick={() => onSelect(row.detailLog || row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(row.detailLog || row)}
              style={{ cursor: "pointer" }}
            >
              <td>{formatTimestamp(row.time).split(", ").pop() || formatTimestamp(row.time)}</td>
              <td>
                <strong>{row.flow}</strong>
              </td>
              <td>
                <div className="transaction-cell-stack">
                  <strong>{row.inbound}</strong>
                  <span>{row.inboundRequestType}</span>
                </div>
              </td>
              <td>
                <div className="transaction-cell-stack">
                  <strong>{row.outbound}</strong>
                  <span>{row.outboundRequestType}</span>
                </div>
              </td>
              <td>
                <span className={`activity-badge ${row.isSuccess ? "success" : row.isFailed ? "failed" : "pending"}`}>
                  <i className={`ti ${row.isSuccess ? "ti-circle-check" : row.isFailed ? "ti-alert-triangle" : "ti-loader"}`} />
                  {row.isSuccess ? "SUCCESS" : row.isFailed ? "FAILED" : "PROCESSING"}
                </span>
              </td>
              <td>
                <strong className="transaction-latency">{row.latency > 0 ? `${row.latency} ms` : "â€”"}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExecutiveProtocolWidget({ data, total: protocolTotal, excludedAdapters }) {
  const allFormats = safeArray(data);
  const total = allFormats.reduce((sum, item) => sum + toNumber(item?.value), 0);
  const pieData = allFormats.filter((item) => toNumber(item?.value) > 0);
  const adapterCount = safeArray(data).reduce((sum, item) => sum + toNumber(item?.value), 0);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>Message Format Distribution</h3>
      </div>
      <div className="protocol-widget">
        {pieData.length === 0 ? (
          <div className="compact-empty-panel">
            <i className="ti ti-chart-pie" />
            <p>No transaction data available yet.</p>
            <span>Protocol breakdown will appear once routed traffic is processed.</span>
          </div>
        ) : (
          <>
            <div className="protocol-donut-shell protocol-donut-shell--premium">
              <div className="protocol-orbit protocol-orbit--outer" aria-hidden="true" />
              <div className="protocol-orbit protocol-orbit--inner" aria-hidden="true" />
              <div className="protocol-donut-center">
                <strong>{adapterCount}</strong>
                <span>Adapters</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={5} stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
                  {pieData.map((entry) => <Cell key={entry.name} fill={payloadFormatColor(entry.name)} />)}
                </Pie>
              </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="protocol-breakdown protocol-breakdown--executive">
              {allFormats.map((entry) => {
                const val = toNumber(entry.value);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={entry.name}>
                    <span style={{ background: transportColor(entry.name), opacity: val === 0 ? 0.35 : 1 }} />
                    <strong style={{ color: val === 0 ? "var(--muted)" : "var(--heading)" }}>{entry.name}</strong>
                    <em style={{ color: val === 0 ? "var(--muted)" : undefined }}>{val === 0 ? "0%" : `${pct}%`}</em>
                  </div>
                );
              })}
              {excludedAdapters?.length ? (
                <div className="protocol-excluded">
                  <strong>Excluded adapters</strong>
                  <span>{excludedAdapters.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ExecutiveTransportWidget({ data }) {
  const allProtocols = safeArray(data);
  const total = allProtocols.reduce((sum, item) => sum + toNumber(item?.value), 0);
  const pieData = allProtocols.filter((item) => toNumber(item?.value) > 0);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>Transport Distribution</h3>
        <p className="dash-card-sub">Transport protocol distribution (HTTP, HTTPS, TCP).</p>
      </div>
      <div className="protocol-widget">
        {pieData.length === 0 ? (
          <div className="compact-empty-panel">
            <i className="ti ti-chart-donut" />
            <p>No transport data available yet.</p>
            <span>Transport breakdown will appear once adapters are saved with a transport protocol.</span>
          </div>
        ) : (
          <>
              <div className="protocol-donut-shell protocol-donut-shell--premium">
                <div className="protocol-orbit protocol-orbit--outer" aria-hidden="true" />
                <div className="protocol-orbit protocol-orbit--inner" aria-hidden="true" />
                <div className="protocol-donut-center">
                  <strong>{total}</strong>
                </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={5} stroke="rgba(255,255,255,0.3)" strokeWidth={2}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={payloadFormatColor(entry.name)} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${formatNumber(value)} adapters`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="protocol-breakdown protocol-breakdown--executive">
              {allProtocols.map((entry) => {
                const val = toNumber(entry.value);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={entry.name}>
                    <span style={{ background: payloadFormatColor(entry.name), opacity: val === 0 ? 0.35 : 1 }} />
                    <strong style={{ color: val === 0 ? "var(--muted)" : "var(--heading)" }}>{entry.name}</strong>
                    <em style={{ color: val === 0 ? "var(--muted)" : undefined }}>{val === 0 ? "0%" : `${pct}%`}</em>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ExecutiveLatencyWidget({ data }) {
  const chartData = safeArray(data);
  const { averageLatency, fastestLatency, slowestLatency } = buildLatencyStatsFromLogs(chartData);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>Latency Overview</h3>
      </div>
      <div className="latency-widget">
        {chartData.length === 0 ? (
          <div className="compact-empty-panel">
            <i className="ti ti-chart-line" />
            <p>No transaction latency available yet.</p>
            <span>Latency metrics will appear automatically once successful traffic is processed.</span>
          </div>
        ) : (
          <div className="latency-widget-layout">
            <div className="latency-summary">
              <div><span>Average Latency</span><strong>{formatNumber(averageLatency, " ms")}</strong></div>
              <div><span>Fastest Transaction</span><strong>{formatNumber(fastestLatency, " ms")}</strong></div>
              <div><span>Slowest Transaction</span><strong>{formatNumber(slowestLatency, " ms")}</strong></div>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Area type="monotone" dataKey="latency" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorLatency)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}

function ExecutiveActivityFeed({ loading, rows, onSelect }) {
  const logRows = safeArray(rows).slice(0, 5);

  if (loading) {
    return <div className="compact-empty-panel"><i className="ti ti-loader" /><p>Loading latest transactions...</p></div>;
  }

  if (!logRows.length) {
    return (
      <div className="compact-empty-panel">
        <i className="ti ti-clipboard-data" />
        <p>No transaction data available yet.</p>
        <span>The activity feed will show routed transactions once the workspace receives live activity.</span>
      </div>
    );
  }

  return (
    <div className="activity-feed-list">
      {logRows.map((row, i) => {
        const status = String(row.status || "").toLowerCase();
        const isSuccess = ["success", "delivered", "ok", "completed"].includes(status);
        const isFailed = ["failed", "failure", "error", "route_failed"].includes(status);
        return (
          <article key={`${row.requestId}-${i}`} className="activity-feed-card">
            <div className="activity-card-head">
              <span className={`activity-badge ${isSuccess ? "success" : isFailed ? "failed" : "pending"}`}>
                <i className={`ti ${isSuccess ? "ti-circle-check" : isFailed ? "ti-alert-triangle" : "ti-loader"}`} />
                {isSuccess ? "SUCCESS" : isFailed ? "FAILED" : "PROCESSING"}
              </span>
              <span className="activity-time">{formatTimestamp(row.createdAt)}</span>
            </div>
            <h4>{row.requestName || row.title || "Transaction"}</h4>
            <div className="activity-route">
              <span>{row.source || "-"}</span>
              <i className="ti ti-arrow-right" />
              <span>{row.target || "Pending destination"}</span>
            </div>
            <p className="activity-note">
              {row.sourceFormat || "-"} â†’ {row.target || "-"} {row.message ? `â€¢ ${row.message}` : ""}
            </p>
            <button type="button" className="activity-link" onClick={() => onSelect(row.detailLog || row)}>View Details</button>
          </article>
        );
      })}
    </div>
  );
}

function LinkedAdapterFlowWidget({ rows }) {
  const visibleRows = safeArray(rows).slice(0, 3);
  if (!visibleRows.length) {
    return (
      <div className="compact-empty-panel linked-flow-empty">
        <i className="ti ti-diagram-3" />
        <p>No linked adapter routes available yet.</p>
        <span>The workspace will show live route movement once linked adapters begin processing traffic.</span>
      </div>
    );
  }

  return (
    <div className="linked-flow-widget linked-flow-exec">
      {visibleRows.map((row, index) => (
        <article key={row.key || index} className="linked-flow-card">
          <div className="linked-flow-top linked-flow-top--exec">
            <span className="linked-flow-chip linked-flow-chip--source">{row.inboundAdapterName}</span>
            <span className="linked-flow-chip linked-flow-chip--engine">InnoBridge Canonical Engine</span>
            <span className="linked-flow-chip linked-flow-chip--dest">{row.outboundAdapterName}</span>
          </div>
          <div className="linked-flow-stage">
            <div className="linked-flow-side linked-flow-side--left">
              <div className="linked-flow-node linked-flow-node--source">
                <strong>{row.inboundAdapterName}</strong>
                <em>{row.inboundRequestType || "Request"}</em>
              </div>
            </div>
            <div className="linked-flow-middle">
              <div className="linked-flow-core">
                <span className="linked-flow-core-eyebrow">Mapping</span>
                <h4>{row.mappingName}</h4>
                <p>{formatNumber(row.executionCount)} Transactions</p>
                <div className="linked-flow-core-metrics">
                  <span><strong>{formatNumber(row.successRate, "%")}</strong> Success</span>
                  <span><strong>{formatNumber(row.avgLatency, " ms")}</strong> Avg</span>
                </div>
                <div className="linked-flow-core-footer">
                  Last Activity: {row.lastExecutionTime ? formatTimestamp(row.lastExecutionTime) : "â€”"}
                </div>
              </div>
              <div className="linked-flow-axis" aria-hidden="true">
                <span className="linked-flow-axis-line" />
                <span className="linked-flow-axis-arrow linked-flow-axis-arrow--top">
                  <i className="ti ti-arrow-down" />
                </span>
                <span className="linked-flow-axis-arrow linked-flow-axis-arrow--bottom">
                  <i className="ti ti-arrow-down" />
                </span>
              </div>
            </div>
            <div className="linked-flow-side linked-flow-side--right">
              <div className="linked-flow-node linked-flow-node--dest">
                <strong>{row.outboundAdapterName}</strong>
                <em>{row.outboundRequestType || "Request"}</em>
              </div>
            </div>
          </div>
          <div className="linked-flow-summary">
            <span className="linked-flow-summary-item">
              <strong>{formatNumber(row.executionCount)}</strong>
              <em>Transactions</em>
            </span>
            <span className="linked-flow-summary-item success">
              <strong>{formatNumber(row.successRate, "%")}</strong>
              <em>Success Rate</em>
            </span>
            <span className="linked-flow-summary-item">
              <strong>{formatNumber(row.avgLatency, " ms")}</strong>
              <em>Avg Latency</em>
            </span>
            <span className="linked-flow-summary-item wide">
              <strong>{row.lastExecutionTime ? formatTimestamp(row.lastExecutionTime) : "â€”"}</strong>
              <em>Last Activity</em>
            </span>
          </div>
          <div className="linked-flow-pulse" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </article>
      ))}
    </div>
  );
}

function LiveIntegrationFlow({ rows }) {
  const flowRows = safeArray(rows).slice(0, 4);
  if (!flowRows.length) {
    return <div className="compact-empty-panel"><i className="ti ti-diagram-3" /><p>No live integration flow available yet.</p></div>;
  }

  return (
    <div className="live-flow-grid">
      {flowRows.map((row, index) => (
        <article key={row.key || index} className="live-flow-card">
          <div className="live-flow-path">
            <span>{row.source}</span>
            <i className="ti ti-arrow-right" />
            <span>InnoBridge Engine</span>
            <i className="ti ti-arrow-right" />
            <span>{row.destination === "Unlinked Adapter" ? "Configuration Incomplete" : row.destination}</span>
          </div>
          <div className="live-flow-meta">
            <span>{row.requestType || row.sourceFormat}</span>
            <strong>{row.destination === "Unlinked Adapter" ? "Pending link" : "Live route"}</strong>
          </div>
          <div className="flow-particles" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </article>
      ))}
    </div>
  );
}

function RouteCards({ rows }) {
  if (!rows.length) {
    return (
      <div className="compact-empty-panel">
        <i className="ti ti-route" />
        <p>No active routes available yet.</p>
      </div>
    );
  }

  return (
    <div className="route-card-grid">
      {rows.map((row) => (
        <article key={row.key} className="route-card">
          <div className="route-card-line">
            <div>
              <span className="route-label">Source Adapter</span>
              <strong>{row.source}</strong>
              <em>{row.sourceFormat}</em>
            </div>
            <div className="route-arrow"><i className="ti ti-arrow-right" /></div>
            <div className="route-destination">
              <span className="route-label">Destination Adapter</span>
              <strong>{row.destination}</strong>
              <em>{row.destinationProtocol}</em>
            </div>
          </div>
          <div className="route-stats">
            <div><span>Messages Processed</span><strong>{formatNumber(row.messages)}</strong></div>
            <div><span>Success Rate</span><strong>{formatNumber(row.successRate, "%")}</strong></div>
            <div><span>Avg Latency</span><strong>{formatNumber(row.avgLatency, " ms")}</strong></div>
          </div>
        </article>
      ))}
    </div>
  );
}

function nodeHealth(adapter) {
  const s = String(
    getValue(adapter, ["last_final_status", "lastFinalStatus", "final_status", "finalStatus", "status"]) || ""
  ).toLowerCase();
  if (s === "success" || s === "active" || s === "ok") return "healthy";
  if (s === "failed" || s === "failure" || s === "error" || s === "route_failed") return "failing";
  return "idle";
}

function transformType(adapter) {
  // Legacy function - no longer used for display
  // ESB uses canonical architecture, not direct format-to-format routing
  return "Canonical Transform";
}

function outboundProtocol(adapter) {
  const cfg = Array.isArray(adapter.configurations) ? adapter.configurations[0] || {} : {};
  return (
    getValue(adapter, ["transport_protocol", "transportProtocol"]) ||
    getValue(cfg, ["transport_protocol", "transportProtocol"]) ||
    "HTTP"
  );
}

function outboundFormat(adapter) {
  const cfg = Array.isArray(adapter.configurations) ? adapter.configurations[0] || {} : {};
  return (
    getValue(adapter, ["outbound_format", "outboundFormat"]) ||
    getValue(cfg, ["targetFormat", "target_format", "outboundFormat"]) ||
    ""
  );
}

const HEALTH_COLOR = { healthy: "#16a34a", failing: "#dc2626", idle: "#9ca3af", pending: "#f59e0b" };

function HealthDot({ status }) {
  const color = HEALTH_COLOR[status] || HEALTH_COLOR.idle;
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 10, height: 10, flexShrink: 0 }}>
      {status === "healthy" && (
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.35, animation: "topo-ping 1.6s ease-out infinite" }} />
      )}
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, position: "relative" }} />
    </span>
  );
}

function MessageFlowOverview({ adapters }) {
  const nodes = safeArray(adapters).slice(0, 8);

  // Separate inbound adapters with and without linked configurations
  const inboundNodes = nodes.filter(n => n.direction === "Inbound" || (!n.direction && !n.outboundId));
  const targetAdapters = nodes.filter(n => n.direction === "Outbound" || (n.direction && !n.direction.includes("Inbound")));
  
  // For each inbound, check if it has a linked outbound or is in "Pending Config" state
  const displayInbound = inboundNodes.length > 0 ? inboundNodes : nodes.slice(0, Math.ceil(nodes.length / 2));
  const displayTargets = targetAdapters.length > 0 ? targetAdapters : nodes.slice(Math.ceil(nodes.length / 2));

  return (
    <section className="dash-card compact-topology-card">
      <style>{`
        @keyframes topo-ping {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      <div className="dash-card-head">
        <h3>Message Flow Overview</h3>
        <span className="summary-card-meta">Active integration routes</span>
      </div>
      <div className="telemetry-topology">
        <svg className="telemetry-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {displayInbound.map((adapter, index) => {
            const y = displayInbound.length === 1 ? 50 : 16 + (index * 68) / (displayInbound.length - 1);
            const isPendingConfig = adapter.status === "Pending Config";
            const strokeDasharray = isPendingConfig ? "4 4" : "none";
            const stroke = isPendingConfig ? "#999" : "#333";
            return (
              <g key={index}>
                <path d={`M 18 ${y} C 35 ${y}, 35 50, 48 50`} stroke={stroke} strokeDasharray={strokeDasharray} />
                <path d={`M 52 50 C 65 50, 65 ${y}, 82 ${y}`} stroke={stroke} strokeDasharray={strokeDasharray} />
              </g>
            );
          })}
        </svg>
        <div className="telemetry-node-stack">
          {displayInbound.length === 0 && <p className="muted">No inbound adapters returned.</p>}
          {displayInbound.map((adapter, index) => (
            <TopologyNode
              key={adapterId(adapter, index)}
              label={adapter.displayName || adapterName(adapter, index)}
              sub={adapter.formatType || adapterType(adapter)}
              tone="inbound"
              health={nodeHealth(adapter)}
              isPendingConfig={adapter.status === "Pending Config"}
            />
          ))}
        </div>
        <div className="telemetry-gateway">
          <div className="telemetry-gateway-icon">
            <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#6366f1" strokeWidth="1.2" strokeDasharray="4 3" className="topo-gw-spin" />
              <circle cx="20" cy="20" r="11" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="2.5 2.5" className="topo-gw-spin-rev" />
              <circle cx="20" cy="20" r="5" fill="#6366f1" opacity="0.9" />
              <circle cx="20" cy="20" r="5" fill="#6366f1" className="topo-gw-pulse" />
              <circle cx="20" cy="2" r="2" fill="#6366f1" className="topo-gw-spin" style={{ transformOrigin: "20px 20px" }} />
              <circle cx="38" cy="20" r="1.5" fill="#818cf8" className="topo-gw-spin" style={{ transformOrigin: "20px 20px" }} />
              <circle cx="20" cy="38" r="2" fill="#6366f1" className="topo-gw-spin" style={{ transformOrigin: "20px 20px" }} />
              <circle cx="2" cy="20" r="1.5" fill="#818cf8" className="topo-gw-spin" style={{ transformOrigin: "20px 20px" }} />
            </svg>
          </div>
          <strong>InnoBridge Gateway</strong>
          <span>Canonical Transform Engine</span>
        </div>
        <div className="telemetry-node-stack telemetry-target-stack">
          {displayTargets.length === 0 && <p className="muted">No target endpoints returned.</p>}
          {displayInbound.map((adapter, index) => {
            const isPendingConfig = adapter.status === "Pending Config";
            const targetAdapter = displayTargets[index];
            
            if (isPendingConfig) {
              return (
                <TopologyNode
                  key={`${adapterId(adapter, index)}-unconfigured`}
                  label="Unconfigured Target"
                  sub="Awaiting Configuration"
                  tone="target-pending"
                  health="pending"
                  isPendingConfig={true}
                />
              );
            }
            
            return targetAdapter ? (
              <TopologyNode
                key={`${adapterId(targetAdapter, index)}-target`}
                label={targetAdapter.displayName || adapterTarget(targetAdapter, index)}
                sub={targetAdapter.transport_protocol || outboundProtocol(targetAdapter)}
                tone="target"
                health={nodeHealth(targetAdapter)}
              />
            ) : (
              <TopologyNode
                key={`${adapterId(adapter, index)}-empty`}
                label="Unconfigured Target"
                sub="Awaiting Configuration"
                tone="target-pending"
                health="pending"
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TopologyNode({ label, sub, tone, health, isPendingConfig }) {
  const borderColor = isPendingConfig ? "#9ca3af" : (tone === "inbound" ? "#16a34a" : tone === "target-pending" ? "#9ca3af" : "#7c3aed");
  const bgColor = isPendingConfig ? "rgba(156, 163, 175, 0.1)" : undefined;
  return (
    <div className={`telemetry-node ${tone}`} style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: bgColor }}>
      <HealthDot status={isPendingConfig ? "pending" : health} />
      <div>
        <strong>{label}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

function FormatDonut({ data }) {
  const allFormats = safeArray(data);
  const total = allFormats.reduce((sum, item) => sum + toNumber(item?.value), 0);
  // Only render slices with actual values â€” zero slices break pie charts visually
  const pieData = allFormats.filter((item) => toNumber(item?.value) > 0);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>Format Distribution</h3>
        <p className="dash-card-sub">Inbound payload breakdown (JSON, XML, ISO8583, ISO20022).</p>
      </div>
      <div className="summary-donut-wrap">
        {pieData.length === 0 ? (
          <div style={{ display: "grid", gap: 16 }}>
            <EmptyStateCard
              icon="ti-chart-pie"
              title="No transaction data available yet"
              message="Message Format Distribution will appear here once the workspace starts receiving routed traffic."
              hint="We are waiting for real payload activity from the transaction pipeline."
            />
            <div className="summary-donut-legend summary-donut-legend--empty">
              {allFormats.map((entry) => (
                <div key={entry.name}>
                  <span style={{ background: payloadFormatColor(entry.name), opacity: 0.25 }} />
                  <strong>{entry.name}</strong>
                  <em>Waiting</em>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={payloadFormatColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="summary-donut-legend">
              {allFormats.map((entry) => {
                const val = toNumber(entry.value);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                return (
                  <div key={entry.name}>
                    <span style={{ background: payloadFormatColor(entry.name), opacity: val === 0 ? 0.35 : 1 }} />
                    <strong style={{ color: val === 0 ? "var(--muted)" : "var(--heading)" }}>{entry.name}</strong>
                    {val > 0 ? <em>{`${formatNumber(val)} â€” ${pct}%`}</em> : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function LatencyPersistence({ data }) {
  const chartData = safeArray(data);

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>Processing Latency Trends</h3>
        <p className="dash-card-sub">Comparative P50 / P90 / P99 execution speeds across all active routes.</p>
      </div>
      <div className="summary-chart-wrap latency-persistence-wrap">
        {chartData.length === 0 ? (
          <EmptyStateCard
            icon="ti-chart-line"
            title="No transaction data available yet"
            message="Latency Trends will populate after the first successful transaction is measured."
            hint="Milliseconds, percentiles, and trend lines will appear automatically once traffic starts."
          />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 16, right: 22, left: -12, bottom: 4 }}>
              <defs>
                <linearGradient id="colorP50" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5A4FCF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5A4FCF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1A1A24", borderRadius: "8px", color: "#fff", border: "none" }}
                formatter={(value, name) => [`${formatNumber(value)} ms`, String(name).toUpperCase()]}
              />
              <Area type="monotone" dataKey="P50" stroke="#5A4FCF" strokeWidth={4} fillOpacity={1} fill="url(#colorP50)" dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="P90" stroke="#00B4D8" strokeWidth={3} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="P99" stroke="#94A3B8" strokeWidth={2} dot={false} opacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function AuditFeed({ loading, rows, onSelect }) {
  const logRows = safeArray(rows).slice(0, 10);
  const hasRows = logRows.length > 0;

  function fmtTs(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  }

  function truncId(id) {
    if (!id || id === "-") return "-";
    return id.length > 22 ? id.slice(0, 22) + "â€¦" : id;
  }

  function StatusBadge({ status }) {
    const s = String(status || "").toLowerCase();
    const ok  = ["success", "delivered", "ok", "completed"].includes(s);
    const bad = ["failed", "failure", "error", "route_failed"].includes(s);
    const label = ok ? "DELIVERED" : bad ? "FAILED" : String(status || "-").toUpperCase();
    const style = ok
      ? { background: "var(--primary)", color: "#fff", border: "1px solid var(--primary)" }
      : bad
      ? { background: "#fff", color: "#1c1917", border: "1px solid #1c1917" }
      : { background: "var(--panel-soft)", color: "var(--muted)", border: "1px solid var(--border)" };
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 999,
        fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
        fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap",
        ...style,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#a5f3fc" : bad ? "#1c1917" : "var(--muted)", flexShrink: 0 }} />
        {label}
      </span>
    );
  }

  const COLS = ["Transaction ID", "Timestamp", "Adapter (Format)", "Target Endpoint", "Execution State", "Actions"];

  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <h3>InnoBridge Audit &amp; Delivery Stream</h3>
        <p className="dash-card-sub">Latest 10 transactions â€” inbound requests, payload transformations, and outbound routing execution.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--panel-soft)", position: "sticky", top: 0, zIndex: 1 }}>
              {COLS.map(h => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left",
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "var(--muted)",
                  borderBottom: "2px solid var(--border)", whiteSpace: "nowrap",
                  background: "var(--panel-soft)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {COLS.map(c => (
                  <td key={c} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                    <div className="skel skel-h" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && !hasRows && (
              <tr>
                <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ padding: 18 }}>
                    <EmptyStateCard
                      icon="ti-clipboard-data"
                      title="No transaction data available yet"
                      message="The Audit Stream will show routed transactions here once the workspace receives live activity."
                      hint="Request IDs, statuses, and payload previews will appear in a structured audit trail."
                    />
                  </div>
                </td>
              </tr>
            )}
            {!loading && logRows.map((row, i) => (
              <tr key={`${row.requestId}-${i}`}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: i % 2 === 0 ? "var(--panel)" : "var(--panel-soft)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(79,70,229,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--panel)" : "var(--panel-soft)"}
              >
                <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                  <code style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                    fontSize: 11, color: "var(--primary)",
                    background: "var(--primary-soft)",
                    padding: "2px 7px", borderRadius: 4, letterSpacing: "0.02em",
                  }} title={row.requestId}>
                    {truncId(row.requestId)}
                  </code>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--muted)", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                  {fmtTs(row.createdAt)}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <strong style={{ display: "block", fontSize: 12, color: "var(--heading)", fontWeight: 600 }}>{row.source}</strong>
                  {row.sourceFormat && row.sourceFormat !== "-" && (
                    <span style={{
                      display: "inline-block", marginTop: 3,
                      padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                      fontFamily: "ui-monospace, monospace", textTransform: "uppercase",
                      background: "rgba(79,70,229,0.08)", color: "var(--primary)",
                      border: "1px solid rgba(79,70,229,0.2)",
                    }}>{row.sourceFormat}</span>
                  )}
                </td>
                <td style={{ padding: "11px 14px", fontSize: 11, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.target}
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <StatusBadge status={row.status} />
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <button type="button" onClick={() => onSelect(row.detailLog || row)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 6,
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: "var(--primary-soft)", color: "var(--primary)",
                      border: "1px solid rgba(79,70,229,0.25)",
                    }}
                  >
                    <i className="ti ti-eye" style={{ fontSize: 12 }} /> Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExecutiveTransactionDeepDiveModal({ log, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const flowName = log.flow || log.mappingName || log.mapping_name || "Transaction Flow";
  const timestamp = log.time || log.createdAt || log.created_at || log.timestamp || "";
  const latency = log.latency || log.latencyMs || log.latency_ms || log.processing_time_ms || "";
  const inboundAdapter = log.inbound || log.inboundAdapterName || log.inbound_adapter_name || log.source || "Data not available";
  const inboundRequest = log.inboundRequestType || log.inbound_request_type || "Data not available";
  const outboundAdapter = log.outbound || log.outboundAdapterName || log.outbound_adapter_name || log.target || "Data not available";
  const outboundRequest = log.outboundRequestType || log.outbound_request_type || "Data not available";
  const canonicalPayload = log.canonicalPayload || log.canonical_payload || log.transformedPayload || log.transformed_payload || "";
  const outboundPayload = log.responsePayload || log.response_payload || log.outboundPayload || log.outbound_payload || log.outboundResponse || log.outbound_response || "";
  const statusValue = String(log.status || "-").toUpperCase();

  return createPortal(
    (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 9999 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Executive Transaction Deep Dive"
        style={{
          width: "min(760px, 92vw)",
          maxHeight: "min(92vh, 900px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--panel-soft)" }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)" }}>Transaction Deep-Dive</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, color: "var(--heading)" }}>{flowName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
              {timestamp ? formatTimestamp(timestamp) : "Data not available"} · {latency ? `${latency} ms` : "Data not available"}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)", lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 12, overflowY: "auto" }}>
          <div className="linked-flow-modal-summary">
            <div className="linked-flow-step">
              <strong>Customer Onboarding Gateway</strong>
              <span>CUSTOMER_ONBOARDING</span>
            </div>
            <div className="linked-flow-arrow"><i className="ti ti-arrow-down" /></div>
            <div className="linked-flow-chip">Canonical Transformation</div>
            <div className="linked-flow-arrow"><i className="ti ti-arrow-down" /></div>
            <div className="linked-flow-step">
              <strong>KYC Verification Service</strong>
              <span>VERIFY_CUSTOMER</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <Tile label="Flow Name" value={flowName} />
            <Tile label="Status" value={statusValue} />
            <Tile label="Latency" value={latency ? `${latency} ms` : "Data not available"} />
            <Tile label="Timestamp" value={timestamp ? formatTimestamp(timestamp) : "Data not available"} />
          </div>
          <Tile label="Inbound Adapter" value={inboundAdapter} />
          <Tile label="Inbound Request Type" value={inboundRequest} />
          <Tile label="Canonical Payload" value={canonicalPayload ? safeStringifyMasked(canonicalPayload) : "Data not available"} mono />
          <Tile label="Outbound Adapter" value={outboundAdapter} />
          <Tile label="Outbound Request Type" value={outboundRequest} />
          <Tile label="Response Payload" value={outboundPayload ? safeStringifyMasked(outboundPayload) : "Data not available"} mono />
        </div>
      </div>
    </div>
    ),
    document.body,
  );
}

function Tile({ label, value, mono = false }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, background: "var(--panel-soft)", border: "1px solid var(--border)" }}>
      <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>{label}</p>
      <div style={{ marginTop: 6, color: "var(--heading)", fontFamily: mono ? "ui-monospace, SFMono-Regular, Consolas, monospace" : "inherit", whiteSpace: mono ? "pre-wrap" : "normal", wordBreak: mono ? "break-all" : "break-word" }}>
        {value}
      </div>
    </div>
  );
}

function PayloadModal({ log, onClose }) {
  function fmtPayload(val) {
    if (!val || val === "-") return null;
    if (typeof val === "object") { try { return safeStringifyMasked(val); } catch { return String(val); } }
    return safeDisplayValue(val);
  }

  const ok  = ["success", "delivered", "ok", "completed"].includes(String(log.status || "").toLowerCase());
  const bad = ["failed", "failure", "error", "route_failed"].includes(String(log.status || "").toLowerCase());

  const CODE = {
    background: "#1e1e2e", color: "#cdd6f4",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontSize: 11, lineHeight: 1.6, padding: "12px 14px",
    borderRadius: 7, margin: 0, overflowY: "auto",
    maxHeight: 160, whiteSpace: "pre-wrap", wordBreak: "break-all",
    border: "1px solid rgba(255,255,255,0.06)",
  };

  function WaterfallStep({ step, label, sub, accent, children, isLast }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0 }}>
        <div style={{
          border: `1px solid ${accent}`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: 10, overflow: "hidden",
          background: "var(--panel)",
          boxShadow: `0 2px 12px ${accent}22`,
        }}>
          {/* step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${accent}33`, background: `${accent}0d` }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: accent, color: "#fff",
              display: "grid", placeItems: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>{step}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--heading)" }}>{label}</p>
              {sub && <p style={{ margin: 0, fontSize: 10, color: accent, fontFamily: "ui-monospace, monospace", fontWeight: 600, marginTop: 1 }}>{sub}</p>}
            </div>
          </div>
          {/* step body */}
          <div style={{ padding: "12px 14px" }}>{children}</div>
        </div>
        {/* connector arrow */}
        {!isLast && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0" }}>
            <div style={{ width: 2, height: 10, background: "var(--border)" }} />
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M7 10 L0 0 L14 0 Z" fill="var(--primary)" opacity="0.5" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "min(640px, 96vw)",
        maxHeight: "min(90vh, 820px)",
        display: "flex", flexDirection: "column",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}>
        {/* modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--panel-soft)" }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)" }}>Transaction Deep-Dive</p>
            <h3 style={{ margin: "4px 0 0", fontSize: 18, color: "var(--heading)" }}>{flowName}</h3>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)", lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* waterfall body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* STEP 1 â€” Inbound */}
            <WaterfallStep step="1" label="Inbound Reception" sub={log.sourceFormat !== "-" ? log.sourceFormat : undefined} accent="#4f46e5">
              {fmtPayload(log.inboundPayload)
                ? <pre style={CODE}><code>{fmtPayload(log.inboundPayload)}</code></pre>
                : <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>No inbound payload recorded.</p>}
            </WaterfallStep>

            {/* STEP 2 â€” Transformation */}
            <WaterfallStep step="2" label="Canonical Transformation" sub="ESB Canonical Model" accent="#7c3aed">
              {fmtPayload(log.transformedPayload)
                ? <pre style={CODE}><code>{fmtPayload(log.transformedPayload)}</code></pre>
                : <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>No transformed payload recorded.</p>}
            </WaterfallStep>

            {/* STEP 3 â€” Outbound */}
            <WaterfallStep step="3" label="Outbound Delivery" sub={log.target !== "-" ? log.target : undefined} accent={ok ? "#16a34a" : bad ? "#dc2626" : "#64748b"} isLast>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Final Status:</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999,
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                  fontFamily: "ui-monospace, monospace",
                  background: ok ? "var(--primary)" : bad ? "#fff" : "var(--panel-soft)",
                  color: ok ? "#fff" : bad ? "#1c1917" : "var(--muted)",
                  border: ok ? "1px solid var(--primary)" : bad ? "1px solid #1c1917" : "1px solid var(--border)",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#a5f3fc" : bad ? "#1c1917" : "var(--muted)", flexShrink: 0 }} />
                  {ok ? "DELIVERED" : bad ? "FAILED" : String(log.status || "-").toUpperCase()}
                </span>
              </div>
              {fmtPayload(log.outboundResponse)
                ? <pre style={CODE}><code>{fmtPayload(log.outboundResponse)}</code></pre>
                : <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>No outbound response recorded.</p>}
            </WaterfallStep>

          </div>
        </div>
      </div>
    </div>
  );
}






