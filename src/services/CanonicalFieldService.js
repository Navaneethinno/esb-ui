import axios from "axios";
import { APP_CONFIG } from "../config/theme";
import { cachedFetch } from "../utils/apiCache";

const baseURL =
  import.meta.env.VITE_ESB_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : APP_CONFIG.api.fallbackBaseUrl);

const api = axios.create({
  baseURL,
  timeout: APP_CONFIG.api.timeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

function unwrapFields(data) {
  console.log('═══════════════════════════════════════');
  console.log('CANONICAL_SOURCE: CanonicalFieldService.unwrapFields');
  console.log('RAW API DATA:', JSON.stringify(data, null, 2));
  console.log('═══════════════════════════════════════');
  
  const raw = Array.isArray(data) ? data : data?.fields || data?.data || data?.items || data?.results || [];
  console.log('EXTRACTED RAW ARRAY:', raw);
  console.log('RAW ARRAY LENGTH:', raw.length);
  
  // Check for test fields
  const partnerTierInRaw = raw.find(item => {
    const fieldName = typeof item === 'string' ? item : (item?.fieldName || item?.referenceId || item?.fieldId || item?.code || item?.name || '');
    return fieldName.toLowerCase() === 'partnertier';
  });
  const customerSegmentInRaw = raw.find(item => {
    const fieldName = typeof item === 'string' ? item : (item?.fieldName || item?.referenceId || item?.fieldId || item?.code || item?.name || '');
    return fieldName.toLowerCase() === 'customersegment';
  });
  const errorFieldInRaw = raw.find(item => {
    const fieldName = typeof item === 'string' ? item : (item?.fieldName || item?.referenceId || item?.fieldId || item?.code || item?.name || '');
    return fieldName.toLowerCase() === 'error';
  });
  
  console.log('TEST FIELDS IN RAW:');
  console.log('  - partnerTier:', partnerTierInRaw);
  console.log('  - customerSegment:', customerSegmentInRaw);
  console.log('  - error:', errorFieldInRaw);
  
  if (raw.length > 0 && typeof raw[0] === "object") {
    const mapped = raw.map(item => ({
      ...item,
      fieldName: item.fieldName || item.referenceId || item.fieldId || item.code || item.name || "",
      displayName: item.displayName || item.name || item.fieldName || item.referenceId || item.fieldId || item.code || "",
    }));
    console.log('AFTER MAPPING (first 5):', mapped.slice(0, 5));
    console.log('MAPPED ARRAY LENGTH:', mapped.length);
    
    const filtered = mapped.filter(field => field.fieldName && field.displayName);
    console.log('AFTER FILTER (first 5):', filtered.slice(0, 5));
    console.log('FILTERED ARRAY LENGTH:', filtered.length);
    
    // Check test fields after filter
    const partnerTierAfterFilter = filtered.find(f => f.fieldName.toLowerCase() === 'partnertier');
    const customerSegmentAfterFilter = filtered.find(f => f.fieldName.toLowerCase() === 'customersegment');
    const errorFieldAfterFilter = filtered.find(f => f.fieldName.toLowerCase() === 'error');
    
    console.log('TEST FIELDS AFTER FILTER:');
    console.log('  - partnerTier:', partnerTierAfterFilter);
    console.log('  - customerSegment:', customerSegmentAfterFilter);
    console.log('  - error:', errorFieldAfterFilter);
    
    return filtered;
  }
  
  const mapped = raw
    .map(item => (typeof item === "string" ? { fieldName: item, displayName: item } : {
      ...item,
      fieldName: item?.fieldName || item?.referenceId || item?.fieldId || item?.code || item?.name || "",
      displayName: item?.displayName || item?.name || item?.fieldName || item?.referenceId || item?.fieldId || item?.code || "",
    }));
  console.log('STRING PATH - AFTER MAPPING:', mapped.slice(0, 5));
  
  const filtered = mapped.filter(field => field.fieldName && field.displayName);
  console.log('STRING PATH - AFTER FILTER:', filtered.slice(0, 5));
  console.log('STRING PATH - FILTERED LENGTH:', filtered.length);
  
  return filtered;
}

export async function fetchCanonicalFields(format) {
  console.log('═══════════════════════════════════════');
  console.log('CANONICAL_SOURCE: fetchCanonicalFields');
  console.log('FORMAT PARAM:', format);
  console.log('═══════════════════════════════════════');
  
  const cacheKey = `canonical-fields:${format || "all"}`;
  let result = [];

  await cachedFetch(
    cacheKey,
    async () => {
      const response = await api.get("/canonical/fields", {
        params: format ? { format } : undefined,
      });
      console.log('API RESPONSE STATUS:', response.status);
      console.log('API RESPONSE DATA:', response.data);
      
      const unwrapped = unwrapFields(response.data);
      console.log('UNWRAPPED RESULT LENGTH:', unwrapped.length);
      console.log('UNWRAPPED RESULT (first 10):', unwrapped.slice(0, 10));
      
      // Check test fields
      const partnerTier = unwrapped.find(f => f.fieldName.toLowerCase() === 'partnertier');
      const customerSegment = unwrapped.find(f => f.fieldName.toLowerCase() === 'customersegment');
      const errorField = unwrapped.find(f => f.fieldName.toLowerCase() === 'error');
      
      console.log('TEST FIELDS IN UNWRAPPED:');
      console.log('  - partnerTier:', partnerTier);
      console.log('  - customerSegment:', customerSegment);
      console.log('  - error:', errorField);
      console.log('ALL FIELD NAMES:', unwrapped.map(f => f.fieldName));
      
      return unwrapped;
    },
    {
      onData: (data) => {
        result = Array.isArray(data) ? data : [];
        console.log('onData CALLBACK - RESULT LENGTH:', result.length);
        console.log('onData CALLBACK - RESULT (first 10):', result.slice(0, 10));
      },
      ttl: 60_000,
    },
  );

  console.log('FINAL RETURN VALUE LENGTH:', result.length);
  console.log('FINAL RETURN VALUE (first 10):', result.slice(0, 10));
  
  return result;
}

export async function createCanonicalField(payload) {
  const response = await api.post("/canonical/fields", payload);
  return response.data;
}
