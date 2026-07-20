import { describe, expect, it } from "vitest";
import { computeAnalysisInputHash } from "../../lib/analysis/inputHash";

describe("computeAnalysisInputHash", () => {
  it("is deterministic for the same inputs", () => {
    expect(computeAnalysisInputHash(["profile", "paper-1", "paper-2"])).toBe(
      computeAnalysisInputHash(["profile", "paper-1", "paper-2"]),
    );
  });

  it("differs when a part changes", () => {
    const a = computeAnalysisInputHash(["profile", "paper-1"]);
    const b = computeAnalysisInputHash(["profile", "paper-2"]);
    expect(a).not.toBe(b);
  });

  it("differs when part order changes", () => {
    const a = computeAnalysisInputHash(["paper-1", "paper-2"]);
    const b = computeAnalysisInputHash(["paper-2", "paper-1"]);
    expect(a).not.toBe(b);
  });

  it("treats null and undefined parts as empty strings consistently", () => {
    expect(computeAnalysisInputHash(["a", null])).toBe(computeAnalysisInputHash(["a", undefined]));
  });
});
