import { describe, expect, it, vi } from "vitest";
import { contactEventTypeForDecision, upsertDiscoveredResearcher, type QueryableClient } from "../../lib/repositories/researchers";

function createFakeClient(existingRow: Record<string, unknown> | null, existingBranches: string[] = []) {
  const calls: { text: string; params?: unknown[] }[] = [];
  const query = vi.fn(async (text: string, params?: unknown[]) => {
    calls.push({ text, params });
    const kind = text.trim().split(/\s+/)[0];
    if (kind === "SELECT" && text.includes("FROM researchers")) {
      return { rows: existingRow ? [existingRow] : [] };
    }
    if (kind === "SELECT" && text.includes("FROM researcher_branches")) {
      return { rows: existingBranches.map((branch) => ({ branch })) };
    }
    if (kind === "INSERT" && text.includes("INTO researchers")) {
      return { rows: [{ id: existingRow?.id ?? "new-id" }] };
    }
    return { rows: [] };
  });
  return { query, calls } as unknown as QueryableClient & { calls: { text: string; params?: unknown[] }[] };
}

describe("upsertDiscoveredResearcher", () => {
  const input = {
    fullName: "Prof. Uri Abdu",
    normalizedName: "prof uri abdu",
    crisUrl: "https://www.bgu.ac.il/en/people/abdu/",
    orcid: "https://orcid.org/0000-0003-1226-0750",
    branches: ["s3" as const],
  };

  it("wraps discovery in a single transaction", async () => {
    const client = createFakeClient(null);

    await upsertDiscoveredResearcher(client, input);

    expect(client.calls[0].text).toBe("BEGIN");
    expect(client.calls.at(-1)?.text).toBe("COMMIT");
    expect(client.calls.map((c) => c.text)).not.toContain("ROLLBACK");
  });

  it("never writes decision or personal_note on merge", async () => {
    const client = createFakeClient({ id: "existing-id", full_name: "Old Name", orcid: null });

    await upsertDiscoveredResearcher(client, input);

    const upsertCall = client.calls.find((c) => c.text.includes("INTO researchers"));
    expect(upsertCall).toBeDefined();
    expect(upsertCall!.text).not.toMatch(/decision/i);
    expect(upsertCall!.text).not.toMatch(/personal_note/i);
  });

  it("replaces branch rows for the researcher", async () => {
    const client = createFakeClient({ id: "existing-id", full_name: "Prof. Uri Abdu", orcid: null }, [
      "theory_of_computing",
    ]);

    await upsertDiscoveredResearcher(client, input);

    const deleteCall = client.calls.find((c) => c.text.startsWith("DELETE FROM researcher_branches"));
    const insertBranchCall = client.calls.find((c) => c.text.startsWith("INSERT INTO researcher_branches"));
    expect(deleteCall).toBeDefined();
    expect(insertBranchCall?.params).toEqual(["existing-id", "s3"]);
  });

  it("reports changed=false when nothing differs from the prior row", async () => {
    const client = createFakeClient(
      { id: "existing-id", full_name: input.fullName, orcid: input.orcid },
      ["s3"],
    );

    const result = await upsertDiscoveredResearcher(client, input);

    expect(result.changed).toBe(false);
  });

  it("reports changed=true for a newly discovered researcher", async () => {
    const client = createFakeClient(null);

    const result = await upsertDiscoveredResearcher(client, input);

    expect(result.changed).toBe(true);
  });

  it("rolls back and rethrows if the upsert fails", async () => {
    const query = vi.fn(async (text: string) => {
      const kind = text.trim().split(/\s+/)[0];
      if (kind === "INSERT" && text.includes("INTO researchers")) throw new Error("insert failed");
      return { rows: [] };
    });

    await expect(
      upsertDiscoveredResearcher({ query } as unknown as QueryableClient, input),
    ).rejects.toThrow("insert failed");
    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
});

describe("contactEventTypeForDecision", () => {
  it("maps already_contacted to a contacted event", () => {
    expect(contactEventTypeForDecision("already_contacted")).toBe("contacted");
  });

  it("maps meeting_scheduled to a meeting_scheduled event", () => {
    expect(contactEventTypeForDecision("meeting_scheduled")).toBe("meeting_scheduled");
  });

  it("maps closed to a closed event", () => {
    expect(contactEventTypeForDecision("closed")).toBe("closed");
  });

  it("has no event for decisions without a contact_events counterpart", () => {
    expect(contactEventTypeForDecision("waiting_for_reply")).toBeNull();
    expect(contactEventTypeForDecision("temporarily_unavailable")).toBeNull();
    expect(contactEventTypeForDecision("new")).toBeNull();
  });
});
