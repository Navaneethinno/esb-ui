import { useEffect, useMemo, useState } from 'react';
import { triggerInboundAdapter, triggerRuntimeAdapter, getApiErrorMessage } from '../services/esbApi';
import { useAPI } from '../contexts/APIContext';
import { DataTable, DataTableContainer } from './shared/DataTable';
import { PageToolbar } from './shared/PageToolbar';

function getArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') {
    const data = val.data !== undefined ? val.data : val;
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key];
      }
      if (data.adapterId || data.adapter_id || data.outboundId || data.name) return [data];
      const vals = Object.values(data);
      if (vals.length > 0 && vals.every(item => typeof item === 'object')) return vals;
    }
  }
  return [];
}

function firstConfig(adapter) {
  return Array.isArray(adapter?._raw?.configurations) ? adapter._raw.configurations[0] || {} : {};
}

function formatDate(value) {
  if (!value) return { date: '-', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '-', time: '' };
  return {
    date: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date),
  };
}

function createdTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function adapterSearchText(adapter) {
  const created = formatDate(adapter.createdAt);
  const source = adapter.formatType || 'Data not available';
  const adapterType = adapter.direction === 'Inbound' ? 'Inbound Adapter' : 'Outbound Adapter';

  return [
    adapter.displayName,
    adapter.displayId,
    adapterType,
    adapter.direction,
    source,
    created.date,
    created.time,
    adapter.status,
    `${adapter.configCount} request types`,
  ].filter(Boolean).join(' ').toLowerCase();
}

function formatRequestTypeCount(count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value <= 0) return "0";
  return `${value} Request Type${value === 1 ? "" : "s"}`;
}

function iconTone(adapter) {
  const raw = adapter._raw || {};
  const finalStatus = String(raw.lastFinalStatus || raw.status || '').toLowerCase();
  if (finalStatus === 'failed' || finalStatus === 'error') return 'danger';
  if (finalStatus === 'success' || finalStatus === 'active') return 'success';
  return 'idle';
}

function isHeartbeatAdapter(adapter) {
  const name = String(adapter?.displayName || adapter?.displayId || "").toLowerCase();
  const raw = adapter?._raw || {};
  return Boolean(raw.isHeartbeat || raw.is_heartbeat || name.includes("heartbeat"));
}

export default function AdapterRegistry({ selectedUser, setActiveTab, setSelectedAdapterId, setSelectedFunctionAdapter }) {
  const { loadInboundAdapters, loadOutboundAdapters } = useAPI();
  const selectedUsername = selectedUser?.username || '';
  const [rawAdapters, setRawAdapters] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState('All');
  const [filterDirection, setFilterDirection] = useState('All');

  const loadAdapters = async () => {
    if (!selectedUsername) {
      setRawAdapters([]);
      setStatus('ready');
      return;
    }

    setStatus('loading');
    try {
      const [inArray, outArray] = await Promise.all([
        loadInboundAdapters(selectedUsername),
        loadOutboundAdapters(selectedUsername),
      ]);

      const mappedInbound = (inArray || []).map((item, i) => {
        const cfg = Array.isArray(item?.configurations) ? item.configurations[0] || {} : {};
        const sourceFormat = item?.format_type || item?.formatType || '';
        return {
          uniqueKey: `IN-${item?.adapterId || item?.adapter_id || i}`,
          displayId: item?.adapterId || item?.adapter_id || 'No ID',
          displayName: item?.adapterName || item?.adapter_name || 'Unnamed Inbound',
          adapterId: item?.adapterId || item?.adapter_id || '',
          outboundId: item?.outboundId || item?.outbound_id || '',
          formatType: sourceFormat,
          direction: 'Inbound',
          status: item?.status || item?.runStatus || item?.run_status || 'Ready',
          createdAt: item?.createdAt || item?.created_at || cfg?.createdAt,
          configCount: Array.isArray(item?.configurations) ? item.configurations.length : 0,
          _raw: item,
          username: item?.username || cfg?.username || selectedUsername,
        };
      });

      const mappedOutbound = (outArray || []).map((item, i) => {
        // Now use configurations array instead of metadata
        const configCount = Array.isArray(item?.configurations) ? item.configurations.length : 0;

        return {
          uniqueKey: `OUT-${item?.outboundId || item?.outbound_id || i}`,
          displayId: item?.outboundId || item?.outbound_id || 'No ID',
          displayName: item?.name || item?.outboundName || 'Unnamed Outbound',
          adapterId: item?.adapterId || item?.adapter_id || '',
          outboundId: item?.outboundId || item?.outbound_id || '',
          formatType: item?.format_type || item?.formatType || '',
          direction: 'Outbound',
          status: item?.status || 'Ready',
          createdAt: item?.createdAt || item?.created_at,
          configCount,
          _raw: item,
          username: item?.username || item?.owner || selectedUsername,
        };
      });
      // Client-side filter: only keep adapters that belong to selectedUsername
      const allAdapters = [...mappedInbound, ...mappedOutbound];
      const filteredAdapters = allAdapters.filter(a => {
        const name = String(a.displayName || "").toUpperCase();
        const id = String(a.displayId || "").toUpperCase();
        return a.username === selectedUsername && !name.startsWith("DEMO_") && !id.startsWith("DEMO_");
      });

      setRawAdapters(
        filteredAdapters
          .sort((a, b) => createdTime(b.createdAt) - createdTime(a.createdAt))
      );
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load adapters', err);
      setStatus('error');
    }
  };

  useEffect(() => {
    loadAdapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsername]); // Only depend on selectedUsername, not the load functions

  const formats = useMemo(() => ['All', ...new Set(rawAdapters.map(a => a.formatType).filter(Boolean))], [rawAdapters]);

  const availableDirections = useMemo(() => {
    if (rawAdapters.length === 0) return ['All'];
    const directions = new Set(rawAdapters.map(a => a.direction));
    const result = ['All'];
    if (directions.has('Inbound')) result.push('Inbound');
    if (directions.has('Outbound')) result.push('Outbound');
    return result;
  }, [rawAdapters]);

  const displayed = useMemo(() => (rawAdapters || []).filter(adapter => {
    try {
      const query = String(searchQuery || '').toLowerCase();
      const matchesSearch = !query || adapterSearchText(adapter).includes(query);
      const matchesFormat = filterFormat === 'All' || String(adapter.formatType).toUpperCase() === String(filterFormat).toUpperCase();
      const matchesDirection = filterDirection === 'All' || adapter.direction === filterDirection;
      return matchesSearch && matchesFormat && matchesDirection;
    } catch {
      return true;
    }
  }), [filterDirection, filterFormat, rawAdapters, searchQuery]);

  const openConfigs = (adapter) => {
    console.log("[AdapterRegistry] openConfigs", {
      row: adapter,
      adapterType: adapter.direction,
      adapterId: adapter.direction === "Inbound" ? adapter.adapterId : adapter.outboundId,
      outboundId: adapter.outboundId,
    });
    setSelectedAdapterId?.({
      adapterId: adapter.direction === "Inbound" ? adapter.adapterId : undefined,
      outboundId: adapter.direction === "Outbound" ? adapter.outboundId : undefined,
      adapterType: adapter.direction,
      row: adapter,
    });
    setActiveTab?.('adapter_configuration');
  };

  const openFunctionBuilder = (adapter) => {
    setSelectedFunctionAdapter?.(adapter);
    setSelectedAdapterId?.({
      adapterId: adapter.direction === "Inbound" ? adapter.adapterId : undefined,
      outboundId: adapter.direction === "Outbound" ? adapter.outboundId : undefined,
      adapterType: adapter.direction,
      row: adapter,
    });
    setActiveTab?.('manage_functions');
  };

  const openCreate = () => setActiveTab?.('create_adapter');


  const columns = [
    { field: 'adapter', label: 'Adapter', width: '30%' },
    { field: 'adapterType', label: 'Adapter Type', width: '16%' },
    { field: 'formatType', label: 'Format Type', width: '10%' },
    { field: 'createdOn', label: 'Created On', width: '15%' },
    { field: 'requestTypes', label: 'Request Types', width: '14%' },
    { field: 'actions', label: 'Actions', width: '15%' },
  ];

  const renderCell = (field, row) => {
    const created = formatDate(row.createdAt);
    const source = row.formatType || 'Data not available';

    switch (field) {
      case 'adapter':
        return (
          <div className="dt-name-cell">
            <div className={`dt-icon dt-icon-${iconTone(row)}`}>
              <i className={`ti ${row.direction === 'Inbound' ? 'ti-plug-connected' : 'ti-send'}`} />
            </div>
          <div className="dt-name-content">
            <strong className="dt-name-label" title={row.displayName}>{row.displayName}</strong>
            {isHeartbeatAdapter(row) ? (
              <span className="dt-badge dt-badge-outbound" style={{ marginTop: 6, display: "inline-flex", width: "fit-content" }}>
                Heartbeat Adapter
              </span>
            ) : null}
          </div>
        </div>
      );

      case 'adapterType':
        return (
          <span className={`dt-badge dt-badge-${row.direction === 'Inbound' ? 'inbound' : 'outbound'}`}>
            {row.direction === 'Inbound' ? 'Inbound Adapter' : 'Outbound Adapter'}
          </span>
        );

      case 'formatType':
        return <strong className="dt-label">{source}</strong>;

      case 'createdOn':
        return (
          <div className="dt-date-cell">
            <strong className="dt-date-primary">{created.date}</strong>
            <span className="dt-date-secondary">{created.time}</span>
          </div>
        );

      case 'requestTypes':
        return (
          <button
            type="button"
            className="dt-pill"
            title="View request type details"
            aria-label="View request type details"
            onClick={(e) => {
              e.stopPropagation();
              openConfigs(row);
            }}
          >
            <span className="dt-pill-label">Request Types</span>
            <span className="dt-pill-value">{row.configCount}</span>
          </button>
        );

      case 'actions':
        return (
          <div className="dt-actions">
            <button
              className="dt-action-button dt-action-button-primary"
              onClick={(e) => {
                e.stopPropagation();
                openFunctionBuilder(row);
              }}
              title="Open request type builder"
              aria-label="Open request type builder"
            >
              <i className="ti ti-list-details" /> Create Request Type
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DataTableContainer>
      <PageToolbar
        primaryAction={{
          label: 'New Adapter',
          icon: 'ti-plus',
          onClick: openCreate,
        }}
        filters={[
          {
            type: 'tabs',
            label: 'Filter adapter type',
            value: filterDirection,
            onChange: setFilterDirection,
            options: availableDirections.map(dir => ({ value: dir, label: dir })),
          },
          {
            type: 'select',
            label: 'Filter format',
            value: filterFormat,
            onChange: setFilterFormat,
            options: formats.map(format => ({
              value: format,
              label: format === 'All' ? 'All Formats' : format,
            })),
          },
        ]}
        searchProps={{
          placeholder: 'Search all columns...',
          value: searchQuery,
          onChange: setSearchQuery,
        }}
        refreshAction={{
          onClick: loadAdapters,
          loading: status === 'loading',
          label: 'Refresh',
        }}
      />

      {status === 'error' && (
        <p className="status error">Failed to load adapters. Check your connection and refresh.</p>
      )}

      <DataTable
        columns={columns}
        data={displayed}
        isLoading={status === 'loading'}
        emptyMessage="Data not available."
        rowKey="uniqueKey"
        renderCell={renderCell}
        skeletonRows={5}
      />
    </DataTableContainer>
  );
}
