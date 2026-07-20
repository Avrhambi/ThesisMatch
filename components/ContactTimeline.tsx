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
    <div className="rounded-[var(--radius-card)] border border-rule bg-paper p-4 text-sm">
      <p className="mb-2 font-medium text-ink">Contact timeline</p>
      <ul className="space-y-1">
        {state.events.map((event) => (
          <li key={event.id} className="flex items-center gap-2 text-xs text-muted">
            <span className="font-mono">{new Date(event.occurredAt).toLocaleString("en-US")}</span>
            <span className="rounded-[var(--radius-pill)] bg-paper-2 px-2 py-0.5 text-accent">
              {CONTACT_EVENT_LABELS[event.eventType]}
            </span>
            {event.note && <span>{event.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
