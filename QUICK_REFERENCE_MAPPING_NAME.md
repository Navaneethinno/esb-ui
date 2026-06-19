# QUICK REFERENCE: Mapping Name Auto-Generation

## 🎯 What Changed?
Users NO LONGER input mapping names manually. The backend automatically generates them.

## 📋 Format
```
IB-{OUTBOUND_ADAPTER_NAME}-{INBOUND_ADAPTER_NAME}-{SEQUENCE}
```

### Examples
- `IB-TANAIOBKYC-TANAIIBKYC-0001`
- `IB-MOBILECHANNEL-COREBANKING-0001`
- `IB-PAYMENTGW-COREBANK-0002`

## 🔧 Implementation

### Frontend (LinkAdapters.jsx)
```javascript
// ❌ OLD - Manual input
const payload = {
  mappingName: `USER_INPUT_NAME`,
  inboundAdapterId: "...",
  // ...
};

// ✅ NEW - Auto-generated
const payload = {
  // No mappingName field - backend generates it
  inboundAdapterId: "...",
  outboundAdapterId: "...",
  // ...
};
```

### Backend (db_manager.py)
```python
# Auto-generation logic
def _next_mapping_id(inbound_id, outbound_id):
    ob_name = clean(get_outbound_name(outbound_id))
    ib_name = clean(get_inbound_name(inbound_id))
    seq = count_existing() + 1
    return f"IB-{ob_name}-{ib_name}-{seq:04d}"
```

## 🧪 Quick Test

### 1. UI Test
1. Go to Link Adapters
2. Select adapters
3. Save mapping
4. ✅ No mapping name input required

### 2. API Test
```bash
curl -X POST http://localhost:5000/api/adapter-configurations/save-mapping \
  -H "Content-Type: application/json" \
  -d '{
    "inboundAdapterId": "TAN-IB-001",
    "outboundAdapterId": "TAN-OB-001",
    "requestMappings": {},
    "responseMappings": {}
  }'
```

### 3. DB Test
```sql
SELECT mapping_id FROM adapter_link_mapping 
ORDER BY created_at DESC LIMIT 1;
-- Expected: IB-XXXXXX-YYYYYY-0001
```

## 📊 Verification

| Check | Command | Expected |
|-------|---------|----------|
| Format | `SELECT mapping_id FROM adapter_link_mapping` | `IB-XXX-YYY-####` |
| Unique | `SELECT mapping_id, COUNT(*) ... GROUP BY mapping_id` | No duplicates |
| Audit | `SELECT mapping_name FROM innobridge_audit` | Shows generated IDs |

## ⚠️ Important Notes

1. **Existing mappings**: Unchanged - preserved as-is
2. **New mappings**: Auto-generated - no user input
3. **Uniqueness**: Enforced by sequence counter
4. **Dashboard**: Works with auto-generated IDs
5. **Backward compatible**: No breaking changes

## 📁 Files Changed
- `ESB_UI/src/components/LinkAdapters.jsx` - Removed mappingName from payload

## 📁 Files Unchanged (Already Correct)
- `services/db_manager.py` - Auto-generation exists
- `services/adapter_configuration_api.py` - Accepts optional mapping_name

## 🚀 Deployment
```bash
# Frontend
cd ESB_UI
npm run build

# Backend (no changes needed)
# Just restart if already running
```

## ✅ Success Criteria
- [x] No mapping name input in UI
- [x] No validation errors
- [x] Auto-generated IDs follow format
- [x] No duplicates
- [x] Existing mappings work
- [x] Dashboard shows routes
- [x] Audit trail records IDs

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "mappingName required" error | Remove mappingName from frontend payload |
| NULL mapping_id in DB | Check backend _next_mapping_id() execution |
| Wrong format | Verify adapter names in DB |
| Dashboard empty | Check innobridge_audit table |

## 📞 Quick Commands

```bash
# Check recent mappings
psql -U postgres -d main_esb -c "SELECT mapping_id, created_at FROM adapter_link_mapping ORDER BY created_at DESC LIMIT 5;"

# Verify format
psql -U postgres -d main_esb -c "SELECT mapping_id FROM adapter_link_mapping WHERE mapping_id !~ '^IB-[A-Z0-9]+-[A-Z0-9]+-[0-9]{4}$';"

# Count by type
psql -U postgres -d main_esb -c "SELECT CASE WHEN mapping_id ~ '^IB-' THEN 'Auto' ELSE 'Manual' END AS type, COUNT(*) FROM adapter_link_mapping GROUP BY type;"
```

## 📖 Documentation
- Full details: `DELIVERY_SUMMARY_MAPPING_NAME.md`
- Implementation: `TASK_REMOVE_MAPPING_NAME.md`
- Tests: `test_mapping_name_removal.py`
- SQL: `verify_mapping_name_generation.sql`

---

**Status**: ✅ COMPLETE  
**Version**: 1.0  
**Date**: 2025-01-20
