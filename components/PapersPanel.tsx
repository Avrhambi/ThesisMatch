"use client";

import { useEffect, useState } from "react";
import { ACCESS_LEVEL_LABELS, SELECTION_REASON_LABELS, analysisErrorMessage } from "../lib/labels";
import type { AccessLevel, AnalysisResponse, ImportPublicationsResponse } from "../lib/types";
import type { PaperReview } from "./AnalysisPanel";

export interface PaperRow {
  id: string;
  title: string;
  doi: string;
  publicationYear: number | null;
  venue: string | null;
  access: AccessLevel;
  addedByUser: boolean;
}

type ImportState = { kind: "idle" } | { kind: "running" } | { kind: "done"; result: ImportPublicationsResponse } | { kind: "error" };
type AnalyzeState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "confirm_extra" }
  | { kind: "error"; message: string };

async function fetchReviewByPaperId(researcherId: string): Promise<Map<string, PaperReview>> {
  const [deep, additional] = await Promise.all([
    fetch(`/api/researchers/${researcherId}/analyses/deep`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null) as Promise<{ analysis: AnalysisResponse | null } | AnalysisResponse | null>,
    fetch(`/api/researchers/${researcherId}/analyses/additional`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null) as Promise<{ papers: PaperReview[] } | null>,
  ]);

  const analysis = deep ? ("analysis" in deep ? deep.analysis : deep) : null;
  const review = (analysis?.result ?? null) as { papers?: PaperReview[] } | null;

  const map = new Map<string, PaperReview>();
  for (const paper of review?.papers ?? []) map.set(paper.paperId, paper);
  for (const paper of additional?.papers ?? []) map.set(paper.paperId, paper);
  return map;
}

export default function PapersPanel({
  researcherId,
  initialPapers,
}: {
  researcherId: string;
  initialPapers: PaperRow[];
}) {
  const [papers, setPapers] = useState(initialPapers);
  const [reviewByPaperId, setReviewByPaperId] = useState<Map<string, PaperReview>>(new Map());
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [analyzeTitlesInput, setAnalyzeTitlesInput] = useState("");
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>({ kind: "idle" });

  useEffect(() => {
    fetchReviewByPaperId(researcherId).then(setReviewByPaperId);
  }, [researcherId]);

  async function refreshAll() {
    const [papersRes, review] = await Promise.all([
      fetch(`/api/researchers/${researcherId}/papers`).catch(() => null),
      fetchReviewByPaperId(researcherId),
    ]);
    if (papersRes?.ok) setPapers(await papersRes.json());
    setReviewByPaperId(review);
  }

  async function runImport() {
    setImportState({ kind: "running" });
    try {
      const res = await fetch(`/api/researchers/${researcherId}/papers/import`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const result: ImportPublicationsResponse = await res.json();
      setImportState({ kind: "done", result });
      await refreshAll();
    } catch {
      setImportState({ kind: "error" });
    }
  }

  // additional_papers_analysis produces only { papers: [...] }, merged into
  // the publication list above by paperId (SPEC Flow 2).
  async function runAnalyzeAdditional(confirmExtra: boolean) {
    const titles = analyzeTitlesInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (titles.length === 0 || titles.length > 10) {
      setAnalyzeState({ kind: "error", message: "Enter between 1 and 10 titles" });
      return;
    }

    setAnalyzeState({ kind: "running" });
    try {
      const res = await fetch(`/api/researchers/${researcherId}/analyses/additional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles, confirmExtra }),
      });
      if (res.status === 409) {
        setAnalyzeState({ kind: "confirm_extra" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAnalyzeState({ kind: "error", message: analysisErrorMessage(body?.error ?? "") });
        return;
      }
      setAnalyzeTitlesInput("");
      setAnalyzeState({ kind: "idle" });
      await refreshAll();
    } catch {
      setAnalyzeState({ kind: "error", message: "Analysis failed" });
    }
  }

  const reviewedPapers = papers.filter((p) => reviewByPaperId.has(p.id));
  const unreviewedPapers = papers.filter((p) => !reviewByPaperId.has(p.id));
  const extraReviewed = Array.from(reviewByPaperId.values()).filter(
    (review) => !papers.some((p) => p.id === review.paperId)
  );
  const reviewedCount = reviewedPapers.length + extraReviewed.length;

  return (
    <section className="rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Publication review</h2>
          {papers.length > 0 && (
            <p className="text-xs text-muted">
              {papers.length} publication{papers.length === 1 ? "" : "s"} · {reviewedCount} reviewed by AI
            </p>
          )}
        </div>
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

      {papers.length === 0 && extraReviewed.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-rule p-4 text-center text-sm text-muted">
          No publications recorded for this researcher yet.
        </p>
      ) : (
        <>
          {reviewedPapers.length === 0 && extraReviewed.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-rule p-4 text-center text-sm text-muted">
              No publications have an AI review yet. Run an analysis, or see the unreviewed list below.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviewedPapers.map((paper) => {
                const review = reviewByPaperId.get(paper.id)!;
                return (
                  <li key={paper.id} className="rounded-[var(--radius-card)] border border-rule p-3">
                    <div className="font-medium text-ink">{paper.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
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
                      {review.selectionReason && (
                        <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5">
                          {SELECTION_REASON_LABELS[review.selectionReason] ?? review.selectionReason}
                        </span>
                      )}
                    </div>
                    <PaperReviewBlock review={review} />
                  </li>
                );
              })}
              {extraReviewed.map((review) => (
                <li key={review.paperId} className="rounded-[var(--radius-card)] border border-rule p-3">
                  <div className="font-medium text-ink">{review.title ?? "(title unavailable)"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {review.publicationYear && <span>{review.publicationYear}</span>}
                    {review.venue && <span>{review.venue}</span>}
                    {review.access && (
                      <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-accent">
                        {ACCESS_LEVEL_LABELS[review.access]}
                      </span>
                    )}
                  </div>
                  <PaperReviewBlock review={review} />
                </li>
              ))}
            </ul>
          )}

          {unreviewedPapers.length > 0 && (
            <details className="mt-4 rounded-[var(--radius-card)] border border-rule p-3 text-sm">
              <summary className="cursor-pointer font-medium text-muted">
                {unreviewedPapers.length} publication{unreviewedPapers.length === 1 ? "" : "s"} not yet analyzed by AI
              </summary>
              <ul className="mt-2 space-y-2">
                {unreviewedPapers.map((paper) => (
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
        </>
      )}

      <div className="mt-6 space-y-6 border-t border-rule pt-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Add &amp; analyze publications</h3>
          <p className="mb-2 text-xs text-muted">
            Up to 10 titles, one per line. Runs an AI review immediately and appends it to the list above.
          </p>
          <textarea
            value={analyzeTitlesInput}
            onChange={(e) => setAnalyzeTitlesInput(e.target.value)}
            rows={3}
            placeholder="One publication title per line"
            className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
          />

          {analyzeState.kind === "confirm_extra" && (
            <div className="mt-2 rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-3 text-sm text-ink">
              <p className="mb-2">You&rsquo;ve exceeded the daily quota of five analyses. Continue with another analysis?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => runAnalyzeAdditional(true)}
                  className="rounded-[var(--radius-input)] bg-warning px-3 py-1.5 text-white transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
                >
                  Confirm &amp; run
                </button>
                <button
                  onClick={() => setAnalyzeState({ kind: "idle" })}
                  className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-ink hover:border-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => runAnalyzeAdditional(false)}
            disabled={analyzeState.kind === "running"}
            className="mt-2 rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {analyzeState.kind === "running" ? "Analyzing…" : "Analyze additional publications"}
          </button>

          {analyzeState.kind === "error" && <p className="mt-2 text-sm text-danger">{analyzeState.message}</p>}
        </div>
      </div>
    </section>
  );
}

function PaperReviewBlock({ review }: { review: PaperReview }) {
  // Analyses stored before keyConcepts existed have no such field in their
  // persisted result_json -- fall back to [] rather than crash on legacy data.
  const keyConcepts = review.keyConcepts ?? [];
  if (
    !review.question &&
    !review.method &&
    !review.results &&
    keyConcepts.length === 0 &&
    review.limitations.length === 0 &&
    review.sources.length === 0
  ) {
    return null;
  }
  return (
    <div className="mt-3 space-y-1.5 rounded-[var(--radius-card)] bg-paper-2 p-3 text-sm text-ink">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">AI review</p>
      {keyConcepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keyConcepts.map((concept, i) => (
            <span key={i} className="rounded-[var(--radius-pill)] bg-paper px-2 py-0.5 text-xs text-ink">
              {concept}
            </span>
          ))}
        </div>
      )}
      {review.question && (
        <p>
          <span className="font-medium">Research question — </span>
          {review.question}
        </p>
      )}
      {review.method && (
        <p>
          <span className="font-medium">Method — </span>
          {review.method}
        </p>
      )}
      {review.results && (
        <p>
          <span className="font-medium">Results — </span>
          {review.results}
        </p>
      )}
      {review.limitations.length > 0 && (
        <p>
          <span className="font-medium">Limitations — </span>
          {review.limitations.join("; ")}
        </p>
      )}
      {review.sources.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-muted">
          {review.sources.map((source) => (
            <li key={source.sourceId}>
              <a href={source.url} target="_blank" rel="noreferrer" className="truncate hover:text-accent hover:underline">
                {source.url}
              </a>{" "}
              · {ACCESS_LEVEL_LABELS[source.access]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
