$content = [System.IO.File]::ReadAllText('src\components\AdapterRegistry.jsx')
$lf = [char]10

# The anchor is the SECOND occurrence of this pattern (first is Fields td, second is Enrichment Fields td)
$marker = 'fontSize: 12 }}>-</span>}'
$idx1 = $content.IndexOf($marker)
$idx2 = $content.IndexOf($marker, $idx1 + 1)
Write-Host "first=$idx1 second=$idx2"

# Build the full anchor starting at idx2
$anchor = $marker + $lf + '                            </div>' + $lf + '                          </td>' + $lf + '                        </tr>' + $lf + '                      );' + $lf + '                    })}' + $lf + '                  </tbody>'

# Verify it matches at idx2
$actual = $content.Substring($idx2, $anchor.Length)
if ($actual -ne $anchor) {
    Write-Host "Mismatch! actual bytes:"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($actual.Substring(0, [Math]::Min(50, $actual.Length)))
    ($bytes | ForEach-Object { '{0:X2}' -f $_ }) -join ' '
    exit 1
}

$fnCell = '                          <td style={{ position: "relative" }}>' + $lf +
'                            {functionEntries.length === 0 ? (' + $lf +
'                              <span style={{ color: "var(--muted)", fontSize: 12 }}>-</span>' + $lf +
'                            ) : (' + $lf +
'                              <details>' + $lf +
'                                <summary style={{' + $lf +
'                                  cursor: "pointer", fontSize: 11, fontWeight: 600,' + $lf +
'                                  color: "var(--primary)", listStyle: "none",' + $lf +
'                                  display: "inline-flex", alignItems: "center", gap: 4,' + $lf +
'                                  userSelect: "none",' + $lf +
'                                }}>' + $lf +
'                                  <i className="ti ti-function" style={{ fontSize: 11 }} />' + $lf +
'                                  {functionEntries.length} fn{functionEntries.length !== 1 ? "s" : ""}' + $lf +
'                                  <i className="ti ti-chevron-down" style={{ fontSize: 9, opacity: 0.6 }} />' + $lf +
'                                </summary>' + $lf +
'                                <div style={{' + $lf +
'                                  position: "absolute", left: 0, zIndex: 50, marginTop: 4,' + $lf +
'                                  display: "flex", flexDirection: "column", gap: 6,' + $lf +
'                                  background: "var(--panel)", padding: "10px 12px",' + $lf +
'                                  borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.18)",' + $lf +
'                                  border: "1px solid var(--border)",' + $lf +
'                                  minWidth: 220, maxHeight: 200, overflowY: "auto",' + $lf +
'                                }}>' + $lf +
'                                  {functionEntries.map(([fnName, fnDef]) => (' + $lf +
'                                    <div key={fnName} style={{ borderLeft: "2px solid var(--primary)", paddingLeft: 8, fontSize: 11 }}>' + $lf +
'                                      <div style={{ fontWeight: 700, color: "var(--heading)" }}>' + $lf +
'                                        {fnName}{" "}' + $lf +
'                                        <span style={{ fontWeight: 400, color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>({fnDef.type || "-"})</span>' + $lf +
'                                      </div>' + $lf +
'                                      {fnDef.base_amount_field && (' + $lf +
'                                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>' + $lf +
'                                          In: <span style={{ color: "var(--text)" }}>{fnDef.base_amount_field}</span>' + $lf +
'                                          {" -> "}' + $lf +
'                                          Out: <span style={{ color: "var(--text)" }}>{fnDef.output_field || "-"}</span>' + $lf +
'                                        </div>' + $lf +
'                                      )}' + $lf +
'                                      {!fnDef.base_amount_field && fnDef.output_field && (' + $lf +
'                                        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>' + $lf +
'                                          Out: <span style={{ color: "var(--text)" }}>{fnDef.output_field}</span>' + $lf +
'                                          {fnDef.format && <span style={{ marginLeft: 4, opacity: 0.7 }}>({fnDef.format})</span>}' + $lf +
'                                        </div>' + $lf +
'                                      )}' + $lf +
'                                      {fnDef.total_field && fnDef.total_field !== "TotalAmount" && (' + $lf +
'                                        <div style={{ fontSize: 10, color: "#d97706", marginTop: 1 }}>' + $lf +
'                                          * Total overwrites {fnDef.total_field}' + $lf +
'                                        </div>' + $lf +
'                                      )}' + $lf +
'                                    </div>' + $lf +
'                                  ))}' + $lf +
'                                </div>' + $lf +
'                              </details>' + $lf +
'                            )}' + $lf +
'                          </td>'

$replacement = $marker + $lf + '                            </div>' + $lf + '                          </td>' + $lf + $fnCell + $lf + '                        </tr>' + $lf + '                      );' + $lf + '                    })}' + $lf + '                  </tbody>'

$content = $content.Substring(0, $idx2) + $replacement + $content.Substring($idx2 + $anchor.Length)
[System.IO.File]::WriteAllText('src\components\AdapterRegistry.jsx', $content)
Write-Host "Patched successfully"
