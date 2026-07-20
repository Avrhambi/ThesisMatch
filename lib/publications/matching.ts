import { normalizeName } from "../discovery/normalize";
import { normalizeTitle } from "./normalizeTitle";

export interface AuthorCandidate {
  id: string;
  displayName: string;
  affiliationNames: string[];
}

// The BGU staff directory's `name` field (stored verbatim as researchers.
// full_name in Milestone 3) includes academic titles, e.g. "Professor
// Emeritus Yefim Dinitz" or "Prof. Uri Abdu". External catalogs never carry
// those, so an exact-name match against them requires stripping title
// tokens first — otherwise the no-ORCID fallback below silently matches
// nobody.
const TITLE_TOKENS = new Set([
  "prof",
  "professor",
  "associate",
  "assistant",
  "dr",
  "emeritus",
  "emerita",
  "ret",
]);

export function stripAcademicTitle(normalizedName: string): string {
  return normalizedName
    .split(" ")
    .filter((token) => token.length > 0 && !TITLE_TOKENS.has(token))
    .join(" ");
}

// The no-ORCID fallback path (see openalex.ts / import.ts): a single OpenAlex
// author whose name matches exactly (after stripping academic titles) and
// who has a Ben-Gurion affiliation on record is treated as identity-verified
// enough to import from. Anything short of that (zero or multiple
// candidates) is left un-importable rather than guessed at.
export function findBguAuthorMatch(
  candidates: AuthorCandidate[],
  normalizedTargetName: string,
): AuthorCandidate | null {
  const targetCore = stripAcademicTitle(normalizedTargetName);
  const matches = candidates.filter(
    (c) =>
      stripAcademicTitle(normalizeName(c.displayName)) === targetCore &&
      c.affiliationNames.some((name) => name.includes("Ben-Gurion")),
  );
  return matches.length === 1 ? matches[0] : null;
}

export function isTitleMatch(candidateTitle: string, queryTitle: string): boolean {
  const a = normalizeTitle(candidateTitle);
  const b = normalizeTitle(queryTitle);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Crossref bibliographic search does not return author affiliation, so
// authorship is checked by name only: the candidate's family name must
// appear as a whole token in the researcher's normalized full name.
export function isAuthorMatch(candidateFamily: string, normalizedTargetName: string): boolean {
  const family = normalizeName(candidateFamily);
  if (!family) return false;
  const targetTokens = normalizedTargetName.split(" ");
  return family.split(" ").every((token) => targetTokens.includes(token));
}
