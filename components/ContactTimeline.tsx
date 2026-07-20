"use client";

import { useEffect, useState } from "react";
import { CONTACT_EVENT_LABELS } from "../lib/labels";
import type { ContactEventType } from "../lib/repositories/contactEvents";

interface ContactEventItem {
  id: string;
  eventType: ContactEventType;
  occurredAt: string;
  note: string | null;
}

type State = { kind: "loading" } | { kind: "error" } | { kind: "loaded"; events: ContactEventItem[] };

export default function ContactTimeline({ researcherId }: { researcherId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/researchers/${researcherId}/contact-events`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data: { events: ContactEventItem[] }) => {
        if (!cancelled) setState({ kind: "loaded", events: data.events });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [researcherId]);

  if (state.kind === "loading" || state.kind === "error") return null;
  if (state.events.length === 0) return null;

  return (
    <div className="rounded border border-gray-200 p-3 text-sm" dir="rtl">
      <p className="mb-2 font-medium">ציר זמן קשר</p>
      <ul className="space-y-1">
        {state.events.map((event) => (
          <li key={event.id} className="flex items-center gap-2 text-xs text-gray-600">
            <span>{new Date(event.occurredAt).toLocaleString("he-IL")}</span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{CONTACT_EVENT_LABELS[event.eventType]}</span>
            {event.note && <span>{event.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
