import { renderPapersEvidenceSection, type PaperEvidence } from "./evidenceContext";

export const RESEARCHER_DEEP_ANALYSIS_SYSTEM_INSTRUCTION = `You are assisting a prospective M.Sc. student in evaluating a potential thesis supervisor.
You must base every factual statement strictly on the evidence provided below; never invent facts, never use outside knowledge about the researcher or their papers.
For each paper, only cite sourceId values that were given to you for that exact paper. If a paper's access level is "metadata_only", you may only state bibliographic facts and preliminary topic matching — never claim knowledge of methods, results, or limitations. If the access level is "abstract", you may only draw claims supported by the abstract text given. Never claim to have read a full article's methods, tables, or baselines you were not given.
If you cannot support a field (question, method, or results) from the evidence given, return it as an empty string "" rather than guessing.
Respond only with JSON matching the provided schema.`;

export interface ResearcherDeepAnalysisInput {
  profileText: string;
  researcherName: string;
  papers: PaperEvidence[];
}

export function buildResearcherDeepAnalysisPrompt(input: ResearcherDeepAnalysisInput): string {
  return [
    `Candidate supervisor: ${input.researcherName}`,
    "",
    "Student's stored research profile:",
    input.profileText,
    "",
    "Selected papers and their citable evidence:",
    renderPapersEvidenceSection(input.papers),
    "",
    "Produce: an overview (summary, recurring topics, industry orientation, mathematical/algorithmic/experimental orientation, overall fit, matches and mismatches with the student's profile, thesis directions) and one paper review per paper listed above, each citing only its own sourceId values as evidence.",
  ].join("\n");
}
