// ERROR FIELD DIAGNOSTIC TEST
// Run this in the browser console after the page loads

console.log("=== ERROR FIELD DIAGNOSTIC TEST ===");

// Test 1: Check if error exists in API response
fetch('/api/canonical/fields')
  .then(res => res.json())
  .then(data => {
    console.log("TEST 1: Raw API Response");
    console.log("Full response:", data);
    
    const fields = Array.isArray(data) ? data : (data?.fields || data?.data || data?.items || []);
    console.log("Extracted fields:", fields);
    
    const errorField = fields.find(f => {
      const name = typeof f === 'string' ? f : (f.fieldName || f.referenceId || f.name || f.field_name || '');
      return name.toLowerCase() === 'error';
    });
    
    console.log("ERROR field in API response:", errorField);
    console.log("All field names:", fields.map(f => {
      if (typeof f === 'string') return f;
      return f.fieldName || f.referenceId || f.name || f.field_name || '[unnamed]';
    }));
    
    if (!errorField) {
      console.error("❌ FAILURE POINT: 'error' field not returned by API");
      console.log("Backend may not be returning the field, or field is named differently");
    } else {
      console.log("✅ PASS: 'error' field exists in API response");
      console.log("ERROR field structure:", errorField);
      
      // Test 2: Check the exact property names
      console.log("\nTEST 2: Property Analysis");
      console.log("Has 'fieldName' property:", 'fieldName' in errorField);
      console.log("Has 'displayName' property:", 'displayName' in errorField);
      console.log("Has 'referenceId' property:", 'referenceId' in errorField);
      console.log("Has 'name' property:", 'name' in errorField);
      
      // Test 3: Simulate unwrapFields logic
      console.log("\nTEST 3: Simulated unwrapFields");
      const simulated = {
        ...errorField,
        fieldName: errorField.fieldName || errorField.referenceId || errorField.fieldId || errorField.code || errorField.name || "",
        displayName: errorField.displayName || errorField.name || errorField.fieldName || errorField.referenceId || errorField.fieldId || errorField.code || "",
      };
      console.log("After mapping:", simulated);
      console.log("fieldName:", simulated.fieldName);
      console.log("displayName:", simulated.displayName);
      
      const wouldPassFilter = !!(simulated.fieldName && simulated.displayName);
      console.log("Would pass filter (fieldName && displayName):", wouldPassFilter);
      
      if (!wouldPassFilter) {
        console.error("❌ FAILURE POINT: 'error' field would be filtered out in unwrapFields()");
        console.log("Reason: fieldName or displayName is empty");
        console.log("fieldName is truthy:", !!simulated.fieldName);
        console.log("displayName is truthy:", !!simulated.displayName);
      } else {
        console.log("✅ PASS: 'error' field would survive unwrapFields filter");
      }
    }
  })
  .catch(err => {
    console.error("❌ API Request Failed:", err);
  });

// Test 4: Check React component state (if Redux is used)
setTimeout(() => {
  console.log("\n=== TEST 4: Component State Check ===");
  console.log("Note: Open React DevTools to inspect component props");
  console.log("Look for:");
  console.log("- ManageFunctionsPage component");
  console.log("- TreeMappingBuilder component");
  console.log("- CanonicalFieldSelect component");
  console.log("Check their 'canonicalFields' prop/state");
}, 2000);

// Test 5: Check DOM
setTimeout(() => {
  console.log("\n=== TEST 5: DOM Check ===");
  const selects = document.querySelectorAll('select');
  console.log(`Found ${selects.length} select elements`);
  
  selects.forEach((select, idx) => {
    const options = Array.from(select.options);
    const hasError = options.some(opt => opt.value.toLowerCase() === 'error' || opt.textContent.toLowerCase().includes('error'));
    console.log(`Select #${idx}: Has 'error' option:`, hasError);
    if (hasError) {
      console.log(`  Found at index:`, options.findIndex(opt => opt.value.toLowerCase() === 'error' || opt.textContent.toLowerCase().includes('error')));
    }
    console.log(`  Total options:`, options.length);
    console.log(`  First 10 option values:`, options.slice(0, 10).map(o => o.value));
  });
}, 3000);

console.log("\n⏳ Tests running... Check logs above after 3 seconds");
