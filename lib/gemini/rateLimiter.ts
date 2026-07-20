// Module-level state: this app is a single Next.js process with no worker
// or queue (per CLAUDE.md), so an in-process mutex plus a sliding request
// timestamp window is sufficient to serialize Gemini calls and cap them at
// the application's 8 requests/minute ceiling.
const RPM_LIMIT = 8;
const WINDOW_MS = 60_000;

let chain: Promise<unknown> = Promise.resolve();
const requestTimestamps: number[] = [];

async function waitForRpmSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (requestTimestamps.length > 0 && now - requestTimestamps[0] >= WINDOW_MS) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < RPM_LIMIT) {
      requestTimestamps.push(now);
      return;
    }
    const waitMs = WINDOW_MS - (now - requestTimestamps[0]) + 1;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

export function runSerialized<T>(task: () => Promise<T>): Promise<T> {
  const result = chain.then(async () => {
    await waitForRpmSlot();
    return task();
  });
  chain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
