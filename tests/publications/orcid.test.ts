import { describe, expect, it } from "vitest";
import { extractBareOrcid, mapOrcidWorksResponse } from "../../lib/publications/orcid";

describe("mapOrcidWorksResponse", () => {
  it("extracts title, doi, and year from each work group", () => {
    const json = {
      group: [
        {
          "external-ids": { "external-id": [{ "external-id-type": "doi", "external-id-value": "10.1/ABC" }] },
          "work-summary": [
            { title: { title: { value: "A Paper" } }, "publication-date": { year: { value: "2020" } } },
          ],
        },
        {
          "external-ids": { "external-id": [] },
          "work-summary": [{ title: { title: { value: "No DOI Paper" } } }],
        },
      ],
    };

    expect(mapOrcidWorksResponse(json)).toEqual([
      { title: "A Paper", doi: "10.1/abc", year: 2020 },
      { title: "No DOI Paper", doi: null, year: null },
    ]);
  });

  it("drops groups without a title", () => {
    const json = { group: [{ "work-summary": [{ title: { title: { value: "" } } }] }] };
    expect(mapOrcidWorksResponse(json)).toEqual([]);
  });

  it("handles a missing group list", () => {
    expect(mapOrcidWorksResponse({})).toEqual([]);
  });
});

describe("extractBareOrcid", () => {
  it("pulls the bare id out of a full orcid.org URL", () => {
    expect(extractBareOrcid("https://orcid.org/0000-0002-1825-0097")).toBe("0000-0002-1825-0097");
  });

  it("returns a bare id unchanged", () => {
    expect(extractBareOrcid("0000-0002-1825-009X")).toBe("0000-0002-1825-009X");
  });
});
