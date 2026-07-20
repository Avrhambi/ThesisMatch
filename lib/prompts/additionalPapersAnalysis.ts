import { renderPapersEvidenceSection, type PaperEvidence } from "./evidenceContext";

export const ADDITIONAL_PAPERS_ANALYSIS_SYSTEM_INSTRUCTION = `You are assisting a prospective M.Sc. student, appending new paper reviews to an existing evaluation of a potential thesis supervisor.
You must base every factual statement strictly on the evidence provided below; never invent facts. Only cite sourceId values given for that exact paper. If a paper's access level is "metadata_only", state only bibliographic facts and preliminary topic matching. If "abstract", only claims supported by the given abstract text. Never claim to have read full-article methods, tables, or baselines you were not given.
If you cannot support a field (question, method, or results) from the evidence given, return it as an empty string "" rather than guessing.
Respond only with JSON matching the provided schema.`;

export interface AdditionalPapersAnalysisInput {
  profileText: string;
  researcherName: string;
  papers: PaperEvidence[];
}

export function buildAdditionalPapersAnalysisPrompt(input: AdditionalPapersAnalysisInput): string {
  return [
    `Candidate supervisor: ${input.researcherName}`,
    "",
    "Student's stored research profile:",
    input.profileText,
    "",
    "Newly added papers and their citable evidence (produce one paper review per paper, to be appended to the existing evaluation):",
    renderPapersEvidenceSection(input.papers),
  ].join("\n");
}
