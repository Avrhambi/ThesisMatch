import { fetchWithTimeout } from "../discovery/fetchWithTimeout";
import { normalizeDoi } from "./normalizeDoi";

const USER_AGENT = "ThesisMatchBot/1.0 (+personal research tool; mailto:noreply@example.invalid)";
const SEARCH_ROWS = 5;

export interface CrossrefWork {
  doi: string;
  title: string;
  year: number | null;
  venue: string | null;
  authorFamilies: string[];
}

interface CrossrefMessage {
  DOI?: string;
  title?: string[];
  "container-title"?: string[];
  "short-container-title"?: string[];
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  author?: { family?: string }[];
}

function extractYear(message: CrossrefMessage): number | null {
  const dateParts =
    message.published?.["date-parts"]?.[0] ??
    message["published-print"]?.["date-parts"]?.[0] ??
    message["published-online"]?.["date-parts"]?.[0];
  return dateParts?.[0] ?? null;
}

export function mapCrossrefWork(message: CrossrefMessage): CrossrefWork | null {
  if (!message.DOI || !message.title?.[0]) return null;
  return {
    doi: normalizeDoi(message.DOI),
    title: message.title[0],
    year: extractYear(message),
    venue: message["container-title"]?.[0] ?? message["short-container-title"]?.[0] ?? null,
    authorFamilies: (message.author ?? []).map((a) => a.family ?? "").filter(Boolean),
  };
}

export type CrossrefWorkOutcome =
  | { ok: true; url: string; raw: string; work: CrossrefWork }
  | { ok: false; errorCode: string };

// Authoritative DOI verification: a DOI is only trusted, and a paper only
// persisted, once Crossref confirms it resolves to a real bibliographic
// record. Never invent DOI metadata from ORCID/OpenAlex alone (CLAUDE.md).
export async function fetchCrossrefWork(doi: string, timeoutMs: number): Promise<CrossrefWorkOutcome> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const raw = await outcome.response.text();
    const json = JSON.parse(raw) as { message?: CrossrefMessage };
    const work = json.message ? mapCrossrefWork(json.message) : null;
    if (!work) return { ok: false, errorCode: "invalid_response" };
    return { ok: true, url, raw, work };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}

export type CrossrefSearchOutcome =
  | { ok: true; candidates: CrossrefWork[] }
  | { ok: false; errorCode: string };

export async function fetchCrossrefBibliographicSearch(
  title: string,
  timeoutMs: number,
): Promise<CrossrefSearchOutcome> {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(title)}&rows=${SEARCH_ROWS}`;
  const outcome = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, timeoutMs);
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const json = (await outcome.response.json()) as { message?: { items?: CrossrefMessage[] } };
    const candidates = (json.message?.items ?? [])
      .map(mapCrossrefWork)
      .filter((work): work is CrossrefWork => work !== null);
    return { ok: true, candidates };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}
