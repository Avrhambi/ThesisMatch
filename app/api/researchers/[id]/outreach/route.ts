import { NextResponse } from "next/server";
import { generateOutreachRequestSchema, markOutreachRequestSchema } from "../../../../../lib/validation/outreach";
import { runOutreachGeneration } from "../../../../../lib/analysis/runOutreachGeneration";
import { getResearcherById, updateResearcher } from "../../../../../lib/repositories/researchers";
import { getResearcherNote } from "../../../../../lib/repositories/researcherNotes";
import {
  getLatestOutreachForResearcher,
  getOutreachPackageByAnalysisId,
  markOutreachCopied,
  markOutreachSent,
} from "../../../../../lib/repositories/outreach";
import { createContactEvent } from "../../../../../lib/repositories/contactEvents";
import type { AnalysisResponse } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const researcher = await getResearcherById(id);
  if (!researcher) return NextResponse.json({ error: "researcher_not_found" }, { status: 404 });

  const note = await getResearcherNote(id);
  const latest = await getLatestOutreachForResearcher(id);

  const analysis: AnalysisResponse | null = latest
    ? {
        analysisId: latest.analysisId,
        state: latest.analysisState,
        isExtra: latest.isExtra,
        result: latest.outreach
          ? {
              subject: latest.outreach.subject,
              body: latest.outreach.body,
              cvRecommendations: latest.outreach.cvRecommendations,
              excludedClaims: latest.outreach.excludedClaims,
            }
          : null,
        errorCode: latest.errorCode,
      }
    : null;

  return NextResponse.json({
    note: note?.content ?? null,
    analysis,
    copiedAt: latest?.outreach?.copiedAt ?? null,
    sentAt: latest?.outreach?.sentAt ?? null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = generateOutreachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const outcome = await runOutreachGeneration(id, parsed.data.note, parsed.data.confirmExtra, parsed.data.regenerate);

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
  return NextResponse.json({ analysis: response, copiedAt: outcome.outreach.copiedAt, sentAt: outcome.outreach.sentAt });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = markOutreachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, { status: 400 });
  }

  const latest = await getLatestOutreachForResearcher(id);
  if (!latest?.outreach) {
    return NextResponse.json({ error: "outreach_not_found" }, { status: 404 });
  }

  if (parsed.data.action === "copy") {
    await markOutreachCopied(latest.outreach.id);
  } else {
    await markOutreachSent(latest.outreach.id);
    // SPEC Flow 3: marking sent defaults the decision to Waiting for reply
    // unless the caller explicitly picked another status.
    await updateResearcher(id, { decision: parsed.data.decision ?? "waiting_for_reply" });
    await createContactEvent(id, "contacted");
  }

  const updated = await getOutreachPackageByAnalysisId(latest.analysisId);
  return NextResponse.json({ copiedAt: updated?.copiedAt ?? null, sentAt: updated?.sentAt ?? null });
}
