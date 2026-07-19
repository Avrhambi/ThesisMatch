import { describe, expect, it } from "vitest";
import pool, { query } from "../lib/db";

describe("lib/db", () => {
  it("exposes a parameterized query function", () => {
    expect(typeof query).toBe("function");
  });

  it("exposes the underlying pg pool", () => {
    expect(typeof pool.query).toBe("function");
  });
});
