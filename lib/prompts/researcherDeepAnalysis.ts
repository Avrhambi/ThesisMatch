import { renderPapersEvidenceSection, type PaperEvidence } from "./evidenceContext";
import type { SupervisionStatus } from "../types";

export const RESEARCHER_DEEP_ANALYSIS_SYSTEM_INSTRUCTION = `You are assisting a prospective M.Sc. student in evaluating a potential thesis supervisor. Your job is to help the student decide whether to prioritize this researcher, not just to describe them.
You must base every factual statement strictly on the evidence provided below; never invent facts, never use outside knowledge about the researcher or their papers.
For each paper, only cite sourceId values that were given to you for that exact paper. If a paper's access level is "metadata_only", you may only state bibliographic facts and preliminary topic matching — never claim knowledge of methods, results, or limitations. If the access level is "abstract", you may only draw claims supported by the abstract text given. Never claim to have read a full article's methods, tables, or baselines you were not given.
If you cannot support a field (question, method, or results) from the evidence given, return it as an empty string "" rather than guessing.
keyConcepts: 2-4 short phrases (at most 4 words each) naming that specific paper's core concepts or techniques, grounded only in the evidence given for that paper. Return an empty array if the access level does not support it.

Produce four separate fit dimensions, each as { level: unknown|low|medium|high, reasoning: at most 15 words, one grounded clause }:
- topicFit: does the researcher's actual publication history align with the student's declared interests?
- methodFit: does the researcher's typical methodology (e.g. proof-based/theoretical vs. empirical/experimental) match the student's stated preference?
- mechanismFit: does the researcher study mechanisms internal to learned models/systems specifically, as opposed to external application domains, deployment, or infrastructure?
- practicalFit: feasibility factors such as apparent current research activity and any supervision-availability context given below. Do not assume active supervision without evidence.
Do not compute or state an overall fit level yourself — the application derives that deterministically from these four dimensions.

thesisDirections must each be a concrete question connecting the researcher's actual demonstrated work to the student's profile, specific enough that a reader could start scoping a thesis from it, in at most one sentence each. Return an empty array if no genuine connection exists — never restate the researcher's field as a filler "direction".
recommendationReason: at most 25 words synthesizing why this researcher should or should not be prioritized, grounded in the four fit dimensions above.
disqualifyingFactors: at most 2 concrete reasons this researcher may not be viable (e.g. no evidence of current AI/ML work, fundamental methodology mismatch), each at most 12 words. Return an empty array if none apply.
missingEvidence: at most 2 items describing what could not be assessed from the evidence given (e.g. "no evidence of current student supervision"), each at most 12 words. Return an empty array if nothing is missing.
Keep every text field as short as these limits allow — the total response must fit a strict output budget. Do not pad with extra detail.

Respond only with JSON matching the provided schema.`;

export interface ResearcherDeepAnalysisInput {
  profileText: string;
  researcherName: string;
  supervisionStatus: SupervisionStatus;
  papers: PaperEvidence[];
}

export function buildResearcherDeepAnalysisPrompt(input: ResearcherDeepAnalysisInput): string {
  const supervisionNote =
    input.supervisionStatus === "unverified"
      ? `Note: this researcher's name is recorded as "${input.researcherName}" in the source directory, which indicates Emeritus or retired status. Do not assume active student supervision — factor this directly into practicalFit's reasoning and into missingEvidence.`
      : null;

  return [
    `Candidate supervisor: ${input.researcherName}`,
    ...(supervisionNote ? ["", supervisionNote] : []),
    "",
    "Student's stored research profile:",
    input.profileText,
    "",
    "Selected papers and their citable evidence:",
    renderPapersEvidenceSection(input.papers),
    "",
    "Produce: an overview (summary, recurring topics, industry orientation, mathematical/algorithmic/experimental orientation, the four fit dimensions, recommendationReason, disqualifyingFactors, missingEvidence, matches and mismatches with the student's profile, thesis directions) and one paper review per paper listed above, each citing only its own sourceId values as evidence.",
  ].join("\n");
}
