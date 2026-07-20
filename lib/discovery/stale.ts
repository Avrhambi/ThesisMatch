const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function isStale(refreshedAt: string | null, now: Date = new Date()): boolean {
  if (!refreshedAt) return true;
  return now.getTime() - new Date(refreshedAt).getTime() > THIRTY_DAYS_MS;
}
