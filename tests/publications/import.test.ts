import { beforeEach, describe, expect, it, vi } from "vitest";

const getResearcherRecordForImport = vi.fn();
const fetchOrcidWorks = vi.fn();
const fetchOpenAlexWorksByOrcid = vi.fn();
const fetchOpenAlexAuthorByName = vi.fn();
const fetchOpenAlexWorksByAuthorId = vi.fn();
const importSingleDoi = vi.fn();

vi.mock("../../lib/repositories/researchers", () => ({
  getResearcherRecordForImport: (...args: unknown[]) => getResearcherRecordForImport(...args),
}));
vi.mock("../../lib/publications/orcid", () => ({
  extractBareOrcid: (v: string) => v.replace("https://orcid.org/", ""),
  fetchOrcidWorks: (...args: unknown[]) => fetchOrcidWorks(...args),
}));
vi.mock("../../lib/publications/openalex", () => ({
  fetchOpenAlexWorksByOrcid: (...args: unknown[]) => fetchOpenAlexWorksByOrcid(...args),
  fetchOpenAlexAuthorByName: (...args: unknown[]) => fetchOpenAlexAuthorByName(...args),
  fetchOpenAlexWorksByAuthorId: (...args: unknown[]) => fetchOpenAlexWorksByAuthorId(...args),
}));
vi.mock("../../lib/publications/importSingleDoi", () => ({
  importSingleDoi: (...args: unknown[]) => importSingleDoi(...args),
}));

const { importPublicationsForResearcher } = await import("../../lib/publications/import");

describe("importPublicationsForResearcher", () => {
  beforeEach(() => {
    getResearcherRecordForImport.mockReset();
    fetchOrcidWorks.mockReset();
    fetchOpenAlexWorksByOrcid.mockReset();
    fetchOpenAlexAuthorByName.mockReset();
    fetchOpenAlexWorksByAuthorId.mockReset();
    importSingleDoi.mockReset();
  });

  it("fails without touching any source when the researcher does not exist", async () => {
    getResearcherRecordForImport.mockResolvedValue(null);
    const result = await importPublicationsForResearcher("missing-id");
    expect(result).toEqual({ source: "unavailable", found: 0, imported: 0, updated: 0, skipped: 0, failed: 1 });
    expect(fetchOrcidWorks).not.toHaveBeenCalled();
  });

  it("imports from ORCID, deduplicating against the OpenAlex completion pass", async () => {
    getResearcherRecordForImport.mockResolvedValue({
      id: "r1",
      fullName: "Uri Abdu",
      normalizedName: "uri abdu",
      orcid: "https://orcid.org/0000-0002-1825-0097",
    });
    fetchOrcidWorks.mockResolvedValue({
      ok: true,
      works: [{ title: "A", doi: "10.1/a", year: 2020 }, { title: "B", doi: null, year: null }],
    });
    fetchOpenAlexWorksByOrcid.mockResolvedValue({ ok: true, dois: ["10.1/a", "10.1/c"] });
    importSingleDoi.mockResolvedValue("imported");

    const result = await importPublicationsForResearcher("r1");

    expect(result.source).toBe("orcid");
    expect(result.found).toBe(2); // 10.1/a deduped, 10.1/c added; the no-DOI work is dropped
    expect(importSingleDoi).toHaveBeenCalledTimes(2);
    expect(result.imported).toBe(2);
  });

  it("reports a failed run when the ORCID fetch fails, without importing anything", async () => {
    getResearcherRecordForImport.mockResolvedValue({
      id: "r1",
      fullName: "Uri Abdu",
      normalizedName: "uri abdu",
      orcid: "https://orcid.org/0000-0002-1825-0097",
    });
    fetchOrcidWorks.mockResolvedValue({ ok: false, errorCode: "timeout" });

    const result = await importPublicationsForResearcher("r1");

    expect(result).toEqual({ source: "unavailable", found: 0, imported: 0, updated: 0, skipped: 0, failed: 1 });
    expect(importSingleDoi).not.toHaveBeenCalled();
  });

  it("falls back to an OpenAlex name match when no ORCID is on file", async () => {
    getResearcherRecordForImport.mockResolvedValue({
      id: "r1",
      fullName: "Uri Abdu",
      normalizedName: "uri abdu",
      orcid: null,
    });
    fetchOpenAlexAuthorByName.mockResolvedValue({
      ok: true,
      candidates: [{ id: "A1", displayName: "Uri Abdu", affiliationNames: ["Ben-Gurion University of the Negev"] }],
    });
    fetchOpenAlexWorksByAuthorId.mockResolvedValue({ ok: true, dois: ["10.1/x"] });
    importSingleDoi.mockResolvedValue("imported");

    const result = await importPublicationsForResearcher("r1");

    expect(result.source).toBe("openalex_name_match");
    expect(result.imported).toBe(1);
  });

  it("marks the source unavailable, without failing, when no ORCID and no reliable name match exist", async () => {
    getResearcherRecordForImport.mockResolvedValue({
      id: "r1",
      fullName: "Uri Abdu",
      normalizedName: "uri abdu",
      orcid: null,
    });
    fetchOpenAlexAuthorByName.mockResolvedValue({ ok: true, candidates: [] });

    const result = await importPublicationsForResearcher("r1");

    expect(result).toEqual({ source: "unavailable", found: 0, imported: 0, updated: 0, skipped: 0, failed: 0 });
    expect(fetchOpenAlexWorksByAuthorId).not.toHaveBeenCalled();
  });
});
