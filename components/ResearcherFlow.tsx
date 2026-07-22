"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AnalysisPanel from "./AnalysisPanel";
import PapersPanel, { type PaperRow } from "./PapersPanel";
import EvidencePanel from "./EvidencePanel";
import ContactTimeline from "./ContactTimeline";
import { DECISION_LABELS, VISIBLE_DECISION_STATUSES } from "../lib/labels";
import type { DecisionStatus } from "../lib/types";

type Stage = "verdict" | "publications" | "decision";

const STAGES: { id: Stage; label: string }[] = [
  { id: "verdict", label: "1. Verdict" },
  { id: "publications", label: "2. Publications" },
  { id: "decision", label: "3. Decision" },
];

interface ReadyItem {
  id: string;
}

export default function ResearcherFlow({
  researcherId,
  initialDecision,
  initialPersonalNote,
  initialPapers,
}: {
  researcherId: string;
  initialDecision: DecisionStatus;
  initialPersonalNote: string | null;
  initialPapers: PaperRow[];
}) {
  const [stage, setStage] = useState<Stage>("verdict");
  const [decision, setDecision] = useState<DecisionStatus>(initialDecision);
  const [note, setNote] = useState(initialPersonalNote ?? "");
  const [skipping, setSkipping] = useState(false);
  const router = useRouter();

  // Offer the six visible statuses, but keep the current one if it's a hidden
  // legacy status so the select still shows the real value (matches the
  // researcher list's per-row select).
  const decisionOptions = VISIBLE_DECISION_STATUSES.includes(decision)
    ? VISIBLE_DECISION_STATUSES
    : [decision, ...VISIBLE_DECISION_STATUSES];

  async function saveDecision(next: DecisionStatus) {
    setDecision(next);
    await fetch(`/api/researchers/${researcherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next }),
    }).catch(() => {});
  }

  async function saveNote() {
    await fetch(`/api/researchers/${researcherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalNote: note.trim() === "" ? null : note }),
    }).catch(() => {});
  }

  // "Skip" rejects the researcher (reusing the same decision/status-history
  // machinery as the manual dropdown) and jumps straight to the next
  // researcher waiting for a decision, so rejecting one flows directly into
  // reviewing the next instead of returning to the list every time.
  async function skipToNext() {
    setSkipping(true);
    try {
      await saveDecision("not_interested");
      const res = await fetch("/api/researchers/ready-for-review").catch(() => null);
      const data: { items: ReadyItem[] } | null = res?.ok ? await res.json() : null;
      const next = data?.items.find((item) => item.id !== researcherId);
      router.push(next ? `/researchers/${next.id}` : "/researchers");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 text-sm">
        {STAGES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStage(s.id)}
            className={`rounded-[var(--radius-pill)] px-3 py-1 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] ${
              stage === s.id ? "bg-accent text-accent-ink" : "bg-paper-2 text-muted hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {stage === "verdict" && (
        <div className="space-y-4">
          <AnalysisPanel researcherId={researcherId} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStage("publications")}
              className="rounded-[var(--radius-input)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
            >
              Continue to publications &rarr;
            </button>
            <button
              onClick={skipToNext}
              disabled={skipping}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-4 py-2 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent disabled:opacity-50"
            >
              {skipping ? "Skipping…" : "Skip this researcher"}
            </button>
          </div>
        </div>
      )}

      {stage === "publications" && (
        <div className="space-y-4">
          <PapersPanel researcherId={researcherId} initialPapers={initialPapers} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStage("verdict")}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-4 py-2 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStage("decision")}
              className="rounded-[var(--radius-input)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
            >
              Continue to decision &rarr;
            </button>
            <button
              onClick={skipToNext}
              disabled={skipping}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-4 py-2 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent disabled:opacity-50"
            >
              {skipping ? "Skipping…" : "Skip this researcher"}
            </button>
          </div>
        </div>
      )}

      {stage === "decision" && (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-rule bg-paper p-4 text-sm">
            <label className="mb-1 block font-medium text-ink">Personal status</label>
            <select
              value={decision}
              onChange={(e) => saveDecision(e.target.value as DecisionStatus)}
              className="rounded-[var(--radius-input)] border border-rule bg-paper px-2 py-1"
            >
              {decisionOptions.map((d) => (
                <option key={d} value={d}>
                  {DECISION_LABELS[d]}
                </option>
              ))}
            </select>

            <label className="mb-1 mt-3 block font-medium text-ink">Personal note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              rows={2}
              placeholder="Personal note"
              className="w-full rounded-[var(--radius-input)] border border-rule bg-paper p-2 text-sm text-ink focus:border-accent"
            />
          </div>

          <EvidencePanel researcherId={researcherId} />
          <ContactTimeline researcherId={researcherId} />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStage("publications")}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-4 py-2 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent"
            >
              &larr; Back
            </button>
            <Link
              href={`/researchers/${researcherId}/outreach`}
              className="rounded-[var(--radius-input)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90"
            >
              Go to outreach &rarr;
            </Link>
            <Link
              href="/researchers"
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-4 py-2 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent"
            >
              Back to researchers list
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
