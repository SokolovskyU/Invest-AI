import assert from "assert";
import { grpcCallWithRetry } from "../src/grpcHelpers";

async function testRetrySuccess(): Promise<void> {
  let attempts = 0;

  const fn = (
    _req: { id: string },
    _metadata: any,
    cb: (err: any, res: { ok: boolean; attempts: number }) => void
  ) => {
    attempts += 1;
    if (attempts < 3) {
      cb({ code: 14, message: "temporarily unavailable" }, null as any);
      return;
    }
    cb(null, { ok: true, attempts });
  };

  const result = await grpcCallWithRetry(
    fn,
    { id: "abc" },
    {},
    { retries: 3, baseDelayMs: 5, maxDelayMs: 10 }
  );

  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
  assert.equal(attempts, 3);
}

async function testNoRetryOnFatal(): Promise<void> {
  let attempts = 0;

  const fn = (
    _req: { id: string },
    _metadata: any,
    cb: (err: any, res: { ok: boolean }) => void
  ) => {
    attempts += 1;
    cb({ code: 3, message: "invalid argument" }, null as any);
  };

  await assert.rejects(
    grpcCallWithRetry(fn, { id: "abc" }, {}, { retries: 3, baseDelayMs: 5, maxDelayMs: 10 }),
    (err: any) => Number(err?.code) === 3
  );
  assert.equal(attempts, 1);
}

async function testTimeoutRetry(): Promise<void> {
  let attempts = 0;

  const fn = (
    _req: { id: string },
    _metadata: any,
    cb: (err: any, res: { ok: boolean; attempts: number }) => void
  ) => {
    attempts += 1;
    if (attempts === 1) {
      setTimeout(() => cb(null, { ok: true, attempts }), 80);
      return;
    }
    setTimeout(() => cb(null, { ok: true, attempts }), 5);
  };

  const result = await grpcCallWithRetry(
    fn,
    { id: "abc" },
    {},
    { retries: 2, timeoutMs: 20, baseDelayMs: 5, maxDelayMs: 20 }
  );

  assert.equal(result.ok, true);
  assert.equal(attempts, 2);
}

async function run(): Promise<void> {
  await testRetrySuccess();
  await testNoRetryOnFatal();
  await testTimeoutRetry();
  console.log("grpc helpers tests passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
