import { notFound } from "next/navigation";
import { getResearcherById } from "../../../lib/repositories/researchers";
import { listPapersForResearcher } from "../../../lib/repositories/papers";
import PapersPanel from "../../../components/PapersPanel";
import AnalysisPanel from "../../../components/AnalysisPanel";
import EvidencePanel from "../../../components/EvidencePanel";
import ContactTimeline from "../../../components/ContactTimeline";

export const dynamic = "force-dynamic";

export default async function ResearcherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const researcher = await getResearcherById(id).catch(() => null);
  if (!researcher) notFound();

  const papers = await listPapersForResearcher(id).catch(() => []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink">{researcher.fullName}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        <a
          href={researcher.crisUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-rule underline-offset-4 hover:decoration-accent hover:text-accent"
        >
          Profile page
        </a>
      </p>

      <div className="space-y-4">
        <AnalysisPanel researcherId={researcher.id} />

        <PapersPanel researcherId={researcher.id} initialPapers={papers} />

        <EvidencePanel researcherId={researcher.id} />
        <ContactTimeline researcherId={researcher.id} />
      </div>
    </main>
  );
}
