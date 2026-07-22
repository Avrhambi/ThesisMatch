"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
const AUTO_FILL_TARGET = 5;
const AUTO_FILL_MAX_ATTEMPTS = 15;

type AskState = { kind: "idle" } | { kind: "running" } | { kind: "none_available" } | { kind: "error" };

export default function ReadyForReviewPanel() {
  const [items, setItems] = useState<ReadyItem[] | null>(null);
  const [askState, setAskState] = useState<AskState>({ kind: "idle" });
  const [autoFilling, setAutoFilling] = useState(false);
  const router = useRouter();
  const cancelledRef = useRef(false);
  const autoFillStartedRef = useRef(false);

  async function loadAndReturn(): Promise<ReadyItem[]> {
    try {
      const res = await fetch("/api/researchers/ready-for-review");
      const data: { items: ReadyItem[] } = res.ok ? await res.json() : { items: [] };
      if (!cancelledRef.current) setItems(data.items);
      return data.items;
    } catch {
      return [];
    }
  }

  // On first load, if fewer than AUTO_FILL_TARGET researchers are ready for
  // review, automatically analyze enough of the highest-match unanalyzed
  // candidates to reach that many -- reusing the same deep-analysis endpoint
  // "Ask for another review" already used, just looped and without
  // navigating away. Never consumes more than the day's standard quota (no
  // confirmExtra), and skips candidates that already failed in this pass so
  // one unanalyzable researcher (e.g. no importable publications) can't spin
  // the loop forever.
  async function autoFillToTarget() {
    if (autoFillStartedRef.current) return;
    autoFillStartedRef.current = true;

    const usageRes = await fetch("/api/usage").catch(() => null);
    const usage: { standardUsed: number; standardLimit: number } | null = usageRes?.ok ? await usageRes.json() : null;
    if (!usage) return;

    let remaining = usage.standardLimit - usage.standardUsed;
    let current = await loadAndReturn();
    if (current.length >= AUTO_FILL_TARGET || remaining <= 0) return;

    setAutoFilling(true);
    const tried: string[] = [];
    let attempts = 0;
    try {
      while (current.length < AUTO_FILL_TARGET && remaining > 0 && attempts < AUTO_FILL_MAX_ATTEMPTS) {
        attempts += 1;
        const candidateRes = await fetch(`/api/researchers/next-candidate?exclude=${tried.join(",")}`).catch(
          () => null,
        );
        if (!candidateRes || !candidateRes.ok) break;
        const { candidate }: { candidate: { id: string } } = await candidateRes.json();
        tried.push(candidate.id);

        const analyzeRes = await fetch(`/api/researchers/${candidate.id}/analyses/deep`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmExtra: false }),
        }).catch(() => null);

        if (analyzeRes?.ok) {
          remaining -= 1;
          current = await loadAndReturn();
        }
      }
    } finally {
      setAutoFilling(false);
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    // Fire-and-forget: autoFillToTarget is async and only sets state after
    // awaiting network calls, never synchronously -- eslint's static
    // analysis can't see that, hence the disable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    autoFillToTarget();
    const timer = setInterval(loadAndReturn, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (!autoFilling && (!items || items.length === 0)) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-rule bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Ready for review ({items?.length ?? 0})</h2>
        <button
          onClick={askForAnother}
          disabled={askState.kind === "running" || autoFilling}
          className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-3 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {askState.kind === "running" ? "Finding a candidate…" : "Ask for another review"}
        </button>
      </div>

      {autoFilling && (
        <p className="mb-3 text-sm text-muted">
          Preparing your first {AUTO_FILL_TARGET} researchers&hellip; ({items?.length ?? 0} of {AUTO_FILL_TARGET})
        </p>
      )}

      {askState.kind === "none_available" && (
        <p className="mb-3 text-sm text-muted">Every discovered researcher has already been analyzed.</p>
      )}
      {askState.kind === "error" && <p className="mb-3 text-sm text-danger">Could not start another analysis.</p>}

      <ul className="space-y-2">
        {(items ?? []).map((item) => (
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
