import { randomUUID } from "node:crypto";
import { getResearcherById } from "../repositories/researchers";
import { getProfile } from "../repositories/profile";
import { getCurrentCv } from "../repositories/cv";
import { getSelectablePapersForResearcher, getPapersEvidence } from "../repositories/papers";
import { upsertResearcherNote } from "../repositories/researcherNotes";
import { createOutreachPackage, getOutreachPackageByAnalysisId, type OutreachPackageRecord } from "../repositories/outreach";
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
import { validateCvRecommendationsEvidence, type CvRecommendation, type ExcludedClaim } from "./evidenceValidation";
import { normalizeCvRecommendation } from "./normalizeReview";
import { localDateString } from "../time";
import { generateStructured } from "../gemini/client";
import { OUTREACH_JSON_SCHEMA } from "../gemini/schema";
import { OUTREACH_GENERATION_SYSTEM_INSTRUCTION, buildOutreachPrompt } from "../prompts/outreachGeneration";

const KIND = "outreach_generation" as const;
const MAX_BODY_LENGTH = 3000;

export type RunOutreachOutcome =
  | { status: "cached" | "ran"; analysis: AnalysisRecord; outreach: OutreachPackageRecord }
  | { status: "needs_confirmation" }
  | { status: "error"; errorCode: string };

export async function runOutreachGeneration(
  researcherId: string,
  note: string,
  confirmExtra: boolean,
  regenerate: boolean,
): Promise<RunOutreachOutcome> {
  const researcher = await getResearcherById(researcherId);
  if (!researcher) return { status: "error", errorCode: "researcher_not_found" };

  const profile = await getProfile();
  if (!profile) return { status: "error", errorCode: "profile_missing" };

  const cv = await getCurrentCv();
  if (!cv) return { status: "error", errorCode: "cv_missing" };

  const deepAnalysis = await getLatestAnalysisForResearcher(researcherId, "researcher_deep_analysis");
  if (!deepAnalysis || (deepAnalysis.state !== "completed" && deepAnalysis.state !== "completed_with_gaps")) {
    return { status: "error", errorCode: "deep_analysis_required" };
  }

  await upsertResearcherNote(researcherId, note);

  const allPapers = await getSelectablePapersForResearcher(researcherId);
  const paperIds = [...allPapers.map((p) => p.id)].sort();

  // `regenerate` must always dispatch a new counted Gemini request per SPEC's
  // daily analysis policy, even when nothing else about the input changed;
  // a random nonce guarantees the hash cannot collide with a prior request.
  const hashParts = [profile.researchProfileText, cv.redactedText, note, deepAnalysis.id, ...paperIds];
  if (regenerate) hashParts.push(randomUUID());
  const inputHash = computeAnalysisInputHash(hashParts);
  const localDate = localDateString();

  const existing = await findAnalysisByHash(researcherId, KIND, inputHash);
  if (existing && (existing.state === "completed" || existing.state === "completed_with_gaps")) {
    const outreach = await getOutreachPackageByAnalysisId(existing.id);
    if (outreach) return { status: "cached", analysis: existing, outreach };
  }

  if (existing?.state === "running") return { status: "error", errorCode: "already_running" };

  const counts = await countCompletedAnalysesForDate(localDate);
  const gate = evaluateUsageGate(counts, confirmExtra);
  if (!gate.allowed) return { status: "needs_confirmation" };

  const analysis = await getOrCreatePendingAnalysis(researcherId, KIND, inputHash, gate.isExtra, localDate);
  return runAndPersist(analysis, researcher.fullName, profile.researchProfileText, cv.redactedText, note, deepAnalysis, paperIds);
}

async function runAndPersist(
  analysis: AnalysisRecord,
  researcherName: string,
  profileText: string,
  cvRedactedText: string,
  note: string,
  deepAnalysis: AnalysisRecord,
  paperIds: string[],
): Promise<RunOutreachOutcome> {
  await markAnalysisRunning(analysis.id);

  const evidence = await getPapersEvidence(analysis.researcherId, paperIds);
  const deepReview =
    deepAnalysis.resultJson && typeof deepAnalysis.resultJson === "object"
      ? (deepAnalysis.resultJson as { summary?: string; topics?: string[]; mismatches?: string[] })
      : null;
  const researcherSummary = deepReview?.summary ?? "";
  const researcherTopics = deepReview?.topics ?? [];
  const researcherMismatches = deepReview?.mismatches ?? [];

  const prompt = buildOutreachPrompt({
    researcherName,
    profileText,
    cvRedactedText,
    researcherNote: note,
    researcherSummary,
    researcherTopics,
    researcherMismatches,
    papers: evidence,
  });

  const outcome = await generateStructured<{
    subject: string;
    body: string;
    cvRecommendations: Parameters<typeof normalizeCvRecommendation>[0][];
    excludedClaims: ExcludedClaim[];
  }>(OUTREACH_GENERATION_SYSTEM_INSTRUCTION, prompt, OUTREACH_JSON_SCHEMA);

  if (!outcome.ok) {
    await failAnalysis(analysis.id, outcome.errorCode);
    return { status: "error", errorCode: outcome.errorCode };
  }

  if (outcome.data.body.length > MAX_BODY_LENGTH) {
    await failAnalysis(analysis.id, "output_too_large");
    return { status: "error", errorCode: "output_too_large" };
  }

  const normalizedRecommendations: CvRecommendation[] = outcome.data.cvRecommendations.map(normalizeCvRecommendation);
  const allowedSourceIds = new Set(evidence.flatMap((paper) => paper.sources.map((s) => s.sourceId)));
  const { sanitized, dropped, claims, hasGaps } = validateCvRecommendationsEvidence(normalizedRecommendations, allowedSourceIds);

  const finalState = hasGaps ? "completed_with_gaps" : "completed";
  const resultJson = {
    subject: outcome.data.subject,
    body: outcome.data.body,
    cvRecommendations: sanitized,
    droppedRecommendations: dropped,
    excludedClaims: outcome.data.excludedClaims,
  };

  await completeAnalysis(analysis.id, finalState, resultJson);
  await linkPapersToAnalysis(analysis.id, paperIds);
  await replaceClaimsForAnalysis(analysis.id, claims);
  const outreach = await createOutreachPackage(analysis.id, resultJson.subject, resultJson.body, sanitized, resultJson.excludedClaims);

  const updated: AnalysisRecord = { ...analysis, state: finalState, resultJson, errorCode: null };
  return { status: "ran", analysis: updated, outreach };
}
