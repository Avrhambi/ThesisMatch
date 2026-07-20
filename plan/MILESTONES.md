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
- [x] Read `SPEC.md` and `SCHEMA.md`; implement CS-faculty discovery with 15-second fetch timeouts and no automatic retry. CRIS (cris.bgu.ac.il) rejects non-browser requests behind a Cloudflare bot challenge, so the discovery source is BGU's public staff directory (bgu.ac.il/people) instead, driven through its own documented CSRF-token + POST API. Branch/institute membership comes from the department field that API already returns, not from fetching the five institute pages separately — those pages are narrative bios naming only each institute's chair, not a member roster, so they carry no usable membership data.
- [x] Implement deterministic identity merging (upsert keyed on the researcher's BGU profile URL, never overwriting `decision`/`personal_note`), branch assignment from the directory response, and stale-state calculation (30-day `refreshed_at` threshold). Source persistence and content hashes are deferred: this discovery path returns structured JSON, not a scraped page, so there is no fetched-page evidence to store yet — revisit when a milestone actually scrapes HTML/PDF content (e.g. paper full text in Milestone 4).
- [x] Build the Researchers list, filters, pagination, status updates, notes, and refresh progress/results.
- [x] Run `npm run verify`

## Milestone 4 — Publications and access evidence
- [x] Read `SPEC.md` and `SCHEMA.md`; import publications. Note: CRIS is Cloudflare-blocked to non-browser requests (see Milestone 3), so a CRIS-based import will hit the same wall — check for a reachable per-person publication source (e.g. the BGU profile page, ORCID as primary rather than completion-only) before assuming CRIS scraping works here. Complete from ORCID/OpenAlex, verify DOI metadata with Crossref, and deduplicate versions. Shipped as: ORCID is the primary DOI source when the BGU directory supplied one (Milestone 3), completed via OpenAlex's works-by-orcid filter; researchers without an ORCID fall back to an OpenAlex author-name search that requires an exact name match (after stripping academic-title tokens like "Professor Emeritus") plus a Ben-Gurion affiliation before it's trusted, else the source is reported `unavailable` rather than guessed at. Every DOI is only persisted once Crossref confirms it resolves; DOI-based `ON CONFLICT` upsert dedupes versions.
- [x] Resolve legal open-access locations and store metadata/abstract/full-text access levels without bypassing access controls. Shipped as: OpenAlex's `open_access` field (itself Unpaywall-derived) decides `full_text_open` vs `abstract` vs `metadata_only`; no full-text bytes are fetched, only the access level and its evidence source (Crossref + OpenAlex `sources` rows with retrieval time and content hash) are persisted per CLAUDE.md's evidence-before-AI-call requirement.
- [x] Build paper lists and title-resolution UI for 1–10 user-supplied paper titles, including ambiguous and unrelated results. Shipped as: deterministic Crossref bibliographic search + author-family-name matching (no LLM, per CLAUDE.md) classifies each pasted title resolved/ambiguous/unrelated; resolved titles import through the same Crossref-verified path with `added_by_user=true`.
- [x] Run `npm run verify`

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
