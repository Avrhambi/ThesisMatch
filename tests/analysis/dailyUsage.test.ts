import { describe, expect, it } from "vitest";
import { evaluateUsageGate, STANDARD_DAILY_LIMIT } from "../../lib/analysis/dailyUsage";

describe("evaluateUsageGate", () => {
  it("allows a standard analysis under the daily limit", () => {
    const result = evaluateUsageGate({ standardUsed: 0, extraUsed: 0 }, false);
    expect(result).toEqual({ allowed: true, isExtra: false, requiresConfirmation: false });
  });

  it("allows up to the limit without confirmation", () => {
    const result = evaluateUsageGate({ standardUsed: STANDARD_DAILY_LIMIT - 1, extraUsed: 0 }, false);
    expect(result.allowed).toBe(true);
    expect(result.isExtra).toBe(false);
  });

  it("requires confirmation once the standard limit is reached and confirmExtra is false", () => {
    const result = evaluateUsageGate({ standardUsed: STANDARD_DAILY_LIMIT, extraUsed: 0 }, false);
    expect(result).toEqual({ allowed: false, isExtra: true, requiresConfirmation: true });
  });

  it("allows an extra analysis once confirmed", () => {
    const result = evaluateUsageGate({ standardUsed: STANDARD_DAILY_LIMIT, extraUsed: 2 }, true);
    expect(result).toEqual({ allowed: true, isExtra: true, requiresConfirmation: false });
  });

  it("still requires confirmation for every extra beyond the first", () => {
    const result = evaluateUsageGate({ standardUsed: STANDARD_DAILY_LIMIT, extraUsed: 5 }, false);
    expect(result.requiresConfirmation).toBe(true);
  });
});
