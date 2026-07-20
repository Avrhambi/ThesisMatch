import { describe, expect, it } from "vitest";
import { normalizeDoi } from "../../lib/publications/normalizeDoi";

describe("normalizeDoi", () => {
  it("strips protocol and host from a doi.org URL", () => {
    expect(normalizeDoi("https://doi.org/10.1038/Nature12373")).toBe("10.1038/nature12373");
  });

  it("strips the doi: prefix", () => {
    expect(normalizeDoi("doi:10.1038/nature12373")).toBe("10.1038/nature12373");
  });

  it("leaves a bare doi unchanged apart from casing", () => {
    expect(normalizeDoi("10.1038/NATURE12373")).toBe("10.1038/nature12373");
  });
});
