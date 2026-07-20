import { describe, expect, it } from "vitest";
import { isStale } from "../../lib/discovery/stale";

describe("isStale", () => {
  const now = new Date("2026-07-20T00:00:00Z");

  it("treats a never-refreshed researcher as stale", () => {
    expect(isStale(null, now)).toBe(true);
  });

  it("treats a researcher refreshed 29 days ago as not stale", () => {
    const refreshedAt = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(refreshedAt, now)).toBe(false);
  });

  it("treats a researcher refreshed 31 days ago as stale", () => {
    const refreshedAt = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(refreshedAt, now)).toBe(true);
  });
});
