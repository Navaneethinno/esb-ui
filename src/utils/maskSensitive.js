const SENSITIVE_FIELDS = new Set([
  "PAN",
  "CVV",
  "PIN",
  "PINBLOCK",
  "TRACK2DATA",
  "AUTHTOKEN",
  "CORRELATIONID",
  "REQUESTID",
  "MAPPINGID",
  "ADAPTERID",
  "OUTBOUNDADAPTERID",
  "UUID",
]);

const MASK_PREFIX_CHARS = 4;
const MASK_SUFFIX_CHARS = 4;

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export function isSensitiveFieldName(name) {
  return SENSITIVE_FIELDS.has(normalizeKey(name));
}

function maskString(value) {
  const str = String(value ?? "");
  if (!str) return str;
  if (str.length <= MASK_SUFFIX_CHARS) return "*".repeat(str.length);
  return `${"*".repeat(Math.max(str.length - MASK_SUFFIX_CHARS, MASK_PREFIX_CHARS))}${str.slice(-MASK_SUFFIX_CHARS)}`;
}

function maskPanLikeString(value) {
  const str = String(value ?? "");
  const digits = str.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return null;
  if (!/^[\d\s-]+$/.test(str)) return null;
  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

function maskShortSecret(value) {
  const str = String(value ?? "");
  if (!/^\d{3,6}$/.test(str)) return null;
  return "*".repeat(str.length);
}

export function maskSensitiveValue(value, fieldName) {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveValue(item, fieldName));
  }

  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (isSensitiveFieldName(key)) {
        return [key, "[redacted]"];
      }
      if (isSensitiveFieldName(key)) {
        return [key, maskSensitiveValue(item, key)];
      }
      return [key, maskSensitiveValue(item, key)];
    }));
  }

  if (fieldName && isSensitiveFieldName(fieldName)) {
    return maskString(value);
  }

  const panLike = maskPanLikeString(value);
  if (panLike) return panLike;

  const shortSecret = maskShortSecret(value);
  if (shortSecret) return shortSecret;

  return value;
}

export function maskSensitiveText(text) {
  if (text == null) return text;
  const str = String(text);
  return isSensitiveFieldName(str) ? maskString(str) : str;
}

export function safeStringifyMasked(value, space = 2) {
  return JSON.stringify(maskSensitiveValue(value), null, space);
}

export function safeDisplayValue(value, fieldName) {
  const masked = maskSensitiveValue(value, fieldName);
  if (masked == null) return "—";
  if (typeof masked === "object") return safeStringifyMasked(masked);
  return String(masked);
}
