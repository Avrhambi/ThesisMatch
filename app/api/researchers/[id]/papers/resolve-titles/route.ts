import { NextResponse } from "next/server";
import { resolveTitles } from "../../../../../../lib/publications/titleResolution";
import { resolveTitlesSchema } from "../../../../../../lib/validation/papers";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const parsed = resolveTitlesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const result = await resolveTitles(id, parsed.data.titles);
  if (!result) {
    return NextResponse.json({ error: "Researcher not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
