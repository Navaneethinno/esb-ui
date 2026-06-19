# IMPACT ANALYSIS: Move Dynamic Functions from Request Types to Link Adapters

## Executive Summary

**Task**: Move Dynamic Functions configuration from Request Types (ManageFunctionsPage) to Link Adapters (LinkAdapters)

**Reason**: Business requirement to configure functions (especially fees) at the route/link level, not request type level

**Risk Level**: 🔴 HIGH - Affects data model, API contracts, UI components, and runtime execution

---

## PHASE 1: CURRENT STATE ANALYSIS

### 1.1 Current Architecture

#### Frontend Components

**ManageFunctionsPage.jsx** (Request Types Configuration)
- Location: `ESB_UI/src/components/ManageFunctionsPage.jsx`
- Current Purpose: Configure request types for adapters
- Dynamic Functions Section: Lines ~900-960
- Current Storage: `dynamicFunctions` array in request type configuration
- Format:
```javascript
dynamicFunctions: [{
  outputField: "string",
  functionName: "CALC_FEE | CURRENT_TIMESTAMP | STATIC",
  baseField: "string",     // Input field from request payload
  args: "string"           // Additional arguments
}]
```

**LinkAdapters.jsx** (Route Configuration)
- Location: `ESB_UI/src/components/LinkAdapters.jsx`
- Current Purpose: Link inbound and outbound adapters
- Current Sections:
  - Adapter Selection
  - Request Type Selection
  - Request/Response Mappings (Mapping Studio)
  - Save Integration
- Missing: Dynamic Functions section

#### Backend API

**adapter_configuration_api.py**
- `/api/adapter-configurations/save-mapping` - Saves link mappings
- Current payload fields:
  - `inboundAdapterId`
  - `outboundAdapterId`
  - `inboundRequestName`
  - `outboundRequestName`
  - `requestMappings`
  - `responseMappings`
- Missing: `dynamicFunctions` field

**db_manager.py - save_link_mapping()**
- Current parameters:
  - `inbound_adapter_id`
  - `outbound_adapter_id`
  - `request_mappings`
  - `response_mappings`
  - `inbound_request_name`
  - `outbound_request_name`
  - `mapping_name` (optional)
- Missing: `dynamic_functions` parameter

#### Database Schema

**adapter_link_mapping table** (verified from db_manager.py)
- Current columns:
  - `mapping_id` VARCHAR(100)
  - `mapping_name` TEXT
  - `inbound_adapter_id` VARCHAR(100)
  - `outbound_adapter_id` VARCHAR(100)
  - `inbound_request_name` VARCHAR(150)
  - `outbound_request_name` VARCHAR(150)
  - `request_mappings` JSONB
  - `response_mappings` JSONB
  - `source_output_payload` JSONB
  - `target_input_payload` JSONB
- **MISSING**: `dynamic_functions` JSONB column

**Request Type Storage** (inbound_adapter_request_config, outbound_adapter_request_config)
- Current: `dynamicFunctions` stored in these tables
- Format: JSON object `{"outputField": "FUNCTION_NAME(args)"}`

### 1.2 Current Execution Flow

```
1. Request arrives at Inbound Adapter
2. Request Type identified
3. Dynamic Functions executed (from request type config)
4. Canonical transformation
5. Route mapping applied
6. Outbound transformation
7. Send to Outbound Adapter
```

**Problem**: Functions execute at request type level, not route level
**Impact**: Cannot have route-specific functions (e.g., different fees for different routes)

---

## PHASE 2: IMPACT ASSESSMENT

### 2.1 Database Impact 🔴 HIGH

#### Required Schema Changes

**adapter_link_mapping table**
```sql
ALTER TABLE adapter_link_mapping
ADD COLUMN IF NOT EXISTS dynamic_functions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN adapter_link_mapping.dynamic_functions IS 
'Route-specific dynamic functions executed during transformation. Format: {"outputField": "FUNCTION(args)"}';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_adapter_link_mapping_dynamic_functions
ON adapter_link_mapping USING GIN (dynamic_functions);
```

#### Migration Strategy
- Add column without dropping existing data
- Keep request type `dynamicFunctions` for backward compatibility
- Route-level functions take precedence over request type functions

### 2.2 API Contract Impact 🔴 HIGH

#### save_link_mapping() API Changes

**Current**:
```python
def save_link_mapping(self, inbound_adapter_id, outbound_adapter_id,
                      source_output_payload, target_input_payload,
                      request_mappings, response_mappings=None,
                      ...):
```

**Required**:
```python
def save_link_mapping(self, inbound_adapter_id, outbound_adapter_id,
                      source_output_payload, target_input_payload,
                      request_mappings, response_mappings=None,
                      dynamic_functions=None,  # NEW PARAMETER
                      ...):
```

#### get_link_mapping() API Changes

**Current Response**:
```json
{
  "mappingId": "...",
  "inboundAdapterId": "...",
  "outboundAdapterId": "...",
  "requestMappings": [],
  "responseMappings": []
}
```

**Required Response**:
```json
{
  "mappingId": "...",
  "inboundAdapterId": "...",
  "outboundAdapterId": "...",
  "requestMappings": [],
  "responseMappings": [],
  "dynamicFunctions": {}  // NEW FIELD
}
```

### 2.3 Runtime Execution Impact 🔴 CRITICAL

#### Current Execution Path (from code analysis)

**File**: `services/esb_orchestrator.py` or `services/routing_engine.py`

**Current Flow**:
```
1. Load request type config
2. Get dynamicFunctions from request type
3. Execute functions
4. Apply transformations
5. Route to outbound
```

**Required Flow**:
```
1. Load request type config
2. Load link mapping
3. Get dynamicFunctions from link mapping  // CHANGE
4. Execute functions
5. Apply transformations
6. Route to outbound
```

**Risk**: If runtime doesn't load link mappings, functions won't execute

#### Function Execution Point

Need to verify where functions currently execute:
- Before canonical transformation?
- After canonical transformation?
- Before outbound mapping?

**Fee Requirement**: Must execute BEFORE outbound mapping so fee result can be mapped to outbound field

### 2.4 UI/UX Impact 🟡 MEDIUM

#### ManageFunctionsPage.jsx
- **Remove**: Dynamic Functions section (lines ~900-960)
- **Keep**: All other sections (request/response mappings, custom fields, headers, protection rules)
- **Risk**: Users currently configuring functions will lose this capability at request type level

#### LinkAdapters.jsx
- **Add**: New Dynamic Functions section
- **Location**: After Response Mapping, before Save button
- **Components**: Reuse existing function builder UI from ManageFunctionsPage
- **Complexity**: Need to integrate with Mapping Studio context

### 2.5 Data Migration Impact 🟡 MEDIUM

#### Existing Functions

**Question**: What happens to existing dynamicFunctions in request types?

**Options**:
1. **Keep Both** (Recommended for backward compatibility)
   - Request type functions execute first
   - Link mapping functions execute second
   - Risk: Confusion about execution order

2. **Migrate Automatically**
   - Copy request type functions to all link mappings using that request type
   - Risk: Complex migration script, data duplication

3. **Manual Migration**
   - Require users to reconfigure
   - Risk: User frustration, data loss

**Recommendation**: Option 1 - Keep both, document precedence

### 2.6 Fee Function Requirements

#### New FEE Function Specification

```javascript
{
  functionType: "FEE",
  feeName: "string",
  sourceField: "string",  // Must be from request payload (dropdown)
  
  transactionAmountType: "FLAT" | "SLAB",
  calculationType: "FIXED" | "PERCENTAGE",
  
  // FLAT + FIXED
  feeAmount: number,
  
  // FLAT + PERCENTAGE
  percentage: number,
  minCap: number | null,
  maxCap: number | null,
  
  // SLAB
  slabs: [{
    startAmount: number,
    endAmount: number,
    value: number,
    valueType: "FIXED" | "PERCENTAGE"
  }],
  
  outputMode: "OVERWRITE" | "NEW_FIELD",
  outputField: "string",  // Dropdown if OVERWRITE, free text if NEW_FIELD
  
  // Stored in DB as
  outputField: "feeAmount",
  functionName: "FEE",
  args: JSON.stringify(feeConfig)
}
```

---

## PHASE 3: DEPENDENCIES & CONSTRAINTS

### 3.1 Database Tables to Verify

Need to examine:
- ✅ `adapter_link_mapping` - Confirmed structure from db_manager.py
- ❓ `transformation_functions` - Need to verify if exists
- ❓ `function_canonical_bindings` - Mentioned in db_manager.py
- ❓ `esb_session_functions` - Mentioned in db_manager.py
- ❓ `inbound_adapter_request_config` - Contains current dynamicFunctions
- ❓ `outbound_adapter_request_config` - Contains current dynamicFunctions

### 3.2 Runtime Files to Examine

Need to analyze:
- ❓ `services/esb_orchestrator.py` - Main execution engine
- ❓ `services/routing_engine.py` - Routing logic
- ❓ `services/mapping_engine.py` - Field mapping logic
- ❓ `services/canonical_transformer.py` - Canonical transformation
- ❓ `services/adapter_executor.py` - Adapter execution

### 3.3 API Endpoints to Verify

Need to test:
- ✅ `POST /api/adapter-configurations/save-mapping` - Confirmed exists
- ✅ `GET /api/adapter-configurations/<id>/mappings` - Confirmed exists
- ❓ Runtime execution endpoint
- ❓ Function validation endpoint

---

## PHASE 4: RISKS & MITIGATION

### 4.1 Critical Risks 🔴

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Functions don't execute at runtime | CRITICAL | HIGH | Verify runtime execution path first |
| Existing data loss | HIGH | MEDIUM | Keep request type functions, add migration |
| API breaking changes | HIGH | MEDIUM | Version API or support both formats |
| Performance degradation | MEDIUM | LOW | Index dynamic_functions JSONB column |

### 4.2 Implementation Risks 🟡

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| UI complexity | MEDIUM | HIGH | Reuse existing components |
| Testing gaps | MEDIUM | MEDIUM | Comprehensive test plan |
| Documentation lag | LOW | HIGH | Document as we build |

---

## PHASE 5: RECOMMENDED IMPLEMENTATION PLAN

### Step 1: Database Schema (MUST DO FIRST)
1. Add `dynamic_functions` JSONB column to `adapter_link_mapping`
2. Create index
3. Add comment for documentation
4. **DO NOT** drop request type `dynamicFunctions` column

### Step 2: Backend API Updates
1. Update `db_manager.py`:
   - Modify `save_link_mapping()` to accept `dynamic_functions`
   - Update SQL INSERT/UPDATE statements
   - Modify `get_link_mapping()` to return `dynamic_functions`
2. Update `adapter_configuration_api.py`:
   - Add `dynamicFunctions` to `/save-mapping` request body
   - Add `dynamicFunctions` to response

### Step 3: Runtime Integration (CRITICAL)
1. Locate function execution code
2. Modify to load from link mapping
3. Keep fallback to request type functions
4. Test execution order

### Step 4: UI Implementation
1. Create FeeBuilderModal component for FEE function
2. Add Dynamic Functions section to LinkAdapters.jsx
3. Remove Dynamic Functions section from ManageFunctionsPage.jsx
4. Test UI flow

### Step 5: Testing & Validation
1. Database validation
2. API validation
3. Runtime validation
4. UI validation
5. End-to-end validation

---

## PHASE 6: OPEN QUESTIONS (NEED ANSWERS)

### Critical Questions 🔴

1. **Where exactly do functions execute in the runtime?**
   - File location?
   - Before or after canonical transformation?
   - Do they have access to link mapping data?

2. **How are functions currently stored in request type config?**
   - Exact JSONB format?
   - Function signature format?

3. **Do link mappings currently load during runtime?**
   - If not, need to add this
   - Performance impact?

4. **What is the fee calculation logic?**
   - Existing implementation?
   - New implementation required?

### Implementation Questions 🟡

5. **Should we migrate existing functions automatically?**
   - Or require manual reconfiguration?

6. **What happens if both request type and link mapping have functions?**
   - Which takes precedence?
   - Execute both?

7. **How to handle function validation?**
   - Validate at save time?
   - Validate at runtime?

8. **How to display existing functions in UI?**
   - Read-only vs editable?
   - Version history?

---

## PHASE 7: NEXT STEPS

### Before Implementation:

1. ❌ **STOP** - Do NOT start coding yet
2. ✅ **Examine** runtime execution files
3. ✅ **Verify** database schema
4. ✅ **Test** current function execution
5. ✅ **Document** findings
6. ✅ **Create** detailed implementation plan

### Required Verifications:

1. Run SQL query to examine adapter_link_mapping table
2. Examine esb_orchestrator.py or equivalent
3. Test creating a function in Request Types
4. Test executing a route with functions
5. Verify function output reaches outbound payload

### Decision Points:

- [ ] Keep request type functions or remove?
- [ ] Migration strategy approved?
- [ ] Runtime modification approach decided?
- [ ] UI/UX flow approved?

---

## CONCLUSION

**Status**: 🔴 **ANALYSIS PHASE - DO NOT IMPLEMENT YET**

This task has **HIGH COMPLEXITY** and **HIGH RISK**. It affects:
- Database schema (1 table modification)
- Backend API (2 methods modified)
- Runtime execution (location unknown - CRITICAL)
- Frontend UI (2 components affected)
- Data migration (existing functions)

**Recommended Next Action**: 
1. Examine runtime execution code
2. Create detailed technical specification
3. Get stakeholder approval
4. Then proceed with implementation

**Estimated Effort**: 3-5 days (includes testing and validation)

**Risk Level**: 🔴 HIGH - Requires careful planning and execution

---

**Document Version**: 1.0  
**Created**: 2025-01-20  
**Status**: ANALYSIS COMPLETE - AWAITING RUNTIME VERIFICATION
