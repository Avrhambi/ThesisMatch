import { NextResponse } from "next/server";
import { addPapersRequestSchema } from "../../../../../../lib/validation/analysis";
import { runAdditionalPapersAnalysis } from "../../../../../../lib/analysis/runAdditionalPapersAnalysis";
import { listCompletedAnalysesForResearcher } from "../../../../../../lib/repositories/analyses";

export const dynamic = "force-dynamic";

// Every completed additional_papers_analysis batch, flattened to its paper
// reviews, so the UI can append them to the deep-analysis review (SPEC:
// "appends results to the existing review").
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batches = await listCompletedAnalysesForResearcher(id, "additional_papers_analysis");
  const papers = batches.flatMap((batch) => {
    const result = batch.resultJson as { papers?: unknown[] } | null;
    return Array.isArray(result?.papers) ? result.papers : [];
  });
  return NextResponse.json({ papers });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = addPapersRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const outcome = await runAdditionalPapersAnalysis(id, parsed.data.titles, parsed.data.confirmExtra);

  if (outcome.status === "needs_confirmation") {
    return NextResponse.json({ error: "confirmation_required", resolution: outcome.resolution }, { status: 409 });
  }
  if (outcome.status === "resolved_none") {
    return NextResponse.json({ analysis: null, resolution: outcome.resolution });
  }
  if (outcome.status === "error") {
    const status = outcome.errorCode === "researcher_not_found" ? 404 : 422;
    return NextResponse.json({ error: outcome.errorCode }, { status });
  }

  return NextResponse.json({
    analysis: {
      analysisId: outcome.analysis.id,
      state: outcome.analysis.state,
      isExtra: outcome.analysis.isExtra,
      result: outcome.analysis.resultJson,
      errorCode: outcome.analysis.errorCode,
    },
    resolution: outcome.resolution,
  });
}
