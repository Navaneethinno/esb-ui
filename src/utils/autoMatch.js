/**
 * Calculates similarity between two strings using Dice's coefficient
 * Returns a percentage (0-100)
 */
function stringSimilarity(str1, str2) {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  
  if (a === b) return 100;
  if (a.length < 2 || b.length < 2) return 0;

  const firstBigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
    firstBigrams.set(bigram, count);
  }

  let intersectionSize = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;
    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return Math.round((2.0 * intersectionSize) / (a.length + b.length - 2) * 100);
}

/**
 * Normalizes field names for better matching
 * Converts camelCase, snake_case, kebab-case to lowercase with spaces
 */
function normalizeFieldName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")  // camelCase
    .replace(/[_-]/g, " ")                 // snake_case, kebab-case
    .toLowerCase()
    .trim();
}

/**
 * Finds the best canonical field match for a source field
 */
export function findBestMatch(sourceKey, canonicalFields) {
  const normalizedSource = normalizeFieldName(sourceKey);
  let bestMatch = null;
  let bestScore = 0;

  for (const field of canonicalFields) {
    const canonicalName = field.displayName || field.name || field.referenceId || "";
    if (!canonicalName) continue;

    const normalizedCanonical = normalizeFieldName(canonicalName);
    const score = stringSimilarity(normalizedSource, normalizedCanonical);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { field, score };
    }
  }

  return bestMatch;
}

/**
 * Auto-matches source keys to canonical fields
 * Returns array of { sourceKey, canonicalKey, confidence }
 * Only includes matches above the threshold (default 50%)
 */
export function autoMatchFields(sourceKeys, canonicalFields, threshold = 50) {
  const matches = [];
  
  for (const sourceKey of sourceKeys) {
    if (!sourceKey?.trim()) continue;

    const match = findBestMatch(sourceKey, canonicalFields);
    if (match && match.score >= threshold) {
      const canonicalName = match.field.displayName || match.field.name || match.field.referenceId || "";
      matches.push({
        sourceKey: sourceKey.trim(),
        canonicalKey: canonicalName,
        confidence: match.score,
      });
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}
