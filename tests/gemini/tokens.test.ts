import { describe, expect, it } from "vitest";
import { estimateTokenCount } from "../../lib/gemini/tokens";

describe("estimateTokenCount", () => {
  it("estimates roughly 4 characters per token", () => {
    expect(estimateTokenCount("a".repeat(400))).toBe(100);
  });

  it("returns 0 for empty text", () => {
    expect(estimateTokenCount("")).toBe(0);
  });
});
