import { fetchCrossrefBibliographicSearch } from "./crossref";
import { isAuthorMatch, isTitleMatch } from "./matching";
import { importSingleDoi } from "./importSingleDoi";
import { getResearcherRecordForImport } from "../repositories/researchers";
import type { ResolvedTitleResult, ResolveTitlesResponse } from "../types";

const FETCH_TIMEOUT_MS = 15000;

// Deterministic Crossref search + author-name check — no LLM involved, per
// CLAUDE.md's ban on using an LLM to discover URLs or invent DOI metadata.
// A title resolves only when exactly one Crossref candidate both matches the
// pasted title and lists the researcher as an author; more than one such
// candidate is reported ambiguous rather than guessed at.
export async function resolveTitles(
  researcherId: string,
  titles: string[],
): Promise<ResolveTitlesResponse | null> {
  const researcher = await getResearcherRecordForImport(researcherId);
  if (!researcher) return null;

  const results: ResolvedTitleResult[] = [];
  let imported = 0;

  for (const title of titles) {
    const searchOutcome = await fetchCrossrefBibliographicSearch(title, FETCH_TIMEOUT_MS);
    if (!searchOutcome.ok) {
      results.push({ title, status: "unrelated" });
      continue;
    }

    const matches = searchOutcome.candidates.filter(
      (candidate) =>
        isTitleMatch(candidate.title, title) &&
        candidate.authorFamilies.some((family) => isAuthorMatch(family, researcher.normalizedName)),
    );

    if (matches.length === 1) {
      const match = matches[0];
      const outcome = await importSingleDoi(researcherId, match.doi, true, FETCH_TIMEOUT_MS);
      if (outcome === "imported" || outcome === "updated") {
        imported += 1;
        results.push({ title, status: "resolved", doi: match.doi, matchedTitle: match.title });
      } else {
        results.push({ title, status: "unrelated" });
      }
    } else if (matches.length > 1) {
      results.push({
        title,
        status: "ambiguous",
        candidates: matches.map((c) => ({ doi: c.doi, title: c.title })),
      });
    } else {
      results.push({ title, status: "unrelated" });
    }
  }

  return { results, imported };
}
