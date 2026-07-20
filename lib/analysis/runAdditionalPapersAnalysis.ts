import { getResearcherById } from "../repositories/researchers";
import { getProfile } from "../repositories/profile";
import { getPapersByDois, getPapersEvidence } from "../repositories/papers";
import {
  findAnalysisByHash,
  getOrCreatePendingAnalysis,
  getLatestAnalysisForResearcher,
  markAnalysisRunning,
  completeAnalysis,
  failAnalysis,
  linkPapersToAnalysis,
  replaceClaimsForAnalysis,
  countCompletedAnalysesForDate,
  type AnalysisRecord,
} from "../repositories/analyses";
import { computeAnalysisInputHash } from "./inputHash";
import { evaluateUsageGate } from "./dailyUsage";
import { validatePaperReviewsEvidence, type PaperReview } from "./evidenceValidation";
import { normalizePaperReview } from "./normalizeReview";
import { localDateString } from "../time";
import { generateStructured } from "../gemini/client";
import { ADDITIONAL_PAPERS_JSON_SCHEMA } from "../gemini/schema";
import {
  ADDITIONAL_PAPERS_ANALYSIS_SYSTEM_INSTRUCTION,
  buildAdditionalPapersAnalysisPrompt,
} from "../prompts/additionalPapersAnalysis";
import { resolveTitles } from "../publications/titleResolution";
import type { ResolveTitlesResponse } from "../types";

const KIND = "additional_papers_analysis" as const;

export type RunAdditionalPapersOutcome =
  | { status: "cached" | "ran"; analysis: AnalysisRecord; resolution: ResolveTitlesResponse }
  | { status: "resolved_none"; resolution: ResolveTitlesResponse }
  | { status: "needs_confirmation"; resolution: ResolveTitlesResponse }
  | { status: "error"; errorCode: string };

export async function runAdditionalPapersAnalysis(
  researcherId: string,
  titles: string[],
  confirmExtra: boolean,
): Promise<RunAdditionalPapersOutcome> {
  const researcher = await getResearcherById(researcherId);
  if (!researcher) return { status: "error", errorCode: "researcher_not_found" };

  const profile = await getProfile();
  if (!profile) return { status: "error", errorCode: "profile_missing" };

  const priorDeepAnalysis = await getLatestAnalysisForResearcher(researcherId, "researcher_deep_analysis");
  if (!priorDeepAnalysis || (priorDeepAnalysis.state !== "completed" && priorDeepAnalysis.state !== "completed_with_gaps")) {
    return { status: "error", errorCode: "deep_analysis_required" };
  }

  const resolution = await resolveTitles(researcherId, titles);
  if (!resolution) return { status: "error", errorCode: "researcher_not_found" };

  const resolvedDois = resolution.results
    .filter((r): r is typeof r & { doi: string } => r.status === "resolved" && Boolean(r.doi))
    .map((r) => r.doi);
  if (resolvedDois.length === 0) return { status: "resolved_none", resolution };

  const newPapers = await getPapersByDois(researcherId, resolvedDois);
  const paperIds = [...newPapers.map((p) => p.id)].sort();
  const inputHash = computeAnalysisInputHash([priorDeepAnalysis.id, ...paperIds]);
  const localDate = localDateString();

  const existing = await findAnalysisByHash(researcherId, KIND, inputHash);
  if (existing && (existing.state === "completed" || existing.state === "completed_with_gaps")) {
    return { status: "cached", analysis: existing, resolution };
  }

  if (existing?.state === "running") return { status: "error", errorCode: "already_running" };

  const counts = await countCompletedAnalysesForDate(localDate);
  const gate = evaluateUsageGate(counts, confirmExtra);
  if (!gate.allowed) return { status: "needs_confirmation", resolution };

  const analysis = await getOrCreatePendingAnalysis(researcherId, KIND, inputHash, gate.isExtra, localDate);
  const result = await runAndPersist(analysis, researcher.fullName, profile.researchProfileText, paperIds);
  if (result.status === "error") return result;
  return { ...result, resolution };
}

async function runAndPersist(
  analysis: AnalysisRecord,
  researcherName: string,
  profileText: string,
  paperIds: string[],
): Promise<{ status: "ran"; analysis: AnalysisRecord } | { status: "error"; errorCode: string }> {
  await markAnalysisRunning(analysis.id);

  const evidence = await getPapersEvidence(analysis.researcherId, paperIds);
  const prompt = buildAdditionalPapersAnalysisPrompt({ profileText, researcherName, papers: evidence });

  const outcome = await generateStructured<{ papers: PaperReview[] }>(
    ADDITIONAL_PAPERS_ANALYSIS_SYSTEM_INSTRUCTION,
    prompt,
    ADDITIONAL_PAPERS_JSON_SCHEMA,
  );

  if (!outcome.ok) {
    await failAnalysis(analysis.id, outcome.errorCode);
    return { status: "error", errorCode: outcome.errorCode };
  }

  const normalizedPapers = outcome.data.papers.map((paper) =>
    normalizePaperReview(paper as unknown as Parameters<typeof normalizePaperReview>[0]),
  );
  const allowedSourceIds = new Set(evidence.flatMap((paper) => paper.sources.map((s) => s.sourceId)));
  const { sanitizedPapers, claims, hasGaps } = validatePaperReviewsEvidence(normalizedPapers, allowedSourceIds);

  const finalState = hasGaps ? "completed_with_gaps" : "completed";
  const resultJson = { papers: sanitizedPapers };
  await completeAnalysis(analysis.id, finalState, resultJson);
  await linkPapersToAnalysis(analysis.id, paperIds);
  await replaceClaimsForAnalysis(analysis.id, claims);

  const updated: AnalysisRecord = { ...analysis, state: finalState, resultJson, errorCode: null };
  return { status: "ran", analysis: updated };
}
