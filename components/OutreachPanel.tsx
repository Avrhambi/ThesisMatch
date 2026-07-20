"use client";

import { useEffect, useState } from "react";
import { ANALYSIS_STATE_LABELS, CV_RECOMMENDATION_TYPE_LABELS, DECISION_LABELS } from "../lib/labels";
import type { AnalysisResponse, AnalysisState, CvRecommendation, DecisionStatus, ExcludedClaim, OutreachResult } from "../lib/types";

type PanelState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "confirm_extra" }
  | { kind: "error"; message: string }
  | { kind: "result"; analysis: AnalysisResponse; copiedAt: string | null; sentAt: string | null };

interface OutreachGetResponse {
  note: string | null;
  analysis: AnalysisResponse | null;
  copiedAt: string | null;
  sentAt: string | null;
}

export default function OutreachPanel({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentDecision, setSentDecision] = useState<DecisionStatus>("waiting_for_reply");
  const [copyLabel, setCopyLabel] = useState("Copy email");
  const [pendingRegenerate, setPendingRegenerate] = useState(false);

  useEffect(() => {
    fetch(`/api/researchers/${researcherId}/outreach`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OutreachGetResponse | null) => {
        if (data?.note) setNote(data.note);
        if (data?.analysis) {
          setState({ kind: "result", analysis: data.analysis, copiedAt: data.copiedAt, sentAt: data.sentAt });
        } else {
          setState({ kind: "empty" });
        }
      })
      .catch(() => setState({ kind: "error", message: "Failed to load outreach" }));
  }, [researcherId]);

  async function generate(confirmExtra: boolean, regenerate: boolean) {
    if (note.trim().length === 0 || note.trim().length > 10000) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/researchers/${researcherId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), confirmExtra, regenerate }),
      });
      if (res.status === 409) {
        setPendingRegenerate(regenerate);
        setState({ kind: "confirm_extra" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setState({ kind: "error", message: body?.error ?? "Failed to generate outreach" });
        return;
      }
      const data: { analysis: AnalysisResponse; copiedAt: string | null; sentAt: string | null } = await res.json();
      setState({ kind: "result", analysis: data.analysis, copiedAt: data.copiedAt, sentAt: data.sentAt });
    } catch {
      setState({ kind: "error", message: "Failed to generate outreach" });
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy email"), 2000);
    } catch {
      /* clipboard unavailable */
    }
    await fetch(`/api/researchers/${researcherId}/outreach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy" }),
    }).catch(() => {});
    if (state.kind === "result") setState({ ...state, copiedAt: new Date().toISOString() });
  }

  async function markSent() {
    const res = await fetch(`/api/researchers/${researcherId}/outreach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sent", decision: sentDecision }),
    }).catch(() => null);
    if (!res?.ok) return;
    const data: { copiedAt: string | null; sentAt: string | null } = await res.json();
    if (state.kind === "result") setState({ ...state, copiedAt: data.copiedAt, sentAt: data.sentAt });
  }

  if (state.kind === "loading") return <p className="text-sm text-muted">Loading outreach&hellip;</p>;

  const noteInput = (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">Specific knowledge about the researcher</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Share relevant information about the researcher (1–10,000 characters)"
        className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
      />
      <p className="mt-1 font-mono text-xs text-muted">{note.trim().length} characters</p>
    </div>
  );

  if (state.kind === "confirm_extra") {
    return (
      <div className="space-y-3">
        {noteInput}
        <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-4 text-sm">
          <p className="mb-2 text-ink">You&rsquo;ve exceeded the daily quota of five analyses. Continue generating another outreach?</p>
          <div className="flex gap-2">
            <button
              onClick={() => generate(true, pendingRegenerate)}
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
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3">
        {noteInput}
        <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
          <p className="mb-2">{state.message}</p>
          <button onClick={() => generate(false, false)} disabled={busy} className="underline underline-offset-2">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="space-y-3">
        {noteInput}
        <button
          onClick={() => generate(false, false)}
          disabled={busy || note.trim().length === 0}
          className="rounded-[var(--radius-input)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate outreach"}
        </button>
      </div>
    );
  }

  const { analysis, copiedAt, sentAt } = state;
  const result = analysis.result as OutreachResult | null;

  return (
    <div className="space-y-4">
      {noteInput}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{ANALYSIS_STATE_LABELS[analysis.state as AnalysisState]}</span>
        <div className="flex gap-2">
          <button
            onClick={() => generate(false, true)}
            disabled={busy || note.trim().length === 0}
            className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent disabled:opacity-50"
          >
            {busy ? "Working…" : "Regenerate"}
          </button>
          {analysis.state === "failed" && (
            <button
              onClick={() => generate(false, false)}
              disabled={busy}
              className="rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-sm text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
            >
              Try again
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-rule p-4 text-sm text-ink">
          <p className="font-medium">{result.subject}</p>
          <p className="whitespace-pre-wrap">{result.body}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyEmail(result.body)}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-xs text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent"
            >
              {copyLabel}
            </button>
            {copiedAt && (
              <span className="text-xs text-muted">Copied on {new Date(copiedAt).toLocaleString("en-US")}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-3">
            <select
              value={sentDecision}
              onChange={(e) => setSentDecision(e.target.value as DecisionStatus)}
              className="rounded-[var(--radius-input)] border border-rule bg-paper px-1.5 py-0.5 text-xs"
            >
              {(Object.keys(DECISION_LABELS) as DecisionStatus[]).map((d) => (
                <option key={d} value={d}>
                  {DECISION_LABELS[d]}
                </option>
              ))}
            </select>
            <button
              onClick={markSent}
              className="rounded-[var(--radius-input)] bg-accent px-3 py-1.5 text-xs text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
            >
              Mark as sent
            </button>
            {sentAt && <span className="text-xs text-muted">Sent on {new Date(sentAt).toLocaleString("en-US")}</span>}
          </div>

          {result.cvRecommendations.length > 0 && (
            <div>
              <p className="mb-2 font-medium">CV recommendations</p>
              <ul className="space-y-2">
                {result.cvRecommendations.map((rec: CvRecommendation, i: number) => (
                  <li key={i} className="rounded-[var(--radius-card)] border border-rule p-2">
                    <p className="text-xs font-medium text-accent">
                      {CV_RECOMMENDATION_TYPE_LABELS[rec.type]} · {rec.section}
                    </p>
                    {rec.suggestedText && <p className="mt-1">{rec.suggestedText}</p>}
                    <p className="mt-1 text-xs text-muted">{rec.reason}</p>
                    <p className="mt-1 text-xs text-muted">Sources: {rec.evidenceIds.length}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.excludedClaims.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-warning">Claims excluded for lack of evidence</p>
              <ul className="list-inside list-disc text-xs text-warning">
                {result.excludedClaims.map((claim: ExcludedClaim, i: number) => (
                  <li key={i}>
                    {claim.claim} — {claim.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
