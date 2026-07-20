import { fetchWithTimeout } from "../discovery/fetchWithTimeout";
import { normalizeDoi } from "./normalizeDoi";
import type { AuthorCandidate } from "./matching";

const USER_AGENT = "ThesisMatchBot/1.0 (+personal research tool)";
const WORKS_PAGE_SIZE = 200;

export interface OpenAlexWork {
  title: string;
  year: number | null;
  venue: string | null;
  abstract: string | null;
  isOpenAccess: boolean;
  oaUrl: string | null;
}

export function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex) return null;
  const positions: [number, string][] = [];
  for (const [word, indexes] of Object.entries(invertedIndex)) {
    for (const index of indexes) positions.push([index, word]);
  }
  if (positions.length === 0) return null;
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, word]) => word).join(" ");
}

interface OpenAlexWorkJson {
  title?: string;
  display_name?: string;
  doi?: string;
  publication_year?: number;
  primary_location?: { source?: { display_name?: string } };
  abstract_inverted_index?: Record<string, number[]>;
  open_access?: { is_oa?: boolean; oa_url?: string | null };
  best_oa_location?: { pdf_url?: string | null };
}

export function mapOpenAlexWork(json: OpenAlexWorkJson): OpenAlexWork {
  return {
    title: json.title ?? json.display_name ?? "",
    year: json.publication_year ?? null,
    venue: json.primary_location?.source?.display_name ?? null,
    abstract: reconstructAbstract(json.abstract_inverted_index),
    isOpenAccess: Boolean(json.open_access?.is_oa),
    oaUrl: json.open_access?.oa_url ?? json.best_oa_location?.pdf_url ?? null,
  };
}

export type OpenAlexWorkOutcome =
  | { ok: true; url: string; raw: string; work: OpenAlexWork }
  | { ok: false; errorCode: string };

export async function fetchOpenAlexWorkByDoi(doi: string, timeoutMs: number): Promise<OpenAlexWorkOutcome> {
  const url = `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const raw = await outcome.response.text();
    const work = mapOpenAlexWork(JSON.parse(raw) as OpenAlexWorkJson);
    return { ok: true, url, raw, work };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}

function extractDois(items: OpenAlexWorkJson[]): string[] {
  return items
    .map((item) => item.doi)
    .filter((doi): doi is string => Boolean(doi))
    .map(normalizeDoi);
}

export type OpenAlexDoiListOutcome =
  | { ok: true; dois: string[] }
  | { ok: false; errorCode: string };

// Completion pass: catches papers the ORCID record itself is missing. Only
// used to discover DOIs to feed back through fetchOpenAlexWorkByDoi /
// Crossref, never as an evidence source in its own right (its bulk listing
// URL would collide with sources' UNIQUE(url, content_hash) across papers).
export async function fetchOpenAlexWorksByOrcid(
  bareOrcid: string,
  timeoutMs: number,
): Promise<OpenAlexDoiListOutcome> {
  const url = `https://api.openalex.org/works?filter=author.orcid:${bareOrcid}&per-page=${WORKS_PAGE_SIZE}`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const json = (await outcome.response.json()) as { results?: OpenAlexWorkJson[] };
    return { ok: true, dois: extractDois(json.results ?? []) };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}

export async function fetchOpenAlexWorksByAuthorId(
  authorId: string,
  timeoutMs: number,
): Promise<OpenAlexDoiListOutcome> {
  const url = `https://api.openalex.org/works?filter=author.id:${encodeURIComponent(authorId)}&per-page=${WORKS_PAGE_SIZE}`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const json = (await outcome.response.json()) as { results?: OpenAlexWorkJson[] };
    return { ok: true, dois: extractDois(json.results ?? []) };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}

interface OpenAlexAuthorJson {
  id: string;
  display_name: string;
  affiliations?: { institution?: { display_name?: string } }[];
}

export function mapOpenAlexAuthors(json: { results?: OpenAlexAuthorJson[] }): AuthorCandidate[] {
  return (json.results ?? []).map((author) => ({
    id: author.id,
    displayName: author.display_name,
    affiliationNames: (author.affiliations ?? [])
      .map((a) => a.institution?.display_name)
      .filter((name): name is string => Boolean(name)),
  }));
}

export type OpenAlexAuthorsOutcome =
  | { ok: true; candidates: AuthorCandidate[] }
  | { ok: false; errorCode: string };

export async function fetchOpenAlexAuthorByName(
  name: string,
  timeoutMs: number,
): Promise<OpenAlexAuthorsOutcome> {
  const url = `https://api.openalex.org/authors?search=${encodeURIComponent(name)}&per-page=5`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const json = (await outcome.response.json()) as { results?: OpenAlexAuthorJson[] };
    return { ok: true, candidates: mapOpenAlexAuthors(json) };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}
