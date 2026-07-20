import { NextResponse } from "next/server";
import { getResearcherById } from "../../../../../../lib/repositories/researchers";
import { importPublicationsForResearcher } from "../../../../../../lib/publications/import";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const researcher = await getResearcherById(id);
  if (!researcher) {
    return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
  }

  const result = await importPublicationsForResearcher(id);
  return NextResponse.json(result);
}
