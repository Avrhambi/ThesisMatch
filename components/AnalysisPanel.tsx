"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ANALYSIS_STATE_LABELS,
  FIT_DIMENSION_LABELS,
  MATCH_LEVEL_LABELS,
  PRIORITY_LABELS,
  SUPERVISION_STATUS_LABELS,
  analysisErrorMessage,
} from "../lib/labels";
import type { AccessLevel, AnalysisResponse, AnalysisState, FitAssessment, MatchLevel, Priority, SupervisionStatus } from "../lib/types";

export interface PaperReview {
  paperId: string;
  question: string | null;
  method: string | null;
  results: string | null;
  keyConcepts: string[];
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
  | { kind: "confirm_extra" }
  | { kind: "error"; message: string }
  | { kind: "result"; analysis: AnalysisResponse };

export default function AnalysisPanel({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const searchParams = useSearchParams();
  const autoAnalyzeTriggered = useRef(false);

  useEffect(() => {
    fetch(`/api/researchers/${researcherId}/analyses/deep`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data: { analysis: AnalysisResponse | null } | AnalysisResponse | null) => {
        if (!data) return setState({ kind: "empty" });
        const analysis = "analysis" in data ? data.analysis : data;
        setState(analysis ? { kind: "result", analysis } : { kind: "empty" });
      });
  }, [researcherId]);

  // A deep analysis can be in flight without this panel having started it --
  // the background auto-fill scheduler (readyForReviewScheduler) creates
  // pending/running rows too. Without polling, the panel would show a frozen
  // "Analyzing…" and the user would have to refresh the page repeatedly to see
  // the finished result. Poll until the row reaches a terminal state.
  const pollingAnalysis = state.kind === "result" ? state.analysis : null;
  const pollingState = pollingAnalysis?.state;
  useEffect(() => {
    if (pollingState !== "pending" && pollingState !== "running") return;
    let cancelled = false;
    const timer = setInterval(() => {
      fetch(`/api/researchers/${researcherId}/analyses/deep`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
        .then((data: { analysis: AnalysisResponse | null } | AnalysisResponse | null) => {
          if (cancelled || !data) return;
          const analysis = "analysis" in data ? data.analysis : data;
          if (analysis) setState({ kind: "result", analysis });
        });
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollingState, researcherId]);

  async function runDeepAnalysis(confirmExtra: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/researchers/${researcherId}/analyses/deep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmExtra }),
      });
      if (res.status === 409) {
        setState({ kind: "confirm_extra" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // Another run (usually the background auto-fill) already holds this
        // researcher's analysis slot. Don't surface an error -- switch to the
        // in-flight record so the poller carries it to completion.
        if (body?.error === "already_running") {
          const data = await fetch(`/api/researchers/${researcherId}/analyses/deep`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          const analysis = data && ("analysis" in data ? data.analysis : data);
          if (analysis) {
            setState({ kind: "result", analysis });
            return;
          }
        }
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

  if (state.kind === "loading") {
    return <p className="text-sm text-muted">Loading analysis&hellip;</p>;
  }

  if (state.kind === "confirm_extra") {
    return (
      <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-4 text-sm text-ink">
        <p className="mb-2">You&rsquo;ve exceeded the daily quota of five analyses. Continue with another analysis?</p>
        <div className="flex gap-2">
          <button
            onClick={() => runDeepAnalysis(true)}
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

      {analysis.state === "failed" && (
        <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          {analysisErrorMessage(analysis.errorCode ?? "")}
        </div>
      )}

      {review && (
        <div className="space-y-5 rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          {/* Decision comes first: priority, supervision risk, and why -- before the descriptive summary. */}
          <div className="flex flex-wrap items-center gap-2">
            {review.priority && (
              <span
                className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-xs font-medium text-ink ${
                  review.priority === "high_priority"
                    ? "border-success/40 bg-success-bg/60"
                    : review.priority === "do_not_prioritize"
                      ? "border-danger/40 bg-danger-bg/60"
                      : "border-rule bg-paper-2"
                }`}
              >
                {PRIORITY_LABELS[review.priority]}
              </span>
            )}
            <span className="text-xs font-medium text-muted">
              Overall fit: {MATCH_LEVEL_LABELS[review.fit]}
            </span>
          </div>

          {review.supervisionStatus === "unverified" && (
            <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg/50 p-3 text-sm text-ink">
              <p className="font-semibold text-warning">{SUPERVISION_STATUS_LABELS.unverified}</p>
              <p className="mt-1 text-xs text-muted">
                This researcher&rsquo;s listed title suggests Emeritus or retired status. Verify they still supervise
                M.Sc. students before contacting.
              </p>
            </div>
          )}

          {review.recommendationReason && (
            <p className="text-sm leading-relaxed text-ink">{review.recommendationReason}</p>
          )}

          {review.summary && <p className="text-sm leading-relaxed text-ink">{review.summary}</p>}
          {review.topics.length > 0 && (
            <p className="text-xs text-muted">Recurring topics: {review.topics.join(", ")}</p>
          )}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Fit dimensions</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["topicFit", "methodFit", "mechanismFit", "practicalFit"] as const).map((dim) => (
                <div key={dim} className="rounded-[var(--radius-card)] border border-rule p-2">
                  <p className="text-xs font-medium text-muted">{FIT_DIMENSION_LABELS[dim]}</p>
                  <p className="text-sm font-semibold">{MATCH_LEVEL_LABELS[review[dim]?.level ?? "unknown"]}</p>
                  {review[dim]?.reasoning && <p className="mt-1 text-xs text-muted">{review[dim].reasoning}</p>}
                </div>
              ))}
            </div>
          </div>

          {(review.disqualifyingFactors?.length ?? 0) > 0 && (
            <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-warning">Disqualifying factors</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {review.disqualifyingFactors.map((factor, i) => (
                  <li key={i}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {(review.missingEvidence?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Missing evidence</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted">
                {review.missingEvidence.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {review.thesisDirections.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Possible thesis directions</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
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
    </div>
  );
}
