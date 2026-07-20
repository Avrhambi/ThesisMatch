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
        setState({ kind: "error", message: body?.error ?? "הניתוח נכשל" });
        return;
      }
      const analysis: AnalysisResponse = await res.json();
      setState({ kind: "result", analysis });
    } catch {
      setState({ kind: "error", message: "הניתוח נכשל" });
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
        setState({ kind: "error", message: body?.error ?? "הניתוח נכשל" });
        return;
      }
      const body: { analysis: AnalysisResponse | null } = await res.json();
      if (body.analysis) {
        setAdditionalPapers(await fetchAdditionalPapers(researcherId));
        setTitlesInput("");
      }
    } catch {
      setState({ kind: "error", message: "הניתוח נכשל" });
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === "loading") {
    return <p className="text-sm text-gray-500">טוען ניתוח...</p>;
  }

  if (state.kind === "confirm_extra") {
    const confirm = () => (state.action === "deep" ? runDeepAnalysis(true) : runAdditionalAnalysis(true));
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm" dir="rtl">
        <p className="mb-2">חרגת ממכסת חמשת הניתוחים היומית. להמשיך בניתוח נוסף?</p>
        <div className="flex gap-2">
          <button onClick={confirm} disabled={busy} className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-500 disabled:opacity-50">
            אישור וביצוע
          </button>
          <button onClick={() => setState({ kind: "empty" })} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">
            ביטול
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700" dir="rtl">
        <p className="mb-2">{state.message}</p>
        <button onClick={() => runDeepAnalysis(false)} disabled={busy} className="underline">
          ניסיון נוסף
        </button>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-600" dir="rtl">
        <p className="mb-3">{ANALYSIS_STATE_LABELS.not_analyzed}</p>
        <button onClick={() => runDeepAnalysis(false)} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? "מבצע ניתוח..." : "ניתוח"}
        </button>
      </div>
    );
  }

  const { analysis } = state;
  const review = (analysis.result ?? null) as ResearcherReview | null;
  const allPapers = review ? [...review.papers, ...additionalPapers] : additionalPapers;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{ANALYSIS_STATE_LABELS[analysis.state as AnalysisState]}</span>
        {analysis.state === "failed" && (
          <button onClick={() => runDeepAnalysis(false)} disabled={busy} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
            ניסיון נוסף
          </button>
        )}
      </div>

      {review && (
        <div className="space-y-3 rounded border border-gray-200 p-4 text-sm">
          <p>{review.summary}</p>
          <p className="text-xs text-gray-600">התאמה כללית: {MATCH_LEVEL_LABELS[review.fit as keyof typeof MATCH_LEVEL_LABELS] ?? review.fit}</p>
          {review.topics.length > 0 && <p className="text-xs text-gray-600">נושאים חוזרים: {review.topics.join(", ")}</p>}
          {review.thesisDirections.length > 0 && (
            <div>
              <p className="font-medium">כיווני תזה אפשריים</p>
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
        <div className="rounded border border-gray-200 p-4 text-sm">
          <p className="mb-2 font-medium">סקירת פרסומים</p>
          <ul className="space-y-2">
            {allPapers.map((paper) => (
              <li key={paper.paperId} className="rounded border border-gray-100 p-2">
                {paper.question && <p>שאלת מחקר: {paper.question}</p>}
                {paper.method && <p>שיטה: {paper.method}</p>}
                {paper.results && <p>תוצאות: {paper.results}</p>}
                <p className="text-xs text-gray-500">מקורות: {paper.evidence.length}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">הוספת פרסומים לניתוח</h3>
        <p className="mb-2 text-xs text-gray-500">עד 10 כותרות, שורה לכל כותרת. הניתוח יתווסף לסקירה הקיימת.</p>
        <textarea
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          rows={3}
          placeholder="כותרת פרסום אחת בכל שורה"
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />
        <button
          onClick={() => runAdditionalAnalysis(false)}
          disabled={busy}
          className="mt-2 rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? "מנתח..." : "ניתוח פרסומים נוספים"}
        </button>
      </div>
    </div>
  );
}
