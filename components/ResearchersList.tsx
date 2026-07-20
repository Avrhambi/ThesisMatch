"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isStale } from "../lib/discovery/stale";
import { BRANCH_LABELS, DECISION_LABELS, MATCH_LEVEL_LABELS } from "../lib/labels";
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

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: ListResponse };

type RefreshState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: RefreshResponse }
  | { kind: "error" };

export default function ResearchersList() {
  const [branch, setBranch] = useState<ResearchBranch | "">("");
  const [decision, setDecision] = useState<DecisionStatus | "">("");
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
        setState({ kind: "error", message: "טעינת רשימת החוקרים נכשלה" });
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
    <div dir="rtl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={runRefresh}
          disabled={refreshState.kind === "running"}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {refreshState.kind === "running" ? "מרענן..." : "רענון חוקרים"}
        </button>

        <select
          value={branch}
          onChange={(e) => applyFilter(setBranch, e.target.value as ResearchBranch | "")}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">כל התחומים</option>
          {(Object.keys(BRANCH_LABELS) as ResearchBranch[]).map((b) => (
            <option key={b} value={b}>
              {BRANCH_LABELS[b]}
            </option>
          ))}
        </select>

        <select
          value={decision}
          onChange={(e) => applyFilter(setDecision, e.target.value as DecisionStatus | "")}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">כל הסטטוסים (פעילים)</option>
          {(Object.keys(DECISION_LABELS) as DecisionStatus[]).map((d) => (
            <option key={d} value={d}>
              {DECISION_LABELS[d]}
            </option>
          ))}
        </select>

        <select
          value={matchLevel}
          onChange={(e) => applyFilter(setMatchLevel, e.target.value as MatchLevel | "")}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">כל רמות ההתאמה</option>
          {(Object.keys(MATCH_LEVEL_LABELS) as MatchLevel[]).map((m) => (
            <option key={m} value={m}>
              {MATCH_LEVEL_LABELS[m]}
            </option>
          ))}
        </select>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="חיפוש לפי שם"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>

      {refreshState.kind === "done" && (
        <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <p>
            נמצאו {refreshState.result.discovered} חוקרים · מאומתים {refreshState.result.verified} · לבדיקה{" "}
            {refreshState.result.needsReview} · ללא שינוי {refreshState.result.unchanged}
          </p>
          {refreshState.result.failed > 0 && (
            <p className="mt-1 text-amber-700">
              {refreshState.result.failed} מקורות לא היו זמינים; תוצאות קודמות נשמרו.{" "}
              <button onClick={runRefresh} className="underline">
                ניסיון נוסף
              </button>
            </p>
          )}
        </div>
      )}

      {refreshState.kind === "error" && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          הרענון נכשל.{" "}
          <button onClick={runRefresh} className="underline">
            ניסיון נוסף
          </button>
        </div>
      )}

      {state.kind === "loading" && <p className="text-sm text-gray-500">טוען...</p>}

      {state.kind === "error" && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {state.kind === "loaded" && state.data.items.length === 0 && (
        <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-600">
          <p>עדיין לא נמצאו חוקרים.</p>
          <p className="mt-1 text-sm text-gray-500">
            לפני הרענון הראשון, מומלץ להשלים את הפרופיל המחקרי וקורות החיים דרך &quot;פרופיל וקורות
            חיים&quot; בתפריט העליון, ואז ללחוץ על &quot;רענון חוקרים&quot;.
          </p>
        </div>
      )}

      {state.kind === "loaded" && state.data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {state.data.items.map((item) => (
              <div key={item.id} className="rounded border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/researchers/${item.id}`} className="font-medium hover:underline">
                      {item.fullName}
                    </Link>
                    {isStale(item.refreshedAt) && (
                      <span className="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        לא רוענן 30+ ימים
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/researchers/${item.id}`}
                    className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                  >
                    פתיחה
                  </Link>
                </div>

                <div className="mt-1 flex flex-wrap gap-1">
                  {item.branches.length === 0 && (
                    <span className="text-xs text-gray-500">תחום לא אומת</span>
                  )}
                  {item.branches.map((b) => (
                    <span key={b} className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                      {BRANCH_LABELS[b]}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                  <span>התאמה ראשונית: {MATCH_LEVEL_LABELS[item.preliminaryMatch]}</span>
                  <span>סטטוס ניתוח: טרם בוצע ניתוח</span>
                  <select
                    value={item.decision}
                    onChange={(e) => updateDecision(item.id, e.target.value as DecisionStatus)}
                    className="rounded border border-gray-300 px-1 py-0.5"
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
                  placeholder="הערה אישית"
                  className="mt-2 w-full rounded border border-gray-200 p-1 text-xs"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded bg-gray-100 px-2 py-1 disabled:opacity-50"
            >
              הקודם
            </button>
            <span>
              עמוד {page} מתוך {Math.max(1, Math.ceil(state.data.total / PAGE_SIZE))}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * PAGE_SIZE >= state.data.total}
              className="rounded bg-gray-100 px-2 py-1 disabled:opacity-50"
            >
              הבא
            </button>
          </div>
        </>
      )}
    </div>
  );
}
