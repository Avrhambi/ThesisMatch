"use client";

import { useRef, useState } from "react";
import ReadyForReviewPanel from "./ReadyForReviewPanel";
import DecisionsDashboard from "./DecisionsDashboard";
import ResearchersList from "./ResearchersList";
import type { DecisionStatus } from "../lib/types";

// Owns the decision filter so the decisions dashboard tiles and the list stay
// in sync: clicking a status tile filters the list below it.
export default function ResearchersScreen() {
  const [decision, setDecision] = useState<DecisionStatus | "">("");
  const listRef = useRef<HTMLDivElement>(null);

  function selectStatus(status: DecisionStatus) {
    // Toggle off when the active tile is clicked again.
    setDecision((current) => (current === status ? "" : status));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main>
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Researchers</h1>
        <div className="mt-6">
          <ReadyForReviewPanel />
          <DecisionsDashboard activeStatus={decision} onSelectStatus={selectStatus} />
        </div>
      </div>
      <div ref={listRef}>
        <ResearchersList decision={decision} onDecisionChange={setDecision} />
      </div>
    </main>
  );
}
