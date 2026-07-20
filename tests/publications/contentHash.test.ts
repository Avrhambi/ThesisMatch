import { describe, expect, it } from "vitest";
import { hashContent } from "../../lib/publications/contentHash";

describe("hashContent", () => {
  it("produces a deterministic sha256 hex digest", () => {
    expect(hashContent("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces different hashes for different content", () => {
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });
});
