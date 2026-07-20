CREATE TABLE researcher_status_events (
  id uuid PRIMARY KEY,
  researcher_id uuid NOT NULL REFERENCES researchers(id) ON DELETE CASCADE,
  old_decision decision_status,
  new_decision decision_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX researcher_status_events_researcher_idx ON researcher_status_events(researcher_id, changed_at DESC);
