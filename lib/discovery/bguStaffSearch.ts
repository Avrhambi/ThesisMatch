import { fetchWithTimeout } from "./fetchWithTimeout";
import type { StaffDepartment } from "./branchMatch";

// CRIS (cris.bgu.ac.il) sits behind a Cloudflare bot challenge and returns
// 403 to any non-browser request, including this app's server-side fetch.
// The BGU public staff directory (bgu.ac.il/people) is not protected and
// exposes the same faculty roster through a documented CSRF-token + POST
// flow that its own front end uses. This module drives that flow directly;
// no browser automation or challenge-bypass is involved.
const TOKEN_URL = "https://www.bgu.ac.il/umbraco/api/AntiForeignApi/GetToken";
const SEARCH_URL = "https://www.bgu.ac.il/umbraco/api/staffMembersLobbyApi/searchStaffMembers";
const USER_AGENT = "ThesisMatchBot/1.0 (+personal research tool)";
const PAGE_NODE_ID = 107837;
const SELECTED_STAFF_TYPES = [1, 21]; // Senior academic staff, Emeritus/Retired

export interface StaffMember {
  name: string;
  departments: StaffDepartment[];
  orcLink: string | null;
  email: string | null;
  pageUrl: string;
}

export interface StaffSearchResponse {
  staffMembers: StaffMember[];
  totalResults: number;
  totalPages: number;
}

export type StaffSearchResult =
  | { ok: true; data: StaffSearchResponse }
  | { ok: false; stage: "token" | "search"; errorCode: string };

export async function fetchBguStaffDirectory(
  timeoutMs: number,
  pageSize: number,
): Promise<StaffSearchResult> {
  const tokenOutcome = await fetchWithTimeout(
    TOKEN_URL,
    { headers: { "User-Agent": USER_AGENT } },
    timeoutMs,
  );
  if (!tokenOutcome.ok) return { ok: false, stage: "token", errorCode: tokenOutcome.errorCode };

  const cookieHeader = tokenOutcome.response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const token = await tokenOutcome.response.text();

  const searchOutcome = await fetchWithTimeout(
    SEARCH_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        RequestVerificationToken: token,
        Cookie: cookieHeader,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        selectedTypes: SELECTED_STAFF_TYPES,
        term: "",
        currentPage: 1,
        cultureCode: "en-US",
        pageSize,
        units: [],
        searchTerm: "",
        pageNodeId: PAGE_NODE_ID,
      }),
    },
    timeoutMs,
  );
  if (!searchOutcome.ok) return { ok: false, stage: "search", errorCode: searchOutcome.errorCode };

  const data = (await searchOutcome.response.json()) as StaffSearchResponse;
  return { ok: true, data };
}
