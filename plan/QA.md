# QA.md

## Startup
- [ ] Copy `.env.example`, set `DATABASE_URL` and `GEMINI_API_KEY`, start Postgres, run migrations, run the production build, and start the app.
- [ ] Open the app on desktop and mobile widths; Hebrew layout is RTL, readable, and has no clipped controls.

## Persistent profile
- [ ] Save the research profile, reload, and confirm it persists.
- [ ] Upload a valid CV PDF and confirm it becomes current; replace it and confirm prior outreach remains unchanged.
- [ ] Reject files over 5 MB, over 20 pages, non-PDF files, and unreadable PDFs.
- [ ] Confirm email, phone, address, and ID-like contact details are absent from the text sent to Gemini.

## Researcher discovery
- [ ] Refresh researchers and confirm CRIS is the discovery list while institute pages supply verified branch membership.
- [ ] Confirm duplicate people merge and researchers preserve personal statuses and notes across refreshes.
- [ ] Confirm unreachable sources produce a visible partial-failure state without deleting completed results.
- [ ] Confirm researchers older than 30 days show a stale indicator.

## Researcher tracking
- [ ] Set each personal status, reload, filter by it, and confirm the choice persists.
- [ ] Mark a researcher Already contacted, Waiting for reply, Meeting scheduled, Temporarily unavailable, and Closed; confirm the timeline remains ordered.
- [ ] Confirm Not interested records disappear from the default active view but remain searchable.

## Papers and evidence
- [ ] Confirm CRIS papers are completed and verified without creating duplicate arXiv/conference records.
- [ ] Confirm every paper displays metadata-only, abstract, full-text-open, uploaded-PDF, or unavailable access.
- [ ] Add 1 and 10 valid titles in one submission and confirm one appended batch analysis.
- [ ] Confirm ambiguous titles require selection, unrelated papers are rejected, and duplicate titles are not reanalyzed.
- [ ] Confirm metadata-only and abstract-only analyses do not claim full methods, tables, baselines, or limitations.

## Analyses and limits
- [ ] Complete five counted analyses and confirm the header shows 5 of 5.
- [ ] Attempt a sixth, cancel confirmation, and confirm no Gemini call or usage record occurs.
- [ ] Confirm one extra analysis, then confirm it is marked extra and the next extra again requires confirmation.
- [ ] Simulate Gemini 429 and network failure; confirm progress persists, no automatic retry occurs, and Try again works.
- [ ] Reopen an existing analysis and confirm it does not consume usage.

## Outreach
- [ ] Add researcher-specific knowledge and generate an English email no longer than 180 words.
- [ ] Confirm the email uses one concrete paper or direction and only supported personal facts.
- [ ] Confirm unsupported claims appear separately and never enter the email or CV wording.
- [ ] Confirm each CV recommendation has a category, reason, and evidence reference.
- [ ] Copy the email, mark it sent, reload, and confirm the sent time and Waiting for reply status persist.

## Final usability
- [ ] From the home screen, find an active candidate, open the analysis, add papers, generate outreach, and update contact status without losing context.
- [ ] Confirm empty, loading, success, partial-success, failure, stale, and quota-exhausted states each offer one clear next action.
