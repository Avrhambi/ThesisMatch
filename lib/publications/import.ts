import { extractBareOrcid, fetchOrcidWorks } from "./orcid";
import {
  fetchOpenAlexAuthorByName,
  fetchOpenAlexWorksByAuthorId,
  fetchOpenAlexWorksByOrcid,
} from "./openalex";
import { findBguAuthorMatch, stripAcademicTitle } from "./matching";
import { normalizeDoi } from "./normalizeDoi";
import { importSingleDoi } from "./importSingleDoi";
import { getResearcherRecordForImport, type ResearcherImportRecord } from "../repositories/researchers";
import type { ImportPublicationsResponse, PublicationSourceKind } from "../types";

const FETCH_TIMEOUT_MS = 15000;
// Caps a single synchronous import run; matches the no-retry, bounded-batch
// pattern used by refreshResearchers (MAX_PEOPLE) for the same reason.
const MAX_DOIS_PER_IMPORT = 200;

type DoiResolution =
  | { ok: true; dois: string[]; source: PublicationSourceKind }
  | { ok: false };

async function resolveDois(researcher: ResearcherImportRecord): Promise<DoiResolution> {
  if (researcher.orcid) {
    const bareOrcid = extractBareOrcid(researcher.orcid);
    const worksOutcome = await fetchOrcidWorks(bareOrcid, FETCH_TIMEOUT_MS);
    if (!worksOutcome.ok) return { ok: false };

    const dois = new Set(worksOutcome.works.map((w) => w.doi).filter((d): d is string => Boolean(d)));

    const completionOutcome = await fetchOpenAlexWorksByOrcid(bareOrcid, FETCH_TIMEOUT_MS);
    if (completionOutcome.ok) {
      for (const doi of completionOutcome.dois) dois.add(normalizeDoi(doi));
    }

    return { ok: true, dois: Array.from(dois), source: "orcid" };
  }

  const searchName = stripAcademicTitle(researcher.normalizedName);
  const authorOutcome = await fetchOpenAlexAuthorByName(searchName, FETCH_TIMEOUT_MS);
  if (!authorOutcome.ok) return { ok: true, dois: [], source: "unavailable" };

  const match = findBguAuthorMatch(authorOutcome.candidates, researcher.normalizedName);
  if (!match) return { ok: true, dois: [], source: "unavailable" };

  const worksOutcome = await fetchOpenAlexWorksByAuthorId(match.id, FETCH_TIMEOUT_MS);
  if (!worksOutcome.ok) return { ok: false };

  return { ok: true, dois: worksOutcome.dois.map(normalizeDoi), source: "openalex_name_match" };
}

// No CRIS source is reachable (see lib/discovery/bguStaffSearch.ts). This
// imports from the researcher's ORCID record when the BGU staff directory
// supplied one (Milestone 3), completed via OpenAlex; researchers without an
// ORCID fall back to an OpenAlex author lookup that requires an exact name
// match plus a Ben-Gurion affiliation before it is trusted (see
// matching.ts). Every candidate DOI is only persisted once Crossref verifies
// it (see importSingleDoi.ts) — this function itself never invents metadata.
export async function importPublicationsForResearcher(researcherId: string): Promise<ImportPublicationsResponse> {
  const researcher = await getResearcherRecordForImport(researcherId);
  if (!researcher) {
    return { source: "unavailable", found: 0, imported: 0, updated: 0, skipped: 0, failed: 1 };
  }

  const resolution = await resolveDois(researcher);
  if (!resolution.ok) {
    return { source: "unavailable", found: 0, imported: 0, updated: 0, skipped: 0, failed: 1 };
  }

  const dois = resolution.dois.slice(0, MAX_DOIS_PER_IMPORT);
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doi of dois) {
    const outcome = await importSingleDoi(researcherId, doi, false, FETCH_TIMEOUT_MS);
    if (outcome === "imported") imported += 1;
    else if (outcome === "updated") updated += 1;
    else if (outcome === "skipped") skipped += 1;
    else failed += 1;
  }

  return { source: resolution.source, found: dois.length, imported, updated, skipped, failed };
}
