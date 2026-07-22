import { NextResponse } from "next/server";
import { countResearchersByDecision } from "../../../../lib/repositories/researchers";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await countResearchersByDecision();
  return NextResponse.json({ counts });
}
