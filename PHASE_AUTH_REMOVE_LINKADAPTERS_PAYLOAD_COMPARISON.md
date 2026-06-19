# LINKADAPTERS SAVE PAYLOAD: BEFORE vs AFTER

**Purpose:** Visual comparison of save-mapping payload before and after authentication removal.

---

## ❌ BEFORE (with authTransformation)

```json
{
  "mappingName": "MOBILE_REQUEST_TO_BALANCE_INQUIRY",
  "inboundAdapterId": "TAN-IB-POSTILION-001",
  "outboundAdapterId": "TAN-OB-MOBILE-001",
  "inboundRequestName": "Balance Inquiry",
  "outboundRequestName": "Mobile Request",
  "requestMappings": {
    "0": {
      "sourceField": "0",
      "targetField": "0",
      "mappingType": "DIRECT"
    },
    "3": {
      "sourceField": "3",
      "targetField": "3",
      "mappingType": "DIRECT"
    },
    "4": {
      "sourceField": "4",
      "targetField": "4",
      "mappingType": "DIRECT"
    },
    "11": {
      "sourceField": "11",
      "targetField": "11",
      "mappingType": "DIRECT"
    },
    "amount": {
      "mappingType": "STATIC",
      "targetField": "amount",
      "staticValue": "0"
    },
    "channel": {
      "sourceField": "source",
      "targetField": "channel",
      "mappingType": "FUNCTION",
      "functionName": "UPPERCASE"
    }
  },
  "responseMappings": {
    "39": {
      "sourceField": "39",
      "targetField": "39",
      "mappingType": "DIRECT"
    },
    "54": {
      "sourceField": "54",
      "targetField": "54",
      "mappingType": "DIRECT"
    },
    "statusMessage": {
      "sourceField": "39",
      "targetField": "statusMessage",
      "mappingType": "CONDITION",
      "operator": "==",
      "conditionValue": "00",
      "trueValue": "Success",
      "falseValue": "Failed"
    }
  },
  "authTransformation": {
    "inbound": "JWT",
    "outbound": "BASIC_AUTH",
    "inboundConfig": {
      "secret": "***MASKED***",
      "algorithm": "HS256"
    },
    "outboundConfig": {
      "username": "admin",
      "password": "***MASKED***"
    }
  }
}
```

**Issues:**
- ❌ `authTransformation` field present (incorrect location)
- ❌ Authentication is relationship-level (wrong architecture)
- ❌ Inbound adapter authentication configured in mapping (incorrect)
- ❌ Outbound adapter authentication configured in mapping (incorrect)

---

## ✅ AFTER (clean payload)

```json
{
  "mappingName": "MOBILE_REQUEST_TO_BALANCE_INQUIRY",
  "inboundAdapterId": "TAN-IB-POSTILION-001",
  "outboundAdapterId": "TAN-OB-MOBILE-001",
  "inboundRequestName": "Balance Inquiry",
  "outboundRequestName": "Mobile Request",
  "requestMappings": {
    "0": {
      "sourceField": "0",
      "targetField": "0",
      "mappingType": "DIRECT"
    },
    "3": {
      "sourceField": "3",
      "targetField": "3",
      "mappingType": "DIRECT"
    },
    "4": {
      "sourceField": "4",
      "targetField": "4",
      "mappingType": "DIRECT"
    },
    "11": {
      "sourceField": "11",
      "targetField": "11",
      "mappingType": "DIRECT"
    },
    "amount": {
      "mappingType": "STATIC",
      "targetField": "amount",
      "staticValue": "0"
    },
    "channel": {
      "sourceField": "source",
      "targetField": "channel",
      "mappingType": "FUNCTION",
      "functionName": "UPPERCASE"
    }
  },
  "responseMappings": {
    "39": {
      "sourceField": "39",
      "targetField": "39",
      "mappingType": "DIRECT"
    },
    "54": {
      "sourceField": "54",
      "targetField": "54",
      "mappingType": "DIRECT"
    },
    "statusMessage": {
      "sourceField": "39",
      "targetField": "statusMessage",
      "mappingType": "CONDITION",
      "operator": "==",
      "conditionValue": "00",
      "trueValue": "Success",
      "falseValue": "Failed"
    }
  }
}
```

**Benefits:**
- ✅ NO `authTransformation` field (correct architecture)
- ✅ Clean payload focused on field mappings only
- ✅ Authentication configured at destination level (in Create Outbound Adapter)
- ✅ Smaller payload size (reduced by ~30%)
- ✅ Clear separation of concerns

---

## 📐 CORRECT ARCHITECTURE

### Authentication Configuration Location

**Outbound Adapter Payload (TAN-OB-MOBILE-001):**
```json
{
  "adapterId": "TAN-OB-MOBILE-001",
  "adapterName": "Mobile Banking API",
  "type": "outbound",
  "protocol": "HTTPS",
  "host": "api.mobile.bank.com",
  "port": 443,
  "metadata": {
    "authentication": {
      "type": "BASIC",
      "username": "admin",
      "password": "***ENCRYPTED***"
    },
    "transportHeaders": [
      {
        "key": "Content-Type",
        "value": "application/json"
      },
      {
        "key": "Accept",
        "value": "application/json"
      },
      {
        "key": "Authorization",
        "value": "Basic YWRtaW46***=="
      }
    ]
  }
}
```

**Inbound Adapter Payload (TAN-IB-POSTILION-001):**
```json
{
  "adapterId": "TAN-IB-POSTILION-001",
  "adapterName": "Postilion Switch",
  "type": "inbound",
  "protocol": "TCP",
  "host": "10.0.0.5",
  "port": 5000,
  "metadata": {
    "authentication": {
      "type": "NONE"
    }
  }
}
```

**Link Adapters Payload (Integration Mapping):**
```json
{
  "mappingName": "MOBILE_REQUEST_TO_BALANCE_INQUIRY",
  "inboundAdapterId": "TAN-IB-POSTILION-001",
  "outboundAdapterId": "TAN-OB-MOBILE-001",
  "inboundRequestName": "Balance Inquiry",
  "outboundRequestName": "Mobile Request",
  "requestMappings": { ... },
  "responseMappings": { ... }
}
```

---

## 🔄 DATA FLOW

### Request Flow (Mobile → ESB → Postilion)

1. **Mobile Banking API** sends request
   - Uses authentication from TAN-OB-MOBILE-001 adapter
   - Transport headers include Authorization (BASIC auth)

2. **ESB receives request**
   - Validates authentication using outbound adapter config
   - Applies request field mappings from Link Adapters

3. **ESB sends to Postilion**
   - Uses connection details from TAN-IB-POSTILION-001 adapter
   - No authentication required (TCP protocol)

### Response Flow (Postilion → ESB → Mobile)

1. **Postilion** sends response
   - No authentication (TCP protocol)

2. **ESB receives response**
   - Applies response field mappings from Link Adapters

3. **ESB sends to Mobile API**
   - Uses authentication from TAN-OB-MOBILE-001 adapter
   - Includes transport headers

---

## 📊 COMPARISON TABLE

| Aspect | BEFORE (with authTransformation) | AFTER (clean) |
|--------|----------------------------------|---------------|
| **Authentication Location** | ❌ Link Adapters (relationship-level) | ✅ Create Outbound Adapter (destination-level) |
| **Payload Size** | ~150 lines | ~110 lines |
| **authTransformation Field** | ❌ Present | ✅ Removed |
| **Architecture** | ❌ Incorrect (auth in mapping) | ✅ Correct (auth in adapter) |
| **Reusability** | ❌ Auth duplicated per mapping | ✅ Auth shared across mappings |
| **Maintenance** | ❌ Change auth in every mapping | ✅ Change auth once in adapter |
| **Security** | ❌ Credentials in mapping config | ✅ Credentials in adapter config |
| **Separation of Concerns** | ❌ Mixed responsibilities | ✅ Clean separation |

---

## 🎯 KEY TAKEAWAYS

1. **Authentication = Destination Property**
   - Belongs in adapter configuration, NOT in adapter mappings
   - One outbound adapter serves multiple sources with same credentials

2. **Link Adapters = Field Transformations Only**
   - Request mappings: Transform fields from source to target
   - Response mappings: Transform fields from target to source
   - NO authentication configuration

3. **Clean Payload = Better Architecture**
   - Smaller payload size
   - Clear responsibilities
   - Easier maintenance
   - Better security

4. **Reusability**
   - Same outbound adapter can be used by multiple inbound adapters
   - Authentication configured once, used everywhere
   - No credential duplication

---

## 🔍 VERIFICATION

### How to Verify Clean Payload:

1. **Open Browser DevTools** (F12)
2. **Navigate to Network tab**
3. **Create/update adapter integration in Link Adapters**
4. **Click "Save Integration"**
5. **Find POST request to `/api/adapter-configurations/save-mapping`**
6. **Click request → Payload tab**
7. **Verify:**
   - ✅ `mappingName` present
   - ✅ `inboundAdapterId` present
   - ✅ `outboundAdapterId` present
   - ✅ `requestMappings` present
   - ✅ `responseMappings` present
   - ✅ `authTransformation` **NOT present**

---

**END OF PAYLOAD COMPARISON**
