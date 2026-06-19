const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
const results = {};

// ── 1. BLANK_FEE: add totalMode + totalCustomName, keep includeFee/feeFieldName, drop outputMode ──
const old1 = "BLANK_FEE  = { fnType: 'fee',  fnName: 'txnFee',      baseAmountField: '', outputMode: 'new', includeFee: true, feeFieldName: 'Fee', amountType: 'FLAT', startAmount: '', endAmount: '', calcType: 'FIXED', feeValue: '', hasMinCap: false, minCap: '', hasMaxCap: false, maxCap: '' };";
const new1 = "BLANK_FEE  = { fnType: 'fee',  fnName: 'txnFee',      baseAmountField: '', totalMode: 'overwrite', totalCustomName: '', includeFee: true, feeFieldName: 'Fee', amountType: 'FLAT', startAmount: '', endAmount: '', calcType: 'FIXED', feeValue: '', hasMinCap: false, minCap: '', hasMaxCap: false, maxCap: '' };";
results[1] = c.includes(old1);
c = c.replace(old1, new1);

// ── 2. UI destination block: replace ToggleSwitch-only block with Block A + Block B ──
const old2 = `                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

const new2 = `                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Amount Destination</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ val: 'overwrite', label: 'Overwrite original field' }, { val: 'new', label: 'Write to new field' }].map(opt => (
                          <button key={opt.val} type="button"
                            onClick={() => setD('totalMode', opt.val)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: (draft.totalMode || 'overwrite') === opt.val ? '1px solid var(--primary)' : '1px solid var(--border)', background: (draft.totalMode || 'overwrite') === opt.val ? 'var(--primary-soft)' : 'var(--panel-soft)', color: (draft.totalMode || 'overwrite') === opt.val ? 'var(--primary)' : 'var(--muted)' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {(draft.totalMode || 'overwrite') === 'overwrite' && (
                        <input type="text" value={draft.baseAmountField} disabled
                          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--muted)', background: 'var(--panel-soft)', fontSize: 13, outline: 'none', cursor: 'not-allowed' }} />
                      )}
                      {(draft.totalMode || 'overwrite') === 'new' && (
                        <Field label="Total Field Name">
                          <input type="text" value={draft.totalCustomName ?? ''} placeholder="e.g. Amt_new"
                            onChange={e => setD('totalCustomName', e.target.value)} />
                        </Field>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fee Amount Destination</label>
                      <ToggleSwitch
                        value={draft.includeFee !== false}
                        onChange={v => setD('includeFee', v)}
                        label="Add separate FEE field to outbound payload?"
                      />
                      {draft.includeFee !== false && (
                        <Field label="Fee Field Name">
                          <input type="text" value={draft.feeFieldName ?? 'Fee'} placeholder="Fee"
                            onChange={e => setD('feeFieldName', e.target.value)} />
                        </Field>
                      )}
                    </div>
                  </div>`;

results[2] = c.includes(old2);
c = c.replace(old2, new2);

// ── 3. save() feeGroups builder ──
const old3 = `              const isOverwrite = fr.outputMode === "overwrite";
            feeGroups[key] = {
              type:              "CALC_FEE",
              base_amount_field: fr.baseAmountField,
              output_field:      fr.includeFee !== false ? (fr.feeFieldName || "Fee") : null,
              total_field:       isOverwrite ? fr.baseAmountField : "TotalAmount",
              feeRules: [],
            };`;
const new3 = `            const totalTarget = (fr.totalMode || 'overwrite') === 'overwrite'
              ? fr.baseAmountField
              : (fr.totalCustomName || 'TotalAmount');
            const feeTarget = fr.includeFee !== false ? (fr.feeFieldName || 'Fee') : null;
            feeGroups[key] = {
              type:              "CALC_FEE",
              base_amount_field: fr.baseAmountField,
              output_field:      feeTarget,
              total_field:       totalTarget,
              feeRules: [],
            };`;
results[3] = c.includes(old3);
c = c.replace(old3, new3);

// ── 4. formatFunctionSummary fee return line ──
const old4 = "      const feeOut = fr.includeFee !== false ? (fr.feeFieldName || fr.outputField || 'Fee') : 'no fee field';\n      return `${tag} ${name} | In: ${fr.baseAmountField}${tier} ${calc}${caps ? ' ' + caps : ''} -> Out: ${feeOut}`;";
const new4 = "      const totalDest = (fr.totalMode || 'overwrite') === 'overwrite' ? fr.baseAmountField : (fr.totalCustomName || 'TotalAmount');\n      const feeDest = fr.includeFee !== false ? (fr.feeFieldName || 'Fee') : null;\n      return `${tag} ${name} | In: ${fr.baseAmountField}${tier} ${calc}${caps ? ' ' + caps : ''} -> Total: ${totalDest}${feeDest ? ` | Fee: ${feeDest}` : ''}`;";
results[4] = c.includes(old4);
c = c.replace(old4, new4);

console.log('Match results:', results);
const allFound = Object.values(results).every(Boolean);
if (!allFound) { console.error('ERROR: one or more patterns not found'); process.exit(1); }

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('All patches applied');
