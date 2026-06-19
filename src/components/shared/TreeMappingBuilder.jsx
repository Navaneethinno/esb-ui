import { useState, useMemo } from "react";
import CanonicalFieldSelect from "./CanonicalFieldSelect";

/**
 * TreeMappingBuilder - Hierarchical schema explorer for mapping nested JSON structures
 * 
 * Features:
 * - Tree-based visualization of nested objects and arrays
 * - Expand/collapse functionality
 * - Icons for different node types (object, array, primitive)
 * - Mapping dropdowns only on leaf nodes
 * - Search/filter capability
 * - Auto-match support for leaf nodes only
 * - Mobile responsive
 */

// Parse JSON and build tree structure
function buildTree(schema, parentPath = "") {
  if (!schema || typeof schema !== "object") return [];

  const nodes = [];

  if (Array.isArray(schema)) {
    // Array - check first element
    if (schema.length > 0 && typeof schema[0] === "object" && !Array.isArray(schema[0])) {
      return buildTree(schema[0], `${parentPath}[]`);
    }
    return [{ path: `${parentPath}[]`, name: "[]", type: "array-primitive", isLeaf: true, children: [] }];
  }

  // Object
  for (const [key, value] of Object.entries(schema)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    
    if (value === null || value === undefined) {
      // Leaf node
      nodes.push({ path: currentPath, name: key, type: "primitive", isLeaf: true, children: [] });
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        // Empty array - treat as leaf
        nodes.push({ path: `${currentPath}[]`, name: key, type: "array-primitive", isLeaf: true, children: [] });
      } else if (typeof value[0] === "object" && !Array.isArray(value[0])) {
        // Array of objects - branch node
        const children = buildTree(value[0], `${currentPath}[]`);
        nodes.push({ path: `${currentPath}[]`, name: key, type: "array", isLeaf: false, children });
      } else {
        // Array of primitives - leaf
        nodes.push({ path: `${currentPath}[]`, name: key, type: "array-primitive", isLeaf: true, children: [] });
      }
    } else if (typeof value === "object") {
      // Nested object - branch node
      const children = buildTree(value, currentPath);
      nodes.push({ path: currentPath, name: key, type: "object", isLeaf: false, children });
    } else {
      // Primitive - leaf node
      nodes.push({ path: currentPath, name: key, type: "primitive", isLeaf: true, children: [] });
    }
  }

  return nodes;
}

function normalizePipelineStep(step = {}) {
  const type = String(step?.type || "FUNCTION").toUpperCase();
  if (type === "CONDITION") {
    return {
      type: "CONDITION",
      operator: step?.operator || "==",
      compareValue: step?.compareValue ?? "",
      ifTrue: step?.ifTrue ?? "",
      ifFalse: step?.ifFalse ?? "",
    };
  }
  if (type === "STATIC") {
    return {
      type: "STATIC",
      value: step?.value ?? "",
    };
  }
  return {
    type: "FUNCTION",
    function: step?.function || "ABS",
  };
}

function normalizeMappingValue(mapping) {
  if (!mapping) {
    return { targetField: "", pipeline: [] };
  }
  if (typeof mapping === "string") {
    return { targetField: mapping, pipeline: [] };
  }
  if (typeof mapping === "object") {
    const targetField = String(mapping.targetField || mapping.target || mapping.field || "").trim();
    const pipeline = Array.isArray(mapping.pipeline) ? mapping.pipeline.map(normalizePipelineStep) : [];
    return { targetField, pipeline };
  }
  return { targetField: String(mapping), pipeline: [] };
}

function MappingPipelineEditor({ value, onChange, canonicalFields = [] }) {
  const mapping = normalizeMappingValue(value);

  const update = (next) => onChange?.(next);

  const updateTargetField = (targetField) => {
    update({ ...mapping, targetField });
  };

  const updateStep = (index, patch) => {
    const nextPipeline = mapping.pipeline.map((step, stepIndex) => (
      stepIndex === index ? normalizePipelineStep({ ...step, ...patch }) : step
    ));
    update({ ...mapping, pipeline: nextPipeline });
  };

  const addStep = () => {
    update({ ...mapping, pipeline: [...mapping.pipeline, { type: "FUNCTION", function: "ABS" }] });
  };

  const removeStep = (index) => {
    update({ ...mapping, pipeline: mapping.pipeline.filter((_, stepIndex) => stepIndex !== index) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <CanonicalFieldSelect
        value={mapping.targetField}
        onChange={updateTargetField}
        canonicalFields={canonicalFields}
        placeholder="-- Select target field --"
      />

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--panel-soft)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <strong style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
            Transformation Steps
          </strong>
          <button
            type="button"
            onClick={addStep}
            style={{
              fontSize: 11,
              padding: "5px 10px",
              border: "1px solid var(--primary)",
              borderRadius: 6,
              background: "var(--primary-soft)",
              color: "var(--primary)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            <i className="ti ti-plus" /> Add Step
          </button>
        </div>

        {mapping.pipeline.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Add steps such as FUNCTION, CONDITION, or STATIC. No steps means a direct mapping.
          </div>
        )}

        {mapping.pipeline.map((step, index) => {
          const normalized = normalizePipelineStep(step);
          return (
            <div key={index} style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--panel)",
              padding: 10,
              display: "grid",
              gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: 12, color: "var(--heading)" }}>Step {index + 1}</strong>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Remove
                </button>
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Type</label>
                <select
                  value={normalized.type}
                  onChange={(e) => updateStep(index, { type: e.target.value })}
                >
                  <option value="FUNCTION">FUNCTION</option>
                  <option value="CONDITION">CONDITION</option>
                  <option value="STATIC">STATIC</option>
                </select>
              </div>

              {normalized.type === "FUNCTION" && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Function</label>
                  <select
                    value={normalized.function}
                    onChange={(e) => updateStep(index, { function: e.target.value })}
                  >
                    <option value="ABS">ABS</option>
                    <option value="ROUND">ROUND</option>
                    <option value="TRIM">TRIM</option>
                    <option value="UPPER">UPPER</option>
                    <option value="LOWER">LOWER</option>
                  </select>
                </div>
              )}

              {normalized.type === "STATIC" && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Value</label>
                  <input
                    type="text"
                    value={normalized.value}
                    onChange={(e) => updateStep(index, { value: e.target.value })}
                    placeholder="Static output value"
                  />
                </div>
              )}

              {normalized.type === "CONDITION" && (
                <>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Operator</label>
                    <select
                      value={normalized.operator}
                      onChange={(e) => updateStep(index, { operator: e.target.value })}
                    >
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value=">">{">"}</option>
                      <option value=">=">{">="}</option>
                      <option value="<">{"<"}</option>
                      <option value="<=">{"<="}</option>
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Compare Value</label>
                    <input
                      type="text"
                      value={normalized.compareValue}
                      onChange={(e) => updateStep(index, { compareValue: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>If True</label>
                    <input
                      type="text"
                      value={normalized.ifTrue}
                      onChange={(e) => updateStep(index, { ifTrue: e.target.value })}
                      placeholder="CREDIT"
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>If False</label>
                    <input
                      type="text"
                      value={normalized.ifFalse}
                      onChange={(e) => updateStep(index, { ifFalse: e.target.value })}
                      placeholder="DEBIT"
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tree Node Component
function TreeNode({ node, depth, expandedNodes, toggleNode, mappings, onMapChange, canonicalFields, searchTerm, onFieldCreated }) {
  const isExpanded = expandedNodes.has(node.path);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 20;
  const mapping = normalizeMappingValue(mappings[node.path]);
  
  // Filter logic
  const matchesSearch = !searchTerm || 
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.path.toLowerCase().includes(searchTerm.toLowerCase());

  const childrenMatchSearch = node.children?.some(child => 
    child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!matchesSearch && !childrenMatchSearch) return null;

  const icon = node.type === "object" ? "ti-folder" :
               node.type === "array" ? "ti-stack" :
               "ti-circle";

  const typeColor = node.type === "object" ? "#7c3aed" :
                    node.type === "array" ? "#f59e0b" :
                    "#6b7280";

  return (
    <div style={{ width: "100%" }}>
      <div 
        style={{ 
          display: "grid",
          gridTemplateColumns: node.isLeaf ? "1fr 280px" : "1fr",
          gap: 12,
          alignItems: "center",
          padding: "8px 12px",
          paddingLeft: indent + 12,
          borderBottom: "1px solid var(--border)",
          background: isExpanded && hasChildren ? "var(--panel-soft)" : "transparent",
          transition: "background 0.12s"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleNode(node.path)}
              style={{
                width: 20,
                height: 20,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
                fontSize: 14,
                flexShrink: 0
              }}
            >
              <i className={`ti ${isExpanded ? "ti-chevron-down" : "ti-chevron-right"}`} />
            </button>
          )}
          {!hasChildren && <span style={{ width: 20, flexShrink: 0 }} />}
          
          <i className={`ti ${icon}`} style={{ color: typeColor, fontSize: 16, flexShrink: 0 }} />
          
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <strong style={{ 
                fontSize: 13, 
                fontWeight: 600, 
                color: node.isLeaf && !mappings[node.path] ? "#dc2626" : "var(--heading)",
                fontFamily: "ui-monospace, monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {node.name}
              </strong>
              {node.isLeaf && !mappings[node.path] && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#dc2626",
                  background: "rgba(220, 38, 38, 0.1)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  flexShrink: 0
                }}>
                  REQUIRED
                </span>
              )}
            </div>
            {depth > 0 && (
              <span style={{ 
                fontSize: 10, 
                color: "var(--muted)", 
                fontFamily: "ui-monospace, monospace",
                marginTop: 2
              }}>
                {node.path}
              </span>
            )}
          </div>

          {node.type === "array" && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.1)",
              padding: "2px 6px",
              borderRadius: 4,
              marginLeft: 8,
              flexShrink: 0
            }}>
              ARRAY
            </span>
          )}
        </div>

        {node.isLeaf && (
          <MappingPipelineEditor
            value={mapping}
            onChange={(value) => onMapChange(node.path, value)}
            canonicalFields={canonicalFields}
            onFieldCreated={onFieldCreated}
          />
        )}
      </div>

      {hasChildren && isExpanded && node.children.map((child, idx) => (
        <TreeNode
          key={child.path || idx}
          node={child}
          depth={depth + 1}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
          mappings={mappings}
          onMapChange={onMapChange}
          canonicalFields={canonicalFields}
          searchTerm={searchTerm}
          onFieldCreated={onFieldCreated}
        />
      ))}
    </div>
  );
}

// Main Component
export default function TreeMappingBuilder({ 
  payload, 
  mappings, 
  onMappingsChange, 
  canonicalFields = [],
  label = "Schema Explorer",
  onAutoMatch,
  onCanonicalFieldsRefresh
}) {
  console.log('TREE_MAPPING_RECEIVED', {
    partnerTier: canonicalFields.some(f => String(f.fieldName || f.name || '').toLowerCase() === 'partnertier'),
    customerSegment: canonicalFields.some(f => String(f.fieldName || f.name || '').toLowerCase() === 'customersegment'),
    error: canonicalFields.some(f => String(f.fieldName || f.name || '').toLowerCase() === 'error'),
  });
  
  console.log('═══════════════════════════════════════');
  console.log('CANONICAL_SOURCE: TreeMappingBuilder');
  console.log('RECEIVED canonicalFields LENGTH:', canonicalFields.length);
  console.log('ALL FIELD NAMES:', canonicalFields.map(f => f.fieldName || f.name));
  
  // Check test fields
  const partnerTier = canonicalFields.find(f => (f.fieldName || f.name || '').toLowerCase() === 'partnertier');
  const customerSegment = canonicalFields.find(f => (f.fieldName || f.name || '').toLowerCase() === 'customersegment');
  const errorField = canonicalFields.find(f => (f.fieldName || f.name || '').toLowerCase() === 'error');
  
  console.log('TEST FIELDS IN TreeMappingBuilder:');
  console.log('  - partnerTier:', partnerTier);
  console.log('  - customerSegment:', customerSegment);
  console.log('  - error:', errorField);
  console.log('═══════════════════════════════════════');
  
  const [expandedNodes, setExpandedNodes] = useState(new Set(["root"]));
  const [searchTerm, setSearchTerm] = useState("");

  const tree = useMemo(() => {
    if (!payload || !payload.trim()) return [];
    try {
      const parsed = JSON.parse(payload);
      return buildTree(parsed);
    } catch {
      return [];
    }
  }, [payload]);

  const toggleNode = (path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleMapChange = (path, canonicalField) => {
    const updated = { ...mappings };
    if (canonicalField) {
      updated[path] = canonicalField;
    } else {
      delete updated[path];
    }
    onMappingsChange?.(updated);
  };

  const handleFieldCreated = (newField) => {
    onCanonicalFieldsRefresh?.(newField);
  };

  const expandAll = () => {
    const allPaths = new Set();
    const collectPaths = (nodes) => {
      nodes.forEach(node => {
        if (node.children?.length > 0) {
          allPaths.add(node.path);
          collectPaths(node.children);
        }
      });
    };
    collectPaths(tree);
    setExpandedNodes(allPaths);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const leafCount = useMemo(() => {
    let count = 0;
    const countLeaves = (nodes) => {
      nodes.forEach(node => {
        if (node.isLeaf) count++;
        else if (node.children) countLeaves(node.children);
      });
    };
    countLeaves(tree);
    return count;
  }, [tree]);

  const mappedCount = Object.keys(mappings).length;

  if (tree.length === 0) {
    return (
      <div style={{
        padding: "32px 20px",
        textAlign: "center",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--panel-soft)",
        color: "var(--muted)"
      }}>
        <i className="ti ti-json" style={{ fontSize: 32, opacity: 0.4, display: "block", marginBottom: 8 }} />
        <p style={{ margin: 0, fontSize: 13 }}>Paste valid JSON to see the schema tree</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--panel)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--panel-soft)",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <strong style={{ fontSize: 12, fontWeight: 700, color: "var(--heading)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <i className="ti ti-file-type-json" /> {label}
          </strong>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>
            {mappedCount} / {leafCount} mapped
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: 180,
              fontSize: 12,
              padding: "5px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--panel)",
              color: "var(--heading)"
            }}
          />
          <button
            type="button"
            onClick={expandAll}
            style={{
              fontSize: 11,
              padding: "5px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            <i className="ti ti-arrows-maximize" /> Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            style={{
              fontSize: 11,
              padding: "5px 10px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            <i className="ti ti-arrows-minimize" /> Collapse All
          </button>
          {onAutoMatch && (
            <button
              type="button"
              onClick={onAutoMatch}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                border: "1px solid var(--primary)",
                borderRadius: 6,
                background: "var(--primary-soft)",
                color: "var(--primary)",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              <i className="ti ti-sparkles" /> Auto Match
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div style={{ 
        maxHeight: 500, 
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "var(--border) transparent"
      }}>
        {tree.map((node, idx) => (
          <TreeNode
            key={node.path || idx}
            node={node}
            depth={0}
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
            mappings={mappings}
            onMapChange={handleMapChange}
            canonicalFields={canonicalFields}
            searchTerm={searchTerm}
            onFieldCreated={handleFieldCreated}
          />
        ))}
      </div>
    </div>
    </>
  );
}
