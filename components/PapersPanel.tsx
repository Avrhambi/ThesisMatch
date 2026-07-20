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
      setResolveState({ kind: "error", message: "יש להזין בין כותרת אחת ל-10 כותרות" });
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
      setResolveState({ kind: "error", message: err instanceof Error ? err.message : "הפעולה נכשלה" });
    }
  }

  return (
    <section className="mt-6" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">פרסומים</h2>
        <button
          onClick={runImport}
          disabled={importState.kind === "running"}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {importState.kind === "running" ? "מייבא..." : "יבוא פרסומים"}
        </button>
      </div>

      {importState.kind === "done" && (
        <p className="mb-3 rounded border border-gray-200 bg-gray-50 p-2 text-sm">
          {importState.result.source === "unavailable" ? (
            <>לא נמצא מקור פרסומים אמין עבור חוקר זה (אין ORCID ואין התאמת שם חד-משמעית).</>
          ) : (
            <>
              נמצאו {importState.result.found} · יובאו {importState.result.imported} · עודכנו{" "}
              {importState.result.updated} · דולגו {importState.result.skipped}
              {importState.result.failed > 0 && <> · נכשלו {importState.result.failed}</>}
            </>
          )}
        </p>
      )}
      {importState.kind === "error" && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          יבוא הפרסומים נכשל.{" "}
          <button onClick={runImport} className="underline">
            ניסיון נוסף
          </button>
        </p>
      )}

      {papers.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
          עדיין אין פרסומים רשומים לחוקר זה.
        </p>
      ) : (
        <ul className="space-y-2">
          {papers.map((paper) => (
            <li key={paper.id} className="rounded border border-gray-200 p-3 text-sm">
              <div className="font-medium">{paper.title}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                {paper.publicationYear && <span>{paper.publicationYear}</span>}
                {paper.venue && <span>{paper.venue}</span>}
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                  {ACCESS_LEVEL_LABELS[paper.access]}
                </span>
                {paper.addedByUser && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">נוסף ידנית</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">הוספת פרסומים לפי כותרת</h3>
        <p className="mb-2 text-xs text-gray-500">עד 10 כותרות, שורה לכל כותרת.</p>
        <textarea
          value={titlesInput}
          onChange={(e) => setTitlesInput(e.target.value)}
          rows={4}
          placeholder="כותרת פרסום אחת בכל שורה"
          className="w-full rounded border border-gray-300 p-2 text-sm"
        />
        <button
          onClick={runResolve}
          disabled={resolveState.kind === "running"}
          className="mt-2 rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {resolveState.kind === "running" ? "מזהה..." : "זיהוי והוספה"}
        </button>

        {resolveState.kind === "error" && (
          <p className="mt-2 text-sm text-red-700">{resolveState.message}</p>
        )}

        {resolveState.kind === "done" && (
          <ul className="mt-3 space-y-1 text-sm">
            {resolveState.result.results.map((r, i) => (
              <li key={i}>
                {r.status === "resolved" && <span className="text-green-700">נמצא: {r.matchedTitle}</span>}
                {r.status === "ambiguous" && (
                  <span className="text-amber-700">
                    {r.title} — נמצאו מספר התאמות אפשריות ({r.candidates?.length}), יש לבחור ידנית.
                  </span>
                )}
                {r.status === "unrelated" && <span className="text-gray-500">{r.title} — לא נמצאה התאמה.</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
