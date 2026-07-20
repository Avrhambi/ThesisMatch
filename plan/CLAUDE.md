# CLAUDE.md
Stack: Next.js 16.2.10 App Router, TypeScript, Tailwind CSS, PostgreSQL 18.4, Node.js 20.9+.
Runtime: one Next.js process; one Postgres container; no worker, queue, cron, cache, auth, analytics, or multi-tenancy.
AI: `@google/genai`; model `gemini-3.1-flash-lite`; structured JSON output only.
Data access: `pg` with parameterized raw SQL; numbered SQL migrations.
Scraping: native `fetch` plus `cheerio`; obey robots, timeouts, and public-access limits.
Validation: `zod`; tests: Vitest.
Approved dependencies: next, react, react-dom, pg, @google/genai, zod, cheerio, pdf-parse.
Approved dev dependencies: typescript, eslint, eslint-config-next, tailwindcss, vitest, @types/node, @types/pg, @types/react, @types/react-dom.
Folders: `app/`, `components/`, `lib/`, `lib/prompts/`, `migrations/`, `tests/`.
Commands:
`npm install`
`docker compose up -d db`
`npm run db:migrate`
`npm run dev`
`npm run verify`
`npm run start`
Environment: `DATABASE_URL`, `GEMINI_API_KEY`, `APP_TIME_ZONE=Asia/Jerusalem`.
Never send CV contact details to Gemini; strip phone, email, address, ID numbers before AI calls.
Never use an LLM to discover researcher URLs, validate identity, invent DOI metadata, or bypass paywalls.
Every factual AI field must reference stored evidence IDs; unreferenced factual output fails validation.
Persist source URL, retrieval time, access level, and content hash before any AI call.
Use the BGU public staff directory as discovery source (CRIS is Cloudflare-blocked for non-browser requests); branch membership is matched against the five research-branch keyword sets.
Use ORCID as the primary publication source, then OpenAlex for completion, Crossref for DOI metadata, and legal open-access links only.
One Gemini request at a time; application ceiling 8 RPM, 20,000 input tokens/request, 2,000 output tokens/request.
Standard quota: five counted analyses per local calendar day; each extra analysis requires explicit confirmation.
No automatic retries. On 429 or network failure, persist progress and expose a manual retry action.
Prompts live only in `lib/prompts/`; do not copy prompts into build-pack files.
Use English LTR UI; technical identifiers and stored enum values remain English.
Keep the UI to Researchers, Researcher Detail, and Outreach screens.
`npm run verify` must run ESLint, `tsc --noEmit`, Vitest unit tests, and `next build`, failing on any error.
