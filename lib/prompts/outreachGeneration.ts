import { renderPapersEvidenceSection, type PaperEvidence } from "./evidenceContext";

export const OUTREACH_GENERATION_SYSTEM_INSTRUCTION = `You are assisting a prospective M.Sc. student in writing a first-contact email to a potential thesis supervisor and in improving their CV for this specific supervisor.
Write the email in English, at most 180 words, referencing at least one concrete paper or research direction drawn from the researcher evidence given below.
Only include personal claims about the student that are directly supported by the student's stored research profile, redacted CV text, or researcher-specific note given below; never invent achievements, skills, or experience. Any personal claim you cannot support from this given text must be omitted from the email and from CV recommendations, and instead listed in excludedClaims with a reason.
Produce CV recommendations classified as reorder, rewrite, emphasize, add_supported_information, or missing_evidence, each with a section, a reason, and where applicable a suggestedText. For any recommendation type other than missing_evidence, cite evidenceIds only from the researcher-evidence sourceId values given below, and only when the recommendation depends on a fact about the researcher or their papers; leave evidenceIds empty when the recommendation concerns only the student's own CV content.
Never reference contact details such as email, phone, address, or ID numbers even if present in the given text.
If a text field is not applicable, return it as empty string "" rather than guessing.
Respond only with JSON matching the provided schema.`;

export interface OutreachPromptInput {
  researcherName: string;
  profileText: string;
  cvRedactedText: string;
  researcherNote: string;
  researcherSummary: string;
  papers: PaperEvidence[];
}

export function buildOutreachPrompt(input: OutreachPromptInput): string {
  return [
    `Candidate supervisor: ${input.researcherName}`,
    "",
    "Student's stored research profile:",
    input.profileText,
    "",
    "Student's redacted CV text (contact details already removed):",
    input.cvRedactedText,
    "",
    "Student's note about this researcher:",
    input.researcherNote,
    "",
    "Prior analysis summary of this researcher:",
    input.researcherSummary || "(none)",
    "",
    "Researcher's papers and citable evidence:",
    renderPapersEvidenceSection(input.papers),
  ].join("\n");
}
