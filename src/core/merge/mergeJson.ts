type Json = Record<string, unknown>;

function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merges `source` into `target`, returning a new object.
 *
 * Objects merge recursively, arrays concatenate with duplicates removed
 * (so two modules both adding an Expo plugin produce one entry), and scalars
 * are overwritten by the later value. Key order is preserved from target-first,
 * which keeps generated package.json diffs stable.
 */
export function mergeJson(target: Json, source: Json): Json {
  const result: Json = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = result[key];

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = mergeJson(targetValue, sourceValue);
    } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      result[key] = dedupe([...targetValue, ...sourceValue]);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

/** Removes duplicates, comparing objects structurally. */
function dedupe(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of items) {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : `${typeof item}:${String(item)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Returns a copy with keys in alphabetical order, recursively. */
export function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeys) as unknown as T;
  if (!isPlainObject(value)) return value;

  const sorted: Json = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted as unknown as T;
}
