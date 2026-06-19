# Protocol Distribution Chart Verification Guide

## Quick Verification Steps

### 1. Open the Application
```bash
npm run dev
```

Navigate to: **Summary Dashboard**

---

### 2. Open Browser Console
**Chrome/Edge:** Press `F12` or `Ctrl+Shift+I`  
**Firefox:** Press `F12`  
**Safari:** Press `Cmd+Option+I`

---

### 3. Check Console Output

You should see logs like this:

```
[PROTOCOL AUDIT] Raw adapters: Array(17) [{...}, {...}, ...]

[PROTOCOL AUDIT] Adapter CBS001: {
  format_type: "XML",
  formatType: "XML",
  type: undefined,
  protocol: undefined,
  format: "XML",
  resolved: "XML",
  direction: "Inbound",
  status: "Active"
}

[PROTOCOL AUDIT] Adapter MOBILE_GATEWAY: {
  format_type: "JSON",
  formatType: "JSON",
  type: "JSON",
  protocol: undefined,
  format: "JSON",
  resolved: "JSON",
  direction: "Inbound",
  status: "Active"
}

... (15 more adapters)

[PROTOCOL AUDIT] Grouped counts: {
  JSON: 8,
  XML: 5,
  ISO8583: 3,
  HTTP: 1
}

[PROTOCOL AUDIT] Total adapters counted: 17
```

---

### 4. Verify KPI Card

**Location:** Top row of Dashboard  
**Card Title:** "Configured Adapters"  
**Expected Value:** **17**

![KPI Card Screenshot]
┌─────────────────────────┐
│ 🖥️  Configured Adapters │
│                         │
│         17              │
│                         │
└─────────────────────────┘

---

### 5. Verify Protocol Distribution Chart

**Location:** Middle section of Dashboard  
**Widget Title:** "Protocol Distribution"

#### 5.1 Check Center Display
```
┌─────────────┐
│     17      │
│  Adapters   │
└─────────────┘
```

#### 5.2 Check Legend

All formats should be listed (including zeros):

```
● JSON      47.1%
● XML       29.4%
● ISO8583   17.6%
● HTTP       5.9%
○ ISO20022   0%     (muted/greyed out)
○ CSV        0%     (muted/greyed out)
○ HTTPS      0%     (muted/greyed out)
○ TCP        0%     (muted/greyed out)
```

**Note:** Zero-count formats appear with reduced opacity (0.35)

#### 5.3 Check Pie Chart

Segments should be visible for:
- JSON (largest slice)
- XML (second largest)
- ISO8583 (third)
- HTTP (smallest)

No segments for zero-count formats (ISO20022, CSV, HTTPS, TCP)

---

### 6. Verify Math

**Formula:** `(count / total) * 100`

| Format | Count | Percentage | Calculation |
|--------|-------|------------|-------------|
| JSON | 8 | 47.1% | (8/17) × 100 = 47.06% |
| XML | 5 | 29.4% | (5/17) × 100 = 29.41% |
| ISO8583 | 3 | 17.6% | (3/17) × 100 = 17.65% |
| HTTP | 1 | 5.9% | (1/17) × 100 = 5.88% |
| **TOTAL** | **17** | **100%** | **17/17** |

**Sum Check:** 47.1% + 29.4% + 17.6% + 5.9% = **100%** ✅

---

### 7. Check for Issues

#### ❌ If totals don't match:

1. **Console shows < 17 adapters:**
   - Check if adapters are being filtered out
   - Look for console warnings: `[PROTOCOL AUDIT] Skipping adapter with unsupported format: ...`
   - Verify backend is returning `format_type` field

2. **Chart shows > 17 adapters:**
   - Duplicate adapters in backend response
   - Check for caching issues (clear browser cache)

3. **Percentages don't add to 100%:**
   - Check console `Grouped counts` - should sum to 17
   - Verify no adapters are counted twice

#### ❌ If FIXED or UNKNOWN categories appear:

The fix should prevent this, but if you see them:
```javascript
// Check SUPPORTED_FORMATS includes only allowed formats
const SUPPORTED_FORMATS = ["JSON", "XML", "ISO8583", "ISO20022", "CSV", "HTTP", "HTTPS", "TCP"];
```

---

### 8. Test with Different Data

#### Scenario A: All JSON Adapters
**Expected:**
- JSON: 17 (100%)
- All others: 0%

#### Scenario B: Mixed Distribution
**Expected:**
- Total always equals Configured Adapters KPI
- All formats shown in legend
- Percentages sum to 100%

---

### 9. Validation Checklist

- [ ] Console logs show all 17 adapters
- [ ] `Grouped counts` sums to 17
- [ ] KPI Card shows **17**
- [ ] Chart center shows **17 Adapters**
- [ ] Legend includes all 8 formats
- [ ] Zero-count formats are muted/greyed
- [ ] Percentages sum to **100%**
- [ ] No FIXED category
- [ ] No UNKNOWN category
- [ ] No errors in console

---

## Expected Console Output Template

Copy this and compare with your actual console output:

```
============================================
PROTOCOL DISTRIBUTION VALIDATION
============================================

Raw Adapter Count: 17
Console Grouped Total: 17
Chart Display Total: 17
KPI Card Value: 17

Format Breakdown:
  JSON:     X adapters (XX.X%)
  XML:      X adapters (XX.X%)
  ISO8583:  X adapters (XX.X%)
  ISO20022: X adapters (XX.X%)
  CSV:      X adapters (XX.X%)
  HTTP:     X adapters (XX.X%)
  HTTPS:    X adapters (XX.X%)
  TCP:      X adapters (XX.X%)
  ────────────────────────────
  TOTAL:    17 adapters (100%)

✅ ALL TOTALS MATCH: PASS
============================================
```

---

## Troubleshooting

### Issue: "formatType is undefined"

**Solution:** Backend must return `format_type` or one of these fields:
- `format_type` (preferred)
- `formatType`
- `type`
- `protocol`
- `format`

### Issue: "Adapters missing from chart"

**Solution:** Check console for:
```
[PROTOCOL AUDIT] Skipping adapter with unsupported format: CUSTOM_FORMAT
```

Add format to `SUPPORTED_FORMATS` or fix backend data.

### Issue: "Percentages don't sum to 100%"

**Solution:** Check for:
1. Floating point rounding errors (expected ±0.1%)
2. Duplicate adapters in raw data
3. Adapters counted in multiple categories

---

## Success Criteria

### ✅ PASS when ALL THREE match:

1. **Console:** `Total adapters counted: 17`
2. **Chart:** Center label shows `17 Adapters`
3. **KPI:** Top card shows `17`

### ✅ Additional PASS criteria:

4. Percentages sum to 100% (±0.1% tolerance)
5. All 8 formats visible in legend
6. Zero-count formats muted
7. No FIXED or UNKNOWN categories
8. No console errors

---

## Report Template

If you find issues, use this template:

```
PROTOCOL DISTRIBUTION ISSUE REPORT
===================================

Date: [DATE]
User: [USERNAME]
Environment: [DEV/STAGING/PROD]

ISSUE DESCRIPTION:
------------------
[Describe the discrepancy]

CONSOLE OUTPUT:
---------------
[Paste console logs here]

EXPECTED vs ACTUAL:
-------------------
Expected Total: 17
Actual Total: [ACTUAL]

Expected Breakdown: {...}
Actual Breakdown: {...}

SCREENSHOTS:
------------
[Attach screenshots of chart and KPI]

STEPS TO REPRODUCE:
-------------------
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

---

## Quick Test Script

Run this in browser console after page load:

```javascript
// Quick validation script
const verifyProtocolDistribution = () => {
  console.group('🔍 Protocol Distribution Validation');
  
  const kpiCard = document.querySelector('.kpi-card--success .kpi-value');
  const chartCenter = document.querySelector('.protocol-donut-center strong');
  
  const kpiValue = kpiCard ? parseInt(kpiCard.textContent) : 'NOT FOUND';
  const chartValue = chartCenter ? parseInt(chartCenter.textContent) : 'NOT FOUND';
  
  console.log('KPI Card Value:', kpiValue);
  console.log('Chart Center Value:', chartValue);
  console.log('Match:', kpiValue === chartValue ? '✅ PASS' : '❌ FAIL');
  
  console.groupEnd();
};

verifyProtocolDistribution();
```

---

## Contact

If validation fails, provide:
1. Console logs
2. Screenshots of chart and KPI
3. Backend API response (mask sensitive data)
4. Browser/OS version

**Status:** Ready for verification ✅
