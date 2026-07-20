import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/bgu-staff-search.json";

const fetchBguStaffDirectory = vi.fn();
const upsertDiscoveredResearcherOnPool = vi.fn();

vi.mock("../../lib/discovery/bguStaffSearch", () => ({
  fetchBguStaffDirectory: (...args: unknown[]) => fetchBguStaffDirectory(...args),
}));
vi.mock("../../lib/repositories/researchers", () => ({
  upsertDiscoveredResearcherOnPool: (...args: unknown[]) => upsertDiscoveredResearcherOnPool(...args),
}));

const { refreshResearchers } = await import("../../lib/discovery/refresh");

describe("refreshResearchers", () => {
  beforeEach(() => {
    fetchBguStaffDirectory.mockReset();
    upsertDiscoveredResearcherOnPool.mockReset();
    upsertDiscoveredResearcherOnPool.mockResolvedValue({ id: "generated-id", changed: true });
  });

  it("reports a failed run without touching the database when the directory fetch fails", async () => {
    fetchBguStaffDirectory.mockResolvedValue({ ok: false, stage: "token", errorCode: "timeout" });

    const result = await refreshResearchers();

    expect(result).toEqual({ discovered: 0, verified: 0, needsReview: 0, unchanged: 0, failed: 1 });
    expect(upsertDiscoveredResearcherOnPool).not.toHaveBeenCalled();
  });

  it("discovers only CS faculty members and buckets them by branch match", async () => {
    fetchBguStaffDirectory.mockResolvedValue({ ok: true, data: fixture });

    const result = await refreshResearchers();

    // Fixture has 3 CS-faculty members (s3, theory_of_computing, applied-ai)
    // and 1 non-CS member (electrical engineering) that must be excluded.
    expect(result.discovered).toBe(3);
    expect(result.verified).toBe(2); // s3 + theory_of_computing matched a tracked branch
    expect(result.needsReview).toBe(1); // applied-ai has no tracked branch
    expect(result.failed).toBe(0);
    expect(upsertDiscoveredResearcherOnPool).toHaveBeenCalledTimes(3);
  });

  it("counts unchanged researchers as reported by the upsert", async () => {
    fetchBguStaffDirectory.mockResolvedValue({ ok: true, data: fixture });
    upsertDiscoveredResearcherOnPool.mockResolvedValue({ id: "generated-id", changed: false });

    const result = await refreshResearchers();

    expect(result.unchanged).toBe(3);
  });
});
