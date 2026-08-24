interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

const MAX_WINDOW_MS = 86_400_000;

function cleanup(key: string, windowMs: number, now: number) {
  const bucket = buckets.get(key);
  if (!bucket) return;
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length === 0) {
    buckets.delete(key);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < MAX_WINDOW_MS);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}, 60_000);

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  cleanup(key, windowMs, now);

  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { timestamps: [now] });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  bucket.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}
