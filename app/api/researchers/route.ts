import { NextResponse } from "next/server";
import {
  CURRENT_ANALYSIS_STATE,
  listResearchers,
  type ListResearchersFilters,
} from "../../../lib/repositories/researchers";
import type { AnalysisState, DecisionStatus, MatchLevel, ResearchBranch } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const branch = (url.searchParams.get("branch") as ResearchBranch | null) ?? undefined;
  const decision = (url.searchParams.get("decision") as DecisionStatus | null) ?? undefined;
  const matchLevel = (url.searchParams.get("matchLevel") as MatchLevel | null) ?? undefined;
  const analysisState = url.searchParams.get("analysisState") as AnalysisState | null;
  const search = url.searchParams.get("search")?.trim() || undefined;
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  // See CURRENT_ANALYSIS_STATE: no analysis data exists until Milestone 5,
  // so any other requested state trivially has zero matches.
  if (analysisState && analysisState !== CURRENT_ANALYSIS_STATE) {
    return NextResponse.json({ items: [], total: 0, page });
  }

  const filters: ListResearchersFilters = { branch, decision, matchLevel, search, page };
  const { items, total } = await listResearchers(filters);

  return NextResponse.json({
    items: items.map((item) => ({ ...item, analysisState: CURRENT_ANALYSIS_STATE })),
    total,
    page,
  });
}
