# ESB UI — Implementation Notebook

Full function-to-function flow, component by component, with every API call mapped.

---

## 1. Entry Point — `main.jsx`

```
createRoot → renders <App /> inside StrictMode
```

No API calls. Just mounts the React tree.

---

## 2. Root — `App.jsx`

### State owned at root

| State | Purpose |
|---|---|
| `activeTab` | Which tab is visible: `summary`, `adapters`, `config` |
| `step` | Which wizard step: `inbound`, `outbound`, `save` |
| `form` | All adapter config form values (INIT shape) |
| `users` | Normalised user list from API |
| `selectedUsername` | Currently selected user |
| `theme` | `light` or `dark` — written to `document.documentElement.dataset.theme` |
| `formats` | Request format options loaded from API |
| `status` | Save operation status (loading / success / error) |
| `toast` | Ephemeral success/error notification (auto-clears after 3s) |

---

### `loadUsers()` — called once on mount

```
API: GET /api/users
Service fn: listUsers()
Returns: { users: [...] } or array

Normalised by normaliseUsers() into:
  { id, username, name, role, raw }

Filters out items missing id, username, or name.
Sets: users[], selectedUsername (preserved if still valid)
```

---

### `loadFormats()` — called once on mount

```
API: GET /api/request-type/formats
Service fn: getFormats()
Returns: array of { code, displayName } or string[]

Normalised by normaliseOptions() from utils/options.js
Sets: formats[] — used to populate Request Format and Output Format dropdowns
Also pre-selects form.type and form.format to formats[0] if not already set
```

---

### `save()` — called from SaveStep on submit

```
Guard: requires selectedUser — shows error if not set

API: POST /api/adapter-configurations
Service fn: createLinkedAdapterConfiguration(payload)

Payload shape:
{
  username: selectedUser.username,
  inbound: {
    adapterId: "ADAPTER-<timestamp>",
    adapterName,
    type,           ← request format
    requestName,
    configurations: [{}]
  },
  outbound: {
    name, protocol, host, port,
    path (only for HTTP/HTTPS),
    format, timeoutSeconds, retryCount, sendEnabled
  }
}

On success:
  - shows toast "Adapter saved"
  - resets form to INIT
  - resets step to "inbound"
  - switches activeTab to "adapters"

On error:
  - sets status { type: "error", msg: ... }
```

---

### Tab routing (render)

```
activeTab === "summary"  → <SummaryDashboard selectedUser activeTab />
activeTab === "adapters" → <AdapterRegistry selectedUser users setActiveTab />
activeTab === "config"   → wizard: InboundStep | OutboundStep | SaveStep
```

---

## 3. Wizard Steps — `App.jsx` (inline components)

### `InboundStep`

Owns: `protoTypes[]`, `protoState` (idle | loading | ready | error), `submitted`

#### `handleFormatChange(format)`

```
1. set("type", format)
2. If format is NOT in PROTOCOL_FORMATS (ISO8583, ISO20022):
     clear requestType, protoTypes, set protoState = "idle"
     return

3. If format IS ISO8583 or ISO20022:
   API: GET /api/request-type/formats/:format/subtypes
   Service fn: getFormatSubtypes(format.toLowerCase())
   Returns: array of subtype strings

   On success: setProtoTypes(items), set requestType = "", protoState = "ready"
   On error:   protoTypes = [], protoState = "error"
```

#### Validation (on Next click)

```
errors checked:
  - user selected
  - adapterName not empty
  - type (format) selected
  - requestName not empty
  - requestType selected (only if needsRequestType)

If errors exist: shows inline validation messages, blocks navigation
If valid: calls onNext() → step moves to "outbound"
```

---

### `OutboundStep`

No API calls. Pure form.

```
Validates on Next:
  - outboundName not empty
  - host not empty
  - port is a valid number
  - format selected

showPath = protocol is HTTP or HTTPS → shows Path field
```

---

### `SaveStep`

No API calls. Review only.

```
Renders two ReviewPanel components:
  - Inbound: adapterName, type, requestName, requestType
  - Outbound: name, protocol, host, port, path, format

Save button calls save() from App root
Disabled if: no selectedUser, status is loading, or status is success
```

---

## 4. `AdapterRegistry.jsx`

### State

| State | Purpose |
|---|---|
| `rawAdapters` | Raw API response array |
| `status` | Loading / error state for list fetch |
| `selectedAdapter` | Adapter currently open in trigger view |
| `payloadText` | JSON string in the trigger textarea |
| `triggerStatus` | Loading / success / error for trigger call |
| `triggerPopup` | Modal shown after trigger completes |
| `lastTriggeredMap` | Local map of adapterId → ISO timestamp (optimistic update) |
| `deleteTarget` | Adapter pending delete confirmation |
| `deleteStatus` | Loading / error for delete call |
| `searchQuery` | Text filter on adapter name / ID |
| `filterFormat` | Format tab filter (All, JSON, XML, etc.) |

---

### `loadAdapters()` — called on mount and on Refresh

```
Guard: requires selectedUser.username

API: GET /api/users/:username/adapters
Service fn: listUserAdapters(username)
Cache key: "adapters:<username>" (via cachedFetch utility)

Returns: { adapters: [...] } or array

Sets: rawAdapters[]
Rows normalised by normalizeRows() from utils/adapterUtils.js into:
  { id, adapterName, requestName, inboundFormat, outboundFormat,
    transformType, createdOn, lastTriggeredOn, triggerCount, status, raw }
```

---

### `displayed` (derived, no API)

```
Filters adapters[] by:
  1. filterFormat (matches inboundFormat or "All")
  2. searchQuery (matches adapterName, id, or requestName case-insensitive)
```

---

### `openTrigger(adapter)`

```
No API call.
Sets selectedAdapter, pre-fills payloadText with buildDefaultPayload(adapter)
Switches view to trigger/payload screen
```

---

### `submitTrigger()`

```
1. Parses payloadText as JSON — shows error if invalid
2. Appends meta: { requestId: "REQ-<timestamp>", timestamp: ISO }

API: POST /api/inbound-adapters/:adapterId/trigger
Service fn: triggerInboundAdapter(adapterId, payload)

On success (status not "failed" / "error" / "partial_failure"):
  - updates lastTriggeredMap[adapterId] = now
  - invalidates cache "adapters:<username>"
  - shows success popup

On failure (API error OR result.status is failed):
  - extracts reason from result.error / result.message / result.outboundResponse
  - shows error popup
```

---

### `confirmDelete()`

```
API: DELETE /api/adapter-configurations/:adapterId
Service fn: deleteAdapterConfiguration(adapterId)

Soft delete — sets active = FALSE on backend, no data lost.

On success:
  - clears deleteTarget
  - invalidates cache "adapters:<username>"
  - calls loadAdapters() to refresh list

On error:
  - shows inline error in delete modal
```

---

### Skeleton loading

```
While status.type === "loading":
  Renders 6 skeleton rows (skel / skel-h / skel-s CSS classes)
  No real data shown until load completes
```

---

## 5. `SummaryDashboard.jsx`

### `load()` — called when activeTab === "summary"

```
API: GET /api/users/:username/adapters
Service fn: listUserAdapters(username)
Cache key: "adapters:<username>" (shared with AdapterRegistry)

Sets: rawAdapters[]
Normalised by normalizeRows() from utils/adapterUtils.js
```

---

### Derived metrics (no API)

```
totalTriggers  = sum of adapter.triggerCount
activeCount    = adapters where resolveStatus() === "active"
errorCount     = adapters where resolveStatus() === "error"
healthPct      = (total - errors) / total * 100

recentAdapters = sorted by raw.updatedAt desc, top 8
```

---

### `FormatBreakdown` (no API)

```
Groups adapters by transformType or inboundFormat
Renders horizontal bar chart using inline styles
Max 6 entries, sorted by count desc
```

---

### `HealthPanel` (no API)

```
SVG donut chart
  - stroke-dasharray calculated from healthPct
  - color: green ≥80%, amber ≥50%, red <50%
Shows: active count, error count, total
```

---

## 6. `esbApi.js` — Full API surface

| Function | Method | Endpoint |
|---|---|---|
| `listUsers()` | GET | `/api/users` |
| `listUserAdapters(username)` | GET | `/api/users/:username/adapters` |
| `getFormats()` | GET | `/api/request-type/formats` |
| `getFormatSubtypes(format)` | GET | `/api/request-type/formats/:format/subtypes` |
| `createLinkedAdapterConfiguration(payload)` | POST | `/api/adapter-configurations` |
| `listLinkedAdapterConfigurations()` | GET | `/api/adapter-configurations` |
| `getAdapterConfiguration(adapterId)` | GET | `/api/adapter-configurations/:adapterId` |
| `updateLinkedAdapterConfiguration(adapterId, payload)` | PUT | `/api/adapter-configurations/:adapterId` |
| `deleteAdapterConfiguration(adapterId)` | DELETE | `/api/adapter-configurations/:adapterId` |
| `listInboundAdapters()` | GET | `/api/inbound-adapters` |
| `getInboundAdapter(adapterId)` | GET | `/api/inbound-adapters/:adapterId` |
| `createInboundAdapter(payload)` | POST | `/api/inbound-adapters` |
| `updateInboundAdapter(adapterId, payload)` | PUT | `/api/inbound-adapters/:adapterId` |
| `upsertInboundConfiguration(adapterId, configId, payload)` | POST/PUT | `/api/inbound-adapters/:adapterId/configurations[/:configId]` |
| `triggerInboundAdapter(adapterId, payload)` | POST | `/api/inbound-adapters/:adapterId/trigger` |
| `listOutboundAdapters()` | GET | `/api/outbound-adapters` |
| `getOutboundAdapter(outboundId)` | GET | `/api/outbound-adapters/:outboundId` |
| `createOutboundAdapter(payload)` | POST | `/api/outbound-adapters` |
| `updateOutboundAdapter(outboundId, payload)` | PUT | `/api/outbound-adapters/:outboundId` |
| `listRequestTypes(format?)` | GET | `/api/request-type/list[?format=...]` |
| `getRequestTypeContract(requestType)` | GET | `/api/request-type/contract/:requestType` |
| `resolveRequestAliases(payload)` | POST | `/api/request-type/resolve` |
| `suggestCanonicalMapping(payload)` | POST | `/api/canonical/suggest` |
| `validateCustomFunction(payload)` | POST | `/api/validate-custom-function` |
| `transformPayload(payload)` | POST | `/api/v1/esb/transform` |
| `executePayload(payload)` | POST | `/api/v1/esb/execute` |
| `uploadInputFile(formData)` | POST | `/api/v1/esb/upload` |
| `listAllAdapters()` | GET | `/api/adapter-configurations` |
| `getAdapterExecutions(adapterId)` | GET | `/api/adapter-configurations/:adapterId/executions` |

---

## 7. Utilities

### `utils/options.js`

```
normaliseOptions(data)
  Accepts: array, { formats: [] }, { subtypes: [] }, { data: [] }, etc.
  Returns: string[] of unique non-empty values
  Used by: loadFormats(), handleFormatChange()

getOptionValue(item)
  Extracts string from: item.code, item.id, item.value,
  item.displayName, item.name, item.label, item.description
```

---

### `utils/adapterUtils.js`

```
normalizeRows(rawAdapters, lastTriggeredMap?)
  Maps raw API adapter objects into normalised display rows
  Fields: id, adapterName, requestName, inboundFormat, outboundFormat,
          transformType, createdOn, lastTriggeredOn, triggerCount, status, raw

resolveStatus(status)
  Returns: "active" | "error" | "idle"
  Used by: StatusChip, AdapterIcon, SummaryDashboard metrics

statusMeta(status)
  Returns: { label, cls } for badge rendering
```

---

### `utils/apiCache.js`

```
cachedFetch(key, fetchFn, { onLoading, onData, onError })
  In-memory cache keyed by string
  Calls onLoading() immediately
  Returns cached data if available, otherwise calls fetchFn()
  Calls onData(result) or onError(err)

invalidateCache(key)
  Removes key from cache so next cachedFetch re-fetches from API
  Called after: triggerInboundAdapter, deleteAdapterConfiguration
```

---

## 8. API call map by user action

| User action | Component | API called |
|---|---|---|
| App loads | App | GET /api/users, GET /api/request-type/formats |
| Select user from sidebar | App | (no API — filters existing users[]) |
| Switch to Summary tab | SummaryDashboard | GET /api/users/:username/adapters |
| Switch to Adapters tab | AdapterRegistry | GET /api/users/:username/adapters |
| Click Refresh in Adapters | AdapterRegistry | GET /api/users/:username/adapters |
| Select ISO8583 or ISO20022 format | InboundStep | GET /api/request-type/formats/:format/subtypes |
| Click Save named config | App.save() | POST /api/adapter-configurations |
| Click Enter Payload on a row | AdapterRegistry | (no API — opens trigger view) |
| Click Trigger Adapter | AdapterRegistry | POST /api/inbound-adapters/:adapterId/trigger |
| Click Delete on a row | AdapterRegistry | DELETE /api/adapter-configurations/:adapterId |
| Click Confirm delete | AdapterRegistry | (already called above, then re-fetches adapters) |

---

## 9. Data flow diagram (text)

```
App (mount)
  ├── listUsers()              → users[]
  └── getFormats()             → formats[]

User selects tab
  ├── "summary"  → SummaryDashboard
  │     └── listUserAdapters(username) → rawAdapters → metrics + list
  │
  ├── "adapters" → AdapterRegistry
  │     └── listUserAdapters(username) → rawAdapters → table rows
  │           ├── [trigger] → triggerInboundAdapter(id, payload)
  │           └── [delete]  → deleteAdapterConfiguration(id)
  │
  └── "config"   → Wizard
        ├── Step 1: InboundStep
        │     └── [ISO format] → getFormatSubtypes(format)
        ├── Step 2: OutboundStep (no API)
        └── Step 3: SaveStep
              └── [save] → createLinkedAdapterConfiguration(payload)
```

---

## 10. Theme system

```
theme state in App → document.documentElement.dataset.theme = "light" | "dark"
CSS: :root { light vars } / [data-theme="dark"] { dark vars }
Toggle button in sidebar switches between modes
Default: "light"
```

---

## 11. Error handling pattern

```
All API calls follow:
  setStatus({ type: "loading", ... })
  try {
    const result = await apiFunction()
    setStatus({ type: "idle", ... })
    // use result
  } catch (error) {
    setStatus({ type: "error", msg: getApiErrorMessage(error) })
  }

getApiErrorMessage(error) in esbApi.js:
  - ECONNABORTED → timeout message
  - no response  → unreachable message
  - 400 → invalid input
  - 401/403 → permission denied
  - 404 → not found
  - 409 → conflict / duplicate
  - 422 → missing required fields
  - 500+ → server error
  - backend message used directly if present and not a Python traceback
```
