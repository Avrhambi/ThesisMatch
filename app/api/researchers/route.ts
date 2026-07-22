import { NextResponse } from "next/server";
import { listResearchers, type ListResearchersFilters } from "../../../lib/repositories/researchers";
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

  const filters: ListResearchersFilters = { branch, decision, matchLevel, search, page };
  const { items, total } = await listResearchers(filters);

  const filtered = analysisState ? items.filter((item) => item.analysisState === analysisState) : items;

  return NextResponse.json({ items: filtered, total, page });
}
