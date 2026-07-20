import { describe, expect, it } from "vitest";
import { normalizeName } from "../../lib/discovery/normalize";

describe("normalizeName", () => {
  it("lowercases and strips titles-adjacent punctuation", () => {
    expect(normalizeName("Prof. Uri Abdu")).toBe("prof uri abdu");
  });

  it("strips diacritics", () => {
    expect(normalizeName("José Ramón")).toBe("jose ramon");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeName("Uri   Abdu")).toBe("uri abdu");
  });

  it("is stable for already-normalized input", () => {
    const name = "associate professor ret miriam balaban";
    expect(normalizeName(name)).toBe(name);
  });
});
