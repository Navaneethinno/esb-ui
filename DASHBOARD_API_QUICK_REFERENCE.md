# DASHBOARD API QUICK REFERENCE

## Endpoint Overview

### 1. GET /metrics
**Purpose**: Complete dashboard metrics from database  
**Cache**: None (real-time)  
**Response Time**: ~100-200ms  

**Example Request**:
```bash
curl http://localhost:8000/metrics
```

**Response Structure**:
```json
{
  "health": {
    "status": "healthy|degraded|unhealthy",
    "uptime_seconds": 3600,
    "success_rate": 98.5,
    "avg_processing_time_ms": 125.3,
    "current_throughput": 45
  },
  "adapters": {
    "total_count": 15,
    "protocol_distribution": {
      "ISO8583": 5,
      "ISO20022": 3,
      "JSON": 4,
      "XML": 3
    }
  },
  "latency": {
    "avg_ms": 125.3,
    "percentiles": {
      "p50": [{"timestamp": "...", "value": 45.2}],
      "p90": [{"timestamp": "...", "value": 120.5}],
      "p99": [{"timestamp": "...", "value": 450.8}]
    }
  },
  "runtime": {
    "total_messages": 1523,
    "successful_messages": 1500,
    "failed_messages": 23
  }
}
```

### 2. GET /logs/recent
**Purpose**: Latest transaction audit logs  
**Default Limit**: 10  
**Cache**: None (real-time)  

**Example Requests**:
```bash
# Get last 10 transactions
curl http://localhost:8000/logs/recent

# Get last 5 transactions
curl http://localhost:8000/logs/recent?limit=5

# Get last 50 transactions
curl http://localhost:8000/logs/recent?limit=50
```

**Response Structure**:
```json
{
  "status": "success",
  "logs": [
    {
      "requestId": "CBS001-abc-123",
      "adapter": "CBS001",
      "requestType": "BalanceInquiry",
      "transform": "JSON_TO_ISO8583",
      "sourceFormat": "JSON",
      "targetFormat": "ISO8583",
      "status": "success",
      "destination": "https://corebanking.example.com/process",
      "timestamp": "2024-01-15T10:30:45.123Z"
    }
  ],
  "count": 10
}
```

---

## Frontend Integration

### SummaryDashboard.jsx Changes

**Before**:
```javascript
const metrics = await getMetrics(username);
const successRate = metrics?.health?.success_rate || 0;
const avgLatency = metrics?.health?.avg_processing_time_ms || 0;
```

**After** (No changes needed - already compatible):
```javascript
const metrics = await getMetrics(username);
const successRate = metrics?.health?.success_rate || 0; // Now from DB
const avgLatency = metrics?.health?.avg_processing_time_ms || 0; // Now from DB
```

### New Data Available

**Percentile Latency**:
```javascript
const percentiles = metrics?.latency?.percentiles || {};
const p50Data = percentiles.p50 || [];
const p90Data = percentiles.p90 || [];
const p99Data = percentiles.p99 || [];
```

**Protocol Distribution**:
```javascript
const distribution = metrics?.adapters?.protocol_distribution || {};
// Returns: { ISO8583: 5, ISO20022: 3, JSON: 4, XML: 3 }
```

**Audit Logs**:
```javascript
const logs = await getRecentLogs(username);
const transactions = logs?.logs || [];
```

---

## Dashboard Widget Mapping

| Widget | Endpoint | Field Path | Data Source |
|--------|----------|-----------|-------------|
| Configured Adapters | GET /metrics | adapters.total_count | inbound_adapter_master + outbound_adapter_master |
| Delivery Success Rate | GET /metrics | health.success_rate | esb_message_delivery_log (24h window) |
| Avg Execution Latency | GET /metrics | health.avg_processing_time_ms | esb_message_delivery_log.outbound_response->>'latencyMs' |
| Protocol Distribution | GET /metrics | adapters.protocol_distribution | inbound_adapter_request_config.source_format |
| Integration Topology | GET /api/inbound-adapters<br>GET /api/outbound-adapters | adapters[] | inbound_adapter_master + outbound_adapter_master |
| Latency Trends (P50/P90/P99) | GET /metrics | latency.percentiles | esb_message_delivery_log (statistical calculation) |
| Audit Stream | GET /logs/recent | logs[] | esb_message_delivery_log (latest 10) |

---

## Time Windows

| Metric | Time Window | Reason |
|--------|-------------|--------|
| Success Rate | 24 hours | Business day view |
| Avg Latency | 1 hour | Recent performance |
| Latency Percentiles | 1 hour (1000 samples) | Statistical accuracy |
| Audit Stream | All time (latest 10) | Real-time monitoring |
| Adapter Count | Real-time | Current state |

---

## Database Queries

### Success Rate
```sql
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN final_status = 'success' THEN 1 ELSE 0 END) as successful
FROM esb_message_delivery_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

### Avg Latency
```sql
SELECT 
    (outbound_response->>'latencyMs')::NUMERIC as latency_ms
FROM esb_message_delivery_log
WHERE 
    created_at >= NOW() - INTERVAL '1 hour'
    AND outbound_response IS NOT NULL
    AND outbound_response->>'latencyMs' IS NOT NULL
LIMIT 100
```

### Protocol Distribution
```sql
SELECT 
    UPPER(source_format) as format,
    COUNT(*) as count
FROM inbound_adapter_request_config
WHERE active = TRUE
GROUP BY UPPER(source_format)
```

### Audit Logs
```sql
SELECT 
    request_id,
    adapter_name,
    request_name,
    transform_type,
    source_format,
    target_format,
    final_status,
    outbound_destination,
    created_at
FROM esb_message_delivery_log
ORDER BY created_at DESC
LIMIT 10
```

---

## Performance Optimization

### Recommended Indexes
```sql
-- For success rate queries
CREATE INDEX idx_delivery_log_created_status 
ON esb_message_delivery_log(created_at, final_status);

-- For latency queries
CREATE INDEX idx_delivery_log_created_response 
ON esb_message_delivery_log(created_at) 
WHERE outbound_response IS NOT NULL;

-- For audit stream
CREATE INDEX idx_delivery_log_created_desc 
ON esb_message_delivery_log(created_at DESC);
```

### Caching Strategy (Optional)
```python
# In production, consider caching metrics for 30-60 seconds
from functools import lru_cache
import time

@lru_cache(maxsize=1)
def get_cached_metrics(timestamp_bucket):
    # timestamp_bucket = int(time.time() / 60)  # 1 minute buckets
    return DashboardMetricsService().get_complete_metrics()
```

---

## Error Handling

### Metrics Endpoint
If database fails, returns runtime-only metrics:
```json
{
  "health": {
    "status": "degraded",
    "uptime_seconds": 3600,
    ...
  },
  "error": "Database metrics unavailable: connection refused"
}
```

### Logs Endpoint
If database fails, returns empty logs:
```json
{
  "status": "error",
  "error": "Database connection failed",
  "logs": []
}
```

---

## Testing Checklist

- [ ] Metrics endpoint returns 200
- [ ] Success rate > 0 after adapter triggers
- [ ] Avg latency > 0 after adapter triggers
- [ ] Protocol distribution has counts
- [ ] Percentiles (P50, P90, P99) are arrays
- [ ] Logs endpoint returns 200
- [ ] Logs array contains recent transactions
- [ ] Adapter count matches database
- [ ] No mock data in responses
- [ ] No hardcoded values

---

## Troubleshooting

### Issue: All metrics show 0
**Cause**: No delivery logs in database  
**Solution**: Trigger some adapters to create logs

### Issue: Percentiles empty
**Cause**: No latency data in last hour  
**Solution**: Trigger adapters with outbound delivery

### Issue: Protocol distribution empty
**Cause**: No adapter configurations  
**Solution**: Create adapters with request configurations

### Issue: Database connection error
**Cause**: PostgreSQL not running or wrong credentials  
**Solution**: Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD environment variables

---

## Production Deployment

1. **Set Environment Variables**:
```bash
export DB_HOST=prod-postgres.example.com
export DB_PORT=5432
export DB_NAME=esb_production
export DB_USER=esb_app_user
export DB_PASSWORD=secure_password_here
```

2. **Create Indexes**:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f create_dashboard_indexes.sql
```

3. **Test Endpoints**:
```bash
python test_dashboard_api.py
```

4. **Monitor Performance**:
```bash
# Check query execution times
curl http://localhost:8000/metrics -w "\nTime: %{time_total}s\n"
```

5. **Enable Caching (Optional)**:
Add Redis/Memcached for 30-60 second metric caching

---

## API Contract

### Backward Compatibility
✅ All existing frontend code works without changes  
✅ New fields are additive (no breaking changes)  
✅ Default values prevent null errors  

### Forward Compatibility
✅ Frontend can add new widgets using existing endpoints  
✅ Time windows can be adjusted via service config  
✅ Additional metrics can be added without frontend changes  
