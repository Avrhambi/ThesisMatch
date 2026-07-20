import { describe, expect, it } from "vitest";
import { findBguAuthorMatch, isAuthorMatch, isTitleMatch, stripAcademicTitle } from "../../lib/publications/matching";

describe("findBguAuthorMatch", () => {
  const target = "uri abdu";

  it("returns the sole candidate matching name and BGU affiliation", () => {
    const candidates = [
      { id: "A1", displayName: "Uri Abdu", affiliationNames: ["Ben-Gurion University of the Negev"] },
      { id: "A2", displayName: "Uri Cohen", affiliationNames: ["Ben-Gurion University of the Negev"] },
    ];
    expect(findBguAuthorMatch(candidates, target)).toEqual(candidates[0]);
  });

  it("returns null when no candidate has a BGU affiliation", () => {
    const candidates = [{ id: "A1", displayName: "Uri Abdu", affiliationNames: ["Harvard University"] }];
    expect(findBguAuthorMatch(candidates, target)).toBeNull();
  });

  it("returns null when multiple candidates match ambiguously", () => {
    const candidates = [
      { id: "A1", displayName: "Uri Abdu", affiliationNames: ["Ben-Gurion University of the Negev"] },
      { id: "A2", displayName: "Uri Abdu", affiliationNames: ["Ben-Gurion University of the Negev"] },
    ];
    expect(findBguAuthorMatch(candidates, target)).toBeNull();
  });

  it("matches despite an academic title prefix stored on the researcher's name", () => {
    const candidates = [
      { id: "A1", displayName: "Yefim Dinitz", affiliationNames: ["Ben-Gurion University of the Negev"] },
    ];
    expect(findBguAuthorMatch(candidates, "professor emeritus yefim dinitz")).toEqual(candidates[0]);
  });
});

describe("stripAcademicTitle", () => {
  it("removes leading and embedded title tokens", () => {
    expect(stripAcademicTitle("professor emeritus yefim dinitz")).toBe("yefim dinitz");
    expect(stripAcademicTitle("prof uri abdu")).toBe("uri abdu");
    expect(stripAcademicTitle("associate professor ret miriam balaban")).toBe("miriam balaban");
  });

  it("leaves a name with no title tokens unchanged", () => {
    expect(stripAcademicTitle("uri abdu")).toBe("uri abdu");
  });
});

describe("isTitleMatch", () => {
  it("matches identical titles after normalization", () => {
    expect(isTitleMatch("Deep Learning: A Survey", "deep learning - a survey")).toBe(true);
  });

  it("matches when one title contains the other (subtitle variation)", () => {
    expect(isTitleMatch("Deep Learning", "Deep Learning: A Survey")).toBe(true);
  });

  it("rejects unrelated titles", () => {
    expect(isTitleMatch("Deep Learning", "Shallow Parsing of Legal Text")).toBe(false);
  });
});

describe("isAuthorMatch", () => {
  it("matches a family name present in the researcher's full name", () => {
    expect(isAuthorMatch("Abdu", "uri abdu")).toBe(true);
  });

  it("rejects a family name absent from the researcher's full name", () => {
    expect(isAuthorMatch("Cohen", "uri abdu")).toBe(false);
  });
});
