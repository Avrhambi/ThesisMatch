import type { AccessLevel } from "../types";

export interface PaperEvidenceSource {
  sourceId: string;
  type: string;
  url: string;
  access: AccessLevel;
}

export interface PaperEvidence {
  paperId: string;
  title: string;
  publicationYear: number | null;
  venue: string | null;
  abstract: string | null;
  access: AccessLevel;
  sources: PaperEvidenceSource[];
}

// Renders each paper as a block Gemini can only cite by sourceId; no full
// article text is ever included because the app never fetches or stores it
// (see lib/publications/importSingleDoi.ts) — access level communicates how
// far a claim about that paper is allowed to go.
export function renderPaperEvidenceBlock(paper: PaperEvidence): string {
  const lines = [
    `[Paper ${paper.paperId}]`,
    `Title: ${paper.title}`,
    `Year: ${paper.publicationYear ?? "unknown"}`,
    `Venue: ${paper.venue ?? "unknown"}`,
    `Access level: ${paper.access}`,
    `Abstract: ${paper.abstract ?? "(not available)"}`,
    "Citable evidence sources for this paper (use these sourceId values only):",
    ...paper.sources.map((source) => `- sourceId=${source.sourceId} type=${source.type} access=${source.access} url=${source.url}`),
  ];
  return lines.join("\n");
}

export function renderPapersEvidenceSection(papers: PaperEvidence[]): string {
  return papers.map(renderPaperEvidenceBlock).join("\n\n");
}
