"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ACCESS_LEVEL_LABELS,
  ANALYSIS_STATE_LABELS,
  FIT_DIMENSION_LABELS,
  MATCH_LEVEL_LABELS,
  PRIORITY_LABELS,
  SELECTION_REASON_LABELS,
  SUPERVISION_STATUS_LABELS,
  analysisErrorMessage,
} from "../lib/labels";
import type { AccessLevel, AnalysisResponse, AnalysisState, FitAssessment, MatchLevel, Priority, SupervisionStatus } from "../lib/types";

interface PaperReview {
  paperId: string;
  question: string | null;
  method: string | null;
  results: string | null;
  limitations: string[];
  fit: string;
  thesisPotential: string;
  evidence: { sourceId: string; label: string; access: string }[];
  title: string | null;
  publicationYear: number | null;
  venue: string | null;
  access: AccessLevel | null;
  selectionReason: string | null;
  sources: { sourceId: string; type: string; url: string; access: AccessLevel }[];
}

interface ResearcherReview {
  summary: string;
  topics: string[];
  industryOrientation: string;
  technicalOrientation: string;
  topicFit: FitAssessment;
  methodFit: FitAssessment;
  mechanismFit: FitAssessment;
  practicalFit: FitAssessment;
  fit: MatchLevel;
  priority: Priority;
  supervisionStatus: SupervisionStatus;
  recommendationReason: string;
  disqualifyingFactors: string[];
  missingEvidence: string[];
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

export interface AnalysisPanelSections {
  verdict: boolean;
  papers: boolean;
}

export default function AnalysisPanel({
  researcherId,
  sections = { verdict: true, papers: true },
}: {
  researcherId: string;
  sections?: AnalysisPanelSections;
}) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [additionalPapers, setAdditionalPapers] = useState<PaperReview[]>([]);
  const [titlesInput, setTitlesInput] = useState("");
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const autoAnalyzeTriggered = useRef(false);

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
        setState({ kind: "error", message: analysisErrorMessage(body?.error ?? "") });
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

  // "Ask for another review" on the Researchers screen links here with
  // ?autoAnalyze=1 so the same Analyze flow (including quota confirmation)
  // runs immediately instead of requiring an extra click.
  useEffect(() => {
    if (state.kind !== "empty") return;
    if (searchParams.get("autoAnalyze") !== "1") return;
    if (autoAnalyzeTriggered.current) return;
    autoAnalyzeTriggered.current = true;
    runDeepAnalysis(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, searchParams]);

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
        setState({ kind: "error", message: analysisErrorMessage(body?.error ?? "") });
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
    return sections.verdict ? <p className="text-sm text-muted">Loading analysis&hellip;</p> : null;
  }

  if (state.kind === "confirm_extra") {
    if (!sections.verdict) return null;
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
    if (!sections.verdict) return null;
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
    if (!sections.verdict) return null;
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

  if (!sections.verdict && !sections.papers) return null;

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      {sections.verdict && (
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
      )}

      {sections.verdict && review && (
        <div className="space-y-4 rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          {/* Decision comes first: priority, supervision risk, and why -- before the descriptive summary. */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium ${
                review.priority === "high_priority"
                  ? "bg-success-bg text-success"
                  : review.priority === "do_not_prioritize"
                    ? "bg-danger-bg text-danger"
                    : "bg-paper-2 text-ink"
              }`}
            >
              {PRIORITY_LABELS[review.priority]}
            </span>
            <span className="text-xs text-muted">
              Overall fit: {MATCH_LEVEL_LABELS[review.fit]}
            </span>
          </div>

          {review.supervisionStatus === "unverified" && (
            <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
              <p className="font-medium">{SUPERVISION_STATUS_LABELS.unverified}</p>
              <p className="mt-1 text-xs">
                This researcher&rsquo;s listed title suggests Emeritus or retired status. Verify they still supervise
                M.Sc. students before contacting.
              </p>
            </div>
          )}

          {review.recommendationReason && <p>{review.recommendationReason}</p>}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["topicFit", "methodFit", "mechanismFit", "practicalFit"] as const).map((dim) => (
              <div key={dim} className="rounded-[var(--radius-card)] border border-rule p-2">
                <p className="text-xs font-medium text-muted">{FIT_DIMENSION_LABELS[dim]}</p>
                <p className="text-sm">{MATCH_LEVEL_LABELS[review[dim].level]}</p>
                <p className="mt-1 text-xs text-muted">{review[dim].reasoning}</p>
              </div>
            ))}
          </div>

          {review.disqualifyingFactors.length > 0 && (
            <div>
              <p className="font-medium text-warning">Disqualifying factors</p>
              <ul className="list-inside list-disc text-warning">
                {review.disqualifyingFactors.map((factor, i) => (
                  <li key={i}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {review.missingEvidence.length > 0 && (
            <div>
              <p className="font-medium text-muted">Missing evidence</p>
              <ul className="list-inside list-disc text-muted">
                {review.missingEvidence.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <p>{review.summary}</p>
          {review.topics.length > 0 && (
            <p className="text-xs text-muted">Recurring topics: {review.topics.join(", ")}</p>
          )}
          {review.thesisDirections.length > 0 ? (
            <div>
              <p className="font-medium">Possible thesis directions</p>
              <ul className="list-inside list-disc">
                {review.thesisDirections.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted">No high-confidence thesis direction found for this researcher.</p>
          )}
        </div>
      )}

      {sections.papers && allPapers.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          <p className="mb-2 font-medium">Publication review</p>
          <ul className="space-y-3">
            {allPapers.map((paper) => (
              <li key={paper.paperId} className="rounded-[var(--radius-card)] border border-rule p-3">
                <div className="mb-1 font-medium text-ink">{paper.title ?? "(title unavailable)"}</div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {paper.publicationYear && <span>{paper.publicationYear}</span>}
                  {paper.venue && <span>{paper.venue}</span>}
                  {paper.access && (
                    <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-accent">
                      {ACCESS_LEVEL_LABELS[paper.access]}
                    </span>
                  )}
                  {paper.selectionReason && (
                    <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5">
                      {SELECTION_REASON_LABELS[paper.selectionReason] ?? paper.selectionReason}
                    </span>
                  )}
                </div>
                {paper.question && <p>Research question: {paper.question}</p>}
                {paper.method && <p>Method: {paper.method}</p>}
                {paper.results && <p>Results: {paper.results}</p>}
                {paper.sources.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {paper.sources.map((source) => (
                      <li key={source.sourceId}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-accent hover:underline"
                        >
                          {source.url}
                        </a>{" "}
                        · {ACCESS_LEVEL_LABELS[source.access]}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.papers && (
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
      )}
    </div>
  );
}
