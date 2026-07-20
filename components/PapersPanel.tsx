"use client";

import { useState } from "react";
import { ACCESS_LEVEL_LABELS } from "../lib/labels";
import type { AccessLevel, ImportPublicationsResponse, ResolveTitlesResponse } from "../lib/types";

export interface PaperRow {
  id: string;
  title: string;
  doi: string;
  publicationYear: number | null;
  venue: string | null;
  access: AccessLevel;
  addedByUser: boolean;
}

function accessLevelBreakdown(papers: PaperRow[]): [AccessLevel, number][] {
  const counts = new Map<AccessLevel, number>();
  for (const paper of papers) counts.set(paper.access, (counts.get(paper.access) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

type ImportState = { kind: "idle" } | { kind: "running" } | { kind: "done"; result: ImportPublicationsResponse } | { kind: "error" };
type ResolveState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: ResolveTitlesResponse }
  | { kind: "error"; message: string };

export default function PapersPanel({
  researcherId,
  initialPapers,
}: {
  researcherId: string;
  initialPapers: PaperRow[];
}) {
  const [papers, setPapers] = useState(initialPapers);
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [titlesInput, setTitlesInput] = useState("");
  const [resolveState, setResolveState] = useState<ResolveState>({ kind: "idle" });

  async function refreshPapers() {
    const res = await fetch(`/api/researchers/${researcherId}/papers`).catch(() => null);
    if (res?.ok) setPapers(await res.json());
  }

  async function runImport() {
    setImportState({ kind: "running" });
    try {
      const res = await fetch(`/api/researchers/${researcherId}/papers/import`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const result: ImportPublicationsResponse = await res.json();
      setImportState({ kind: "done", result });
      await refreshPapers();
    } catch {
      setImportState({ kind: "error" });
    }
  }

  async function runResolve() {
    const titles = titlesInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (titles.length === 0 || titles.length > 10) {
      setResolveState({ kind: "error", message: "Enter between 1 and 10 titles" });
      return;
    }

    setResolveState({ kind: "running" });
    try {
      const res = await fetch(`/api/researchers/${researcherId}/papers/resolve-titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "failed");
      }
      const result: ResolveTitlesResponse = await res.json();
      setResolveState({ kind: "done", result });
      await refreshPapers();
    } catch (err) {
      setResolveState({ kind: "error", message: err instanceof Error ? err.message : "The operation failed" });
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Publications</h2>
        <button
          onClick={runImport}
          disabled={importState.kind === "running"}
          className="rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-sm text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
        >
          {importState.kind === "running" ? "Importing…" : "Import publications"}
        </button>
      </div>

      {importState.kind === "done" && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-rule bg-paper-2 p-2 text-sm text-ink">
          {importState.result.source === "unavailable" ? (
            <>No reliable publication source was found for this researcher (no ORCID and no unambiguous name match).</>
          ) : (
            <>
              Found {importState.result.found} · imported {importState.result.imported} · updated{" "}
              {importState.result.updated} · skipped {importState.result.skipped}
              {importState.result.failed > 0 && <> · failed {importState.result.failed}</>}
            </>
          )}
        </p>
      )}
      {importState.kind === "error" && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-2 text-sm text-danger">
          Publication import failed.{" "}
          <button onClick={runImport} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      )}

      {papers.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-rule p-4 text-center text-sm text-muted">
          No publications recorded for this researcher yet.
        </p>
      ) : (
        <details className="rounded-[var(--radius-card)] border border-rule p-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            {papers.length} publication{papers.length === 1 ? "" : "s"} ·{" "}
            {accessLevelBreakdown(papers)
              .map(([level, count]) => `${count} ${ACCESS_LEVEL_LABELS[level].toLowerCase()}`)
              .join(" · ")}
          </summary>
          <ul className="mt-2 space-y-2">
            {papers.map((paper) => (
              <li key={paper.id} className="rounded-[var(--radius-card)] border border-rule p-3 text-sm text-ink">
                <div className="font-medium">{paper.title}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                  {paper.publicationYear && <span>{paper.publicationYear}</span>}
                  {paper.venue && <span>{paper.venue}</span>}
                  <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-accent">
                    {ACCESS_LEVEL_LABELS[paper.access]}
                  </span>
                  {paper.addedByUser && (
                    <span className="rounded-[var(--radius-pill)] bg-warning-bg px-2 py-0.5 text-warning">
                      Added manually
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-ink">Add publications by title</h3>
        <p className="mb-2 text-xs text-muted">Up to 10 titles, one per line.</p>
        <textarea
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          rows={4}
          placeholder="One publication title per line"
          className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
        />
        <button
          onClick={runResolve}
          disabled={resolveState.kind === "running"}
          className="mt-2 rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {resolveState.kind === "running" ? "Matching…" : "Identify & add"}
        </button>

        {resolveState.kind === "error" && (
          <p className="mt-2 text-sm text-danger">{resolveState.message}</p>
        )}

        {resolveState.kind === "done" && (
          <ul className="mt-3 space-y-1 text-sm">
            {resolveState.result.results.map((r, i) => (
              <li key={i}>
                {r.status === "resolved" && <span className="text-success">Found: {r.matchedTitle}</span>}
                {r.status === "ambiguous" && (
                  <span className="text-warning">
                    {r.title} — multiple possible matches found ({r.candidates?.length}), pick manually.
                  </span>
                )}
                {r.status === "unrelated" && <span className="text-muted">{r.title} — no match found.</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
