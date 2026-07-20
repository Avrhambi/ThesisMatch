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
    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700" title="ניתוחים היום">
      {usage.standardUsed} מתוך {usage.standardLimit}
      {usage.extraUsed > 0 && <> · {usage.extraUsed} נוספים</>}
    </span>
  );
}
