import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuditLogs } from "../services/esbApi";
import { DataTableContainer, TablePagination, useTableQuery } from "../components/shared/DataTable";
import { PageToolbar } from "../components/shared/PageToolbar";

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

function isTruthyStatus(value) {
  const s = String(value || "").toLowerCase();
  return ["success", "active", "ok", "running", "up", "completed", "delivered"].includes(s);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getRouteKey(row) {
  const mapping = String(getValue(row, ["mappingName", "mapping_name"]) || "").trim();
  const inbound = String(getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "").trim();
  const outbound = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "").trim();
  return [mapping, inbound, outbound].filter(Boolean).join(" | ");
}

function getRouteType(row) {
  const adapterName = String(getValue(row, ["outboundAdapterName", "outbound_adapter_name", "inboundAdapterName", "inbound_adapter_name"]) || "").toLowerCase();
  const requestType = String(getValue(row, ["outboundRequestType", "outbound_request_type", "inboundRequestType", "inbound_request_type"]) || "").toLowerCase();
  const mappingName = String(getValue(row, ["mappingName", "mapping_name"]) || "").toLowerCase();
  const isHeartbeat =
    adapterName.includes("heartbeat") ||
    requestType === "heartbeat" ||
    mappingName.includes("heartbeat") ||
    Boolean(getValue(row, ["isHeartbeat", "is_heartbeat"]));
  return isHeartbeat ? "HEARTBEAT" : "INTEGRATION";
}

function getFriendlyMappingLabel(route) {
  if (route?.routeType === "HEARTBEAT") {
    return route?.outboundAdapterName || "Heartbeat UI Final";
  }
  const inbound = route?.inboundRequestType || "IN";
  const outbound = route?.outboundRequestType || "OUT";
  return `${inbound} → ${outbound}`;
}

function buildRouteGroupsFromAudit(logs) {
  const groups = new Map();
  const now = Date.now();

  asArray(logs).forEach((row) => {
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
      mappingName: getValue(row, ["mappingName", "mapping_name"]) || "Friendly Route",
      inboundAdapterName: getValue(row, ["inboundAdapterName", "inbound_adapter_name"]) || "Unlinked Adapter",
      inboundRequestType: getValue(row, ["inboundRequestType", "inbound_request_type"]) || "—",
      outboundAdapterName: getValue(row, ["outboundAdapterName", "outbound_adapter_name"]) || "Unlinked Adapter",
      outboundRequestType: getValue(row, ["outboundRequestType", "outbound_request_type"]) || "—",
      routeType: getRouteType(row),
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
      active: group.recentTs ? now - group.recentTs <= 24 * 60 * 60 * 1000 : false,
      idle: group.recentTs ? now - group.recentTs > 24 * 60 * 60 * 1000 : true,
    }))
    .sort((a, b) => b.executionCount - a.executionCount || b.recentTs - a.recentTs);
}

function formatTimestamp(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatNumber(value) {
  if (value === "" || value === null || value === undefined) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return Intl.NumberFormat().format(Math.round(num * 100) / 100);
}

export default function LinkedRoutesPage({ selectedUsername }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedUsername) {
      setRoutes([]);
      return;
    }

    setLoading(true);
    try {
      const result = await getAuditLogs(selectedUsername);
      const logs = asArray(result.audit_logs || result);
      const routeData = buildRouteGroupsFromAudit(logs);
      setRoutes(routeData);
    } catch (error) {
      console.error("Failed to load linked routes:", error);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUsername]);

  useEffect(() => {
    load();
  }, [load]);

  const tableColumns = useMemo(() => [
    { field: "routeType", label: "Route Type", width: "10%", searchFields: ["routeType"] },
    { field: "mappingName", label: "Mapping Name", width: "22%", searchFields: ["mappingName", "inboundRequestType", "outboundRequestType"] },
    { field: "inboundAdapterName", label: "Inbound Adapter", width: "18%", searchFields: ["inboundAdapterName"] },
    { field: "outboundAdapterName", label: "Outbound Adapter", width: "18%", searchFields: ["outboundAdapterName"] },
    { field: "executionCount", label: "Executions", width: "10%", searchFields: ["executionCount"] },
    { field: "successRate", label: "Success Rate", width: "10%", searchFields: ["successRate"] },
    { field: "avgLatency", label: "Avg Latency", width: "10%", searchFields: ["avgLatency"] },
    { field: "lastExecutionTime", label: "Last Execution", width: "12%", searchFields: ["lastExecutionTime"] },
  ], []);

  const tableQuery = useTableQuery(routes, tableColumns, { defaultPageSize: 10 });
  const pagedRoutes = tableQuery.pagedRows;

  return (
    <div className="esb-dashboard">
      <section className="summary-hero">
        <div>
          <p className="dash-banner-sub">Linked Adapter Routes</p>
          <h2>Active Linked Routes</h2>
          <p className="dash-banner-desc">All configured adapter link mappings with execution statistics</p>
        </div>
      </section>

      <DataTableContainer
        toolbar={
          <PageToolbar
            refreshAction={{
              onClick: load,
              loading,
              label: "Refresh",
            }}
            searchProps={{
              placeholder: "Search linked routes...",
              value: tableQuery.searchText,
              onChange: tableQuery.setSearchText,
              onSubmit: tableQuery.applySearch,
              columns: tableQuery.searchOptions,
              selectedColumn: tableQuery.searchColumn,
              onColumnChange: tableQuery.setSearchColumn,
              buttonLabel: "Search",
            }}
          />
        }
        pagination={
          <TablePagination
            currentPage={tableQuery.currentPage}
            pageCount={tableQuery.pageCount}
            totalItems={tableQuery.totalRows}
            pageSize={tableQuery.pageSize}
            onPageChange={tableQuery.setCurrentPage}
            onPageSizeChange={tableQuery.setPageSize}
          />
        }
      >
      <div className="dash-card">
        {loading && routes.length === 0 ? (
          <div className="compact-empty-panel">
            <i className="ti ti-loader" />
            <p>Loading linked routes...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="compact-empty-panel">
            <i className="ti ti-link-off" />
            <p>No linked routes available</p>
            <span>Linked routes will appear once adapters are configured and linked.</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="transaction-exec-table">
              <thead>
                <tr>
                  <th>Route Type</th>
                  <th>Mapping Name</th>
                  <th>Inbound Adapter</th>
                  <th>Outbound Adapter</th>
                  <th>Executions</th>
                  <th>Success Rate</th>
                  <th>Avg Latency</th>
                  <th>Last Execution</th>
                </tr>
              </thead>
              <tbody>
                {pagedRoutes.map((route, index) => (
                  <tr key={index}>
                    <td>
                      <span className={`activity-badge ${route.routeType === "HEARTBEAT" ? "pending" : "success"}`}>
                        {route.routeType}
                      </span>
                    </td>
                    <td>
                      <strong title={route.mappingName}>{getFriendlyMappingLabel(route)}</strong>
                    </td>
                    <td>
                      <div className="transaction-cell-stack">
                        <strong>{route.inboundAdapterName}</strong>
                        <span>{route.inboundRequestType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="transaction-cell-stack">
                        <strong>{route.outboundAdapterName}</strong>
                        <span>{route.outboundRequestType}</span>
                      </div>
                    </td>
                    <td>{formatNumber(route.executionCount)}</td>
                    <td>
                      <span
                        className={`activity-badge ${
                          route.successRate >= 95 ? "success" : route.successRate >= 80 ? "pending" : "failed"
                        }`}
                      >
                        {formatNumber(route.successRate)}%
                      </span>
                    </td>
                    <td>{formatNumber(route.avgLatency)} ms</td>
                    <td>{formatTimestamp(route.lastExecutionTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </DataTableContainer>
    </div>
  );
}
