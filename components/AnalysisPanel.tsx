"use client";

import { useEffect, useState } from "react";
import { ANALYSIS_STATE_LABELS, MATCH_LEVEL_LABELS } from "../lib/labels";
import type { AnalysisResponse, AnalysisState } from "../lib/types";

interface PaperReview {
  paperId: string;
  question: string | null;
  method: string | null;
  results: string | null;
  limitations: string[];
  fit: string;
  thesisPotential: string;
  evidence: { sourceId: string; label: string; access: string }[];
}

interface ResearcherReview {
  summary: string;
  topics: string[];
  industryOrientation: string;
  technicalOrientation: string;
  fit: string;
  matches: string[];
  mismatches: string[];
  thesisDirections: string[];
  papers: PaperReview[];
}

type PanelState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "confirm_extra"; action: "deep" | "additional" }
  | { kind: "error"; message: string }
  | { kind: "result"; analysis: AnalysisResponse };

async function fetchAdditionalPapers(researcherId: string): Promise<PaperReview[]> {
  const res = await fetch(`/api/researchers/${researcherId}/analyses/additional`).catch(() => null);
  if (!res?.ok) return [];
  const body: { papers: PaperReview[] } = await res.json();
  return body.papers ?? [];
}

export default function AnalysisPanel({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [additionalPapers, setAdditionalPapers] = useState<PaperReview[]>([]);
  const [titlesInput, setTitlesInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/researchers/${researcherId}/analyses/deep`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null) as Promise<{ analysis: AnalysisResponse | null } | AnalysisResponse | null>,
      fetchAdditionalPapers(researcherId),
    ]).then(([data, additional]) => {
      setAdditionalPapers(additional);
      if (!data) return setState({ kind: "empty" });
      const analysis = "analysis" in data ? data.analysis : data;
      setState(analysis ? { kind: "result", analysis } : { kind: "empty" });
    });
  }, [researcherId]);

  async function runDeepAnalysis(confirmExtra: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/researchers/${researcherId}/analyses/deep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmExtra }),
      });
      if (res.status === 409) {
        setState({ kind: "confirm_extra", action: "deep" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setState({ kind: "error", message: body?.error ?? "Analysis failed" });
        return;
      }
      const analysis: AnalysisResponse = await res.json();
      setState({ kind: "result", analysis });
    } catch {
      setState({ kind: "error", message: "Analysis failed" });
    } finally {
      setBusy(false);
    }
  }

  // additional_papers_analysis produces only { papers: [...] }, appended to
  // the existing deep-analysis review (SPEC Flow 2) — it never replaces the
  // panel's main "result" state, which stays the deep analysis.
  async function runAdditionalAnalysis(confirmExtra: boolean) {
    const titles = titlesInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (titles.length === 0 || titles.length > 10) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/researchers/${researcherId}/analyses/additional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titles, confirmExtra }),
      });
      if (res.status === 409) {
        setState({ kind: "confirm_extra", action: "additional" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setState({ kind: "error", message: body?.error ?? "Analysis failed" });
        return;
      }
      const body: { analysis: AnalysisResponse | null } = await res.json();
      if (body.analysis) {
        setAdditionalPapers(await fetchAdditionalPapers(researcherId));
        setTitlesInput("");
      }
    } catch {
      setState({ kind: "error", message: "Analysis failed" });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return <p className="text-sm text-muted">Loading analysis&hellip;</p>;
  }

  if (state.kind === "confirm_extra") {
    const confirm = () => (state.action === "deep" ? runDeepAnalysis(true) : runAdditionalAnalysis(true));
    return (
      <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-4 text-sm text-ink">
        <p className="mb-2">You&rsquo;ve exceeded the daily quota of five analyses. Continue with another analysis?</p>
        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={busy}
            className="rounded-[var(--radius-input)] bg-warning px-3 py-1.5 text-white transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
          >
            Confirm &amp; run
          </button>
          <button
            onClick={() => setState({ kind: "empty" })}
            className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-ink hover:border-accent"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
        <p className="mb-2">{state.message}</p>
        <button onClick={() => runDeepAnalysis(false)} disabled={busy} className="underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-rule p-8 text-center text-ink">
        <p className="mb-3">{ANALYSIS_STATE_LABELS.not_analyzed}</p>
        <button
          onClick={() => runDeepAnalysis(false)}
          disabled={busy}
          className="rounded-[var(--radius-input)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    );
  }

  const { analysis } = state;
  const review = (analysis.result ?? null) as ResearcherReview | null;
  const allPapers = review ? [...review.papers, ...additionalPapers] : additionalPapers;

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{ANALYSIS_STATE_LABELS[analysis.state as AnalysisState]}</span>
        {analysis.state === "failed" && (
          <button
            onClick={() => runDeepAnalysis(false)}
            disabled={busy}
            className="rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-sm text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
          >
            Try again
          </button>
        )}
      </div>

      {review && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          <p>{review.summary}</p>
          <p className="text-xs text-muted">
            Overall fit: {MATCH_LEVEL_LABELS[review.fit as keyof typeof MATCH_LEVEL_LABELS] ?? review.fit}
          </p>
          {review.topics.length > 0 && (
            <p className="text-xs text-muted">Recurring topics: {review.topics.join(", ")}</p>
          )}
          {review.thesisDirections.length > 0 && (
            <div>
              <p className="font-medium">Possible thesis directions</p>
              <ul className="list-inside list-disc">
                {review.thesisDirections.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {allPapers.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          <p className="mb-2 font-medium">Publication review</p>
          <ul className="space-y-2">
            {allPapers.map((paper) => (
              <li key={paper.paperId} className="rounded-[var(--radius-card)] border border-rule p-2">
                {paper.question && <p>Research question: {paper.question}</p>}
                {paper.method && <p>Method: {paper.method}</p>}
                {paper.results && <p>Results: {paper.results}</p>}
                <p className="text-xs text-muted">Sources: {paper.evidence.length}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Add publications to the analysis</h3>
        <p className="mb-2 text-xs text-muted">
          Up to 10 titles, one per line. The analysis will be appended to the existing review.
        </p>
        <textarea
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          rows={3}
          placeholder="One publication title per line"
          className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
        />
        <button
          onClick={() => runAdditionalAnalysis(false)}
          disabled={busy}
          className="mt-2 rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {busy ? "Analyzing…" : "Analyze additional publications"}
        </button>
      </div>
    </div>
  );
}
