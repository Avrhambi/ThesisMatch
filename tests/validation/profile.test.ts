import { describe, expect, it } from "vitest";
import { validateProfileText } from "../../lib/validation/profile";

describe("validateProfileText", () => {
  it("rejects text shorter than 100 characters", () => {
    const result = validateProfileText("too short");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("rejects text longer than 20000 characters", () => {
    const result = validateProfileText("a".repeat(20001));
    expect(result.valid).toBe(false);
  });

  it("accepts text within the 100-20000 character range", () => {
    const result = validateProfileText("a".repeat(100));
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("accepts text at the upper boundary", () => {
    const result = validateProfileText("a".repeat(20000));
    expect(result.valid).toBe(true);
  });
});
