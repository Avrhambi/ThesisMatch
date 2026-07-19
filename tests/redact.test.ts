import { describe, expect, it } from "vitest";
import { redactContactDetails } from "../lib/redact";

describe("redactContactDetails", () => {
  it("strips email addresses", () => {
    const result = redactContactDetails("Contact me at jane.doe@example.com for details");
    expect(result).not.toContain("jane.doe@example.com");
    expect(result).toContain("[REDACTED]");
  });

  it("strips Israeli mobile phone numbers", () => {
    const result = redactContactDetails("Call 052-1234567 anytime");
    expect(result).not.toContain("052-1234567");
    expect(result).toContain("[REDACTED]");
  });

  it("strips international phone numbers", () => {
    const result = redactContactDetails("Reach me at +972-52-1234567");
    expect(result).not.toContain("1234567");
  });

  it("strips 9-digit ID numbers", () => {
    const result = redactContactDetails("ID number: 123456789");
    expect(result).not.toContain("123456789");
  });

  it("strips street addresses", () => {
    const result = redactContactDetails("I live at 12 Main Street, please write");
    expect(result).not.toContain("12 Main Street");
  });

  it("preserves unrelated text", () => {
    const result = redactContactDetails("Research interests: distributed systems and databases.");
    expect(result).toBe("Research interests: distributed systems and databases.");
  });
});
