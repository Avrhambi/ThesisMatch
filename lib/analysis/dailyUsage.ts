export const STANDARD_DAILY_LIMIT = 5;

export interface DailyUsageCounts {
  standardUsed: number;
  extraUsed: number;
}

export interface UsageGateResult {
  allowed: boolean;
  isExtra: boolean;
  requiresConfirmation: boolean;
}

// SPEC's daily analysis policy: the first five counted analyses of the
// local day are standard; every one after that requires the caller to have
// already confirmed (confirmExtra) or is rejected with
// requiresConfirmation=true so the UI can show a confirmation dialog before
// retrying with confirmExtra=true.
export function evaluateUsageGate(counts: DailyUsageCounts, confirmExtra: boolean): UsageGateResult {
  if (counts.standardUsed < STANDARD_DAILY_LIMIT) {
    return { allowed: true, isExtra: false, requiresConfirmation: false };
  }
  if (!confirmExtra) {
    return { allowed: false, isExtra: true, requiresConfirmation: true };
  }
  return { allowed: true, isExtra: true, requiresConfirmation: false };
}
