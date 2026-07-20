import { describe, expect, it } from "vitest";
import { mapOpenAlexAuthors, mapOpenAlexWork, reconstructAbstract } from "../../lib/publications/openalex";

describe("reconstructAbstract", () => {
  it("reorders inverted-index words back into a sentence", () => {
    expect(reconstructAbstract({ world: [1], hello: [0] })).toBe("hello world");
  });

  it("returns null when there is no index", () => {
    expect(reconstructAbstract(null)).toBeNull();
    expect(reconstructAbstract(undefined)).toBeNull();
  });
});

describe("mapOpenAlexWork", () => {
  it("maps title, year, venue, abstract, and open-access fields", () => {
    const json = {
      title: "A Paper",
      publication_year: 2021,
      primary_location: { source: { display_name: "Some Journal" } },
      abstract_inverted_index: { hello: [0], world: [1] },
      open_access: { is_oa: true, oa_url: "https://arxiv.org/abs/1234" },
    };

    expect(mapOpenAlexWork(json)).toEqual({
      title: "A Paper",
      year: 2021,
      venue: "Some Journal",
      abstract: "hello world",
      isOpenAccess: true,
      oaUrl: "https://arxiv.org/abs/1234",
    });
  });

  it("falls back to best_oa_location.pdf_url when open_access.oa_url is absent", () => {
    const json = { open_access: { is_oa: true }, best_oa_location: { pdf_url: "https://x.org/p.pdf" } };
    expect(mapOpenAlexWork(json).oaUrl).toBe("https://x.org/p.pdf");
  });

  it("defaults to closed access with no abstract when fields are missing", () => {
    expect(mapOpenAlexWork({})).toEqual({
      title: "",
      year: null,
      venue: null,
      abstract: null,
      isOpenAccess: false,
      oaUrl: null,
    });
  });
});

describe("mapOpenAlexAuthors", () => {
  it("collects affiliation display names per author", () => {
    const json = {
      results: [
        {
          id: "https://openalex.org/A1",
          display_name: "Uri Abdu",
          affiliations: [{ institution: { display_name: "Ben-Gurion University of the Negev" } }],
        },
      ],
    };
    expect(mapOpenAlexAuthors(json)).toEqual([
      { id: "https://openalex.org/A1", displayName: "Uri Abdu", affiliationNames: ["Ben-Gurion University of the Negev"] },
    ]);
  });

  it("handles a missing results list", () => {
    expect(mapOpenAlexAuthors({})).toEqual([]);
  });
});
