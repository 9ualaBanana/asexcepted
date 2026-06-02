/**
 * Simple sliding-window limiter (per server instance / edge region).
 * For strict global limits under high traffic, swap to Redis / Vercel KV / Upstash.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 20_000;

function pruneKeysIfNeeded() {
  if (buckets.size <= MAX_KEYS) return;
  const keys = [...buckets.keys()];
  const drop = Math.ceil(keys.length / 2);
  for (let i = 0; i < drop; i += 1) {
    buckets.delete(keys[i]!);
  }
}

export function allowRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  pruneKeysIfNeeded();
  const prev = buckets.get(key) ?? [];
  const windowStart = now - windowMs;
  const hits = prev.filter((t) => t > windowStart);
  if (hits.length >= maxHits) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
