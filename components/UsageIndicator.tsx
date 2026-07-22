"use client";

import { useEffect, useState } from "react";
import type { DailyUsageResponse } from "../lib/types";

export default function UsageIndicator() {
  const [usage, setUsage] = useState<DailyUsageResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DailyUsageResponse | null) => {
        if (!cancelled) setUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) return null;

  return (
    <span
      className="rounded-[var(--radius-pill)] bg-paper-2 px-2.5 py-1 font-mono text-xs text-muted"
      title="Analyses today"
    >
      {usage.standardUsed} of {usage.standardLimit}
      {usage.extraUsed > 0 && <> · {usage.extraUsed} extra</>}
    </span>
  );
}
