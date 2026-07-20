import { describe, expect, it } from "vitest";
import { runSerialized } from "../../lib/gemini/rateLimiter";

describe("runSerialized", () => {
  it("runs tasks one at a time in call order, never overlapping", async () => {
    const events: string[] = [];
    let active = 0;

    function task(name: string, delayMs: number) {
      return runSerialized(async () => {
        active += 1;
        expect(active).toBe(1);
        events.push(`start-${name}`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        events.push(`end-${name}`);
        active -= 1;
      });
    }

    await Promise.all([task("a", 10), task("b", 5), task("c", 1)]);

    expect(events).toEqual(["start-a", "end-a", "start-b", "end-b", "start-c", "end-c"]);
  });

  it("continues serializing subsequent tasks after one throws", async () => {
    const events: string[] = [];

    const failing = runSerialized(async () => {
      events.push("failing");
      throw new Error("boom");
    });

    const next = runSerialized(async () => {
      events.push("next");
    });

    await expect(failing).rejects.toThrow("boom");
    await next;
    expect(events).toEqual(["failing", "next"]);
  });
});
