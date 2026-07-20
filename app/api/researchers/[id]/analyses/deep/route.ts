import { NextResponse } from "next/server";
import { analyzeRequestSchema } from "../../../../../../lib/validation/analysis";
import { runDeepAnalysis } from "../../../../../../lib/analysis/runDeepAnalysis";
import { getLatestAnalysisForResearcher } from "../../../../../../lib/repositories/analyses";
import type { AnalysisResponse } from "../../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getLatestAnalysisForResearcher(id, "researcher_deep_analysis");
  if (!analysis) return NextResponse.json({ analysis: null });

  const response: AnalysisResponse = {
    analysisId: analysis.id,
    state: analysis.state,
    isExtra: analysis.isExtra,
    result: analysis.resultJson,
    errorCode: analysis.errorCode,
  };
  return NextResponse.json(response);
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

  const response: AnalysisResponse = {
    analysisId: outcome.analysis.id,
    state: outcome.analysis.state,
    isExtra: outcome.analysis.isExtra,
    result: outcome.analysis.resultJson,
    errorCode: outcome.analysis.errorCode,
  };
  return NextResponse.json(response);
}
