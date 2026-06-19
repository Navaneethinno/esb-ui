const fs = require('fs');
const content = fs.readFileSync('src/components/AdapterRegistry.jsx', 'utf8');

const old = '                          </td>\r\n                        </tr>\r\n                      );\r\n                    })}\r\n                  </tbody>';

const fnTd = `                          <td style={{ position: 'relative' }}>
                            {functionEntries.length === 0 ? (
                              <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>
                            ) : (
                              <details>
                                <summary style={{
                                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                  color: 'var(--primary)', listStyle: 'none',
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  userSelect: 'none',
                                }}>
                                  <i className="ti ti-function" style={{ fontSize: 11 }} />
                                  {functionEntries.length} fn{functionEntries.length !== 1 ? 's' : ''}
                                  <i className="ti ti-chevron-down" style={{ fontSize: 9, opacity: 0.6 }} />
                                </summary>
                                <div style={{
                                  position: 'absolute', left: 0, zIndex: 50, marginTop: 4,
                                  display: 'flex', flexDirection: 'column', gap: 6,
                                  background: 'var(--panel)', padding: '10px 12px',
                                  borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                  border: '1px solid var(--border)',
                                  minWidth: 220, maxHeight: 200, overflowY: 'auto',
                                }}>
                                  {functionEntries.map(([fnName, fnDef]) => (
                                    <div key={fnName} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: 8, fontSize: 11 }}>
                                      <div style={{ fontWeight: 700, color: 'var(--heading)' }}>
                                        {fnName}{' '}
                                        <span style={{ fontWeight: 400, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>({fnDef.type || '-'})</span>
                                      </div>
                                      {fnDef.base_amount_field && (
                                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                          In: <span style={{ color: 'var(--text)' }}>{fnDef.base_amount_field}</span>
                                          {' -> '}
                                          Out: <span style={{ color: 'var(--text)' }}>{fnDef.output_field || '-'}</span>
                                        </div>
                                      )}
                                      {!fnDef.base_amount_field && fnDef.output_field && (
                                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                                          Out: <span style={{ color: 'var(--text)' }}>{fnDef.output_field}</span>
                                          {fnDef.format && <span style={{ marginLeft: 4, opacity: 0.7 }}>({fnDef.format})</span>}
                                        </div>
                                      )}
                                      {fnDef.total_field && fnDef.total_field !== 'TotalAmount' && (
                                        <div style={{ fontSize: 10, color: '#d97706', marginTop: 1 }}>
                                          * Total overwrites {fnDef.total_field}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </td>`;

const replacement = '                          </td>\r\n' + fnTd + '\r\n                        </tr>\r\n                      );\r\n                    })}\r\n                  </tbody>';

const count = content.split(old).length - 1;
console.log('occurrences:', count);

if (count !== 1) {
  console.error('ERROR: need exactly 1');
  process.exit(1);
}

fs.writeFileSync('src/components/AdapterRegistry.jsx', content.replace(old, replacement), 'utf8');
console.log('Done');
