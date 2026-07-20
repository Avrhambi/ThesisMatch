import { describe, expect, it, vi } from "vitest";
import { upsertPaperWithSources, type PaperInput, type SourceInput } from "../../lib/repositories/papers";
import type { QueryableClient } from "../../lib/repositories/researchers";

function createFakeClient(existingPaper: { id: string } | null, existingSourceId: string | null = null) {
  const calls: { text: string; params?: unknown[] }[] = [];
  const query = vi.fn(async (text: string, params?: unknown[]) => {
    calls.push({ text, params });
    const kind = text.trim().split(/\s+/)[0];
    if (kind === "SELECT" && text.includes("FROM papers")) {
      return { rows: existingPaper ? [existingPaper] : [] };
    }
    if (kind === "SELECT" && text.includes("FROM sources")) {
      return { rows: existingSourceId ? [{ id: existingSourceId }] : [] };
    }
    return { rows: [] };
  });
  return { query, calls } as unknown as QueryableClient & { calls: { text: string; params?: unknown[] }[] };
}

const paper: PaperInput = {
  title: "A Paper",
  doi: "10.1/abc",
  publicationYear: 2020,
  venue: "Some Venue",
  abstract: "An abstract",
  access: "abstract",
  addedByUser: false,
};

const source: SourceInput = {
  type: "crossref",
  url: "https://api.crossref.org/works/10.1/abc",
  title: null,
  retrievedAt: new Date().toISOString(),
  contentHash: "hash1",
  access: "metadata_only",
  isFullText: false,
};

describe("upsertPaperWithSources", () => {
  it("wraps writes in a single transaction", async () => {
    const client = createFakeClient(null);
    await upsertPaperWithSources(client, "researcher-1", paper, [source]);
    expect(client.calls[0].text).toBe("BEGIN");
    expect(client.calls.at(-1)?.text).toBe("COMMIT");
    expect(client.calls.map((c) => c.text)).not.toContain("ROLLBACK");
  });

  it("inserts a new paper when none exists for the doi", async () => {
    const client = createFakeClient(null);
    const result = await upsertPaperWithSources(client, "researcher-1", paper, []);
    expect(result.created).toBe(true);
    expect(client.calls.some((c) => c.text.startsWith("INSERT INTO papers"))).toBe(true);
  });

  it("updates rather than duplicates when a paper with the same doi already exists", async () => {
    const client = createFakeClient({ id: "existing-paper-id" });
    const result = await upsertPaperWithSources(client, "researcher-1", paper, []);
    expect(result.created).toBe(false);
    expect(result.paperId).toBe("existing-paper-id");
    expect(client.calls.some((c) => c.text.startsWith("UPDATE papers"))).toBe(true);
    expect(client.calls.some((c) => c.text.startsWith("INSERT INTO papers"))).toBe(false);
  });

  it("inserts a new source and links it as full_text_source_id when marked full text", async () => {
    const client = createFakeClient(null);
    await upsertPaperWithSources(client, "researcher-1", paper, [{ ...source, isFullText: true }]);
    expect(client.calls.some((c) => c.text.startsWith("INSERT INTO sources"))).toBe(true);
    const linkCall = client.calls.find((c) => c.text.includes("full_text_source_id"));
    expect(linkCall).toBeDefined();
  });

  it("reuses an existing source row instead of inserting a duplicate for the same url+hash", async () => {
    const client = createFakeClient(null, "existing-source-id");
    await upsertPaperWithSources(client, "researcher-1", paper, [source]);
    expect(client.calls.some((c) => c.text.startsWith("INSERT INTO sources"))).toBe(false);
    expect(client.calls.some((c) => c.text.startsWith("UPDATE sources"))).toBe(true);
  });

  it("rolls back and rethrows on failure", async () => {
    const query = vi.fn(async (text: string) => {
      if (text.startsWith("INSERT INTO papers")) throw new Error("insert failed");
      return { rows: [] };
    });
    await expect(
      upsertPaperWithSources({ query } as unknown as QueryableClient, "researcher-1", paper, []),
    ).rejects.toThrow("insert failed");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
});
