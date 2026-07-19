# MILESTONES.md

## Milestone 1 — Runnable foundation
- [x] Read `CLAUDE.md` and `SCHEMA.md`; create the Next.js app, Docker Compose Postgres, environment template, raw-SQL connection, and numbered migration runner.
- [x] Apply all schema migrations and add deterministic seed data for the five research branches.
- [x] Add `npm run verify` with lint, type-check, unit tests, and production build.
- [x] Run `npm run verify`

## Milestone 2 — Persistent profile and simple shell
- [x] Read `SPEC.md` and `SCHEMA.md`; build the Hebrew RTL navigation and the Researchers, Researcher Detail, and Outreach routes with empty/loading/error states.
- [x] Implement research-profile editing and one-current-CV PDF upload, extraction, replacement, and contact-detail redaction.
- [x] Add unit tests for validation, CV limits, redaction, and current-CV uniqueness behavior.
- [x] Run `npm run verify`

## Milestone 3 — Researcher discovery and tracking
- [ ] Read `SPEC.md` and `SCHEMA.md`; implement CRIS faculty-person discovery and validation against the five institute pages with 15-second fetch timeouts.
- [ ] Implement deterministic identity merging, source persistence, content hashes, branch assignment, and stale-state calculation.
- [ ] Build the Researchers list, filters, pagination, status updates, notes, and refresh progress/results.
- [ ] Run `npm run verify`

## Milestone 4 — Publications and access evidence
- [ ] Read `SPEC.md` and `SCHEMA.md`; import CRIS publications, complete from ORCID/OpenAlex, verify DOI metadata with Crossref, and deduplicate versions.
- [ ] Resolve legal open-access locations and store metadata/abstract/full-text access levels without bypassing access controls.
- [ ] Build paper lists and title-resolution UI for 1–10 user-supplied paper titles, including ambiguous and unrelated results.
- [ ] Run `npm run verify`

## Milestone 5 — Gemini analyses and daily limits
- [ ] Read all five build-pack files; implement serialized `gemini-3.1-flash-lite` structured-output calls with evidence-ID validation and prompts in `lib/prompts/`.
- [ ] Implement automatic five-paper selection, deep analysis, appended additional-paper batches, input hashing, saved failures, and manual retry.
- [ ] Implement the five-per-day standard allowance, explicit one-request extra confirmation, 8 RPM guard, and usage display.
- [ ] Run `npm run verify`

## Milestone 6 — Outreach and completion
- [ ] Read `SPEC.md`, `SCHEMA.md`, and `QA.md`; implement researcher-specific notes, redacted-CV outreach generation, unsupported-claim exclusion, copy, and sent tracking.
- [ ] Complete researcher detail evidence views, contradictions, missing-data indicators, contact timeline, and all defined user-visible states.
- [ ] Add unit tests for counted actions, extra confirmation, evidence enforcement, access-level claim restrictions, and contact status transitions.
- [ ] Run `npm run verify`
