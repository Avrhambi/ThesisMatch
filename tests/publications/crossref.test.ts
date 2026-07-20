import { describe, expect, it } from "vitest";
import { mapCrossrefWork } from "../../lib/publications/crossref";

describe("mapCrossrefWork", () => {
  it("maps DOI, title, year, venue, and author families", () => {
    const message = {
      DOI: "10.1038/Nature12373",
      title: ["Nanometre-scale thermometry in a living cell"],
      "container-title": ["Nature"],
      "published-print": { "date-parts": [[2013, 8]] },
      author: [{ family: "Kucsko" }, { family: "Maurer" }],
    };

    expect(mapCrossrefWork(message)).toEqual({
      doi: "10.1038/nature12373",
      title: "Nanometre-scale thermometry in a living cell",
      year: 2013,
      venue: "Nature",
      authorFamilies: ["Kucsko", "Maurer"],
    });
  });

  it("returns null when the DOI or title is missing", () => {
    expect(mapCrossrefWork({ title: ["A Paper"] })).toBeNull();
    expect(mapCrossrefWork({ DOI: "10.1/abc" })).toBeNull();
  });

  it("falls back through published date variants", () => {
    const message = { DOI: "10.1/abc", title: ["T"], "published-online": { "date-parts": [[2019, 1, 1]] } };
    expect(mapCrossrefWork(message)?.year).toBe(2019);
  });
});
