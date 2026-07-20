import { describe, expect, it } from "vitest";
import { normalizeTitle } from "../../lib/publications/normalizeTitle";

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeTitle("A Study of  X-Ray, Y-Ray & Z-Ray!")).toBe("a study of x ray y ray z ray");
  });

  it("treats differently-punctuated equivalent titles as equal", () => {
    expect(normalizeTitle("Deep Learning: A Survey")).toBe(normalizeTitle("Deep learning - a survey"));
  });
});
