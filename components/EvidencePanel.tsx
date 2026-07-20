"use client";

import { useEffect, useState } from "react";
import { ACCESS_LEVEL_LABELS, CLAIM_STATUS_LABELS } from "../lib/labels";
import type { AccessLevel } from "../lib/types";

interface SourceItem {
  id: string;
  paperId: string | null;
  type: string;
  url: string;
  title: string | null;
  retrievedAt: string;
  access: AccessLevel;
}

interface ClaimItem {
  id: string;
  analysisId: string;
  analysisKind: string;
  claimType: string;
  value: string;
  status: "verified" | "inferred" | "conflicting" | "missing";
  evidenceSourceIds: string[];
}

type State = { kind: "loading" } | { kind: "error" } | { kind: "loaded"; sources: SourceItem[]; claims: ClaimItem[] };

export default function EvidencePanel({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/researchers/${researcherId}/evidence`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { sources: SourceItem[]; claims: ClaimItem[] }) => {
        if (!cancelled) setState({ kind: "loaded", sources: data.sources, claims: data.claims });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [researcherId]);

  if (state.kind === "loading") return <p className="text-sm text-gray-500">טוען ראיות...</p>;
  if (state.kind === "error") return <p className="text-sm text-red-600">טעינת הראיות נכשלה</p>;
  if (state.sources.length === 0 && state.claims.length === 0) return null;

  const contradictions = state.claims.filter((c) => c.status === "conflicting");
  const missing = state.claims.filter((c) => c.status === "missing");

  return (
    <div className="space-y-4" dir="rtl">
      {contradictions.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
          <p className="mb-1 font-medium text-red-800">סתירות</p>
          <ul className="list-inside list-disc text-red-700">
            {contradictions.map((c) => (
              <li key={c.id}>{c.value}</li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-1 font-medium text-amber-800">מידע חסר</p>
          <ul className="list-inside list-disc text-amber-700">
            {missing.map((c) => (
              <li key={c.id}>{c.value}</li>
            ))}
          </ul>
        </div>
      )}

      {state.sources.length > 0 && (
        <details className="rounded border border-gray-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium">כיסוי ראיות ({state.sources.length} מקורות)</summary>
          <ul className="mt-2 space-y-1">
            {state.sources.map((source) => (
              <li key={source.id} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="rounded bg-gray-100 px-1.5 py-0.5">{ACCESS_LEVEL_LABELS[source.access]}</span>
                <a href={source.url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                  {source.title ?? source.url}
                </a>
                <span>· נשלף {new Date(source.retrievedAt).toLocaleDateString("he-IL")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {state.claims.length > 0 && (
        <details className="rounded border border-gray-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium">כל הטענות ({state.claims.length})</summary>
          <ul className="mt-2 space-y-1">
            {state.claims.map((claim) => (
              <li key={claim.id} className="text-xs text-gray-600">
                <span className="rounded bg-gray-100 px-1.5 py-0.5">{CLAIM_STATUS_LABELS[claim.status]}</span>{" "}
                {claim.value}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
