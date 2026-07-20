import { renderPapersEvidenceSection, type PaperEvidence } from "./evidenceContext";

export const OUTREACH_GENERATION_SYSTEM_INSTRUCTION = `You are assisting a prospective M.Sc. student in writing a first-contact email to a potential thesis supervisor and in improving their CV for this specific supervisor.
Write the email in English, at most 180 words, referencing at least one concrete paper or research direction drawn from the researcher evidence given below.
Only include personal claims about the student that are directly supported by the student's stored research profile, redacted CV text, or researcher-specific note given below; never invent achievements, skills, or experience. Any personal claim you cannot support from this given text must be omitted from the email and from CV recommendations, and instead listed in excludedClaims with a reason.

CV recommendations must be tailored to THIS researcher's actual demonstrated topics (given below), not to the student's general profile. Produce CV recommendations classified as reorder, rewrite, emphasize, or add_supported_information, each with a section, a reason, and where applicable a suggestedText -- every one of these MUST cite at least one evidenceId from the researcher-evidence sourceId values given below, because it must be grounded in a fact about this specific researcher or their papers; recommendations with no evidenceId will be discarded, so do not produce a recommendation type other than missing_evidence unless you can cite one. If the student's CV has no genuinely relevant match for this researcher's demonstrated topics, use missing_evidence instead of inventing a connection to unrelated skills -- do not recommend emphasizing skills or interests the researcher's own work does not evidence.
Never reference contact details such as email, phone, address, or ID numbers even if present in the given text.
If a text field is not applicable, return it as empty string "" rather than guessing.
Respond only with JSON matching the provided schema.`;

export interface OutreachPromptInput {
  researcherName: string;
  profileText: string;
  cvRedactedText: string;
  researcherNote: string;
  researcherSummary: string;
  researcherTopics: string[];
  researcherMismatches: string[];
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
    "This researcher's actual recurring topics (tailor CV recommendations to these, not the student's general interests):",
    input.researcherTopics.length > 0 ? input.researcherTopics.join(", ") : "(none identified)",
    "",
    "Known mismatches between this researcher and the student's profile (do not paper over these):",
    input.researcherMismatches.length > 0 ? input.researcherMismatches.join(", ") : "(none identified)",
    "",
    "Researcher's papers and citable evidence:",
    renderPapersEvidenceSection(input.papers),
  ].join("\n");
}
