import { refreshResearchers } from "./refresh";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Discovery used to run only when the user clicked "Refresh researchers". That
// button is gone, so discovery now runs in the background inside the
// long-running server process (register() in instrumentation.ts): once on
// start and hourly thereafter. upsertDiscoveredResearcher preserves each
// researcher's decision/personal_note, so a background refresh never disturbs
// personal tracking state.
let started = false;

export function startDiscoveryScheduler() {
  if (started) return;
  started = true;

  const run = () => {
    refreshResearchers().catch((err) => {
      console.error("[discoveryScheduler] discovery failed", err);
    });
  };

  run();
  setInterval(run, CHECK_INTERVAL_MS);
}
