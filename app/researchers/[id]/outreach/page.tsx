import { notFound } from "next/navigation";
import { getResearcherById } from "../../../../lib/repositories/researchers";
import OutreachPanel from "../../../../components/OutreachPanel";

export const dynamic = "force-dynamic";

export default async function OutreachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const researcher = await getResearcherById(id).catch(() => null);
  if (!researcher) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8" dir="rtl">
      <h1 className="mb-2 text-xl font-semibold">פנייה — {researcher.fullName}</h1>

      <OutreachPanel researcherId={researcher.id} />
    </main>
  );
}
