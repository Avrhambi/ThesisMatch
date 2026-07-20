"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MATCH_LEVEL_LABELS } from "../lib/labels";
import type { MatchLevel } from "../lib/types";

interface ReadyItem {
  id: string;
  fullName: string;
  preliminaryMatch: MatchLevel;
  completedAt: string;
}

const POLL_INTERVAL_MS = 20000;

type AskState = { kind: "idle" } | { kind: "running" } | { kind: "none_available" } | { kind: "error" };

export default function ReadyForReviewPanel() {
  const [items, setItems] = useState<ReadyItem[] | null>(null);
  const [askState, setAskState] = useState<AskState>({ kind: "idle" });
  const router = useRouter();
  const cancelledRef = useRef(false);

  const load = useCallback(() => {
    fetch("/api/researchers/ready-for-review")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: ReadyItem[] }) => {
        if (!cancelledRef.current) setItems(data.items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
  }, [load]);

  async function askForAnother() {
    setAskState({ kind: "running" });
    try {
      const res = await fetch("/api/researchers/next-candidate");
      if (res.status === 404) {
        setAskState({ kind: "none_available" });
        return;
      }
      if (!res.ok) throw new Error("failed");
      const { candidate }: { candidate: { id: string } } = await res.json();
      router.push(`/researchers/${candidate.id}?autoAnalyze=1`);
    } catch {
      setAskState({ kind: "error" });
    }
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Ready for review ({items.length})</h2>
        <button
          onClick={askForAnother}
          disabled={askState.kind === "running"}
          className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {askState.kind === "running" ? "Finding a candidate…" : "Ask for another review"}
        </button>
      </div>

      {askState.kind === "none_available" && (
        <p className="mb-3 text-sm text-muted">Every discovered researcher has already been analyzed.</p>
      )}
      {askState.kind === "error" && <p className="mb-3 text-sm text-danger">Could not start another analysis.</p>}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-rule p-3 text-sm"
          >
            <Link href={`/researchers/${item.id}`} className="font-medium text-ink hover:text-accent">
              {item.fullName}
            </Link>
            {item.preliminaryMatch !== "unknown" && (
              <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-xs text-accent">
                {MATCH_LEVEL_LABELS[item.preliminaryMatch]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
