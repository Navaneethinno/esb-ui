import { useEffect, useMemo, useState } from "react";
import {
  getAuditLogs,
  getApiErrorMessage,
  listLinkedAdapterConfigurations,
} from "../services/esbApi";
import { safeDisplayValue } from "../utils/maskSensitive";

const PAGE_SIZE = 10;

const STATUS_STYLES = {
  success: { bg: "rgba(22,163,74,0.12)", color: "#15803d", border: "rgba(22,163,74,0.3)" },
  failed: { bg: "rgba(220,38,38,0.12)", color: "#b91c1c", border: "rgba(220,38,38,0.28)" },
  pending: { bg: "rgba(234,88,12,0.12)", color: "#c2410c", border: "rgba(234,88,12,0.28)" },
  default: { bg: "var(--panel-soft)", color: "var(--muted)", border: "var(--border)" },
};

const EXECUTION_STAGES = [
  { key: "originalRequest", label: "Mobile Request (JSON)", icon: "ti-device-mobile" },
  { key: "requestMappingApplied", label: "Request Mapping Applied", icon: "ti-arrows-exchange" },
  { key: "transformedRequest", label: "Transformed Request", icon: "ti-transform" },
  { key: "outboundRequestXml", label: "Outbound XML Sent To CBS", icon: "ti-send" },
  { key: "inboundResponseXml", label: "CBS Response XML", icon: "ti-arrow-back-up" },
  { key: "parsedResponse", label: "Parsed CBS Response", icon: "ti-file-code" },
  { key: "responseMappingApplied", label: "Response Mapping Applied", icon: "ti-git-merge" },
  { key: "finalResponse", label: "Final Mobile Response", icon: "ti-circle-check" },
];

function parseValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringifyPretty(value, type = "json") {
  if (value === undefined || value === null || value === "") return "";
  if (type === "xml") return typeof value === "string" ? value : String(value);
  const parsed = parseValue(value);
  if (typeof parsed === "string") {
    try {
      return JSON.stringify(JSON.parse(parsed), null, 2);
    } catch {
      return parsed;
    }
  }
  try {
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(parsed);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCreatedTime(row) {
  const raw = row?.timestamp ?? row?.createdAt ?? row?.created_at ?? row?.date ?? row?.createdDate;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function isHeartbeatRow(row) {
  const requestType = String(row?.requestName || row?.request_name || row?.inboundRequestType || row?.inbound_request_type || "").toLowerCase();
  const adapterName = String(row?.adapterName || row?.adapter_name || row?.inboundAdapterName || row?.outboundAdapterName || "").toLowerCase();
  const mappingName = String(row?.mappingName || row?.mapping_name || "").toLowerCase();
  return requestType === "heartbeat" || adapterName.includes("heartbeat") || mappingName.includes("heartbeat") || Boolean(row?.isHeartbeat || row?.is_heartbeat);
}

function statusStyle(status) {
  return STATUS_STYLES[normalizeStatus(status)] || STATUS_STYLES.default;
}

function getAdapterName(mapping, side) {
  const root = side === "inbound" ? mapping?.inboundAdapter : mapping?.outboundAdapter;
  return (
    root?.adapterName ||
    root?.adapter_name ||
    root?.name ||
    mapping?.[`${side}AdapterName`] ||
    mapping?.[`${side}_adapter_name`] ||
    mapping?.[`${side}AdapterId`] ||
    mapping?.[`${side}_adapter_id`] ||
    "-"
  );
}

function normalizeMappings(value, fallbackType) {
  const parsed = parseValue(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => ({
      mappingType: item?.mappingType || fallbackType || "DIRECT",
      sourceField: item?.sourceField || item?.sourceKey || item?.source || "-",
      targetField: item?.targetField || item?.targetKey || item?.target || "-",
      staticValue: item?.staticValue || "-",
    }));
  }
  if (!parsed || typeof parsed !== "object") return [];
  return Object.entries(parsed).map(([sourceKey, config]) => {
    if (typeof config === "string") {
      return {
        mappingType: fallbackType || "DIRECT",
        sourceField: sourceKey || "-",
        targetField: config || "-",
        staticValue: "-",
      };
    }
    return {
      mappingType: config?.mappingType || fallbackType || "DIRECT",
      sourceField: config?.sourceField || sourceKey || "-",
      targetField: config?.targetField || "-",
      staticValue: config?.staticValue || "-",
    };
  });
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: copied ? "var(--success)" : "var(--muted)",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
      }}
      title={`Copy ${label}`}
    >
      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatusPill({ status }) {
  const style = statusStyle(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: style.color }} />
      {status || "-"}
    </span>
  );
}

function MetaTile({ label, value, accent }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: accent || "var(--panel-soft)",
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        {label}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "var(--heading)", wordBreak: "break-word" }}>
        {value || "-"}
      </p>
    </div>
  );
}

function CodeViewer({ title, value, type }) {
  const content = stringifyPretty(value, type);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)" }}>{title}</span>
        <CopyButton value={content} label={title} />
      </div>
      <pre
        style={{
          margin: 0,
          padding: "16px 18px",
          borderRadius: 14,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
          color: type === "xml" ? "#93c5fd" : "#bfdbfe",
          fontSize: 12,
          lineHeight: 1.65,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
        }}
      >
        <code>{content || "No data available."}</code>
      </pre>
    </div>
  );
}

function SectionCard({ id, title, subtitle, expanded, onToggle, children, badge }) {
  return (
    <section style={{ border: "1px solid var(--border)", borderRadius: 18, background: "var(--panel)", overflow: "hidden" }}>
      <button
        id={id}
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 18px",
          border: "none",
          cursor: "pointer",
          background: "var(--panel-soft)",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14, color: "var(--heading)" }}>{title}</strong>
            {badge}
          </div>
          {subtitle ? <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>{subtitle}</p> : null}
        </div>
        <i className={`ti ti-chevron-${expanded ? "up" : "down"}`} style={{ color: "var(--muted)", fontSize: 16 }} />
      </button>
      {expanded ? <div style={{ padding: 18 }}>{children}</div> : null}
    </section>
  );
}

function MappingDetailsModal({ mapping, onClose }) {
  if (!mapping) return null;

  const requestMappings = normalizeMappings(mapping.requestMappings, "REQUEST");
  const responseMappings = normalizeMappings(mapping.responseMappings, "RESPONSE");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(15,23,42,0.55)", display: "grid", placeItems: "center", padding: 20 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div style={{ width: "min(980px, 100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--panel)", borderRadius: 22, border: "1px solid var(--border)", boxShadow: "0 24px 90px rgba(15,23,42,0.38)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 22px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 1 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)" }}>
              Mapping Details
            </p>
            <h3 style={{ margin: "6px 0 0", fontSize: 20, color: "var(--heading)" }}>{mapping.mappingName || mapping.mappingId || mapping.id || "-"}</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <MetaTile label="Mapping ID" value={mapping.mappingId || mapping.id || "-"} />
            <MetaTile label="Mapping Name" value={mapping.mappingName || "-"} />
            <MetaTile label="Inbound Adapter" value={getAdapterName(mapping, "inbound")} />
            <MetaTile label="Outbound Adapter" value={getAdapterName(mapping, "outbound")} />
            <MetaTile label="Created Date" value={formatTimestamp(mapping.createdAt || mapping.created_at)} />
            <MetaTile label="Last Updated Date" value={formatTimestamp(mapping.updatedAt || mapping.updated_at)} />
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <MappingTable title="Request Mappings" rows={requestMappings} />
            <MappingTable title="Response Mappings" rows={responseMappings} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MappingTable({ title, rows }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", background: "var(--panel-soft)" }}>
        <strong style={{ fontSize: 14, color: "var(--heading)" }}>{title}</strong>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12, color: "var(--muted)" }}>No mappings available.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(148,163,184,0.08)" }}>
                {["Mapping Type", "Source Field", "Target Field", "Static Value"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", textAlign: "left", color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border)" }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 14px", color: "var(--heading)", fontWeight: 700 }}>{row.mappingType || "-"}</td>
                  <td style={{ padding: "12px 14px", color: "var(--heading)" }}>{row.sourceField || "-"}</td>
                  <td style={{ padding: "12px 14px", color: "var(--heading)" }}>{row.targetField || "-"}</td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)" }}>{row.staticValue || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExecutionTimeline({ log }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {EXECUTION_STAGES.map((stage, index) => {
        const active =
          stage.key === "requestMappingApplied" ||
          stage.key === "responseMappingApplied" ||
          Boolean(log?.[stage.key]);
        return (
          <div key={stage.key} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 14, minHeight: 58 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: active ? "rgba(37,99,235,0.16)" : "rgba(148,163,184,0.14)",
                color: active ? "#2563eb" : "var(--muted)",
                border: `1px solid ${active ? "rgba(37,99,235,0.25)" : "var(--border)"}`,
                flexShrink: 0,
              }}>
                <i className={`ti ${stage.icon}`} style={{ fontSize: 13 }} />
              </div>
              {index < EXECUTION_STAGES.length - 1 ? (
                <div style={{ flex: 1, width: 2, background: active ? "linear-gradient(180deg, rgba(37,99,235,0.4), rgba(148,163,184,0.2))" : "rgba(148,163,184,0.18)", marginTop: 8 }} />
              ) : null}
            </div>
            <div style={{ paddingTop: 2 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>{stage.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)" }}>{active ? "Captured in audit trail" : "No payload captured"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditDashboard({ selectedUser }) {
  const [logs, setLogs] = useState([]);
  const [linkedMappings, setLinkedMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [adapterFilter, setAdapterFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [mappingModal, setMappingModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSections, setExpandedSections] = useState(() => ({
    originalRequest: true,
    transformedRequest: true,
    outboundDestination: true,
    outboundRequestXml: true,
    inboundResponseXml: true,
    parsedResponse: true,
    responseMappingsUsed: true,
    finalResponse: true,
    executionMetadata: true,
  }));

  const username = selectedUser?.username || undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      getAuditLogs(username),
      listLinkedAdapterConfigurations().catch(() => []),
    ])
      .then(([auditRows, mappings]) => {
        if (!active) return;
        
        // DEBUG: Log first audit row to inspect property names
        if (Array.isArray(auditRows) && auditRows.length > 0) {
          console.log("[AUDIT DEBUG] First audit row:", auditRows[0]);
          console.log("[AUDIT DEBUG] Property names:", Object.keys(auditRows[0]));
        }
        
        const sortedLogs = Array.isArray(auditRows) ? [...auditRows].sort((a, b) => getCreatedTime(b) - getCreatedTime(a)) : [];
        setLogs(sortedLogs);
        setLinkedMappings(Array.isArray(mappings) ? mappings : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username]);

  const adapterOptions = useMemo(() => {
    const names = new Set();
    logs.forEach((row) => {
      if (row?.inboundAdapterName) names.add(row.inboundAdapterName);
      if (row?.outboundAdapterName) names.add(row.outboundAdapterName);
    });
    return ["All", ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((row) => {
      const searchMatch =
        !q ||
        [row.requestId, row.mappingId, row.inboundAdapterName, row.outboundAdapterName, row.inboundRequestType, row.outboundRequestType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const statusMatch =
        statusFilter === "All" ||
        normalizeStatus(row.status) === normalizeStatus(statusFilter);

      const adapterMatch =
        adapterFilter === "All" ||
        row.inboundAdapterName === adapterFilter ||
        row.outboundAdapterName === adapterFilter;

      const rowDate = row.timestamp ? new Date(row.timestamp) : null;
      const fromMatch = !fromDate || (rowDate && rowDate >= new Date(`${fromDate}T00:00:00`));
      const toMatch = !toDate || (rowDate && rowDate <= new Date(`${toDate}T23:59:59`));

      return searchMatch && statusMatch && adapterMatch && fromMatch && toMatch;
    });
  }, [adapterFilter, fromDate, logs, search, statusFilter, toDate]);

  const successCount = filteredLogs.filter((row) => normalizeStatus(row.status) === "success").length;
  const failedCount = filteredLogs.filter((row) => normalizeStatus(row.status) === "failed").length;
  const pendingCount = filteredLogs.filter((row) => normalizeStatus(row.status) === "pending").length;

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, adapterFilter, fromDate, toDate]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  function toggleSection(key) {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }

  function openMappingDetails(mappingId) {
    const found = linkedMappings.find((item) => String(item.mappingId || item.id) === String(mappingId));
    if (found) setMappingModal(found);
  }

  const selectedLogMapping = useMemo(() => {
    if (!selectedLog?.mappingId) return null;
    return linkedMappings.find((item) => String(item.mappingId || item.id) === String(selectedLog.mappingId)) || null;
  }, [linkedMappings, selectedLog]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "var(--heading)" }}>Audit Logs</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(120px, 1fr))", gap: 12, minWidth: "min(100%, 420px)" }}>
          <MetaTile label="Transactions" value={filteredLogs.length} accent="rgba(37,99,235,0.08)" />
          <MetaTile label="Success" value={successCount} accent="rgba(22,163,74,0.08)" />
          <MetaTile label="Failed / Pending" value={`${failedCount} / ${pendingCount}`} accent="rgba(234,88,12,0.08)" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 18, background: "var(--panel-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
          <i className="ti ti-search" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search request ID, mapping ID, adapter, request type"
            style={{ width: "100%", border: "none", background: "transparent", outline: "none", padding: "10px 0", color: "var(--heading)", fontSize: 12 }}
          />
        </div>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={filterControlStyle}>
          {["All", "SUCCESS", "FAILED", "PENDING"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <select value={adapterFilter} onChange={(event) => setAdapterFilter(event.target.value)} style={filterControlStyle}>
          {adapterOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>

        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={filterControlStyle} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={filterControlStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", fontSize: 12, color: "var(--muted)" }}>
          <span>{filteredLogs.length} records</span>
          <span>Page {currentPage} / {pageCount}</span>
        </div>
      </div>

      {error ? <p className="status error">{error}</p> : null}

      <div style={{ border: "1px solid var(--border)", borderRadius: 20, background: "var(--panel)", overflow: "hidden", boxShadow: "0 18px 48px rgba(15,23,42,0.08)" }}>
        {loading ? (
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="skel" style={{ height: 58, borderRadius: 12 }} />)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "44px 20px", textAlign: "center" }}>
            <i className="ti ti-clipboard-off" style={{ display: "block", fontSize: 40, color: "var(--border)", marginBottom: 10 }} />
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>No enriched adapter link audit records match the current filters.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                <thead>
                  <tr style={{ background: "var(--panel-soft)" }}>
                    {["Execution Type", "Mapping", "Inbound Adapter", "Inbound Request Type", "Outbound Adapter", "Outbound Request Type", "Status", "Date", "Time", "Preview"].map((header) => (
                      <th key={header} style={{ padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--panel-soft)", zIndex: 1 }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedLogs.map((row, index) => {
                    // DEBUG: Log row data for inspection
                    if (index === 0) {
                      console.log("[AUDIT ROW DEBUG] Sample row:", row);
                    }
                    
                    // Normalize property access with fallbacks
                    const mappingId = row?.mappingId ?? row?.mapping_id ?? row?.id ?? "-";
                    const inboundAdapterName = row?.inboundAdapterName ?? row?.inbound_adapter_name ?? row?.inboundAdapter ?? "-";
                    const inboundRequestType = row?.inboundRequestType ?? row?.inbound_request_type ?? row?.requestType ?? "-";
                    const outboundAdapterName = row?.outboundAdapterName ?? row?.outbound_adapter_name ?? row?.outboundAdapter ?? "-";
                    const outboundRequestType = row?.outboundRequestType ?? row?.outbound_request_type ?? row?.responseType ?? "-";
                    const executionType = isHeartbeatRow(row) ? "HEARTBEAT" : "TRANSACTION";
                    const timestamp = row?.timestamp ?? row?.createdAt ?? row?.created_at ?? row?.date;
                    const friendlyMappingName = row?.mappingName || row?.mapping_name || (executionType === "HEARTBEAT" ? "Heartbeat UI Final" : mappingId);
                    
                    return (
                    <tr key={`${row.requestId || row.mappingId || "audit"}-${index}`} style={{ borderBottom: "1px solid var(--border)", background: index % 2 === 0 ? "var(--panel)" : "rgba(148,163,184,0.04)" }}>
                      <td style={cellStyle}>
                        <span className={`activity-badge ${executionType === "HEARTBEAT" ? "pending" : "success"}`}>
                          {executionType}
                        </span>
                      </td>
                      <td style={cellStyle}>
                        <button
                          type="button"
                          title={mappingId}
                          onClick={() => openMappingDetails(mappingId)}
                          style={{ border: "none", background: "transparent", padding: 0, color: "var(--primary)", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}
                        >
                          {friendlyMappingName}
                        </button>
                      </td>
                      <td style={cellStyle}><strong style={{ color: "var(--heading)" }}>{inboundAdapterName}</strong></td>
                      <td style={cellStyle}>{inboundRequestType}</td>
                      <td style={cellStyle}><strong style={{ color: "var(--heading)" }}>{outboundAdapterName}</strong></td>
                      <td style={cellStyle}>{outboundRequestType}</td>
                      <td style={cellStyle}><StatusPill status={row.status} /></td>
                      <td style={cellStyle}>{formatDate(timestamp)}</td>
                      <td style={cellStyle}>{formatTime(timestamp)}</td>
                      <td style={cellStyle}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(row)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(37,99,235,0.2)",
                            background: "rgba(37,99,235,0.08)",
                            color: "#2563eb",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          <i className="ti ti-eye" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--panel-soft)", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} style={pagerButtonStyle(currentPage === 1)}>
                  Previous
                </button>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} style={pagerButtonStyle(currentPage === pageCount)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {mappingModal ? <MappingDetailsModal mapping={mappingModal} onClose={() => setMappingModal(null)} /> : null}

      {selectedLog ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(15,23,42,0.52)", display: "flex", justifyContent: "flex-end" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedLog(null);
          }}
        >
          <div style={{ width: "min(980px, 100%)", height: "100vh", background: "var(--panel)", display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(15,23,42,0.24)" }}>
            <div style={{ position: "sticky", top: 0, zIndex: 2, padding: "20px 22px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ display: "grid", gap: 14, flex: 1 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary)" }}>
                      ESB Transaction Preview
                    </p>
                    <h3 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 900, color: "var(--heading)" }}>
                      {selectedLog.requestId || "-"}
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    <MetaTile label="Execution Type" value={isHeartbeatRow(selectedLog) ? "HEARTBEAT" : "TRANSACTION"} />
                    <MetaTile label="Mapping" value={selectedLog?.mappingName ?? selectedLog?.mapping_name ?? (isHeartbeatRow(selectedLog) ? "Heartbeat UI Final" : selectedLog?.mappingId ?? "-")} />
                    <MetaTile label="Mapping Name" value={selectedLog?.mappingName ?? selectedLog?.mapping_name ?? selectedLogMapping?.mappingName ?? selectedLogMapping?.mapping_name ?? "-"} />
                    <MetaTile label="Inbound Adapter" value={selectedLog?.inboundAdapterName ?? selectedLog?.inbound_adapter_name ?? selectedLog?.inboundAdapter ?? "-"} />
                    <MetaTile label="Inbound Request Type" value={selectedLog?.inboundRequestType ?? selectedLog?.inbound_request_type ?? selectedLog?.requestType ?? "-"} />
                    <MetaTile label="Outbound Adapter" value={selectedLog?.outboundAdapterName ?? selectedLog?.outbound_adapter_name ?? selectedLog?.outboundAdapter ?? "-"} />
                    <MetaTile label="Outbound Request Type" value={selectedLog?.outboundRequestType ?? selectedLog?.outbound_request_type ?? selectedLog?.responseType ?? "-"} />
                    <MetaTile label="Adapter Type" value={selectedLog?.adapterType ?? selectedLog?.adapter_type ?? selectedLog?.type ?? "-"} />
                    <MetaTile label="Status" value={<StatusPill status={selectedLog?.status} />} />
                    <MetaTile label="Latency" value={selectedLog?.latencyMs ?? selectedLog?.latency_ms ?? selectedLog?.latency ? `${selectedLog.latencyMs || selectedLog.latency_ms || selectedLog.latency} ms` : "-"} />
                    <MetaTile label="Timestamp" value={formatTimestamp(selectedLog?.timestamp ?? selectedLog?.createdAt ?? selectedLog?.created_at)} />
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedLog(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 22 }}>
                  <i className="ti ti-x" />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 22, alignItems: "start" }}>
                <div style={{ position: "sticky", top: 18, border: "1px solid var(--border)", borderRadius: 18, padding: 18, background: "var(--panel-soft)" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
                    Execution Journey
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <ExecutionTimeline log={selectedLog} />
                  </div>
                </div>

                <div style={{ display: "grid", gap: 18 }}>
                  <SectionCard
                    id="originalRequest"
                    title="1. Original Request"
                    subtitle="Raw mobile request captured before transformation."
                    expanded={expandedSections.originalRequest}
                    onToggle={() => toggleSection("originalRequest")}
                  >
                    <CodeViewer 
                      title="Original Request" 
                      value={selectedLog?.originalRequest ?? selectedLog?.original_request ?? selectedLog?.requestPayload ?? selectedLog?.request_payload} 
                      type="json" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="transformedRequest"
                    title="2. Transformed Request"
                    subtitle="Post-request-mapping payload prepared for outbound handling."
                    expanded={expandedSections.transformedRequest}
                    onToggle={() => toggleSection("transformedRequest")}
                  >
                    <CodeViewer 
                      title="Transformed Request" 
                      value={selectedLog?.transformedRequest ?? selectedLog?.transformed_request ?? selectedLog?.mappedRequest ?? selectedLog?.mapped_request} 
                      type="json" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="outboundDestination"
                    title="3. Outbound Destination"
                    subtitle="Resolved connection target for the outbound adapter."
                    expanded={expandedSections.outboundDestination}
                    onToggle={() => toggleSection("outboundDestination")}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
                      {(() => {
                        const destination = parseValue(selectedLog?.outboundDestination ?? selectedLog?.outbound_destination) || {};
                        return (
                          <>
                            <MetaTile label="Host" value={safeDisplayValue(destination.host)} />
                            <MetaTile label="Port" value={safeDisplayValue(destination.port)} />
                            <MetaTile label="Path" value={safeDisplayValue(destination.path)} />
                            <MetaTile label="Protocol" value={safeDisplayValue(destination.protocol)} />
                          </>
                        );
                      })()}
                    </div>
                  </SectionCard>

                  <SectionCard
                    id="outboundRequestXml"
                    title="4. Outbound XML Sent To CBS"
                    subtitle="XML payload sent from ESB to CBS."
                    expanded={expandedSections.outboundRequestXml}
                    onToggle={() => toggleSection("outboundRequestXml")}
                  >
                    <CodeViewer 
                      title="Outbound Request XML" 
                      value={selectedLog?.outboundRequestXml ?? selectedLog?.outbound_request_xml ?? selectedLog?.outboundRequest ?? selectedLog?.outbound_request} 
                      type="xml" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="inboundResponseXml"
                    title="5. CBS Response XML"
                    subtitle="Response body received back from CBS."
                    expanded={expandedSections.inboundResponseXml}
                    onToggle={() => toggleSection("inboundResponseXml")}
                  >
                    <CodeViewer 
                      title="CBS Response XML" 
                      value={selectedLog?.inboundResponseXml ?? selectedLog?.inbound_response_xml ?? selectedLog?.cbsResponse ?? selectedLog?.cbs_response} 
                      type="xml" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="parsedResponse"
                    title="6. Parsed CBS Response"
                    subtitle="XML parsed into JSON before response transformation."
                    expanded={expandedSections.parsedResponse}
                    onToggle={() => toggleSection("parsedResponse")}
                  >
                    <CodeViewer 
                      title="Parsed Response" 
                      value={selectedLog?.parsedResponse ?? selectedLog?.parsed_response ?? selectedLog?.parsedCbsResponse ?? selectedLog?.parsed_cbs_response} 
                      type="json" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="responseMappingsUsed"
                    title="7. Response Mappings Used"
                    subtitle="Field-level mappings applied while building the final mobile response."
                    expanded={expandedSections.responseMappingsUsed}
                    onToggle={() => toggleSection("responseMappingsUsed")}
                    badge={
                      selectedLogMapping ? (
                        <button type="button" onClick={(event) => { event.stopPropagation(); setMappingModal(selectedLogMapping); }} style={{ border: "none", background: "transparent", color: "var(--primary)", fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}>
                          Open Mapping Details
                        </button>
                      ) : null
                    }
                  >
                    <MappingTable 
                      title="Response Mappings" 
                      rows={normalizeMappings(selectedLog?.responseMappingsUsed ?? selectedLog?.response_mappings_used ?? selectedLog?.responseMappings ?? selectedLog?.response_mappings, "RESPONSE")} 
                    />
                  </SectionCard>

                  <SectionCard
                    id="finalResponse"
                    title="8. Final Mobile Response"
                    subtitle="Response returned by the ESB runtime back to the client."
                    expanded={expandedSections.finalResponse}
                    onToggle={() => toggleSection("finalResponse")}
                  >
                    <CodeViewer 
                      title="Final Response" 
                      value={selectedLog?.finalResponse ?? selectedLog?.final_response ?? selectedLog?.response ?? selectedLog?.mobileResponse ?? selectedLog?.mobile_response} 
                      type="json" 
                    />
                  </SectionCard>

                  <SectionCard
                    id="executionMetadata"
                    title="9. Execution Metadata"
                    subtitle="Operational state captured for this transaction."
                    expanded={expandedSections.executionMetadata}
                    onToggle={() => toggleSection("executionMetadata")}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
                      <MetaTile label="Execution Type" value={isHeartbeatRow(selectedLog) ? "HEARTBEAT" : "TRANSACTION"} />
                      <MetaTile label="Mapping" value={selectedLog?.mappingName ?? selectedLog?.mapping_name ?? (isHeartbeatRow(selectedLog) ? "Heartbeat UI Final" : selectedLog?.mappingId ?? "-")} />
                      <MetaTile label="Mapping Name" value={selectedLog?.mappingName ?? selectedLog?.mapping_name ?? selectedLogMapping?.mappingName ?? selectedLogMapping?.mapping_name ?? "-"} />
                      <MetaTile label="Inbound Adapter" value={selectedLog?.inboundAdapterName ?? selectedLog?.inbound_adapter_name ?? selectedLog?.inboundAdapter ?? "-"} />
                      <MetaTile label="Outbound Adapter" value={selectedLog?.outboundAdapterName ?? selectedLog?.outbound_adapter_name ?? selectedLog?.outboundAdapter ?? "-"} />
                      <MetaTile label="Adapter Type" value={selectedLog?.adapterType ?? selectedLog?.adapter_type ?? selectedLog?.type ?? "-"} />
                      <MetaTile label="Status" value={selectedLog?.status ?? "-"} />
                      <MetaTile label="Transform Status" value={selectedLog?.transformStatus ?? selectedLog?.transform_status ?? "-"} />
                      <MetaTile label="Outbound Status" value={selectedLog?.outboundStatus ?? selectedLog?.outbound_status ?? "-"} />
                      <MetaTile label="Latency" value={selectedLog?.latencyMs ?? selectedLog?.latency_ms ?? selectedLog?.latency ? `${selectedLog.latencyMs || selectedLog.latency_ms || selectedLog.latency} ms` : "-"} />
                      <MetaTile label="Timestamp" value={formatTimestamp(selectedLog?.timestamp ?? selectedLog?.createdAt ?? selectedLog?.created_at)} />
                    </div>
                  </SectionCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const filterControlStyle = {
  padding: "12px 14px",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--panel)",
  color: "var(--heading)",
  fontSize: 12,
  outline: "none",
};

const cellStyle = {
  padding: "14px 16px",
  fontSize: 12,
  color: "var(--heading)",
  verticalAlign: "middle",
};

function pagerButtonStyle(disabled) {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: disabled ? "var(--panel)" : "var(--panel)",
    color: disabled ? "var(--border)" : "var(--heading)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}
