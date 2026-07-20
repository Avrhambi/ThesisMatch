import { fetchCrossrefWork } from "./crossref";
import { fetchOpenAlexWorkByDoi } from "./openalex";
import { decideAccessLevel } from "./accessLevel";
import { hashContent } from "./contentHash";
import { upsertPaperWithSourcesOnPool } from "../repositories/papers";
import type { SourceInput } from "../repositories/papers";

export type ImportSingleDoiOutcome = "imported" | "updated" | "skipped" | "failed";

// Shared by the automatic import (import.ts) and user-supplied title
// resolution (titleResolution.ts): a DOI only becomes a stored paper once
// Crossref confirms it resolves. OpenAlex only completes metadata/OA info;
// its absence downgrades the paper to Crossref-only fields, it never blocks
// the import.
export async function importSingleDoi(
  researcherId: string,
  doi: string,
  addedByUser: boolean,
  timeoutMs: number,
): Promise<ImportSingleDoiOutcome> {
  const crossrefOutcome = await fetchCrossrefWork(doi, timeoutMs);
  if (!crossrefOutcome.ok) return "skipped";

  const openAlexOutcome = await fetchOpenAlexWorkByDoi(doi, timeoutMs);
  const retrievedAt = new Date().toISOString();

  const abstract = openAlexOutcome.ok ? openAlexOutcome.work.abstract : null;
  const isOpenAccess = openAlexOutcome.ok ? openAlexOutcome.work.isOpenAccess : false;
  const access = decideAccessLevel({ isOpenAccess, hasAbstract: Boolean(abstract) });

  const sources: SourceInput[] = [
    {
      type: "crossref",
      url: crossrefOutcome.url,
      title: crossrefOutcome.work.title,
      retrievedAt,
      contentHash: hashContent(crossrefOutcome.raw),
      access: "metadata_only",
      isFullText: false,
    },
  ];

  if (openAlexOutcome.ok) {
    sources.push({
      type: "openalex",
      url: openAlexOutcome.url,
      title: openAlexOutcome.work.title,
      retrievedAt,
      contentHash: hashContent(openAlexOutcome.raw),
      access,
      isFullText: isOpenAccess,
    });
  }

  try {
    const result = await upsertPaperWithSourcesOnPool(
      researcherId,
      {
        title: crossrefOutcome.work.title,
        doi: crossrefOutcome.work.doi,
        publicationYear: crossrefOutcome.work.year ?? (openAlexOutcome.ok ? openAlexOutcome.work.year : null),
        venue: crossrefOutcome.work.venue ?? (openAlexOutcome.ok ? openAlexOutcome.work.venue : null),
        abstract,
        access,
        addedByUser,
      },
      sources,
    );
    return result.created ? "imported" : "updated";
  } catch {
    return "failed";
  }
}
