import { getPapersEvidence } from "../repositories/papers";
import type { AccessLevel } from "../types";

export interface PaperReviewMetadata {
  title: string | null;
  publicationYear: number | null;
  venue: string | null;
  access: AccessLevel | null;
  sources: { sourceId: string; type: string; url: string; access: AccessLevel }[];
}

// Attaches title/year/venue/access/sources (already stored in `papers` and
// `sources` -- the same data already sent to Gemini as evidence, see
// lib/prompts/evidenceContext.ts) to each paper review before it reaches the
// client. This is a pure read-side join: it never calls Gemini and never
// changes what's persisted in `analyses.result_json`.
export async function enrichPaperReviews<T extends { paperId: string }>(
  researcherId: string,
  reviews: T[],
): Promise<(T & PaperReviewMetadata)[]> {
  if (reviews.length === 0) return [];
  const paperIds = reviews.map((review) => review.paperId);
  const evidence = await getPapersEvidence(researcherId, paperIds);
  const byId = new Map(evidence.map((item) => [item.paperId, item]));

  return reviews.map((review) => {
    const meta = byId.get(review.paperId);
    return {
      ...review,
      title: meta?.title ?? null,
      publicationYear: meta?.publicationYear ?? null,
      venue: meta?.venue ?? null,
      access: meta?.access ?? null,
      sources: meta?.sources ?? [],
    };
  });
}
