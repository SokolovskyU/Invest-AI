export function grpcCall<TReq, TRes>(
  fn: (req: TReq, metadata: any, cb: (err: any, res: TRes) => void) => void,
  req: TReq,
  metadata: any
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    fn(req, metadata, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const current = idx++;
      try {
        results[current] = await fn(items[current]);
      } catch {
        // keep server alive on per-item failures
        results[current] = undefined as unknown as R;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getRateLimitResetMs(err: any): number | null {
  try {
    const values = err?.metadata?.get?.("x-ratelimit-reset");
    if (Array.isArray(values) && values.length) {
      const seconds = Number(values[0]);
      if (Number.isFinite(seconds)) return Math.max(0, seconds) * 1000;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function grpcCallWithRetry<TReq, TRes>(
  fn: (req: TReq, metadata: any, cb: (err: any, res: TRes) => void) => void,
  req: TReq,
  metadata: any,
  retries = 3
): Promise<TRes> {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await grpcCall(fn, req, metadata);
    } catch (err: any) {
      lastErr = err;
      if (err?.code === 8 || err?.code === 14) {
        const resetMs = getRateLimitResetMs(err);
        const backoff = 1000 * (i + 1);
        await sleep(resetMs ? Math.max(resetMs, backoff) : backoff);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
