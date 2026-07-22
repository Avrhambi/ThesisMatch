"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DECISION_LABELS, VISIBLE_DECISION_STATUSES } from "../lib/labels";
import type { DecisionStatus } from "../lib/types";

interface RecentEvent {
  id: string;
  researcherId: string;
  researcherName: string;
  oldDecision: DecisionStatus | null;
  newDecision: DecisionStatus;
  changedAt: string;
}

// The six statuses surfaced in the UI, in workflow order (see
// VISIBLE_DECISION_STATUSES).
const STATUS_ORDER: DecisionStatus[] = VISIBLE_DECISION_STATUSES;

interface DecisionsDashboardProps {
  // Clicking a status tile drives the researcher list's decision filter,
  // owned by the parent screen. activeStatus highlights the current one.
  activeStatus: DecisionStatus | "";
  onSelectStatus: (status: DecisionStatus) => void;
}

export default function DecisionsDashboard({ activeStatus, onSelectStatus }: DecisionsDashboardProps) {
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
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(status)}
              className={`rounded-[var(--radius-card)] border p-3 text-center transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] ${
                activeStatus === status
                  ? "border-accent bg-paper-2"
                  : "border-rule bg-paper-2 hover:border-accent/50"
              }`}
            >
              <p className="font-mono text-xl text-ink">{counts[status] ?? 0}</p>
              <p className="text-xs text-muted">{DECISION_LABELS[status]}</p>
            </button>
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
