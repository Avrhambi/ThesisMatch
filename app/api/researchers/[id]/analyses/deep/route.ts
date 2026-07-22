import { NextResponse } from "next/server";
import { analyzeRequestSchema } from "../../../../../../lib/validation/analysis";
import { runDeepAnalysis } from "../../../../../../lib/analysis/runDeepAnalysis";
import { getLatestAnalysisForResearcher, type AnalysisRecord } from "../../../../../../lib/repositories/analyses";
import { getProfile } from "../../../../../../lib/repositories/profile";
import { getSelectablePapersForResearcher } from "../../../../../../lib/repositories/papers";
import { selectPapersForAnalysis } from "../../../../../../lib/analysis/paperSelection";
import { enrichPaperReviews } from "../../../../../../lib/analysis/enrichPaperReviews";
import type { AnalysisResponse } from "../../../../../../lib/types";

export const dynamic = "force-dynamic";

interface PaperReviewShape {
  paperId: string;
  [key: string]: unknown;
}

// Enriches the stored review's paper entries with title/year/venue/access
// (already in `papers`/`sources`, never re-sent to Gemini) and a best-effort
// selectionReason recomputed from the same deterministic heuristic used to
// pick the papers originally (lib/analysis/paperSelection.ts) -- this is a
// read-side join, not a change to what's persisted in analyses.result_json.
async function enrichAnalysisResponse(researcherId: string, analysis: AnalysisRecord): Promise<AnalysisResponse> {
  let result = analysis.resultJson;
  const review = result as { papers?: PaperReviewShape[] } | null;

  if (review?.papers && review.papers.length > 0) {
    const enrichedPapers = await enrichPaperReviews(researcherId, review.papers);

    const profile = await getProfile();
    const allPapers = await getSelectablePapersForResearcher(researcherId);
    const reasons = profile
      ? new Map(selectPapersForAnalysis(profile.researchProfileText, allPapers).map((s) => [s.paperId, s.reason]))
      : new Map<string, string>();

    result = {
      ...review,
      papers: enrichedPapers.map((paper) => ({ ...paper, selectionReason: reasons.get(paper.paperId) ?? null })),
    };
  }

  return {
    analysisId: analysis.id,
    state: analysis.state,
    isExtra: analysis.isExtra,
    result,
    errorCode: analysis.errorCode,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getLatestAnalysisForResearcher(id, "researcher_deep_analysis");
  if (!analysis) return NextResponse.json({ analysis: null });

  return NextResponse.json(await enrichAnalysisResponse(id, analysis));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const outcome = await runDeepAnalysis(id, parsed.data.confirmExtra);

  if (outcome.status === "needs_confirmation") {
    return NextResponse.json({ error: "confirmation_required" }, { status: 409 });
  }
  if (outcome.status === "error") {
    const status = outcome.errorCode === "researcher_not_found" ? 404 : 422;
    return NextResponse.json({ error: outcome.errorCode }, { status });
  }

  return NextResponse.json(await enrichAnalysisResponse(id, outcome.analysis));
}
