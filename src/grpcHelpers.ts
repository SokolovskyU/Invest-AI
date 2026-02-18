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

export type GrpcRetryOptions = {
  retries?: number;
  retryCodes?: number[];
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
};

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

function normalizeRetryOptions(options?: number | GrpcRetryOptions) {
  if (typeof options === "number") {
    return {
      retries: options,
      retryCodes: [8, 14, 4],
      baseDelayMs: 1000,
      maxDelayMs: 15_000,
      timeoutMs: 0,
    };
  }

  return {
    retries: Number.isFinite(options?.retries) ? Number(options?.retries) : 3,
    retryCodes:
      Array.isArray(options?.retryCodes) && options.retryCodes.length
        ? options.retryCodes
        : [8, 14, 4],
    baseDelayMs:
      Number.isFinite(options?.baseDelayMs) && Number(options?.baseDelayMs) > 0
        ? Number(options?.baseDelayMs)
        : 1000,
    maxDelayMs:
      Number.isFinite(options?.maxDelayMs) && Number(options?.maxDelayMs) > 0
        ? Number(options?.maxDelayMs)
        : 15_000,
    timeoutMs:
      Number.isFinite(options?.timeoutMs) && Number(options?.timeoutMs) > 0
        ? Number(options?.timeoutMs)
        : 0,
  };
}

function makeTimeoutError(timeoutMs: number): Error & { code: number } {
  const error = new Error(`gRPC call timeout after ${timeoutMs} ms`) as Error & {
    code: number;
  };
  error.code = 4;
  return error;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(makeTimeoutError(timeoutMs)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function grpcCallWithRetry<TReq, TRes>(
  fn: (req: TReq, metadata: any, cb: (err: any, res: TRes) => void) => void,
  req: TReq,
  metadata: any,
  options?: number | GrpcRetryOptions
): Promise<TRes> {
  const normalized = normalizeRetryOptions(options);
  let lastErr: any;
  for (let i = 0; i <= normalized.retries; i++) {
    try {
      return await withTimeout(
        grpcCall(fn, req, metadata),
        normalized.timeoutMs
      );
    } catch (err: any) {
      lastErr = err;
      if (normalized.retryCodes.includes(Number(err?.code))) {
        const attemptDelay = Math.min(
          normalized.maxDelayMs,
          normalized.baseDelayMs * Math.pow(2, i)
        );
        const jitter = 0.85 + Math.random() * 0.3;
        const resetMs = getRateLimitResetMs(err);
        const backoff = Math.round(attemptDelay * jitter);
        await sleep(resetMs ? Math.max(resetMs, backoff) : backoff);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
