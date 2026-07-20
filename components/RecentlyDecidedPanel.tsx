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

export default function RecentlyDecidedPanel() {
  const [items, setItems] = useState<RecentEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/researchers/recently-decided")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: RecentEvent[] }) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Recently decided</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-rule p-3 text-sm"
          >
            <Link href={`/researchers/${item.researcherId}`} className="font-medium text-ink hover:text-accent">
              {item.researcherName}
            </Link>
            <span className="text-xs text-muted">
              {item.oldDecision ? DECISION_LABELS[item.oldDecision] : "None"} &rarr; {DECISION_LABELS[item.newDecision]}
              {" · "}
              {new Date(item.changedAt).toLocaleString("en-US")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
