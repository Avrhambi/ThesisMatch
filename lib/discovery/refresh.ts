import { fetchBguStaffDirectory } from "./bguStaffSearch";
import { isCsFacultyMember, matchBranches } from "./branchMatch";
import { normalizeName } from "./normalize";
import { upsertDiscoveredResearcherOnPool } from "../repositories/researchers";
import type { RefreshResearchersResponse } from "../types";

const FETCH_TIMEOUT_MS = 15000;
// One request covers the full senior + emeritus staff roster (~1,300 people
// university-wide as of writing); comfortably above that keeps this a single
// no-retry request per SPEC rather than a multi-page loop.
const DIRECTORY_PAGE_SIZE = 3000;
const MAX_PEOPLE = 100;

function toAbsoluteBguUrl(pagePath: string): string {
  return new URL(pagePath, "https://www.bgu.ac.il").toString();
}

export async function refreshResearchers(): Promise<RefreshResearchersResponse> {
  const result = await fetchBguStaffDirectory(FETCH_TIMEOUT_MS, DIRECTORY_PAGE_SIZE);
  if (!result.ok) {
    return { discovered: 0, verified: 0, needsReview: 0, unchanged: 0, failed: 1 };
  }

  const csMembers = result.data.staffMembers
    .filter((member) => isCsFacultyMember(member.departments))
    .slice(0, MAX_PEOPLE);

  let verified = 0;
  let needsReview = 0;
  let unchanged = 0;

  for (const member of csMembers) {
    const branches = matchBranches(member.departments);

    const { changed } = await upsertDiscoveredResearcherOnPool({
      fullName: member.name,
      normalizedName: normalizeName(member.name),
      crisUrl: toAbsoluteBguUrl(member.pageUrl),
      orcid: member.orcLink,
      branches,
    });

    if (branches.length > 0) verified += 1;
    else needsReview += 1;
    if (!changed) unchanged += 1;
  }

  return { discovered: csMembers.length, verified, needsReview, unchanged, failed: 0 };
}
