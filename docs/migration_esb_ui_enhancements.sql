-- ============================================================================
-- ESB UI ENHANCEMENT PHASE - DATABASE MIGRATION
-- ============================================================================
-- Description: Adds security configuration and custom headers support
-- Date: 2024
-- Impact: UI configuration only, no runtime impact
-- ============================================================================

-- 1. Ensure headers column exists in outbound_adapter_master
-- (This should already exist based on backend documentation)
ALTER TABLE outbound_adapter_master 
ADD COLUMN IF NOT EXISTS headers JSON DEFAULT '{}';

COMMENT ON COLUMN outbound_adapter_master.headers IS 
'Custom HTTP headers for outbound requests (JSON key-value pairs)';

-- ============================================================================

-- 2. Add protocol-specific timeout fields
-- HTTP/HTTPS: uses timeout_seconds (already exists)
-- TCP: needs connection_timeout and read_timeout
ALTER TABLE outbound_adapter_master 
ADD COLUMN IF NOT EXISTS connection_timeout INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS read_timeout INTEGER DEFAULT 30;

COMMENT ON COLUMN outbound_adapter_master.connection_timeout IS 
'TCP connection timeout in seconds';

COMMENT ON COLUMN outbound_adapter_master.read_timeout IS 
'TCP read timeout in seconds';

-- ============================================================================

-- 3. Create request_type_config table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS request_type_config (
  id SERIAL PRIMARY KEY,
  request_type_name VARCHAR(100) NOT NULL UNIQUE,
  format VARCHAR(50) NOT NULL,
  description TEXT,
  request_schema JSON,
  response_schema JSON,
  security_type VARCHAR(20) DEFAULT 'NONE' CHECK (security_type IN ('NONE', 'MASK', 'HASH', 'ENCRYPT')),
  protected_fields JSON DEFAULT '[]',
  username VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE request_type_config IS 
'Request type configurations with security and schema definitions';

COMMENT ON COLUMN request_type_config.request_type_name IS 
'Unique identifier for the request type (e.g., BALANCE_INQUIRY)';

COMMENT ON COLUMN request_type_config.format IS 
'Data format: JSON, XML, ISO8583, ISO20022';

COMMENT ON COLUMN request_type_config.security_type IS 
'Security protection type: NONE, MASK, HASH, ENCRYPT';

COMMENT ON COLUMN request_type_config.protected_fields IS 
'Array of field names that should be protected (JSON array of strings)';

-- ============================================================================

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_type_name 
ON request_type_config(request_type_name);

CREATE INDEX IF NOT EXISTS idx_request_type_format 
ON request_type_config(format);

CREATE INDEX IF NOT EXISTS idx_request_type_active 
ON request_type_config(active) WHERE active = true;

-- ============================================================================

-- 5. Insert sample data (optional, for testing)
INSERT INTO request_type_config (
  request_type_name, 
  format, 
  description, 
  request_schema, 
  response_schema,
  security_type,
  protected_fields,
  username
) VALUES (
  'SAMPLE_SECURE_TRANSACTION',
  'JSON',
  'Sample request type with security configuration',
  '{"accountNumber": "string", "amount": "number", "pin": "string"}',
  '{"transactionId": "string", "status": "string", "balance": "number"}',
  'ENCRYPT',
  '["accountNumber", "pin"]',
  'system'
) ON CONFLICT (request_type_name) DO NOTHING;

-- ============================================================================

-- 6. Verify migration
SELECT 
  'request_type_config' as table_name,
  COUNT(*) as record_count
FROM request_type_config
UNION ALL
SELECT 
  'outbound_adapter_master (with headers)' as table_name,
  COUNT(*) as record_count
FROM outbound_adapter_master 
WHERE headers IS NOT NULL;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if needed)
-- ============================================================================

-- UNCOMMENT BELOW TO ROLLBACK (WARNING: This will delete data)

-- DROP TABLE IF EXISTS request_type_config CASCADE;
-- ALTER TABLE outbound_adapter_master DROP COLUMN IF EXISTS connection_timeout;
-- ALTER TABLE outbound_adapter_master DROP COLUMN IF EXISTS read_timeout;
-- Note: We keep 'headers' column as it was documented in original backend

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
