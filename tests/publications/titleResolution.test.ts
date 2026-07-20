import { beforeEach, describe, expect, it, vi } from "vitest";

const getResearcherRecordForImport = vi.fn();
const fetchCrossrefBibliographicSearch = vi.fn();
const importSingleDoi = vi.fn();

vi.mock("../../lib/repositories/researchers", () => ({
  getResearcherRecordForImport: (...args: unknown[]) => getResearcherRecordForImport(...args),
}));
vi.mock("../../lib/publications/crossref", () => ({
  fetchCrossrefBibliographicSearch: (...args: unknown[]) => fetchCrossrefBibliographicSearch(...args),
}));
vi.mock("../../lib/publications/importSingleDoi", () => ({
  importSingleDoi: (...args: unknown[]) => importSingleDoi(...args),
}));

const { resolveTitles } = await import("../../lib/publications/titleResolution");

describe("resolveTitles", () => {
  beforeEach(() => {
    getResearcherRecordForImport.mockReset();
    fetchCrossrefBibliographicSearch.mockReset();
    importSingleDoi.mockReset();
    getResearcherRecordForImport.mockResolvedValue({
      id: "r1",
      fullName: "Uri Abdu",
      normalizedName: "uri abdu",
      orcid: null,
    });
  });

  it("returns null when the researcher does not exist", async () => {
    getResearcherRecordForImport.mockResolvedValue(null);
    expect(await resolveTitles("missing", ["A Paper"])).toBeNull();
  });

  it("resolves a title with exactly one title+author match and imports it", async () => {
    fetchCrossrefBibliographicSearch.mockResolvedValue({
      ok: true,
      candidates: [
        { doi: "10.1/a", title: "A Study of X", year: 2020, venue: null, authorFamilies: ["Abdu"] },
        { doi: "10.1/b", title: "Unrelated Paper", year: 2019, venue: null, authorFamilies: ["Cohen"] },
      ],
    });
    importSingleDoi.mockResolvedValue("imported");

    const result = await resolveTitles("r1", ["A Study of X"]);

    expect(result?.results).toEqual([
      { title: "A Study of X", status: "resolved", doi: "10.1/a", matchedTitle: "A Study of X" },
    ]);
    expect(result?.imported).toBe(1);
    expect(importSingleDoi).toHaveBeenCalledWith("r1", "10.1/a", true, expect.any(Number));
  });

  it("marks a title ambiguous when multiple candidates match both title and authorship", async () => {
    fetchCrossrefBibliographicSearch.mockResolvedValue({
      ok: true,
      candidates: [
        { doi: "10.1/a", title: "A Study of X", year: 2020, venue: null, authorFamilies: ["Abdu"] },
        { doi: "10.1/b", title: "A Study of X", year: 2021, venue: null, authorFamilies: ["Abdu"] },
      ],
    });

    const result = await resolveTitles("r1", ["A Study of X"]);

    expect(result?.results[0].status).toBe("ambiguous");
    expect(result?.results[0].candidates).toHaveLength(2);
    expect(importSingleDoi).not.toHaveBeenCalled();
  });

  it("marks a title unrelated when no candidate matches both title and authorship", async () => {
    fetchCrossrefBibliographicSearch.mockResolvedValue({
      ok: true,
      candidates: [{ doi: "10.1/b", title: "Unrelated Paper", year: 2019, venue: null, authorFamilies: ["Cohen"] }],
    });

    const result = await resolveTitles("r1", ["A Study of X"]);

    expect(result?.results[0]).toEqual({ title: "A Study of X", status: "unrelated" });
  });

  it("marks a title unrelated when the search itself fails", async () => {
    fetchCrossrefBibliographicSearch.mockResolvedValue({ ok: false, errorCode: "timeout" });

    const result = await resolveTitles("r1", ["A Study of X"]);

    expect(result?.results[0]).toEqual({ title: "A Study of X", status: "unrelated" });
  });
});
