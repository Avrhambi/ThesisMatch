// Next.js calls register() once when the server process starts (Node.js
// runtime only -- never on Edge, never per-request). This is where the
// ready-for-review queue's background auto-fill gets started so it runs
// under `next start`/pm2 without anyone needing to open the app.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startReadyForReviewScheduler } = await import("./lib/analysis/readyForReviewScheduler");
  startReadyForReviewScheduler();
}
