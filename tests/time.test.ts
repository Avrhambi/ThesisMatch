import { describe, expect, it } from "vitest";
import { localDateString } from "../lib/time";

describe("localDateString", () => {
  it("formats a date as YYYY-MM-DD in the given time zone", () => {
    // 2024-01-01T22:30:00Z is 2024-01-02 00:30 in Asia/Jerusalem (UTC+2 in winter).
    const date = new Date("2024-01-01T22:30:00Z");
    expect(localDateString(date, "Asia/Jerusalem")).toBe("2024-01-02");
  });

  it("differs across time zones for the same instant", () => {
    const date = new Date("2024-01-01T22:30:00Z");
    expect(localDateString(date, "UTC")).toBe("2024-01-01");
  });
});
