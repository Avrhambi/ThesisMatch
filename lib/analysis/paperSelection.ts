export interface SelectablePaper {
  id: string;
  title: string;
  abstract: string | null;
  publicationYear: number | null;
}

export type PaperSelectionReason = "profile_match" | "recent" | "distinct";

export interface PaperSelectionResult {
  paperId: string;
  reason: PaperSelectionReason;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "onto", "over",
  "using", "based", "study", "analysis", "approach", "method", "methods",
  "toward", "towards", "via", "are", "was", "were", "has", "have", "its",
  "our", "their", "these", "those", "can", "will", "not", "but", "also",
]);

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  return new Set(words);
}

function overlapScore(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let count = 0;
  for (const word of a) if (b.has(word)) count += 1;
  return count;
}

const MAX_SELECTED = 5;

// Deterministic, non-LLM heuristic per SPEC Flow 2: two best profile
// matches, two recent representative papers, one distinct representative
// paper (lowest keyword overlap with everything already selected).
export function selectPapersForAnalysis(
  profileText: string,
  papers: SelectablePaper[],
): PaperSelectionResult[] {
  if (papers.length === 0) return [];

  const profileKeywords = extractKeywords(profileText);
  const withKeywords = papers.map((paper) => ({
    paper,
    keywords: extractKeywords(`${paper.title} ${paper.abstract ?? ""}`),
    profileScore: 0,
  }));
  for (const item of withKeywords) {
    item.profileScore = overlapScore(profileKeywords, item.keywords);
  }

  const selected: PaperSelectionResult[] = [];
  const usedIds = new Set<string>();

  const byProfileMatchDesc = [...withKeywords].sort(
    (a, b) => b.profileScore - a.profileScore || (b.paper.publicationYear ?? 0) - (a.paper.publicationYear ?? 0),
  );
  for (const item of byProfileMatchDesc) {
    if (selected.length >= 2) break;
    selected.push({ paperId: item.paper.id, reason: "profile_match" });
    usedIds.add(item.paper.id);
  }

  const recentPool = withKeywords.filter((item) => !usedIds.has(item.paper.id));
  const byRecentDesc = [...recentPool].sort(
    (a, b) => (b.paper.publicationYear ?? 0) - (a.paper.publicationYear ?? 0),
  );
  let recentCount = 0;
  for (const item of byRecentDesc) {
    if (recentCount >= 2) break;
    selected.push({ paperId: item.paper.id, reason: "recent" });
    usedIds.add(item.paper.id);
    recentCount += 1;
  }

  const distinctPool = withKeywords.filter((item) => !usedIds.has(item.paper.id));
  if (distinctPool.length > 0) {
    const selectedKeywords = new Set<string>();
    for (const item of withKeywords) {
      if (usedIds.has(item.paper.id)) {
        for (const word of item.keywords) selectedKeywords.add(word);
      }
    }
    const byDistinctAsc = [...distinctPool].sort(
      (a, b) => overlapScore(a.keywords, selectedKeywords) - overlapScore(b.keywords, selectedKeywords),
    );
    selected.push({ paperId: byDistinctAsc[0].paper.id, reason: "distinct" });
  }

  return selected.slice(0, MAX_SELECTED);
}
