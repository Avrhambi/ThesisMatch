import { describe, expect, it, vi } from "vitest";
import { replaceCurrentCv } from "../../lib/repositories/cv";

function createFakeClient() {
  const calls: string[] = [];
  const query = vi.fn(async (text: string) => {
    calls.push(text.trim().split(/\s+/)[0]);
    return { rows: [] };
  });
  return { query, calls };
}

describe("replaceCurrentCv", () => {
  it("demotes the existing current CV before inserting the new one", async () => {
    const client = createFakeClient();

    await replaceCurrentCv(client, {
      filename: "cv.pdf",
      extractedText: "text",
      redactedText: "redacted",
      byteSize: 1024,
      pageCount: 2,
    });

    const updateIndex = client.calls.findIndex((c) => c === "UPDATE");
    const insertIndex = client.calls.findIndex((c) => c === "INSERT");

    expect(updateIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThan(updateIndex);
  });

  it("wraps the demote-then-insert in a single transaction", async () => {
    const client = createFakeClient();

    await replaceCurrentCv(client, {
      filename: "cv.pdf",
      extractedText: "text",
      redactedText: "redacted",
      byteSize: 1024,
      pageCount: 2,
    });

    expect(client.calls[0]).toBe("BEGIN");
    expect(client.calls.at(-1)).toBe("COMMIT");
    expect(client.calls).not.toContain("ROLLBACK");
  });

  it("rolls back and rethrows if the insert fails", async () => {
    const calls: string[] = [];
    const query = vi.fn(async (text: string) => {
      const kind = text.trim().split(/\s+/)[0];
      calls.push(kind);
      if (kind === "INSERT") throw new Error("insert failed");
      return { rows: [] };
    });

    await expect(
      replaceCurrentCv(
        { query },
        {
          filename: "cv.pdf",
          extractedText: "text",
          redactedText: "redacted",
          byteSize: 1024,
          pageCount: 2,
        },
      ),
    ).rejects.toThrow("insert failed");

    expect(calls).toContain("ROLLBACK");
    expect(calls).not.toContain("COMMIT");
  });

  it("returns a generated id for the new CV", async () => {
    const client = createFakeClient();
    const id = await replaceCurrentCv(client, {
      filename: "cv.pdf",
      extractedText: "text",
      redactedText: "redacted",
      byteSize: 1024,
      pageCount: 2,
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
