import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { DataTableContainer, TablePagination, useTableQuery } from "../components/shared/DataTable";
import { PageToolbar } from "../components/shared/PageToolbar";
import { getApiErrorMessage, createFee, deleteFee, getFee, getFeeUsage, getFees, updateFee } from "../services/esbApi";
import { invalidateCachePrefix } from "../utils/apiCache";

const FEE_TYPES = ["FLAT", "SLAB"];
const CALC_TYPES = ["FIXED", "PERCENTAGE"];

function emptySlabRow() {
  return { fromAmount: "", toAmount: "", value: "" };
}

function isFormValid(f, touched) {
  // Fee Name required
  if (!f.feeName.trim()) return false;
  
  // Validate based on type
  if (f.feeType === "FLAT" && f.calcType === "FIXED") {
    return String(f.amount).trim() !== "" && Number(f.amount) > 0;
  }
  if (f.feeType === "FLAT" && f.calcType === "PERCENTAGE") {
    return String(f.percentage).trim() !== "" && Number(f.percentage) > 0;
  }
  if (f.feeType === "SLAB") {
    return Array.isArray(f.slabs) && f.slabs.length > 0 && 
           f.slabs.some(s => s.fromAmount && s.toAmount && s.value);
  }
  return true;
}

function formatDateTime(value) {
  if (!value) return "â€”";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "â€”";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date).replace(",", "");
}

function formatShortTime(value) {
  if (!value) return "â€”";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "â€”";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function emptyForm() {
  return {
    feeName: "",
    feeType: "FLAT",
    calcType: "FIXED",
    amount: "",
    percentage: "",
    minFee: "",
    maxFee: "",
    slabs: [emptySlabRow()],
    status: "ACTIVE",
  };
}

function formatFeeValue(fee) {
  if (fee.feeType === "SLAB") {
    const count = Array.isArray(fee.slabs) ? fee.slabs.length : 0;
    return `${count} Slab${count !== 1 ? 's' : ''}`;
  }
  if (fee.calcType === "PERCENTAGE") {
    return `${fee.percentage ?? 0}%`;
  }
  return `â‚¹${fee.amount ?? 0}`;
}

function buildFeeActions(fee, onEdit, onDelete) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      <button
        type="button"
        className="ar-icon-btn"
        onClick={(e) => { e.stopPropagation(); onEdit(fee, e); }}
        title="Edit"
      >
        <i className="ti ti-edit" />
      </button>
      <button
        type="button"
        className="ar-icon-btn ar-icon-btn-danger"
        onClick={(e) => { e.stopPropagation(); onDelete(fee, e); }}
        title="Delete"
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  );
}

export default function FeesPage({ selectedUsername }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [usageByFeeId, setUsageByFeeId] = useState({});
  const [formData, setFormData] = useState(emptyForm());
  const [touched, setTouched] = useState({});
  const [saveError, setSaveError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  const loadFees = async () => {
    setLoading(true);
    try {
      const data = await getFees(selectedUsername);
      const baseFees = Array.isArray(data) ? data : [];
      const usagePairs = await Promise.all(baseFees.map(async (fee) => {
        try {
          return [fee.feeId, await getFeeUsage(fee.feeId)];
        } catch {
          return [fee.feeId, {}];
        }
      }));
      const usageMap = Object.fromEntries(usagePairs);
      setUsageByFeeId(usageMap);
      setFees(baseFees.map((fee) => ({
        ...fee,
        ...(usageMap[fee.feeId] || {}),
      })));
    } catch (err) {
      console.error("Failed to load fees:", err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsername]);

  const handleCreate = () => {
    setEditingFee(null);
    setFormData(emptyForm());
    setTouched({});
    setSaveError("");
    setShowModal(true);
  };

  const handleEdit = (fee, event) => {
    event?.stopPropagation?.();
    setEditingFee(fee);
    setFormData({
      feeName: fee.feeName || "",
      feeType: fee.feeType || "FLAT",
      calcType: fee.calculationType || fee.calcType || fee.feeType || "—",
      amount: fee.amount ?? "",
      percentage: fee.percentage ?? "",
      minFee: fee.minFee ?? "",
      maxFee: fee.maxFee ?? "",
      slabs: Array.isArray(fee.slabs) && fee.slabs.length > 0 ? fee.slabs : [emptySlabRow()],
      status: fee.status || "ACTIVE",
    });
    setTouched({});
    setSaveError("");
    setShowModal(true);
  };

  const handleDelete = async (fee, event) => {
    event?.stopPropagation?.();
    if (!confirm(`Delete fee "${fee.feeName}"?`)) return;
    setDeleteMessage("");
    try {
      await deleteFee(fee.feeId);
      invalidateCachePrefix("fees");
      setDeleteMessage("");
      loadFees();
    } catch (err) {
      const backendMessage = err?.response?.status === 409
        ? "Cannot delete fee. This fee is currently used by one or more linked adapter routes."
        : getApiErrorMessage(err);
      setDeleteMessage(backendMessage);
    }
  };

  const handleSave = async () => {
    setSaveError("");
    try {
      if (editingFee) {
        await updateFee(editingFee.feeId, formData);
      } else {
        await createFee(formData);
      }
      invalidateCachePrefix("fees");
      setShowModal(false);
      loadFees();
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    }
  };

  const rows = useMemo(() => fees.map((fee) => {
    const usage = usageByFeeId[fee.feeId] || fee.usage || fee.analytics || {};
    return {
      ...fee,
      calculationType: fee.calculationType || fee.calcType || fee.feeType || "—",
      actions: buildFeeActions(fee, handleEdit, handleDelete),
      totalUsage: usage.totalExecutions ?? usage.totalUsage ?? fee.totalUsage ?? 0,
      totalFeeCollected: usage.totalFeeCollected ?? fee.totalFeeCollected ?? 0,
      lastUsed: usage.lastUsed ?? fee.lastUsed ?? fee.lastUsedAt ?? null,
    };
  }), [fees, usageByFeeId]);

  const tableColumns = useMemo(() => [
    { field: "feeId", label: "Fee ID", width: "8%", searchFields: ["feeId", "feeCode"] },
    { field: "feeName", label: "Fee Name", width: "18%", searchFields: ["feeName"] },
    { field: "feeType", label: "Transaction Type", width: "12%", searchFields: ["feeType"] },
    { field: "calculationType", label: "Calculation Type", width: "12%", searchFields: ["calculationType", "calcType", "feeType"] },
    { field: "value", label: "Value", width: "14%", searchFields: ["amount", "percentage", "slabs"] },
    { field: "createdBy", label: "Created By", width: "10%", searchFields: ["createdBy", "created_by", "username"] },
    { field: "totalUsage", label: "Usage Count", width: "8%", searchFields: ["totalUsage"] },
    { field: "lastUsed", label: "Last Used", width: "10%", searchFields: ["lastUsed", "lastUsedAt"] },
    { field: "actions", label: "Actions", width: "10%" },
  ], []);

  const tableQuery = useTableQuery(rows, tableColumns, { defaultPageSize: 10 });
  const pagedFees = tableQuery.pagedRows;

  return (
    <div className="content">
      <PageHeader
        title="Fee Management"
        subtitle="Manage fee definitions and review usage analytics"
        actions={[
          { label: "Create Fee", icon: "ti-plus", onClick: handleCreate, variant: "primary" },
        ]}
      />

      {deleteMessage && (
        <div className="status error" style={{ marginBottom: 16 }}>
          {deleteMessage}
        </div>
      )}

      <DataTableContainer
        toolbar={
          <PageToolbar
            refreshAction={{
              onClick: loadFees,
              loading,
              label: "Refresh",
            }}
            searchProps={{
              placeholder: "Search fees...",
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
      <div className="created-table-wrap">
        <table className="created-table">
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Fee ID</th>
              <th>Fee Name</th>
              <th>Transaction Type</th>
              <th>Calculation Type</th>
              <th>Value</th>
              <th>Created By</th>
              <th>Usage Count</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td><div className="created-skeleton created-line-sm" /></td>
                <td><div className="created-skeleton created-line-lg" /></td>
                <td><div className="created-skeleton created-pill-skel" /></td>
                <td><div className="created-skeleton created-pill-skel" /></td>
                <td><div className="created-skeleton created-line-sm" /></td>
                <td><div className="created-skeleton created-line-sm" /></td>
                <td><div className="created-skeleton created-line-sm" /></td>
                <td><div className="created-skeleton created-line-sm" /></td>
                <td><div className="created-skeleton created-line-sm" /></td>
              </tr>
            ))}

            {!loading && pagedFees.map((fee) => (
              <tr key={fee.feeId}>
                <td><span className="created-count-badge" style={{ minWidth: "auto", fontFamily: "monospace" }}>{fee.feeId || fee.feeCode || "â€”"}</span></td>
                <td><strong>{fee.feeName || "â€”"}</strong></td>
                <td>{fee.feeType || "â€”"}</td>
                <td>{fee.calculationType || fee.calcType || fee.feeType || "—"}</td>
                <td><strong style={{ color: "var(--primary)" }}>{formatFeeValue(fee)}</strong></td>
                <td>{fee.createdBy || fee.created_by || fee.username || selectedUsername || "â€”"}</td>
                <td><span className="created-count-badge">{fee.totalUsage ?? 0}</span></td>
                <td>{formatShortTime(fee.lastUsed)}</td>
                <td>{fee.actions}</td>
              </tr>
            ))}

            {!loading && pagedFees.length === 0 && (
              <tr>
                <td colSpan="9" className="created-empty">No fees configured</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </DataTableContainer>

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="la-modal" style={{ maxWidth: 560 }}>

            <div className="la-modal-header">
              <div>
                <h2 className="la-modal-title" style={{ margin: 0 }}>
                  {editingFee ? "Edit Fee" : "Create Fee"}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  {editingFee ? `Editing ${editingFee.feeId || ''}` : "Fee ID will be auto-generated"}
                </p>
              </div>
              <button type="button" className="ar-icon-btn" onClick={() => setShowModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="la-modal-body" style={{ padding: "16px 20px" }}>
              {saveError && <div className="status error" style={{ marginBottom: 12 }}>{saveError}</div>}

              {/* Fee Name */}
              <div className="field">
                <label>Fee Name *</label>
                <input
                  value={formData.feeName}
                  placeholder="e.g. Transfer Fee"
                  onChange={(e) => setFormData({ ...formData, feeName: e.target.value })}
                  onBlur={() => setTouched({ ...touched, feeName: true })}
                />
                {touched.feeName && !formData.feeName.trim() && (
                  <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 4, display: "block" }}>Fee name is required</span>
                )}
              </div>

              {/* Transaction Type + Calculation Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>Transaction Type *</label>
                  <select
                    value={formData.feeType}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        feeType: e.target.value, 
                        amount: "", 
                        percentage: "", 
                        minFee: "",
                        maxFee: "",
                        slabs: [emptySlabRow()] 
                      });
                      setTouched({ ...touched, amount: false, percentage: false });
                    }}
                  >
                    {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Calculation Type *</label>
                  <select
                    value={formData.calcType}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        calcType: e.target.value, 
                        amount: "", 
                        percentage: "",
                        minFee: "",
                        maxFee: "" 
                      });
                      setTouched({ ...touched, amount: false, percentage: false });
                    }}
                  >
                    {CALC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* CASE 1: FLAT + FIXED = Amount */}
              {formData.feeType === "FLAT" && formData.calcType === "FIXED" && (
                <div className="field">
                  <label>Amount *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 10"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    onBlur={() => setTouched({ ...touched, amount: true })}
                  />
                  {touched.amount && (String(formData.amount).trim() === "" || Number(formData.amount) <= 0) && (
                    <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 4, display: "block" }}>Amount must be greater than 0</span>
                  )}
                </div>
              )}

              {/* CASE 2: FLAT + PERCENTAGE = Percentage + Optional Min/Max */}
              {formData.feeType === "FLAT" && formData.calcType === "PERCENTAGE" && (
                <>
                  <div className="field">
                    <label>Percentage *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 2"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                      onBlur={() => setTouched({ ...touched, percentage: true })}
                    />
                    {touched.percentage && (String(formData.percentage).trim() === "" || Number(formData.percentage) <= 0) && (
                      <span style={{ fontSize: 11, color: "var(--danger)", marginTop: 4, display: "block" }}>Percentage must be greater than 0</span>
                    )}
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="field">
                      <label>Minimum Fee (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={formData.minFee}
                        onChange={(e) => setFormData({ ...formData, minFee: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Maximum Fee (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 100"
                        value={formData.maxFee}
                        onChange={(e) => setFormData({ ...formData, maxFee: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CASE 3 & 4: SLAB (FIXED or PERCENTAGE) */}
              {formData.feeType === "SLAB" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>Slabs *</label>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={() => setFormData({ ...formData, slabs: [...(formData.slabs || []), emptySlabRow()] })}
                    >
                      <i className="ti ti-plus" /> Add Slab
                    </button>
                  </div>
                  
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr 1fr 40px", 
                    gap: 8, 
                    padding: "6px 8px", 
                    background: "var(--panel-soft)", 
                    borderRadius: 6, 
                    fontSize: 10, 
                    fontWeight: 700, 
                    color: "var(--muted)", 
                    textTransform: "uppercase", 
                    letterSpacing: "0.05em" 
                  }}>
                    <span>From Amount</span>
                    <span>To Amount</span>
                    <span>{formData.calcType === "PERCENTAGE" ? "Percentage" : "Fixed Fee"}</span>
                    <span />
                  </div>
                  
                  {(formData.slabs || []).map((slab, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, alignItems: "center" }}>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder="0" 
                        value={slab.fromAmount}
                        onChange={(e) => {
                          const slabs = formData.slabs.map((s, i) => i === idx ? { ...s, fromAmount: e.target.value } : s);
                          setFormData({ ...formData, slabs });
                        }}
                        style={{ fontSize: 13 }}
                      />
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder="100" 
                        value={slab.toAmount}
                        onChange={(e) => {
                          const slabs = formData.slabs.map((s, i) => i === idx ? { ...s, toAmount: e.target.value } : s);
                          setFormData({ ...formData, slabs });
                        }}
                        style={{ fontSize: 13 }}
                      />
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        placeholder={formData.calcType === "PERCENTAGE" ? "1" : "5"} 
                        value={slab.value}
                        onChange={(e) => {
                          const slabs = formData.slabs.map((s, i) => i === idx ? { ...s, value: e.target.value } : s);
                          setFormData({ ...formData, slabs });
                        }}
                        style={{ fontSize: 13 }}
                      />
                      <button 
                        type="button" 
                        className="ar-icon-btn ar-icon-btn-danger"
                        disabled={formData.slabs.length === 1}
                        onClick={() => setFormData({ ...formData, slabs: formData.slabs.filter((_, i) => i !== idx) })}
                        title="Delete Slab"
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  ))}
                  
                  {formData.slabs?.every(s => !s.fromAmount && !s.toAmount && !s.value) && (
                    <span style={{ fontSize: 11, color: "var(--danger)" }}>At least one complete slab is required</span>
                  )}
                </div>
              )}

              {/* Status - Edit mode only */}
              {editingFee && (
                <div className="field">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
            </div>

            <div className="la-modal-footer">
              {editingFee && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ color: "var(--danger)", marginRight: "auto" }}
                  onClick={(e) => {
                    if (confirm(`Delete fee "${editingFee.feeName}"?`)) {
                      handleDelete(editingFee, e);
                      setShowModal(false);
                    }
                  }}
                >
                  <i className="ti ti-trash" /> Delete
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => {
                  setTouched({ feeName: true, amount: true, percentage: true });
                  if (isFormValid(formData, touched)) {
                    handleSave();
                  }
                }} 
                disabled={!isFormValid(formData, touched)}
              >
                <i className="ti ti-check" /> {editingFee ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}


