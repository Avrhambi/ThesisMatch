import { describe, expect, it } from "vitest";
import { detectSupervisionStatus } from "../../lib/analysis/supervisionEligibility";

describe("detectSupervisionStatus", () => {
  it("flags Professor Emeritus as unverified", () => {
    expect(detectSupervisionStatus("Professor Emeritus Uri Abraham")).toBe("unverified");
  });

  it("flags (Ret.) as unverified", () => {
    expect(detectSupervisionStatus("Associate Professor (Ret.) Miriam Balaban")).toBe("unverified");
  });

  it("flags (Ret) without a period as unverified", () => {
    expect(detectSupervisionStatus("Prof. Jane Doe (Ret)")).toBe("unverified");
  });

  it("does not flag an active professor", () => {
    expect(detectSupervisionStatus("Prof. Amos Beimel")).toBe("verified_available");
  });

  it("does not flag a name that merely contains 'ret' as a substring", () => {
    expect(detectSupervisionStatus("Dr. Margaret Retford")).toBe("verified_available");
  });
});
