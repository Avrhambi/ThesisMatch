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
  const [copyLabel, setCopyLabel] = useState("העתקת המייל");
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
      .catch(() => setState({ kind: "error", message: "טעינת הפנייה נכשלה" }));
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
        setState({ kind: "error", message: body?.error ?? "יצירת הפנייה נכשלה" });
        return;
      }
      const data: { analysis: AnalysisResponse; copiedAt: string | null; sentAt: string | null } = await res.json();
      setState({ kind: "result", analysis: data.analysis, copiedAt: data.copiedAt, sentAt: data.sentAt });
    } catch {
      setState({ kind: "error", message: "יצירת הפנייה נכשלה" });
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail(body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopyLabel("הועתק!");
      setTimeout(() => setCopyLabel("העתקת המייל"), 2000);
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

  if (state.kind === "loading") return <p className="text-sm text-gray-500">טוען פנייה...</p>;

  const noteInput = (
    <div>
      <label className="mb-1 block text-sm font-medium">ידע ספציפי על החוקר</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="שתפו מידע רלוונטי על החוקר (1–10,000 תווים)"
        className="w-full rounded border border-gray-300 p-2 text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">{note.trim().length} תווים</p>
    </div>
  );

  if (state.kind === "confirm_extra") {
    return (
      <div className="space-y-3" dir="rtl">
        {noteInput}
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="mb-2">חרגת ממכסת חמשת הניתוחים היומית. להמשיך ביצירת פנייה נוספת?</p>
          <div className="flex gap-2">
            <button onClick={() => generate(true, pendingRegenerate)} disabled={busy} className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-500 disabled:opacity-50">
              אישור וביצוע
            </button>
            <button onClick={() => setState({ kind: "empty" })} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">
              ביטול
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-3" dir="rtl">
        {noteInput}
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="mb-2">{state.message}</p>
          <button onClick={() => generate(false, false)} disabled={busy} className="underline">
            ניסיון נוסף
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className="space-y-3" dir="rtl">
        {noteInput}
        <button
          onClick={() => generate(false, false)}
          disabled={busy || note.trim().length === 0}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "יוצר פנייה..." : "יצירת פנייה"}
        </button>
      </div>
    );
  }

  const { analysis, copiedAt, sentAt } = state;
  const result = analysis.result as OutreachResult | null;

  return (
    <div className="space-y-4" dir="rtl">
      {noteInput}

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{ANALYSIS_STATE_LABELS[analysis.state as AnalysisState]}</span>
        <div className="flex gap-2">
          <button onClick={() => generate(false, true)} disabled={busy || note.trim().length === 0} className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-50">
            {busy ? "מעבד..." : "יצירה מחדש"}
          </button>
          {analysis.state === "failed" && (
            <button onClick={() => generate(false, false)} disabled={busy} className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50">
              ניסיון נוסף
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="space-y-3 rounded border border-gray-200 p-4 text-sm">
          <p className="font-medium">{result.subject}</p>
          <p className="whitespace-pre-wrap" dir="ltr">
            {result.body}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => copyEmail(result.body)} className="rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700">
              {copyLabel}
            </button>
            {copiedAt && <span className="text-xs text-gray-500">הועתק בתאריך {new Date(copiedAt).toLocaleString("he-IL")}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <select
              value={sentDecision}
              onChange={(e) => setSentDecision(e.target.value as DecisionStatus)}
              className="rounded border border-gray-300 px-1 py-0.5 text-xs"
            >
              {(Object.keys(DECISION_LABELS) as DecisionStatus[]).map((d) => (
                <option key={d} value={d}>
                  {DECISION_LABELS[d]}
                </option>
              ))}
            </select>
            <button onClick={markSent} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-500">
              סימון כנשלח
            </button>
            {sentAt && <span className="text-xs text-gray-500">נשלח בתאריך {new Date(sentAt).toLocaleString("he-IL")}</span>}
          </div>

          {result.cvRecommendations.length > 0 && (
            <div>
              <p className="mb-2 font-medium">המלצות לקורות חיים</p>
              <ul className="space-y-2">
                {result.cvRecommendations.map((rec: CvRecommendation, i: number) => (
                  <li key={i} className="rounded border border-gray-100 p-2">
                    <p className="text-xs font-medium text-blue-700">
                      {CV_RECOMMENDATION_TYPE_LABELS[rec.type]} · {rec.section}
                    </p>
                    {rec.suggestedText && <p className="mt-1">{rec.suggestedText}</p>}
                    <p className="mt-1 text-xs text-gray-600">{rec.reason}</p>
                    <p className="mt-1 text-xs text-gray-400">מקורות: {rec.evidenceIds.length}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.excludedClaims.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-amber-700">טענות שהוצאו בשל חוסר בראיות</p>
              <ul className="list-inside list-disc text-xs text-amber-800">
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
