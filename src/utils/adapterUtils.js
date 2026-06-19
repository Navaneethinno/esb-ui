// Shared adapter utilities — used by both SummaryDashboard and AdapterRegistry

export function getNested(item, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((cur, k) => cur?.[k], item);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

export function resolveRunStatus(raw) {
  const s = (raw || "").toUpperCase();
  if (s === "RUNNING") return "RUNNING";
  return "STOPPED";
}

export function resolveStatus(raw) {
  const s = (raw || "").toLowerCase();
  if (s === "error" || s === "failed" || s === "partial_failure") return "error";
  if (s === "success" || s === "active")                          return "active";
  return "idle";
}

export function statusMeta(rawStatus) {
  const s = resolveStatus(rawStatus);
  if (s === "error")  return { label: "Error",  cls: "badge-error"   };
  if (s === "active") return { label: "Active", cls: "badge-success" };
  return                     { label: "Idle",   cls: "badge-idle"    };
}

export function normalizeAdapter(adapter, index, lastTriggeredMap = {}) {
  const cfg = Array.isArray(adapter.configurations) ? adapter.configurations[0] : null;
  const id  = String(getNested(adapter, ["adapterId", "adapter_id", "id", "_id"]) || index);
  return {
    id,
    adapterName:     getNested(adapter, ["adapterName", "adapter_name", "name"]),
    requestName:     getNested(adapter, ["requestName", "requestType"]),
    inboundFormat:   getNested(adapter, ["type", "format", "protocol"]),
    outboundFormat:  getNested(cfg,     ["targetFormat", "format"]),
    transformType:   getNested(cfg,     ["transformType"]),
    status:          getNested(adapter, ["status", "lastFinalStatus"]),
    runStatus:       resolveRunStatus(getNested(adapter, ["run_status", "runStatus"])),
    triggerCount:    adapter.trigger_count ?? adapter.triggerCount ?? 0,
    createdOn:       getNested(adapter, ["createdAt", "createdOn"]) || getNested(cfg, ["createdAt"]),
    lastTriggeredOn: lastTriggeredMap[id] || getNested(adapter, ["lastTriggeredAt", "lastTriggeredOn"]),
    raw: adapter,
  };
}

export function normalizeRows(adapters, lastTriggeredMap = {}) {
  return adapters.map((a, i) => normalizeAdapter(a, i, lastTriggeredMap));
}

export const extractArray = (res) => {
  if (!res) return [];
  // Axios wraps response in .data
  if (res.data && Array.isArray(res.data)) return res.data;
  // Direct array
  if (Array.isArray(res)) return res;
  // Object — scan for first array property
  if (typeof res === "object") {
    for (const key of Object.keys(res)) {
      if (Array.isArray(res[key])) return res[key];
    }
    // Dictionary of objects e.g. { "ADAPTER-1": {...} }
    const vals = Object.values(res);
    if (vals.length > 0 && vals.every(v => v && typeof v === "object" && !Array.isArray(v))) {
      return vals;
    }
    // Single object
    if (res.adapterId || res.adapter_id || res.adapterName) return [res];
  }
  return [];
};

export function normalizeAdapters(inboundList, outboundList) {
  const safeInbound  = Array.isArray(inboundList)  ? inboundList  : [];
  const safeOutbound = Array.isArray(outboundList) ? outboundList : [];

  const normalizedInbound = safeInbound.map((item, i) => ({
    uniqueKey:      String(item?.adapterId  ?? item?.adapter_id  ?? `IN-${i}`),
    displayId:      String(item?.adapterId  ?? item?.adapter_id  ?? "No ID"),
    displayName:    item?.adapterName ?? item?.adapter_name ?? "Unnamed Inbound",
    formatType:     item?.type ?? item?.format ?? item?.baseFormat ?? "JSON",
    direction:      "Inbound",
    runStatus:      resolveRunStatus(item?.run_status ?? item?.runStatus ?? ""),
    status:         item?.status ?? item?.lastFinalStatus ?? item?.last_final_status ?? "",
    triggerCount:   item?.trigger_count ?? item?.triggerCount ?? 0,
    createdAt:      item?.createdAt ?? item?.created_at ?? null,
    configurations: Array.isArray(item?.configurations) ? item.configurations : [],
    _raw:           item,
  }));

  const normalizedOutbound = safeOutbound.map((item, i) => ({
    uniqueKey:      String(item?.outboundId ?? item?.outbound_id ?? `OUT-${i}`),
    displayId:      String(item?.outboundId ?? item?.outbound_id ?? "No ID"),
    displayName:    item?.name ?? item?.outboundName ?? "Unnamed Outbound",
    formatType:     item?.protocol ?? item?.format ?? "N/A",
    direction:      "Outbound",
    runStatus:      "N/A",
    status:         item?.status ?? item?.lastFinalStatus ?? item?.last_final_status ?? "",
    triggerCount:   0,
    createdAt:      item?.createdAt ?? item?.created_at ?? null,
    configurations: Array.isArray(item?.configurations) ? item.configurations : [],
    _raw:           item,
  }));

  return [...normalizedInbound, ...normalizedOutbound];
}
