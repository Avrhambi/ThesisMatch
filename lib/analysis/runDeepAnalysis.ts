import { getResearcherById } from "../repositories/researchers";
import { getProfile } from "../repositories/profile";
import { getSelectablePapersForResearcher, getPapersEvidence } from "../repositories/papers";
import { importPublicationsForResearcher } from "../publications/import";
import {
  findAnalysisByHash,
  getOrCreatePendingAnalysis,
  markAnalysisRunning,
  completeAnalysis,
  failAnalysis,
  linkPapersToAnalysis,
  replaceClaimsForAnalysis,
  countCompletedAnalysesForDate,
  type AnalysisRecord,
} from "../repositories/analyses";
import { selectPapersForAnalysis } from "./paperSelection";
import { computeAnalysisInputHash } from "./inputHash";
import { evaluateUsageGate } from "./dailyUsage";
import { validateResearcherReviewEvidence, type GeminiResearcherReview, type ResearcherReview } from "./evidenceValidation";
import { normalizeResearcherReview } from "./normalizeReview";
import { detectSupervisionStatus } from "./supervisionEligibility";
import { deriveOverallFit, derivePriority } from "./fitAssessment";
import { localDateString } from "../time";
import { generateStructured } from "../gemini/client";
import { RESEARCHER_REVIEW_JSON_SCHEMA } from "../gemini/schema";
import {
  RESEARCHER_DEEP_ANALYSIS_SYSTEM_INSTRUCTION,
  buildResearcherDeepAnalysisPrompt,
} from "../prompts/researcherDeepAnalysis";

const KIND = "researcher_deep_analysis" as const;

export type RunDeepAnalysisOutcome =
  | { status: "cached" | "ran"; analysis: AnalysisRecord }
  | { status: "needs_confirmation" }
  | { status: "error"; errorCode: string };

export async function runDeepAnalysis(researcherId: string, confirmExtra: boolean): Promise<RunDeepAnalysisOutcome> {
  const researcher = await getResearcherById(researcherId);
  if (!researcher) return { status: "error", errorCode: "researcher_not_found" };

  const profile = await getProfile();
  if (!profile) return { status: "error", errorCode: "profile_missing" };

  let allPapers = await getSelectablePapersForResearcher(researcherId);
  if (allPapers.length === 0) {
    // Publication import is otherwise a separate manual step (PapersPanel's
    // "Import publications" button); run it here so Analyze works on the
    // first click instead of failing until the user imports first.
    const importResult = await importPublicationsForResearcher(researcherId);
    allPapers = await getSelectablePapersForResearcher(researcherId);
    if (allPapers.length === 0) {
      const errorCode = importResult.source === "unavailable" ? "no_papers_unavailable" : "no_papers";
      return { status: "error", errorCode };
    }
  }

  const selection = selectPapersForAnalysis(profile.researchProfileText, allPapers);
  const paperIds = [...selection.map((s) => s.paperId)].sort();
  const inputHash = computeAnalysisInputHash([profile.researchProfileText, ...paperIds]);
  const localDate = localDateString();

  const existing = await findAnalysisByHash(researcherId, KIND, inputHash);
  if (existing && (existing.state === "completed" || existing.state === "completed_with_gaps")) {
    return { status: "cached", analysis: existing };
  }

  if (!existing || existing.state !== "running") {
    const counts = await countCompletedAnalysesForDate(localDate);
    const gate = evaluateUsageGate(counts, confirmExtra);
    if (!gate.allowed) return { status: "needs_confirmation" };

    const analysis = await getOrCreatePendingAnalysis(researcherId, KIND, inputHash, gate.isExtra, localDate);
    return runAndPersist(analysis, researcher.fullName, profile.researchProfileText, paperIds);
  }

  return { status: "error", errorCode: "already_running" };
}

async function runAndPersist(
  analysis: AnalysisRecord,
  researcherName: string,
  profileText: string,
  paperIds: string[],
): Promise<RunDeepAnalysisOutcome> {
  await markAnalysisRunning(analysis.id);

  const evidence = await getPapersEvidence(analysis.researcherId, paperIds);
  const supervisionStatus = detectSupervisionStatus(researcherName);
  const prompt = buildResearcherDeepAnalysisPrompt({ profileText, researcherName, supervisionStatus, papers: evidence });

  const outcome = await generateStructured<GeminiResearcherReview>(
    RESEARCHER_DEEP_ANALYSIS_SYSTEM_INSTRUCTION,
    prompt,
    RESEARCHER_REVIEW_JSON_SCHEMA,
  );

  if (!outcome.ok) {
    await failAnalysis(analysis.id, outcome.errorCode);
    return { status: "error", errorCode: outcome.errorCode };
  }

  const normalized = normalizeResearcherReview(outcome.data as unknown as Parameters<typeof normalizeResearcherReview>[0]);
  const allowedSourceIds = new Set(evidence.flatMap((paper) => paper.sources.map((s) => s.sourceId)));
  const { sanitized, claims, hasGaps } = validateResearcherReviewEvidence(normalized, allowedSourceIds);

  const fit = deriveOverallFit(sanitized);
  const priority = derivePriority(fit, sanitized.thesisDirections.length);
  const finalReview: ResearcherReview = { ...sanitized, fit, priority, supervisionStatus };

  const finalState = hasGaps ? "completed_with_gaps" : "completed";
  await completeAnalysis(analysis.id, finalState, finalReview);
  await linkPapersToAnalysis(analysis.id, paperIds);
  await replaceClaimsForAnalysis(analysis.id, claims);

  const updated: AnalysisRecord = { ...analysis, state: finalState, resultJson: finalReview, errorCode: null };
  return { status: "ran", analysis: updated };
}
