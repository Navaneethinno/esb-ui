/**
 * FRONTEND ANALYTICS VALIDATION TASK
 * 
 * Run this script in the browser console while viewing the Adapter Details page.
 * It will capture network requests and validate UI rendering against API responses.
 */

const TEST_ADAPTERS = [
  'WaterBill',
  'Dummy_outbound',
  'Customer Onboarding Gateway',
  'TANAI OB COREBANK',
  'Auto Mapping Inbound 1781483061357',
  'Auto Mapping Outbound 1781483061357'
];

const validationResults = [];

async function captureAdapterAnalytics(adapterId, adapterName) {
  console.log(`\n========================================`);
  console.log(`VALIDATING: ${adapterName} (ID: ${adapterId})`);
  console.log(`========================================`);

  try {
    // Step 1: Network Request
    const requestUrl = `/api/adapter-analytics/${adapterId}`;
    console.log(`\nSTEP 1 - Network Request:`);
    console.log(`URL: ${requestUrl}`);

    const response = await fetch(requestUrl);
    const responseStatus = response.status;
    console.log(`Status: ${responseStatus}`);

    if (responseStatus !== 200) {
      validationResults.push({
        adapter: adapterName,
        adapterId,
        requestUrl,
        responseStatus,
        pass: false,
        issue: `HTTP ${responseStatus}`
      });
      return;
    }

    // Step 2: Response Validation
    const apiData = await response.json();
    console.log(`\nSTEP 2 - Response Validation:`);
    console.log('Raw API Response:', JSON.stringify(apiData, null, 2));

    const summary = apiData?.summary || {};
    const charts = apiData?.charts || {};
    const debug = apiData?.debug || {};

    const apiMetrics = {
      totalExecutions: summary.totalExecutions || 0,
      successRate: summary.successRate || 0,
      requestTypeVolume: charts.requestTypeVolume || [],
      latencyTrend: charts.latencyTrend || [],
      matchedAuditRows: debug.matchedAuditRows || debug.auditRowCount || null
    };

    console.log('\nExtracted API Metrics:');
    console.log(`  summary.totalExecutions: ${apiMetrics.totalExecutions}`);
    console.log(`  summary.successRate: ${apiMetrics.successRate}`);
    console.log(`  charts.requestTypeVolume:`, apiMetrics.requestTypeVolume);
    console.log(`  charts.latencyTrend:`, apiMetrics.latencyTrend);
    console.log(`  debug.matchedAuditRows: ${apiMetrics.matchedAuditRows}`);

    // Step 3: UI Rendering Validation
    console.log(`\nSTEP 3 - UI Rendering Validation:`);
    
    // Wait a moment for UI to potentially update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Try to find UI elements
    const totalExecutionsElement = document.querySelector('[data-metric="totalExecutions"], [class*="Total Executions"]');
    const successRateElement = document.querySelector('[data-metric="successRate"], [class*="Success Rate"]');
    const requestTypeChart = document.querySelector('[class*="Request Type Volume"]');
    const latencyChart = document.querySelector('[class*="Latency Trend"]');

    const uiMetrics = {
      totalExecutionsDisplayed: totalExecutionsElement?.textContent?.trim() || 'NOT FOUND',
      successRateDisplayed: successRateElement?.textContent?.trim() || 'NOT FOUND',
      requestTypeChartRendered: requestTypeChart ? 'RENDERED' : 'NOT RENDERED',
      latencyChartRendered: latencyChart ? 'RENDERED' : 'NOT RENDERED'
    };

    console.log('UI Status:');
    console.log(`  Total Executions Displayed: ${uiMetrics.totalExecutionsDisplayed}`);
    console.log(`  Success Rate Displayed: ${uiMetrics.successRateDisplayed}`);
    console.log(`  Request Type Chart: ${uiMetrics.requestTypeChartRendered}`);
    console.log(`  Latency Chart: ${uiMetrics.latencyChartRendered}`);

    // Step 4: Identify Mismatches
    console.log(`\nSTEP 4 - Mismatch Detection:`);
    
    const issues = [];

    // Check if API has data but UI shows empty
    if (apiMetrics.totalExecutions > 0 && uiMetrics.totalExecutionsDisplayed === 'NOT FOUND') {
      issues.push('API has totalExecutions but UI element not found');
    }

    if (apiMetrics.requestTypeVolume.length > 0 && uiMetrics.requestTypeChartRendered === 'NOT RENDERED') {
      issues.push('API has requestTypeVolume data but chart not rendered');
    }

    if (apiMetrics.latencyTrend.length > 0 && uiMetrics.latencyChartRendered === 'NOT RENDERED') {
      issues.push('API has latencyTrend data but chart not rendered');
    }

    if (issues.length > 0) {
      console.log('⚠️  ISSUES FOUND:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ No mismatches detected');
    }

    // Store results
    validationResults.push({
      adapter: adapterName,
      adapterId,
      requestUrl,
      responseStatus,
      api: apiMetrics,
      ui: uiMetrics,
      issues,
      pass: issues.length === 0
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    validationResults.push({
      adapter: adapterName,
      adapterId,
      requestUrl: `/api/adapter-analytics/${adapterId}`,
      responseStatus: 'ERROR',
      error: error.message,
      pass: false
    });
  }
}

async function generateFinalReport() {
  console.log('\n\n');
  console.log('========================================');
  console.log('FINAL VALIDATION REPORT');
  console.log('========================================\n');

  let allPassed = true;

  validationResults.forEach((result, index) => {
    console.log(`\n[${index + 1}] ${result.adapter}`);
    console.log('─'.repeat(50));
    console.log(`Adapter ID: ${result.adapterId}`);
    console.log(`Request URL: ${result.requestUrl}`);
    console.log(`Response Status: ${result.responseStatus}`);
    
    if (result.api) {
      console.log('\nAPI Metrics:');
      console.log(`  Total Executions: ${result.api.totalExecutions}`);
      console.log(`  Success Rate: ${result.api.successRate}%`);
      console.log(`  Request Type Count: ${result.api.requestTypeVolume.length} types`);
      console.log(`  Matched Audit Rows: ${result.api.matchedAuditRows || 'N/A'}`);
      
      console.log('\nUI Status:');
      console.log(`  Total Executions: ${result.ui.totalExecutionsDisplayed}`);
      console.log(`  Request Type Chart: ${result.ui.requestTypeChartRendered}`);
      
      if (result.issues && result.issues.length > 0) {
        console.log('\n⚠️  ISSUES:');
        result.issues.forEach(issue => console.log(`  - ${issue}`));
        allPassed = false;
      } else {
        console.log('\n✅ PASS');
      }
    } else {
      console.log(`\n❌ FAIL: ${result.error || result.issue}`);
      allPassed = false;
    }
  });

  console.log('\n\n========================================');
  console.log(`OVERALL RESULT: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('========================================\n');

  // Return structured report
  return {
    overall: allPassed ? 'PASS' : 'FAIL',
    results: validationResults,
    timestamp: new Date().toISOString()
  };
}

// Main execution - requires adapter IDs to be provided
async function runValidation(adaptersMap) {
  console.log('Starting Frontend Analytics Validation...\n');
  console.log('Adapters to test:', Object.keys(adaptersMap));

  for (const [adapterName, adapterId] of Object.entries(adaptersMap)) {
    await captureAdapterAnalytics(adapterId, adapterName);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }

  return generateFinalReport();
}

// Export for manual execution
window.runAnalyticsValidation = runValidation;

console.log('\n========================================');
console.log('ANALYTICS VALIDATION TOOL LOADED');
console.log('========================================');
console.log('\nTo run validation, execute:');
console.log('\nwindow.runAnalyticsValidation({');
console.log('  "WaterBill": "<adapter-id>",');
console.log('  "Dummy_outbound": "<adapter-id>",');
console.log('  // ... add all adapter IDs');
console.log('});');
console.log('\nExample:');
console.log('window.runAnalyticsValidation({');
console.log('  "WaterBill": "123",');
console.log('  "Dummy_outbound": "456"');
console.log('});');
