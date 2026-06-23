import { Component, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "./services/esbApi";
import { APP_CONFIG } from "./config/theme";
import { clearAllCache } from "./utils/apiCache";
import { useAPI } from "./contexts/APIContext";
import AdapterRegistry from "./components/AdapterRegistry";
import AdapterDetails from "./components/AdapterDetails";
import SummaryDashboard from "./components/SummaryDashboard";
import AuditDashboard from "./components/AuditDashboard";
import CreateAdapterPage from "./components/CreateAdapterPage";
import ManageFunctionsPage from "./components/ManageFunctionsPage";
import LinkAdapters from "./components/LinkAdapters";
import FeesPage from "./pages/FeesPage";
import LinkedRoutesPage from "./pages/LinkedRoutesPage";

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#dc2626', background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: 8, margin: 24 }}>
          <strong>Runtime Error:</strong>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.message}\n{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const TABS = [
  { id: "summary",        label: "InnoBridge Dashboard",  icon: "ti-layout-dashboard" },
  { id: "adapters",       label: "Created Adapters",      icon: "ti-list-details" },
  { id: "create_adapter", label: "Create Adapter",        icon: "ti-plus" },
  { id: "config",         label: "Link Adapters",         icon: "ti-link" },
  { id: "linked_routes",  label: "Linked Routes",         icon: "ti-route" },
  { id: "fees",           label: "Fees",                  icon: "ti-currency-dollar" },
];

const MANAGER_TABS = [
  { id: "audit", label: "Audit Logs", icon: "ti-clipboard-data" },
];

function getValue(item, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, key) => current?.[key], item);
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "";
}

function normaliseUsers(data) {
  const list = Array.isArray(data)
    ? data
    : data?.users || data?.data || data?.items || data?.results || [];

  return list
    .map((item) => ({
      id: getValue(item, ["id", "userId", "user_id", "username", "email"]),
      username: getValue(item, ["username", "userName", "email", "id", "userId"]),
      name: getValue(item, ["name", "displayName", "userName", "username", "email"]),
      role: getValue(item, ["role", "roleName", "designation", "department"]),
      raw: item,
    }))
    .filter((user) => user.id && user.username && user.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function App() {
  useEffect(() => {
    console.log("API BASE:", APP_CONFIG.api.devBasePath);
  }, []);

  const { users, usersLoading, canonicalFields, canonicalLoading, clearCache: clearAPICache } = useAPI();
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [selectedAdapterInfo, setSelectedAdapterInfo] = useState(null);
  const [selectedFunctionAdapter, setSelectedFunctionAdapter] = useState(null);
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const [adapterRegistryKey, setAdapterRegistryKey] = useState(0);

  function clearCacheAndReload() {
    clearAllCache();
    clearAPICache();
    window.location.reload();
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const selectedUser = users.find((user) => user.username === selectedUsername) || null;
  const userMenuReady = !usersLoading && users.length > 0;

  useEffect(() => {
    setSelectedUsername((current) => (
      current && users.some((user) => user.username === current) ? current : ""
    ));
  }, [users]);

  useEffect(() => {
    if (!selectedUsername && !usersLoading && users.length > 0) {
      const tanaiUser = users.find((user) =>
        String(user.username || user.name || "").toLowerCase().includes("tanai")
      );
      setSelectedUsername(tanaiUser?.username || users[0].username);
    }
  }, [selectedUsername, users, usersLoading]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function closeUserMenu(event) {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", closeUserMenu);
    return () => document.removeEventListener("mousedown", closeUserMenu);
  }, []);


  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="30" height="30" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="innobridgeMarkStroke" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4DD6D2" />
                  <stop offset="0.5" stopColor="#2AB7D9" />
                  <stop offset="1" stopColor="#275FDB" />
                </linearGradient>
              </defs>
              <path d="M12 14h16c10 0 18 8 18 18s-8 18-18 18H12V14Z" stroke="url(#innobridgeMarkStroke)" strokeWidth="5" strokeLinejoin="round"/>
              <path d="M22 23h9c4 0 7 2 7 6 0 3-2 5-5 6 4 1 6 4 6 7 0 5-4 8-10 8h-7V23Zm8 6v5h3c2 0 4-1 4-3 0-1-1-2-4-2h-3Zm0 13v6h4c3 0 5-1 5-3 0-2-2-3-5-3h-4Z" fill="url(#innobridgeMarkStroke)"/>
              <path d="M34 36h18" stroke="url(#innobridgeMarkStroke)" strokeWidth="5.5" strokeLinecap="round"/>
              <path d="M44 28l8 8-8 8" stroke="url(#innobridgeMarkStroke)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="brand-copy">
            <p className="brand-name">{APP_CONFIG.brand.appName}</p>
            <p className="brand-sub">{APP_CONFIG.brand.subtitle}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-group">
          <button
            className={`nav-item ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            <i className="ti ti-layout-dashboard" aria-hidden="true" />
            Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === "adapters" ? "active" : ""}`}
            onClick={() => setActiveTab("adapters")}
          >
            <i className="ti ti-list-details" aria-hidden="true" />
            Created Adapters
          </button>
          <button
            className={`nav-item ${activeTab === "create_adapter" ? "active" : ""}`}
            onClick={() => setActiveTab("create_adapter")}
          >
            <i className="ti ti-plus" aria-hidden="true" />
            Create Adapter
          </button>
          <button
            className={`nav-item ${activeTab === "config" ? "active" : ""}`}
            onClick={() => setActiveTab("config")}
          >
            <i className="ti ti-link" aria-hidden="true" />
            Link Adapters
          </button>
          <button
            className={`nav-item ${activeTab === "linked_routes" ? "active" : ""}`}
            onClick={() => setActiveTab("linked_routes")}
          >
            <i className="ti ti-route" aria-hidden="true" />
            Linked Routes
          </button>
          <button
            className={`nav-item ${activeTab === "fees" ? "active" : ""}`}
            onClick={() => setActiveTab("fees")}
          >
            <i className="ti ti-currency-dollar" aria-hidden="true" />
            Fees
          </button>
          <div className="nav-section-divider" />
          <button
            className={`nav-item ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <i className="ti ti-clipboard-data" aria-hidden="true" />
            Audit Logs
          </button>
        </nav>

        {/* Bottom: User Card + Theme + Cache */}
        <div className="user-switcher">
          <label>User</label>
          <div className="user-dropdown" ref={userMenuRef}>
            <button
              className="user-dropdown-trigger"
              type="button"
              onClick={() => {
                if (!userMenuReady) return;
                setUserMenuOpen((open) => !open);
              }}
              disabled={!userMenuReady}
              aria-haspopup="listbox"
              aria-expanded={userMenuOpen}
            >
              <span>{selectedUser?.name || (usersLoading ? "Loading users..." : users.length === 0 ? "No users loaded" : "Select user")}</span>
              <i className={`ti ${userMenuOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
            </button>
            {userMenuOpen && userMenuReady && (
              <div className="user-dropdown-menu" role="listbox" aria-label="User">
                {users.map((user) => (
                  <button
                    key={user.username}
                    className={`user-dropdown-option ${user.username === selectedUsername ? "selected" : ""}`}
                    type="button" role="option" aria-selected={user.username === selectedUsername}
                    onClick={() => { setSelectedUsername(user.username); setUserMenuOpen(false); }}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            )}
            {userMenuOpen && !userMenuReady && (
              <div className="user-dropdown-menu" role="status" aria-live="polite">
                <button type="button" className="user-dropdown-option" disabled style={{ opacity: 0.75, cursor: "wait" }}>
                  {usersLoading ? "Loading users..." : "No users available"}
                </button>
              </div>
            )}
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} aria-hidden="true" />
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button
            className="theme-toggle"
            type="button"
            onClick={clearCacheAndReload}
            aria-label="Clear cache and reload"
            title="Clear all cached data and reload (use after DB reset)"
          >
            <i className="ti ti-refresh" aria-hidden="true" />
            Clear Cache
          </button>
        </div>
      </aside>

      <div className="main">
        {activeTab === "linked_routes" && (
          <div className="content">
            <LinkedRoutesPage selectedUsername={selectedUsername} />
          </div>
        )}
        {activeTab === "fees" && (
          <div className="content">
            <FeesPage selectedUsername={selectedUsername} />
          </div>
        )}
        {activeTab === "config" && (
          <div className="content">
            <LinkAdapters selectedUsername={selectedUsername} />
          </div>
        )}
        {activeTab === "create_adapter" && (
            <div className="content">
              <CreateAdapterPage 
                selectedUsername={selectedUsername} 
                onCreated={() => {
                  setAdapterRegistryKey(k => k + 1);
                  setActiveTab("adapters");
                }} 
              />
            </div>
        )}
        {activeTab === "adapters" && (
          <div className="content">
            <AdapterRegistry
              key={adapterRegistryKey}
              selectedUser={selectedUser}
              users={users}
              setActiveTab={setActiveTab}
              setSelectedAdapterId={setSelectedAdapterInfo}
              setSelectedFunctionAdapter={setSelectedFunctionAdapter}
            />
          </div>
        )}
        {activeTab === "manage_functions" && (
          <div className="content">
            <ManageFunctionsPage
              adapter={selectedFunctionAdapter}
              selectedUser={selectedUser}
              canonicalFields={canonicalFields}
              canonicalStatus={canonicalLoading ? "loading" : "idle"}
              onBack={() => setActiveTab("create_adapter")}
              isOutbound={selectedFunctionAdapter?.direction === "Outbound"}
              existingConfigurations={selectedFunctionAdapter?._raw?.configurations || []}
              isEditMode={false}
            />
          </div>
        )}
        {activeTab === "adapter_configuration" && (
          <div className="content">
            <AdapterDetails
              adapterInfo={selectedAdapterInfo}
              selectedUsername={selectedUsername}
              onBack={() => setActiveTab("adapters")}
            />
          </div>
        )}
        {activeTab === "adapter_details" && (
          <>
            <div className="topbar"><h1>Adapter Analytics</h1><p>Full configuration and execution metrics</p></div>
            <div className="content">
              <AdapterDetails
                adapterInfo={selectedAdapterInfo}
                selectedUsername={selectedUsername}
                onBack={() => setActiveTab("adapters")}
              />
            </div>
          </>
        )}
        {activeTab === "summary" && (
          <>
            <div className="content">
              <SummaryDashboard
                selectedUser={selectedUser}
                selectedUsername={selectedUsername}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                workspaceId={selectedUser?.id || selectedUser?.username || ""}
              />
            </div>
          </>
        )}
        {activeTab === "audit" && (
          <div className="content">
            <AuditDashboard selectedUser={selectedUser} />
          </div>
        )}
      </div>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`ti ${toast.type === "success" ? "ti-check" : "ti-alert-circle"}`} aria-hidden="true" />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
