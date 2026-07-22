import { describe, expect, it } from "vitest";
import { deriveOverallFit, derivePriority } from "../../lib/analysis/fitAssessment";

function fit(level: "unknown" | "low" | "medium" | "high") {
  return { level, reasoning: "test" };
}

describe("deriveOverallFit", () => {
  it("takes the lowest of the four dimensions", () => {
    const review = { topicFit: fit("high"), methodFit: fit("medium"), mechanismFit: fit("low"), practicalFit: fit("high") };
    expect(deriveOverallFit(review)).toBe("low");
  });

  it("returns high only when all four dimensions are high", () => {
    const review = { topicFit: fit("high"), methodFit: fit("high"), mechanismFit: fit("high"), practicalFit: fit("high") };
    expect(deriveOverallFit(review)).toBe("high");
  });

  it("treats unknown as the weakest signal", () => {
    const review = { topicFit: fit("high"), methodFit: fit("high"), mechanismFit: fit("unknown"), practicalFit: fit("high") };
    expect(deriveOverallFit(review)).toBe("unknown");
  });
});

describe("derivePriority", () => {
  it("marks high fit as high_priority", () => {
    expect(derivePriority("high", 2)).toBe("high_priority");
  });

  it("marks medium fit as consider", () => {
    expect(derivePriority("medium", 0)).toBe("consider");
  });

  it("marks low fit with a thesis direction as low_priority", () => {
    expect(derivePriority("low", 1)).toBe("low_priority");
  });

  it("marks low fit with no thesis direction as do_not_prioritize", () => {
    expect(derivePriority("low", 0)).toBe("do_not_prioritize");
  });

  it("marks unknown fit as do_not_prioritize regardless of thesis directions", () => {
    expect(derivePriority("unknown", 3)).toBe("do_not_prioritize");
  });
});
