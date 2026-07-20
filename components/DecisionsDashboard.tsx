"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DECISION_LABELS } from "../lib/labels";
import type { DecisionStatus } from "../lib/types";

interface RecentEvent {
  id: string;
  researcherId: string;
  researcherName: string;
  oldDecision: DecisionStatus | null;
  newDecision: DecisionStatus;
  changedAt: string;
}

// Fixed display order: active/undecided statuses first, then outreach
// progress, then terminal states -- mirrors the order decisionStatusSchema
// declares them in, which the rest of the app already treats as canonical
// (see listResearchers' ORDER BY comment).
const STATUS_ORDER: DecisionStatus[] = [
  "new",
  "interested",
  "analyze_later",
  "not_interested",
  "already_contacted",
  "contact_planned",
  "waiting_for_reply",
  "meeting_scheduled",
  "temporarily_unavailable",
  "closed",
];

export default function DecisionsDashboard() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [events, setEvents] = useState<RecentEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/researchers/decision-stats").then((res) => (res.ok ? res.json() : { counts: {} })),
      fetch("/api/researchers/recently-decided").then((res) => (res.ok ? res.json() : { items: [] })),
    ]).then(([statsData, eventsData]: [{ counts: Record<string, number> }, { items: RecentEvent[] }]) => {
      if (cancelled) return;
      setCounts(statsData.counts);
      setEvents(eventsData.items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  if (counts && total === 0) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Decisions dashboard</h2>

      {counts && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="rounded-[var(--radius-card)] border border-rule bg-paper-2 p-3 text-center">
              <p className="font-mono text-xl text-ink">{counts[status] ?? 0}</p>
              <p className="text-xs text-muted">{DECISION_LABELS[status]}</p>
            </div>
          ))}
        </div>
      )}

      {events && events.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Recently decided</p>
          <ul className="space-y-2">
            {events.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-rule p-3 text-sm"
              >
                <Link href={`/researchers/${item.researcherId}`} className="font-medium text-ink hover:text-accent">
                  {item.researcherName}
                </Link>
                <span className="text-xs text-muted">
                  {item.oldDecision ? DECISION_LABELS[item.oldDecision] : "None"} &rarr;{" "}
                  {DECISION_LABELS[item.newDecision]}
                  {" · "}
                  {new Date(item.changedAt).toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
