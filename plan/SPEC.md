# SPEC.md

## Purpose
A personal Hebrew RTL web app for daily discovery, evidence-backed analysis, and outreach tracking for potential BGU M.Sc. supervisors.

## Persistent setup
The Settings area stores one research profile and one current CV. Replacing the CV preserves prior generated outreach. CV upload accepts one PDF, maximum 5 MB and 20 pages. The app extracts text, stores the original filename and text, and strips contact details before AI use.

## Flow 1 — Researchers
The user presses **Refresh researchers**. The app reads the CRIS faculty-person list, validates membership against the five faculty institute pages, merges duplicates, and stores CRIS, ORCID, research-page, and personal-site links. The run is synchronous, processes at most 100 people, uses 15-second HTTP timeouts, and never retries automatically.

The Researchers screen defaults to active records sorted by personal status priority, then match level descending, then name ascending. Filters: branch, match level, analysis state, personal status, and text search with 250 ms debounce. Page size is 25.

Each row shows name, research branch(es), preliminary match, evidence coverage, analysis state, personal status, and one primary action. Available personal statuses are New, Interested, Analyze later, Not interested, Already contacted, Contact planned, Waiting for reply, Meeting scheduled, Temporarily unavailable, and Closed. Status and note changes save immediately.

## Flow 2 — Automatic research analysis
Pressing **Analyze** selects up to five papers automatically: two best profile matches, two recent representative papers, and one distinct representative paper. Sources are CRIS first, ORCID/OpenAlex completion, Crossref DOI verification, and legal open-access text from publisher, repository, arXiv, or Unpaywall-linked locations.

One counted analysis produces the researcher overview and all selected-paper reviews in one Gemini request. Full-text claims require full text; abstract-only records may support only abstract-level claims; metadata-only records may support only bibliographic facts and preliminary topic matching.

The detail screen shows researcher orientation, industry orientation, mathematical/algorithmic/experimental orientation, recurring topics, match and mismatch with the stored profile, paper reviews, thesis directions, access level, evidence links, missing information, and contradictions.

The user may paste 1–10 paper titles, one per line. The app resolves each title, verifies that the researcher is an author, groups all resolved additions into one counted Gemini request, and appends results to the existing review. Ambiguous matches require selection; unresolved or unrelated titles are not analyzed.

## Flow 3 — Outreach
The user adds researcher-specific knowledge as plain text, 1–10,000 characters. The app combines it with the stored research profile, redacted CV text, researcher evidence, and paper analyses. One counted Gemini request creates an English first-contact email of at most 180 words plus CV recommendations classified as Reorder, Rewrite, Emphasize, Add supported information, or Missing evidence. Unsupported personal claims are listed and excluded.

The user can copy the email and mark it sent. Marking sent sets status to Waiting for reply unless another status is selected.

## Daily analysis policy
The local day uses `Asia/Jerusalem`. Five counted analyses are included per day. A counted analysis is: initial deep analysis, one submitted batch of additional papers, outreach generation, or regeneration. Viewing, refreshing sources, changing status, and editing notes are free. After five, every additional request requires a confirmation dialog; confirmed extras remain allowed and are recorded separately.

Gemini calls are serialized, capped at 8 application requests/minute, 20,000 input tokens, and 2,000 output tokens. On quota or network failure, saved source work remains intact and the UI shows **Try again**; there is no automatic retry.

## States
Empty screens explain the next single action. Loading states show the current stage and completed counts. Success states show retrieval time and evidence coverage. Failures name the failed stage, preserve completed work, and expose one retry action. A stale profile is any researcher not refreshed for 30 days.
