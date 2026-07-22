"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isStale } from "../lib/discovery/stale";
import { ANALYSIS_STATE_LABELS, BRANCH_LABELS, DECISION_LABELS, MATCH_LEVEL_LABELS } from "../lib/labels";
import type { AnalysisState, DecisionStatus, MatchLevel, ResearchBranch } from "../lib/types";

interface ResearcherRow {
  id: string;
  fullName: string;
  branches: ResearchBranch[];
  decision: DecisionStatus;
  preliminaryMatch: MatchLevel;
  personalNote: string | null;
  discoveredAt: string;
  refreshedAt: string | null;
  analysisState: AnalysisState;
}

interface ListResponse {
  items: ResearcherRow[];
  total: number;
  page: number;
}

interface RefreshResponse {
  discovered: number;
  verified: number;
  needsReview: number;
  unchanged: number;
  failed: number;
}

const PAGE_SIZE = 25;

const inputClass =
  "rounded-[var(--radius-input)] border border-rule bg-paper px-2.5 py-1.5 text-sm text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] focus:border-accent";

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: ListResponse };

type RefreshState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: RefreshResponse }
  | { kind: "error" };

interface ResearchersListProps {
  // The decision filter is lifted to the parent screen so the decisions
  // dashboard tiles can drive it (click a status -> filter this list).
  decision: DecisionStatus | "";
  onDecisionChange: (decision: DecisionStatus | "") => void;
}

export default function ResearchersList({ decision, onDecisionChange }: ResearchersListProps) {
  const [branch, setBranch] = useState<ResearchBranch | "">("");
  const [matchLevel, setMatchLevel] = useState<MatchLevel | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [refreshState, setRefreshState] = useState<RefreshState>({ kind: "idle" });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      setState({ kind: "loading" });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function applyFilter<T>(setFilter: (value: T) => void, value: T) {
    setFilter(value);
    setPage(1);
    setState({ kind: "loading" });
  }

  // Reset to page 1 and show the loading state whenever the parent changes the
  // decision filter (e.g. a dashboard tile click). Done during render via the
  // "adjust state when a prop changes" pattern rather than in an effect.
  const [prevDecision, setPrevDecision] = useState(decision);
  if (decision !== prevDecision) {
    setPrevDecision(decision);
    setPage(1);
    setState({ kind: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (decision) params.set("decision", decision);
    if (matchLevel) params.set("matchLevel", matchLevel);
    if (search) params.set("search", search);
    params.set("page", String(page));

    fetch(`/api/researchers?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: ListResponse) => {
        if (cancelled) return;
        setState({ kind: "loaded", data });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: "error", message: "Failed to load the researcher list" });
      });

    return () => {
      cancelled = true;
    };
  }, [branch, decision, matchLevel, search, page, refreshState.kind]);

  async function runRefresh() {
    setRefreshState({ kind: "running" });
    try {
      const res = await fetch("/api/researchers/refresh", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const result: RefreshResponse = await res.json();
      setRefreshState({ kind: "done", result });
    } catch {
      setRefreshState({ kind: "error" });
    }
  }

  async function updateDecision(id: string, next: DecisionStatus) {
    if (state.kind !== "loaded") return;
    const previous = state.data;
    setState({
      kind: "loaded",
      data: {
        ...previous,
        items: previous.items.map((item) => (item.id === id ? { ...item, decision: next } : item)),
      },
    });
    await fetch(`/api/researchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next }),
    }).catch(() => {});
  }

  async function saveNote(id: string) {
    const draft = noteDrafts[id];
    if (draft === undefined) return;
    await fetch(`/api/researchers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalNote: draft.trim() === "" ? null : draft }),
    }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-8 pt-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={runRefresh}
          disabled={refreshState.kind === "running"}
          className="rounded-[var(--radius-input)] bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink transition-opacity duration-[var(--dur-short)] ease-[var(--ease-out)] hover:opacity-90 disabled:opacity-50"
        >
          {refreshState.kind === "running" ? "Refreshing…" : "Refresh researchers"}
        </button>

        <select
          value={branch}
          onChange={(e) => applyFilter(setBranch, e.target.value as ResearchBranch | "")}
          className={inputClass}
        >
          <option value="">All branches</option>
          {(Object.keys(BRANCH_LABELS) as ResearchBranch[]).map((b) => (
            <option key={b} value={b}>
              {BRANCH_LABELS[b]}
            </option>
          ))}
        </select>

        <select
          value={decision}
          onChange={(e) => onDecisionChange(e.target.value as DecisionStatus | "")}
          className={inputClass}
        >
          <option value="">All statuses (active)</option>
          {(Object.keys(DECISION_LABELS) as DecisionStatus[]).map((d) => (
            <option key={d} value={d}>
              {DECISION_LABELS[d]}
            </option>
          ))}
        </select>

        <select
          value={matchLevel}
          onChange={(e) => applyFilter(setMatchLevel, e.target.value as MatchLevel | "")}
          className={inputClass}
        >
          <option value="">All match levels</option>
          {(Object.keys(MATCH_LEVEL_LABELS) as MatchLevel[]).map((m) => (
            <option key={m} value={m}>
              {MATCH_LEVEL_LABELS[m]}
            </option>
          ))}
        </select>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name"
          className={inputClass}
        />
      </div>

      {refreshState.kind === "done" && (
        <div className="mb-6 rounded-[var(--radius-card)] border border-rule bg-paper-2 p-3 text-sm text-ink">
          <p>
            Found {refreshState.result.discovered} researchers · verified {refreshState.result.verified} ·
            needs review {refreshState.result.needsReview} · unchanged {refreshState.result.unchanged}
          </p>
          {refreshState.result.failed > 0 && (
            <p className="mt-1 text-warning">
              {refreshState.result.failed} sources were unavailable; previous results were kept.{" "}
              <button onClick={runRefresh} className="underline underline-offset-2">
                Try again
              </button>
            </p>
          )}
        </div>
      )}

      {refreshState.kind === "error" && (
        <div className="mb-6 rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          Refresh failed.{" "}
          <button onClick={runRefresh} className="underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      {state.kind === "loading" && <p className="text-sm text-muted">Loading&hellip;</p>}

      {state.kind === "error" && (
        <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          {state.message}
        </div>
      )}

      {state.kind === "loaded" && state.data.items.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-rule p-8 text-center text-ink">
          <p>No researchers found yet.</p>
          <p className="mt-1 text-sm text-muted">
            Before the first refresh, complete your research profile and CV via &ldquo;Profile &amp; CV&rdquo;
            in the top menu, then click &ldquo;Refresh researchers&rdquo;.
          </p>
        </div>
      )}

      {state.kind === "loaded" && state.data.items.length > 0 && (
        <>
          <div className="space-y-3">
            {state.data.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-card)] border border-rule bg-paper p-4 transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/researchers/${item.id}`}
                      className="font-display text-base font-semibold text-ink hover:text-accent"
                    >
                      {item.fullName}
                    </Link>
                    {isStale(item.refreshedAt) && (
                      <span className="ms-2 rounded-[var(--radius-pill)] bg-warning-bg px-2 py-0.5 text-xs text-warning">
                        Not refreshed in 30+ days
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/researchers/${item.id}`}
                    className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-2.5 py-1 text-xs text-ink transition-colors duration-[var(--dur-short)] ease-[var(--ease-out)] hover:border-accent hover:text-accent"
                  >
                    Open
                  </Link>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.branches.length === 0 && (
                    <span className="text-xs text-muted">Branch not verified</span>
                  )}
                  {item.branches.map((b) => (
                    <span
                      key={b}
                      className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-xs text-accent"
                    >
                      {BRANCH_LABELS[b]}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>Preliminary match: {MATCH_LEVEL_LABELS[item.preliminaryMatch]}</span>
                  <span>Analysis status: {ANALYSIS_STATE_LABELS[item.analysisState]}</span>
                  <select
                    value={item.decision}
                    onChange={(e) => updateDecision(item.id, e.target.value as DecisionStatus)}
                    className="rounded-[var(--radius-input)] border border-rule bg-paper px-1.5 py-0.5"
                  >
                    {(Object.keys(DECISION_LABELS) as DecisionStatus[]).map((d) => (
                      <option key={d} value={d}>
                        {DECISION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={noteDrafts[item.id] ?? item.personalNote ?? ""}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  onBlur={() => saveNote(item.id)}
                  rows={1}
                  placeholder="Personal note"
                  className="mt-3 w-full rounded-[var(--radius-input)] border border-rule bg-paper p-1.5 text-xs text-ink focus:border-accent"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-2.5 py-1 text-ink disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-mono text-xs text-muted">
              Page {page} of {Math.max(1, Math.ceil(state.data.total / PAGE_SIZE))}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * PAGE_SIZE >= state.data.total}
              className="rounded-[var(--radius-input)] border border-rule bg-paper-2 px-2.5 py-1 text-ink disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
