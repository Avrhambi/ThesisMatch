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

  if (state.kind === "loading") return <p className="text-sm text-muted">Loading evidence&hellip;</p>;
  if (state.kind === "error") return <p className="text-sm text-danger">Failed to load evidence</p>;
  if (state.sources.length === 0 && state.claims.length === 0) return null;

  const contradictions = state.claims.filter((c) => c.status === "conflicting");
  const missing = state.claims.filter((c) => c.status === "missing");

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      {contradictions.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-3 text-sm">
          <p className="mb-1 font-medium text-danger">Contradictions</p>
          <ul className="list-inside list-disc text-danger">
            {contradictions.map((c) => (
              <li key={c.id}>{c.value}</li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning-bg p-3 text-sm">
          <p className="mb-1 font-medium text-warning">Missing information</p>
          <ul className="list-inside list-disc text-warning">
            {missing.map((c) => (
              <li key={c.id}>{c.value}</li>
            ))}
          </ul>
        </div>
      )}

      {state.sources.length > 0 && (
        <details className="rounded-[var(--radius-card)] border border-rule p-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">
            Evidence coverage ({state.sources.length} sources)
          </summary>
          <ul className="mt-2 space-y-1">
            {state.sources.map((source) => (
              <li key={source.id} className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5">
                  {ACCESS_LEVEL_LABELS[source.access]}
                </span>
                <a href={source.url} target="_blank" rel="noreferrer" className="truncate hover:text-accent hover:underline">
                  {source.title ?? source.url}
                </a>
                <span>· retrieved {new Date(source.retrievedAt).toLocaleDateString("en-US")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {state.claims.length > 0 && (
        <details className="rounded-[var(--radius-card)] border border-rule p-3 text-sm">
          <summary className="cursor-pointer font-medium text-ink">All claims ({state.claims.length})</summary>
          <ul className="mt-2 space-y-1">
            {state.claims.map((claim) => (
              <li key={claim.id} className="text-xs text-muted">
                <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5">
                  {CLAIM_STATUS_LABELS[claim.status]}
                </span>{" "}
                {claim.value}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
