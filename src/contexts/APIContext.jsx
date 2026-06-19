import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { listInboundAdapters, listOutboundAdapters, listUsers } from '../services/esbApi';
import { fetchCanonicalFields } from '../services/CanonicalFieldService';

const APIContext = createContext(null);

function getValue(item, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], item);
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

function normalizeUsers(data) {
  const list = Array.isArray(data)
    ? data
    : data?.users || data?.data || data?.items || data?.results || [];

  return list
    .map((item) => ({
      id: getValue(item, ['id', 'userId', 'user_id', 'username', 'email']),
      username: getValue(item, ['username', 'userName', 'email', 'id', 'userId']),
      name: getValue(item, ['name', 'displayName', 'userName', 'username', 'email']),
      role: getValue(item, ['role', 'roleName', 'designation', 'department']),
      raw: item,
    }))
    .filter((user) => user.id && user.username && user.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function APIProvider({ children }) {
  const cacheRef = useRef({
    users: { data: null, loading: false, timestamp: 0 },
    canonical: { data: null, loading: false, timestamp: 0 },
    inboundAdapters: new Map(),
    outboundAdapters: new Map(),
  });

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [canonicalFields, setCanonicalFields] = useState([]);
  const [canonicalLoading, setCanonicalLoading] = useState(false);

  const CACHE_DURATION = 5 * 60 * 1000;

  function getScopedCache(bucket, username) {
    const key = String(username || "__all__");
    const cacheBucket = cacheRef.current[bucket];
    if (cacheBucket instanceof Map) {
      if (!cacheBucket.has(key)) {
        cacheBucket.set(key, { data: null, loading: false, timestamp: 0 });
      }
      return cacheBucket.get(key);
    }
    return cacheBucket;
  }

  const loadUsers = useCallback(async (force = false) => {
    const cache = cacheRef.current.users;
    const now = Date.now();
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) return cache.data;
    if (cache.loading) return cache.data;
    
    cache.loading = true;
    setUsersLoading(true);
    try {
      const response = await listUsers();
      const data = normalizeUsers(response);
      cache.data = data;
      cache.timestamp = now;
      cache.loading = false;
      setUsers(data);
      setUsersLoading(false);
      return data;
    } catch (error) {
      cache.loading = false;
      setUsersLoading(false);
      throw error;
    }
  }, []);

  const loadCanonicalFields = useCallback(async (force = false) => {
    const cache = cacheRef.current.canonical;
    const now = Date.now();
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) return cache.data;
    if (cache.loading) return cache.data;
    
    cache.loading = true;
    setCanonicalLoading(true);
    try {
      console.log('═══════════════════════════════════════');
      console.log('CANONICAL_SOURCE: APIContext.loadCanonicalFields');
      console.log('═══════════════════════════════════════');
      
      const response = await fetchCanonicalFields();
      const data = Array.isArray(response) ? response : [];
      
      console.log('APIContext - RESPONSE LENGTH:', data.length);
      console.log('APIContext - RESPONSE (first 10):', data.slice(0, 10));
      
      // Check test fields
      const partnerTier = data.find(f => f.fieldName?.toLowerCase() === 'partnertier');
      const customerSegment = data.find(f => f.fieldName?.toLowerCase() === 'customersegment');
      const errorField = data.find(f => f.fieldName?.toLowerCase() === 'error');
      
      console.log('TEST FIELDS IN APIContext:');
      console.log('  - partnerTier:', partnerTier);
      console.log('  - customerSegment:', customerSegment);
      console.log('  - error:', errorField);
      console.log('ALL FIELD NAMES:', data.map(f => f.fieldName));
      
      cache.data = data;
      cache.timestamp = now;
      cache.loading = false;
      setCanonicalFields(data);
      setCanonicalLoading(false);
      return data;
    } catch (error) {
      cache.loading = false;
      setCanonicalLoading(false);
      throw error;
    }
  }, []);

  const loadInboundAdapters = useCallback(async (username, force = false) => {
    const cache = getScopedCache("inboundAdapters", username);
    const now = Date.now();
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) return cache.data;
    if (cache.loading) return cache.data;
    
    cache.loading = true;
    try {
      const response = await listInboundAdapters(username);
      const data = Array.isArray(response) ? response : response?.data || [];
      cache.data = data;
      cache.timestamp = now;
      cache.loading = false;
      return data;
    } catch (error) {
      cache.loading = false;
      throw error;
    }
  }, []);

  const loadOutboundAdapters = useCallback(async (username, force = false) => {
    const cache = getScopedCache("outboundAdapters", username);
    const now = Date.now();
    if (!force && cache.data && (now - cache.timestamp) < CACHE_DURATION) return cache.data;
    if (cache.loading) return cache.data;
    
    cache.loading = true;
    try {
      const response = await listOutboundAdapters(username);
      const data = Array.isArray(response) ? response : response?.data || [];
      cache.data = data;
      cache.timestamp = now;
      cache.loading = false;
      return data;
    } catch (error) {
      cache.loading = false;
      throw error;
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = {
      users: { data: null, loading: false, timestamp: 0 },
      canonical: { data: null, loading: false, timestamp: 0 },
      inboundAdapters: new Map(),
      outboundAdapters: new Map(),
    };
    setUsers([]);
    setCanonicalFields([]);
  }, []);

  const clearAdapterCacheForUser = useCallback((username) => {
    const key = String(username || "__all__");
    const inboundBucket = cacheRef.current.inboundAdapters;
    const outboundBucket = cacheRef.current.outboundAdapters;
    if (inboundBucket instanceof Map) inboundBucket.delete(key);
    if (outboundBucket instanceof Map) outboundBucket.delete(key);
  }, []);

  useEffect(() => {
    loadUsers();
    loadCanonicalFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const value = {
    users, usersLoading, loadUsers,
    canonicalFields, canonicalLoading, loadCanonicalFields,
    loadInboundAdapters, loadOutboundAdapters, clearCache, clearAdapterCacheForUser,
  };

  return <APIContext.Provider value={value}>{children}</APIContext.Provider>;
}

export function useAPI() {
  const context = useContext(APIContext);
  if (!context) throw new Error('useAPI must be used within APIProvider');
  return context;
}
