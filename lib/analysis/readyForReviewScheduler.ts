import { autoFillReadyForReview } from "./autoFillReadyForReview";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Runs inside the long-running server process (next start), not per-request:
// autoFillReadyForReview() is cheap to re-check (it returns immediately once
// the target is already met or the day's quota is exhausted), so polling
// hourly keeps the queue topped up after the daily quota resets without
// needing anyone to open the app.
let started = false;

export function startReadyForReviewScheduler() {
  if (started) return;
  started = true;

  const run = () => {
    autoFillReadyForReview().catch((err) => {
      console.error("[readyForReviewScheduler] auto-fill failed", err);
    });
  };

  run();
  setInterval(run, CHECK_INTERVAL_MS);
}
