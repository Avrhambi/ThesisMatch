import { NextResponse } from "next/server";
import { findNextAnalysisCandidate } from "../../../../lib/repositories/analyses";

export const dynamic = "force-dynamic";

export async function GET() {
  const candidate = await findNextAnalysisCandidate();
  if (!candidate) return NextResponse.json({ candidate: null }, { status: 404 });
  return NextResponse.json({ candidate });
}
