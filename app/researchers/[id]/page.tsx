import { notFound } from "next/navigation";
import Link from "next/link";
import { getResearcherById } from "../../../lib/repositories/researchers";

export const dynamic = "force-dynamic";

export default async function ResearcherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const researcher = await getResearcherById(id).catch(() => null);
  if (!researcher) notFound();

  return (
    <main className="mx-auto max-w-3xl p-8" dir="rtl">
      <h1 className="mb-2 text-xl font-semibold">{researcher.fullName}</h1>
      <p className="mb-6 text-sm text-gray-500">
        <a href={researcher.crisUrl} target="_blank" rel="noreferrer" className="hover:underline">
          עמוד CRIS
        </a>
      </p>

      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-gray-600">
        <p>טרם בוצע ניתוח עבור חוקר זה.</p>
      </div>

      <Link
        href={`/researchers/${researcher.id}/outreach`}
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        מעבר למסך פנייה
      </Link>
    </main>
  );
}
