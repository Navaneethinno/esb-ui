import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAdapterAnalytics, getApiErrorMessage } from "../services/esbApi";

function formatTs(value) {
  if (!value) return "Data not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "-").replace(",", "");
}

function formatLatency(value) {
  if (value == null || value === "") return "N/A";
  const num = Number(value);
  return Number.isFinite(num) ? `${Math.round(num)} ms` : "N/A";
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0%";
  return `${num % 1 === 0 ? num : num.toFixed(1)}%`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function metricNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeHistoryRow(row) {
  return {
    timestamp: row.startTime ?? row.timestamp ?? row.createdAt ?? row.created_at ?? row.executedAt ?? row.executed_at ?? "",
    requestType: row.inboundRequestType ?? row.requestType ?? row.request_type ?? row.requestName ?? row.request_name ?? "Data not available",
    status: row.status ?? row.finalStatus ?? row.final_status ?? "Data not available",
    latencyMs: row.latencyMs ?? row.latency_ms ?? row.processingTimeMs ?? row.processing_time_ms ?? null,
    linkedFlow: row.mappingName ?? row.linkedFlow ?? row.linked_flow ?? row.flowName ?? row.flow_name ?? "Data not available",
    errorMessage: row.errorMessage ?? row.error_message ?? row.error ?? "",
  };
}

function KpiCard({ icon, label, value, sub, accent = "indigo" }) {
  const palette = {
    indigo: { bg: "rgba(79,70,229,0.07)", border: "rgba(79,70,229,0.18)", icon: "rgba(79,70,229,0.12)", text: "var(--primary)" },
    green: { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", icon: "rgba(22,163,74,0.12)", text: "var(--success)" },
    red: { bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.18)", icon: "rgba(220,38,38,0.12)", text: "var(--danger)" },
    amber: { bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.18)", icon: "rgba(245,158,11,0.12)", text: "#d97706" },
  };
  const p = palette[accent] || palette.indigo;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", borderRadius: 12, background: p.bg, border: `1px solid ${p.border}` }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: p.icon, display: "grid", placeItems: "center", fontSize: 20, color: p.text }}>
        <i className={`ti ${icon}`} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: p.text }}>{label}</p>
        <strong style={{ display: "block", fontSize: 28, fontWeight: 800, color: "var(--heading)", lineHeight: 1.1 }}>{value}</strong>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ChartPanel({ title, accent = "var(--primary)", children }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${accent}` }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--heading)" }}>{title}</p>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--heading)" }}>{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ margin: 0, color: item.color }}>{item.name}: <strong>{item.value}</strong></p>
      ))}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <strong style={{ color: "var(--heading)", fontSize: 12 }}>{value || "Data not available"}</strong>
    </div>
  );
}

function ConfiguredRequestTypeCard({ item }) {
  const requestType = item.requestType ?? item.request_name ?? item.name ?? "Data not available";
  const createdAt = item.createdAt ?? item.created_at ?? item.createdOn ?? item.created_on ?? null;
  const lastTriggeredAt = item.lastTriggeredAt ?? item.last_triggered_at ?? item.lastTriggered ?? item.last_triggered ?? null;
  const executionCount = metricNumber(item.executionCount ?? item.execution_count ?? item.executions ?? 0);

  return (
    <div style={{
      padding: "18px 20px",
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--panel-soft)",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Request Type</p>
          <h4 style={{ margin: "6px 0 0", fontSize: 16, fontWeight: 800, color: "var(--heading)" }}>{requestType}</h4>
        </div>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 800,
          background: executionCount === 0 ? "rgba(245,158,11,0.1)" : "rgba(22,163,74,0.1)",
          color: executionCount === 0 ? "#d97706" : "var(--success)",
          border: `1px solid ${executionCount === 0 ? "rgba(245,158,11,0.3)" : "rgba(22,163,74,0.3)"}`
        }}>
          {executionCount === 0 ? (
            <><i className="ti ti-clock-pause" /> Never Executed</>
          ) : (
            <><i className="ti ti-circle-check" /> {executionCount} Execution{executionCount === 1 ? "" : "s"}</>
          )}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Created</p>
          <strong style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--heading)", fontFamily: "ui-monospace, monospace" }}>{formatTs(createdAt)}</strong>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Last Triggered</p>
          <strong style={{
            display: "block",
            marginTop: 4,
            fontSize: 12,
            color: lastTriggeredAt ? "var(--heading)" : "var(--muted)",
            fontFamily: "ui-monospace, monospace",
            fontStyle: lastTriggeredAt ? "normal" : "italic"
          }}>
            {lastTriggeredAt ? formatTs(lastTriggeredAt) : "Never"}
          </strong>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry, onBack }) {
  return (
    <div style={{ padding: 24, border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel)" }}>
      <p style={{ margin: 0, fontWeight: 700, color: "var(--heading)" }}>{message}</p>
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" onClick={onRetry}>
          <i className="ti ti-refresh" /> Retry
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back to Registry
        </button>
      </div>
    </div>
  );
}

export default function AdapterDetails({ adapterInfo, onBack }) {
  const adapterId = adapterInfo?.adapterId || adapterInfo?.outboundId || "";
  const adapterType = adapterInfo?.adapterType || adapterInfo?.row?.direction || "";
  const adapterName = adapterInfo?.row?.displayName || adapterInfo?.row?.adapterName || adapterInfo?.row?.name || "Adapter Details";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  const summary = analytics?.summary || {};
  const totalExecutions = metricNumber(summary.totalExecutions);
  const successRate = metricNumber(summary.successRate);
  const failedTransactions = metricNumber(summary.failedTransactions);
  const averageLatencyMs = summary.averageLatencyMs ?? null;
  const requestTypeVolume = asArray(analytics?.charts?.requestTypeVolume).map((item) => ({
    name: item.requestType ?? item.name ?? "Data not available",
    value: metricNumber(item.count ?? item.value),
  }));
  const configuredRequestTypes = asArray(analytics?.configuredRequestTypes);
  const latencyTrend = asArray(analytics?.charts?.latencyTrend).map((item) => ({
    timestamp: item.timestamp ?? item.label ?? "",
    value: metricNumber(item.latencyMs ?? item.value),
  }));
  const outcomeSplit = asArray(analytics?.charts?.auditOutcomeSplit).map((item) => ({
    name: item.status ?? item.name ?? "Data not available",
    value: metricNumber(item.count ?? item.value),
  }));
  const transactionHistory = asArray(analytics?.transactionHistory).map(normalizeHistoryRow);
  const linkedFlow = analytics?.linkedFlow || analytics?.charts?.linkedFlow || null;
  const lastTransaction = analytics?.lastTransaction || transactionHistory[0] || null;
  const zeroExecutions = totalExecutions === 0;
  const hasCharts = !zeroExecutions && !error;

  async function loadAnalytics() {
    if (!adapterId) {
      setError("Unable to load adapter analytics.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getAdapterAnalytics(adapterId);
      console.log("analytics.debug.adapterId", response?.debug?.adapterId ?? adapterId);
      console.log("analytics.debug.matchedAuditRows", response?.debug?.matchedAuditRows ?? response?.debug?.auditRowCount ?? null);
      console.log("analytics.debug.matchedIdentifiers", response?.debug?.matchedIdentifiers ?? null);
      setAnalytics(response || null);
      setLoading(false);
    } catch (err) {
      console.log("analytics.debug.adapterId", adapterId);
      console.log("analytics.debug.matchedAuditRows", null);
      console.log("analytics.debug.matchedIdentifiers", null);
      setAnalytics(null);
      setLoading(false);
      if (err?.response?.status === 404) {
        setError("Unable to load adapter analytics.");
      } else {
        setError(getApiErrorMessage(err));
      }
    }
  }

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapterId]);

  const requestVolumeData = useMemo(() => requestTypeVolume, [requestTypeVolume]);
  const latencySeriesData = useMemo(() => latencyTrend.map((item, index) => ({ index: index + 1, value: item.value })), [latencyTrend]);
  const outcomeData = useMemo(() => outcomeSplit, [outcomeSplit]);
  const averageLatencyDisplay = zeroExecutions ? "N/A" : formatLatency(averageLatencyMs);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 28 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skel" style={{ height: i < 4 ? 80 : 220, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAnalytics} onBack={onBack} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onBack}>
            <i className="ti ti-arrow-left" /> Back
          </button>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--heading)" }}>{adapterName}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {adapterType && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(79,70,229,0.08)", color: "var(--primary)", border: "1px solid rgba(79,70,229,0.2)" }}>
              <i className="ti ti-device-laptop" /> {adapterType}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(79,70,229,0.06)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            <i className="ti ti-history" /> {totalExecutions} executions
          </span>
        </div>
      </div>

      {zeroExecutions ? (
        <div style={{ padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--panel-soft)", color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ display: "block", color: "var(--heading)", marginBottom: 4 }}>No execution history available yet.</strong>
          <span>Run a test transaction to begin collecting analytics.</span>
        </div>
      ) : null}

      <ChartPanel title="Configured Request Types" accent="var(--success)">
        {configuredRequestTypes.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>No request types configured.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {configuredRequestTypes.map((item, index) => (
              <ConfiguredRequestTypeCard key={`${item.requestType ?? item.name ?? index}`} item={item} />
            ))}
          </div>
        )}
      </ChartPanel>

      {zeroExecutions ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
          <KpiCard icon="ti-activity" label="Total Executions" value={totalExecutions} accent="indigo" />
          <KpiCard icon="ti-circle-check" label="Success Rate" value={formatPercent(successRate)} sub={`${successRate}% success`} accent={successRate >= 95 ? "green" : successRate >= 80 ? "amber" : "red"} />
          <KpiCard icon="ti-alert-triangle" label="Failed Transactions" value={failedTransactions} accent={failedTransactions > 0 ? "red" : "green"} />
          <KpiCard icon="ti-clock" label="Average Latency" value={averageLatencyDisplay} accent="amber" />
        </div>
      )}

      {hasCharts ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <ChartPanel title="Audit Outcome Split" accent="var(--success)">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={3} dataKey="value">
                    {outcomeData.map((entry, index) => (
                      <Cell key={entry.name || index} fill={index === 0 ? "var(--success)" : "#ef4444"} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Request Type Volume" accent="var(--primary)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={requestVolumeData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Executions" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel title="Latency Trend" accent="#d97706">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={latencySeriesData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="index" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="value" name="Latency (ms)" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <ChartPanel title="Linked Flow" accent="var(--success)">
            {linkedFlow ? (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>{typeof linkedFlow === "string" ? linkedFlow : JSON.stringify(linkedFlow, null, 2)}</pre>
            ) : (
              <p style={{ margin: 0, color: "var(--muted)" }}>Data not available</p>
            )}
          </ChartPanel>
        </>
      ) : null}

      <ChartPanel title="Last Transaction" accent="var(--primary)">
        {lastTransaction ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 0 }}>
            <InfoRow label="Last Transaction Time" value={formatTs(lastTransaction.timestamp)} />
            <InfoRow label="Request Type" value={lastTransaction.requestType} />
            <InfoRow label="Status" value={lastTransaction.status} />
            <InfoRow label="Latency" value={formatLatency(lastTransaction.latencyMs)} />
            <InfoRow label="Linked Flow" value={lastTransaction.linkedFlow} />
          </div>
        ) : (
          <p style={{ margin: 0, color: "var(--muted)" }}>No transaction data available yet.</p>
        )}
      </ChartPanel>

      <ChartPanel title="Transaction History" accent="#7c3aed">
        {transactionHistory.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>No transaction data available yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--panel-soft)" }}>
                  {["Timestamp", "Request Type", "Status", "Latency", "Linked Flow", "Error"].map((head) => (
                    <th key={head} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", borderBottom: "2px solid var(--border)", whiteSpace: "nowrap" }}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactionHistory.map((row, index) => (
                  <tr key={`${row.timestamp || index}-${row.requestType}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 16px", color: "var(--muted)", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{formatTs(row.timestamp)}</td>
                    <td style={{ padding: "11px 16px" }}>{row.requestType}</td>
                    <td style={{ padding: "11px 16px" }}>{row.status}</td>
                    <td style={{ padding: "11px 16px" }}>{formatLatency(row.latencyMs)}</td>
                    <td style={{ padding: "11px 16px" }}>{row.linkedFlow}</td>
                    <td style={{ padding: "11px 16px", color: "var(--danger)" }}>{row.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartPanel>
    </div>
  );
}
