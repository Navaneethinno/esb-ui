// ============================================================================
// LINKED ROUTES DIAGNOSTIC CONSOLE SCRIPT
// ============================================================================
// Copy and paste this entire script into your browser console (F12)
// while viewing the Dashboard page
// ============================================================================

console.clear();
console.log('%c🔍 LINKED ROUTES DIAGNOSTIC SCRIPT', 'font-size: 16px; font-weight: bold; color: #4f46e5');
console.log('%c━'.repeat(60), 'color: #94a3b8');

// ============================================================================
// SECTION 1: Capture Network Request Data
// ============================================================================
console.log('\n%c📡 SECTION 1: Network Request Analysis', 'font-size: 14px; font-weight: bold; color: #0ea5e9');

// Intercept fetch requests
const originalFetch = window.fetch;
window.linkedRoutesData = {
  apiResponse: null,
  requestUrl: null,
  timestamp: null
};

window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = args[0];
  
  // Capture audit logs or recent logs API calls
  if (url.includes('/audit-logs') || url.includes('/logs/recent')) {
    const clonedResponse = response.clone();
    clonedResponse.json().then(data => {
      window.linkedRoutesData.apiResponse = data;
      window.linkedRoutesData.requestUrl = url;
      window.linkedRoutesData.timestamp = new Date().toISOString();
      
      console.log(`✅ Captured API response from: ${url}`);
      console.log(`📊 Response contains ${Array.isArray(data) ? data.length : 'N/A'} records`);
      console.log('💾 Data stored in window.linkedRoutesData');
    });
  }
  
  return response;
};

console.log('✅ Network interceptor installed');
console.log('⏳ Waiting for API calls... (refresh page if needed)');

// ============================================================================
// SECTION 2: Analyze Current UI State
// ============================================================================
console.log('\n%c🎨 SECTION 2: Current UI State Analysis', 'font-size: 14px; font-weight: bold; color: #0ea5e9');

function analyzeLinkedRoutesUI() {
  const routeCards = document.querySelectorAll('.active-route-card');
  
  console.log(`\n📌 UI Route Cards Found: ${routeCards.length}`);
  
  if (routeCards.length === 0) {
    console.warn('⚠️  No route cards found in DOM');
    return [];
  }
  
  const routeData = [];
  
  routeCards.forEach((card, index) => {
    const mappingName = card.querySelector('.active-route-card__head strong')?.textContent.trim();
    const subtitle = card.querySelector('.active-route-card__head span')?.textContent.trim();
    const inboundName = card.querySelectorAll('.active-route-node strong')[0]?.textContent.trim();
    const inboundType = card.querySelectorAll('.active-route-node span')[0]?.textContent.trim();
    const outboundName = card.querySelectorAll('.active-route-node strong')[2]?.textContent.trim();
    const outboundType = card.querySelectorAll('.active-route-node span')[2]?.textContent.trim();
    
    const route = {
      index,
      mappingName,
      subtitle,
      inboundName,
      inboundType,
      outboundName,
      outboundType,
      // Check for corruption
      hasCorruption: [mappingName, subtitle, inboundName, inboundType, outboundName, outboundType]
        .some(text => text && (text.includes('â€') || text.includes('Ã') || text.includes('Â'))),
    };
    
    routeData.push(route);
    
    console.log(`\n📍 Route ${index + 1}:`);
    console.log(`   Mapping: ${mappingName}`);
    console.log(`   Subtitle: ${subtitle}`);
    console.log(`   Inbound: ${inboundName} (${inboundType})`);
    console.log(`   Outbound: ${outboundName} (${outboundType})`);
    
    if (route.hasCorruption) {
      console.warn(`   ⚠️  CORRUPTION DETECTED in this route!`);
    }
  });
  
  return routeData;
}

const currentUIRoutes = analyzeLinkedRoutesUI();
window.linkedRoutesData.uiRoutes = currentUIRoutes;

// ============================================================================
// SECTION 3: Character Encoding Analysis
// ============================================================================
console.log('\n%c🔤 SECTION 3: Character Encoding Analysis', 'font-size: 14px; font-weight: bold; color: #0ea5e9');

function analyzeEncoding(text, label) {
  if (!text) return;
  
  console.log(`\n📝 Analyzing: ${label}`);
  console.log(`   Text: "${text}"`);
  console.log(`   Length: ${text.length} chars`);
  
  const charCodes = [...text].map(c => ({
    char: c,
    dec: c.charCodeAt(0),
    hex: c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'),
    unicode: `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
  }));
  
  console.table(charCodes);
  
  // Check for common corruption patterns
  const corruptionPatterns = [
    { pattern: /â€/, name: 'UTF-8 → Latin-1 double encoding' },
    { pattern: /Ã/, name: 'Latin-1 → UTF-8 misinterpretation' },
    { pattern: /â†'/, name: 'Corrupted arrow (→)' },
    { pattern: /â€"/, name: 'Corrupted en-dash (–)' },
    { pattern: /â€˜/, name: 'Corrupted right single quotation mark' },
  ];
  
  corruptionPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(text)) {
      console.warn(`   ⚠️  ${name} detected!`);
    }
  });
}

// Analyze corrupted routes
currentUIRoutes.forEach(route => {
  if (route.hasCorruption) {
    console.log(`\n🔍 Analyzing corrupted route: ${route.mappingName}`);
    analyzeEncoding(route.mappingName, 'Mapping Name');
    analyzeEncoding(route.subtitle, 'Subtitle');
    analyzeEncoding(route.inboundType, 'Inbound Type');
    analyzeEncoding(route.outboundType, 'Outbound Type');
  }
});

// ============================================================================
// SECTION 4: Export Functions
// ============================================================================
console.log('\n%c📤 SECTION 4: Export Functions Available', 'font-size: 14px; font-weight: bold; color: #0ea5e9');

window.exportLinkedRoutesReport = function() {
  console.log('\n%c📋 GENERATING DIAGNOSTIC REPORT', 'font-size: 14px; font-weight: bold; color: #10b981');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      apiResponseCount: Array.isArray(window.linkedRoutesData.apiResponse) 
        ? window.linkedRoutesData.apiResponse.length 
        : 'Not captured yet',
      uiRouteCount: window.linkedRoutesData.uiRoutes?.length || 0,
      corruptedRouteCount: window.linkedRoutesData.uiRoutes?.filter(r => r.hasCorruption).length || 0,
    },
    apiResponse: window.linkedRoutesData.apiResponse,
    uiRoutes: window.linkedRoutesData.uiRoutes,
    networkInfo: {
      url: window.linkedRoutesData.requestUrl,
      capturedAt: window.linkedRoutesData.timestamp,
    }
  };
  
  console.log('\n📊 DIAGNOSTIC REPORT:');
  console.log(JSON.stringify(report, null, 2));
  
  // Copy to clipboard
  navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    .then(() => console.log('✅ Report copied to clipboard!'))
    .catch(err => console.error('❌ Failed to copy:', err));
  
  return report;
};

window.findCBSCore = function() {
  console.log('\n%c🔍 SEARCHING FOR CBS_CORE', 'font-size: 14px; font-weight: bold; color: #f59e0b');
  
  const apiData = window.linkedRoutesData.apiResponse;
  if (!apiData) {
    console.warn('⚠️  API data not captured yet. Refresh page and wait.');
    return;
  }
  
  const cbsRoutes = Array.isArray(apiData) 
    ? apiData.filter(row => {
        const text = JSON.stringify(row).toUpperCase();
        return text.includes('CBS_CORE') || text.includes('CBS CORE');
      })
    : [];
  
  console.log(`\n📍 Found ${cbsRoutes.length} CBS_CORE entries in API response:`);
  cbsRoutes.forEach((route, i) => {
    console.log(`\n${i + 1}.`, route);
  });
  
  return cbsRoutes;
};

window.findBalanceInquiry = function() {
  console.log('\n%c🔍 SEARCHING FOR BALANCE_INQUIRY', 'font-size: 14px; font-weight: bold; color: #f59e0b');
  
  const apiData = window.linkedRoutesData.apiResponse;
  if (!apiData) {
    console.warn('⚠️  API data not captured yet. Refresh page and wait.');
    return;
  }
  
  const balanceRoutes = Array.isArray(apiData)
    ? apiData.filter(row => {
        const text = JSON.stringify(row).toUpperCase();
        return text.includes('BALANCE_INQUIRY') || text.includes('BALANCE INQUIRY');
      })
    : [];
  
  console.log(`\n📍 Found ${balanceRoutes.length} BALANCE_INQUIRY entries in API response:`);
  balanceRoutes.forEach((route, i) => {
    console.log(`\n${i + 1}.`, route);
    
    // Check encoding of specific fields
    const mappingName = route.mapping_name || route.mappingName;
    const inboundType = route.inbound_request_type || route.inboundRequestType;
    const outboundType = route.outbound_request_type || route.outboundRequestType;
    
    if (mappingName) analyzeEncoding(mappingName, 'mapping_name');
    if (inboundType) analyzeEncoding(inboundType, 'inbound_request_type');
    if (outboundType) analyzeEncoding(outboundType, 'outbound_request_type');
  });
  
  return balanceRoutes;
};

// ============================================================================
// INSTRUCTIONS
// ============================================================================
console.log('\n%c📖 USAGE INSTRUCTIONS', 'font-size: 14px; font-weight: bold; color: #8b5cf6');
console.log('%c━'.repeat(60), 'color: #94a3b8');
console.log(`
1. If page is already loaded, refresh it to capture API data
2. Wait for "✅ Captured API response" message
3. Run these commands:

   🔍 Find CBS_CORE routes:
   window.findCBSCore()

   🔍 Find BALANCE_INQUIRY routes:
   window.findBalanceInquiry()

   📋 Export full diagnostic report:
   window.exportLinkedRoutesReport()

4. The report will be copied to your clipboard
5. Paste into LINKED_ROUTES_DIAGNOSTIC.md

`);
console.log('%c━'.repeat(60), 'color: #94a3b8');
console.log('%c✅ Diagnostic script loaded successfully!', 'font-size: 14px; font-weight: bold; color: #10b981');
