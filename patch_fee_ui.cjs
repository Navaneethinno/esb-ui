const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// ── 1. BLANK_FEE: replace outputMode/outputField/totalField with includeFee/feeFieldName ──
c = c.replace(
  "BLANK_FEE  = { fnType: 'fee',  fnName: 'txnFee',      baseAmountField: '', outputMode: 'new', outputField: 'Fee', totalField: 'TotalAmount', amountType: 'FLAT', startAmount: '', endAmount: '', calcType: 'FIXED', feeValue: '', hasMinCap: false, minCap: '', hasMaxCap: false, maxCap: '' };",
  "BLANK_FEE  = { fnType: 'fee',  fnName: 'txnFee',      baseAmountField: '', outputMode: 'new', includeFee: true, feeFieldName: 'Fee', amountType: 'FLAT', startAmount: '', endAmount: '', calcType: 'FIXED', feeValue: '', hasMinCap: false, minCap: '', hasMaxCap: false, maxCap: '' };"
);

// ── 2. commit(): remove outputMode-based outputField derivation, just spread draft ──
c = c.replace(
  `    // overwrite mode: total replaces the base field; fee goes to a separate output_field
    const outputField = draft.fnType === 'fee' && draft.outputMode === 'overwrite'
      ? (draft.outputField?.trim() || 'Fee')
      : draft.outputField?.trim();
    onChange([...feeRules, { ...draft, fnName: draft.fnName.trim(), outputField }]);`,
  `    onChange([...feeRules, { ...draft, fnName: draft.fnName.trim() }]);`
);

// ── 3. formatFunctionSummary fee line: use feeFieldName instead of outputField ──
c = c.replace(
  "      return `${tag} ${name} | In: ${fr.baseAmountField}${tier} ${calc}${caps ? ' ' + caps : ''} -> Out: ${fr.outputField}`;",
  "      const feeOut = fr.includeFee !== false ? (fr.feeFieldName || fr.outputField || 'Fee') : 'no fee field';\n      return `${tag} ${name} | In: ${fr.baseAmountField}${tier} ${calc}${caps ? ' ' + caps : ''} -> Out: ${feeOut}`;"
);

// ── 4. save() feeGroups builder: use new simplified fields ──
c = c.replace(
  `          // overwrite mode: total_field = baseAmountField (total overwrites the input),
            // output_field = separate fee field (never the base amount field)
            const isOverwrite = fr.outputMode === "overwrite";
            feeGroups[key] = {
              type:              "CALC_FEE",
              base_amount_field: fr.baseAmountField,
              output_field:      fr.outputField || "Fee",
              total_field:       isOverwrite ? fr.baseAmountField : (fr.totalField || "TotalAmount"),
              feeRules: [],
            };`,
  `            const isOverwrite = fr.outputMode === "overwrite";
            feeGroups[key] = {
              type:              "CALC_FEE",
              base_amount_field: fr.baseAmountField,
              output_field:      fr.includeFee !== false ? (fr.feeFieldName || "Fee") : null,
              total_field:       isOverwrite ? fr.baseAmountField : "TotalAmount",
              feeRules: [],
            };`
);

// ── 5. UI: replace the entire Output Destination block with includeFee toggle + feeFieldName input ──
const oldDestination = `                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Output Destination</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ val: 'overwrite', label: 'Overwrite input field' }, { val: 'new', label: 'Write to new field' }].map(opt => (
                        <button key={opt.val} type="button"
                          onClick={() => { setD('outputMode', opt.val); if (opt.val === 'overwrite') setD('outputField', draft.baseAmountField); }}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: draft.outputMode === opt.val ? '1px solid var(--primary)' : '1px solid var(--border)', background: draft.outputMode === opt.val ? 'var(--primary-soft)' : 'var(--panel-soft)', color: draft.outputMode === opt.val ? 'var(--primary)' : 'var(--muted)' }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {draft.outputMode === 'overwrite' && (
                      <input type="text" value={draft.baseAmountField} disabled
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--muted)', background: 'var(--panel-soft)', fontSize: 13, outline: 'none', cursor: 'not-allowed' }} />
                    )}
                    {draft.outputMode === 'new' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <Field label="Output Field"><input type="text" value={draft.outputField} placeholder="Fee" onChange={e => setD('outputField', e.target.value)} /></Field>
                        <Field label="Total Field"><input type="text" value={draft.totalField} placeholder="TotalAmount" onChange={e => setD('totalField', e.target.value)} /></Field>
                      </div>
                    )}
                  </div>`;

const newDestination = `                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ToggleSwitch
                      value={draft.includeFee !== false}
                      onChange={v => setD('includeFee', v)}
                      label="Add FEE field to outbound payload?"
                    />
                    {draft.includeFee !== false && (
                      <Field label="Fee Field Name">
                        <input type="text" value={draft.feeFieldName ?? 'Fee'} placeholder="Fee"
                          onChange={e => setD('feeFieldName', e.target.value)} />
                      </Field>
                    )}
                  </div>`;

const count = c.split(oldDestination).length - 1;
console.log('destination block occurrences:', count);
if (count !== 1) { console.error('ERROR: need exactly 1'); process.exit(1); }
c = c.replace(oldDestination, newDestination);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('All patches applied');
