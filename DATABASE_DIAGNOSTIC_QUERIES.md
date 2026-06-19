# Database Diagnostic Queries

## Query 1: Check if 'error' field exists in database
```sql
SELECT * FROM canonical_fields WHERE LOWER(field_name) = 'error';
-- OR
SELECT * FROM canonical_fields WHERE LOWER(reference_id) = 'error';
-- OR
SELECT * FROM canonical_fields WHERE LOWER(name) = 'error';
```

**Expected Result:** Should return at least 1 row

## Query 2: Get all canonical fields (verify data structure)
```sql
SELECT * FROM canonical_fields LIMIT 10;
```

**Check:**
- Column names (field_name? fieldName? reference_id? referenceId?)
- Data format
- Any NULL values

## Query 3: Check 'error' field details
```sql
SELECT 
  id,
  field_name,
  fieldName,
  reference_id,
  referenceId,
  display_name,
  displayName,
  name,
  scope,
  data_type,
  dataType,
  created_at,
  updated_at
FROM canonical_fields 
WHERE LOWER(field_name) = 'error' 
   OR LOWER(fieldName) = 'error'
   OR LOWER(reference_id) = 'error' 
   OR LOWER(referenceId) = 'error'
   OR LOWER(name) = 'error';
```

**Critical Checks:**
- Is `field_name` or `fieldName` exactly 'error' (not NULL, not empty)?
- Is `display_name` or `displayName` populated (not NULL, not empty)?
- Are there any unusual characters or whitespace?

## Query 4: Check for duplicates
```sql
SELECT 
  field_name,
  COUNT(*) as count
FROM canonical_fields
GROUP BY field_name
HAVING COUNT(*) > 1;
```

**Expected:** Should be empty (no duplicates)

## Query 5: Check scope/filtering
```sql
SELECT 
  scope,
  COUNT(*) as count
FROM canonical_fields
GROUP BY scope;
```

**Check:** What scope is the 'error' field assigned to?

## Query 6: Compare 'error' with working fields
```sql
-- Get a field that DOES work in dropdown
SELECT * FROM canonical_fields WHERE field_name = 'customerSegment';

-- Compare with 'error' field
SELECT * FROM canonical_fields WHERE LOWER(field_name) = 'error';
```

**Compare:**
- Are the column values similar?
- Any differences in scope, data_type, or other fields?

## Expected Database Schema

Based on the code, the table should have columns like:

```
field_name (or fieldName) - PRIMARY KEY
display_name (or displayName) - NOT NULL
reference_id (or referenceId) - OPTIONAL
scope - OPTIONAL (e.g., 'system', 'custom')
data_type (or dataType) - OPTIONAL (e.g., 'STRING', 'NUMBER')
purpose - OPTIONAL
created_at - TIMESTAMP
updated_at - TIMESTAMP
```

## Red Flags to Look For

1. **Empty Values**
   - `field_name = ''` (empty string, not NULL)
   - `display_name = ''` (empty string, not NULL)

2. **Case Issues**
   - `field_name = 'Error'` (capital E) but code searches for lowercase

3. **Whitespace**
   - `field_name = ' error '` (leading/trailing spaces)
   - `field_name = 'error '` (trailing space)

4. **Special Characters**
   - `field_name = 'error\n'` (newline)
   - `field_name = 'error\r\n'` (carriage return + newline)

5. **NULL vs Empty**
   - `field_name = 'error'` but `display_name = NULL`
   - `field_name = 'error'` but `display_name = ''`

## Verification Query
```sql
SELECT 
  field_name,
  display_name,
  LENGTH(field_name) as field_name_length,
  LENGTH(display_name) as display_name_length,
  CASE 
    WHEN field_name = '' THEN 'EMPTY STRING'
    WHEN field_name IS NULL THEN 'NULL'
    ELSE 'OK'
  END as field_name_status,
  CASE 
    WHEN display_name = '' THEN 'EMPTY STRING'
    WHEN display_name IS NULL THEN 'NULL'
    ELSE 'OK'
  END as display_name_status
FROM canonical_fields
WHERE LOWER(field_name) = 'error' 
   OR LOWER(reference_id) = 'error'
   OR LOWER(name) = 'error';
```

This query will show:
- Exact field values
- String lengths (to detect whitespace)
- NULL vs empty string status
