# ANALYTICS VALIDATION CHECKLIST

## Quick Reference for Frontend Analytics Validation

---

## FOR EACH ADAPTER:

### ☐ WaterBill
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

### ☐ Dummy_outbound
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

### ☐ Customer Onboarding Gateway
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

### ☐ TANAI OB COREBANK
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

### ☐ Auto Mapping Inbound 1781483061357
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

### ☐ Auto Mapping Outbound 1781483061357
- [ ] Network: GET /api/adapter-analytics/{id} → Status: ____
- [ ] API: totalExecutions = ____
- [ ] API: requestTypeVolume.length = ____
- [ ] API: matchedAuditRows = ____
- [ ] UI: Total Executions shows ____
- [ ] UI: Request Type Chart: [ ] Rendered [ ] Empty State [ ] Missing
- [ ] PASS / FAIL: ____
- [ ] Issues: ____________________

---

## BUG DETECTION CRITERIA

Only report as BUG if:

### ❌ Type 1: API has data BUT UI shows empty
```
API totalExecutions > 0
UI shows "No execution history available"
```

### ❌ Type 2: API has data BUT chart missing
```
API requestTypeVolume = [{...}]
UI chart area is blank
```

### ❌ Type 3: Values don't match
```
API totalExecutions = 25
UI displays totalExecutions = 12
```

### ❌ Type 4: Infinite loading on error
```
API returns 404
UI stuck in shimmer state (no error message)
```

---

## SCREENSHOTS CHECKLIST

- [ ] Adapter with executions (showing data)
- [ ] Adapter with zero executions (showing zero state)
- [ ] No infinite shimmer (error state with buttons)
- [ ] Network tab (successful request)
- [ ] Console logs (debug output)

---

## OVERALL RESULT

```
PASS: [ ]  All adapters validated, no mismatches
FAIL: [ ]  Found ____ issues across ____ adapters
```

---

## EVIDENCE REQUIRED

For EACH failure, provide:

1. **Adapter Name:** ____________
2. **API Response Snippet:**
   ```json
   {
     "summary": {
       "totalExecutions": ____
     },
     "charts": {
       "requestTypeVolume": ____
     }
   }
   ```
3. **UI Screenshot:** (attach)
4. **Specific Mismatch:** ____________

---

## NO FIXES - EVIDENCE ONLY

This is a validation task. Do NOT:
- Modify backend code
- Modify frontend code
- Attempt to fix issues

Only:
- Capture evidence
- Report mismatches
- Document findings
