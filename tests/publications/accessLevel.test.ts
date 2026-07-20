import { describe, expect, it } from "vitest";
import { decideAccessLevel } from "../../lib/publications/accessLevel";

describe("decideAccessLevel", () => {
  it("prefers full_text_open when open access", () => {
    expect(decideAccessLevel({ isOpenAccess: true, hasAbstract: false })).toBe("full_text_open");
  });

  it("falls back to abstract when not open access but abstract exists", () => {
    expect(decideAccessLevel({ isOpenAccess: false, hasAbstract: true })).toBe("abstract");
  });

  it("falls back to metadata_only when neither is available", () => {
    expect(decideAccessLevel({ isOpenAccess: false, hasAbstract: false })).toBe("metadata_only");
  });
});
