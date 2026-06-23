function getByPath(source, path) {
  if (!source || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((value, key) => (value == null ? value : value[key]), source);
}

export function normalizeSearchText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  if (Array.isArray(value)) return value.map(normalizeSearchText).join(" ").trim();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value).toLowerCase();
    } catch {
      return "";
    }
  }
  return String(value).toLowerCase();
}

export function getSearchFields(columns = [], searchColumn = "all") {
  if (searchColumn && searchColumn !== "all") {
    const selected = columns.find((column) => String(column.field) === String(searchColumn));
    if (!selected) return [];
    return (selected.searchFields && selected.searchFields.length > 0)
      ? selected.searchFields
      : [selected.field];
  }

  return columns.flatMap((column) => {
    if (Array.isArray(column.searchFields) && column.searchFields.length > 0) {
      return column.searchFields;
    }
    return column.field ? [column.field] : [];
  });
}

export function filterRowsBySearch(rows = [], query = "", searchColumn = "all", columns = []) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return Array.isArray(rows) ? rows : [];

  const fields = getSearchFields(columns, searchColumn);
  if (fields.length === 0) return Array.isArray(rows) ? rows : [];

  return (Array.isArray(rows) ? rows : []).filter((row) =>
    fields.some((field) => normalizeSearchText(getByPath(row, field)).includes(normalizedQuery))
  );
}

export function paginateRows(rows = [], currentPage = 1, pageSize = 10) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safePage = Math.max(1, Number(currentPage) || 1);
  const start = (safePage - 1) * safePageSize;
  return (Array.isArray(rows) ? rows : []).slice(start, start + safePageSize);
}

export function buildColumnSearchOptions(columns = [], allLabel = "All Columns") {
  return [
    { value: "all", label: allLabel },
    ...columns
      .filter((column) => column.field)
      .map((column) => ({
        value: column.field,
        label: column.searchLabel || column.label || column.field,
      })),
  ];
}
