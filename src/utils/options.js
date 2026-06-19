export function getOptionValue(item) {
  if (item == null) {
    return "";
  }

  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return String(item);
  }

  if (typeof item !== "object") {
    return String(item);
  }

  const candidates = [
    item.requestType,
    item.code,
    item.id,
    item.value,
    item.displayName,
    item.name,
    item.label,
    item.description,
  ];

  for (const candidate of candidates) {
    const value = getOptionValue(candidate);
    if (value && value !== "[object Object]") {
      return value;
    }
  }

  return "";
}

export function normaliseOptions(data) {
  const list = Array.isArray(data)
    ? data
    : data?.formats || data?.subtypes || data?.data || data?.items || data?.results || [];

  const result = [...new Set(list.map(getOptionValue).filter(Boolean))];
  console.log('[normaliseOptions] input:', data, '→ output:', result);
  return result;
}
