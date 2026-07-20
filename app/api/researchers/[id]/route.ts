import { NextResponse } from "next/server";
import { getResearcherById, updateResearcher } from "../../../../lib/repositories/researchers";
import { updateResearcherSchema } from "../../../../lib/validation/researcher";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const parsed = updateResearcherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const existing = await getResearcherById(id);
  if (!existing) {
    return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
  }

  await updateResearcher(id, parsed.data);
  const researcher = await getResearcherById(id);
  return NextResponse.json({ researcher });
}
