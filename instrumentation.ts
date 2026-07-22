// Next.js calls register() once when the server process starts (Node.js
// runtime only -- never on Edge, never per-request). This is where the
// background schedulers get started so they run under `next start`/pm2
// without anyone needing to open the app: discovery (which replaced the
// manual "Refresh researchers" button) and the ready-for-review auto-fill.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startDiscoveryScheduler } = await import("./lib/discovery/discoveryScheduler");
  startDiscoveryScheduler();
  const { startReadyForReviewScheduler } = await import("./lib/analysis/readyForReviewScheduler");
  startReadyForReviewScheduler();
}
