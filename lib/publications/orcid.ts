import { fetchWithTimeout } from "../discovery/fetchWithTimeout";
import { normalizeDoi } from "./normalizeDoi";

const USER_AGENT = "ThesisMatchBot/1.0 (+personal research tool)";

export interface OrcidWorkSummary {
  title: string;
  doi: string | null;
  year: number | null;
}

interface OrcidExternalId {
  "external-id-type"?: string;
  "external-id-value"?: string;
}

interface OrcidWorkGroup {
  "external-ids"?: { "external-id"?: OrcidExternalId[] };
  "work-summary"?: {
    title?: { title?: { value?: string } };
    "publication-date"?: { year?: { value?: string } };
  }[];
}

interface OrcidWorksResponse {
  group?: OrcidWorkGroup[];
}

export function mapOrcidWorksResponse(json: unknown): OrcidWorkSummary[] {
  const groups = (json as OrcidWorksResponse)?.group ?? [];
  return groups
    .map((group) => {
      const summary = group["work-summary"]?.[0];
      const title = summary?.title?.title?.value ?? "";
      const yearValue = summary?.["publication-date"]?.year?.value;
      const externalIds = group["external-ids"]?.["external-id"] ?? [];
      const doiEntry = externalIds.find((entry) => entry["external-id-type"] === "doi");
      return {
        title,
        doi: doiEntry?.["external-id-value"] ? normalizeDoi(doiEntry["external-id-value"]) : null,
        year: yearValue ? Number(yearValue) : null,
      };
    })
    .filter((work) => work.title.length > 0);
}

export type OrcidWorksOutcome =
  | { ok: true; works: OrcidWorkSummary[] }
  | { ok: false; errorCode: string };

export async function fetchOrcidWorks(bareOrcid: string, timeoutMs: number): Promise<OrcidWorksOutcome> {
  const outcome = await fetchWithTimeout(
    `https://pub.orcid.org/v3.0/${bareOrcid}/works`,
    { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
    timeoutMs,
  );
  if (!outcome.ok) return { ok: false, errorCode: outcome.errorCode };

  try {
    const json = await outcome.response.json();
    return { ok: true, works: mapOrcidWorksResponse(json) };
  } catch {
    return { ok: false, errorCode: "invalid_response" };
  }
}

export function extractBareOrcid(orcidField: string): string {
  const match = orcidField.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
  return match ? match[1] : orcidField;
}
