"use client";

import { useEffect, useState } from "react";
import { CONTACT_EVENT_LABELS, DECISION_LABELS } from "../lib/labels";
import type { ContactEventType } from "../lib/repositories/contactEvents";
import type { DecisionStatus } from "../lib/types";

interface ContactEventItem {
  id: string;
  eventType: ContactEventType;
  occurredAt: string;
  note: string | null;
}

interface StatusEventItem {
  id: string;
  oldDecision: DecisionStatus | null;
  newDecision: DecisionStatus;
  changedAt: string;
}

type TimelineEntry =
  | { kind: "contact"; occurredAt: string; item: ContactEventItem }
  | { kind: "status"; occurredAt: string; item: StatusEventItem };

type State = { kind: "loading" } | { kind: "error" } | { kind: "loaded"; entries: TimelineEntry[] };

export default function ContactTimeline({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/researchers/${researcherId}/contact-events`).then((res) => (res.ok ? res.json() : { events: [] })),
      fetch(`/api/researchers/${researcherId}/status-events`).then((res) => (res.ok ? res.json() : { events: [] })),
    ])
      .then(
        ([contactData, statusData]: [{ events: ContactEventItem[] }, { events: StatusEventItem[] }]) => {
          if (cancelled) return;
          const entries: TimelineEntry[] = [
            ...contactData.events.map((item): TimelineEntry => ({ kind: "contact", occurredAt: item.occurredAt, item })),
            ...statusData.events.map((item): TimelineEntry => ({ kind: "status", occurredAt: item.changedAt, item })),
          ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
          setState({ kind: "loaded", entries });
        },
      )
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [researcherId]);

  if (state.kind === "loading" || state.kind === "error") return null;
  if (state.entries.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-rule bg-paper p-4 text-sm">
      <p className="mb-2 font-medium text-ink">Contact timeline</p>
      <ul className="space-y-1">
        {state.entries.map((entry) => (
          <li key={`${entry.kind}-${entry.item.id}`} className="flex items-center gap-2 text-xs text-muted">
            <span className="font-mono">{new Date(entry.occurredAt).toLocaleString("en-US")}</span>
            {entry.kind === "contact" ? (
              <>
                <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-accent">
                  {CONTACT_EVENT_LABELS[entry.item.eventType]}
                </span>
                {entry.item.note && <span>{entry.item.note}</span>}
              </>
            ) : (
              <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-ink">
                Status: {entry.item.oldDecision ? DECISION_LABELS[entry.item.oldDecision] : "None"} &rarr;{" "}
                {DECISION_LABELS[entry.item.newDecision]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
