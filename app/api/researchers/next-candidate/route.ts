import { NextResponse } from "next/server";
import { findNextAnalysisCandidate } from "../../../../lib/repositories/analyses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const excludeIds = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean);
  const candidate = await findNextAnalysisCandidate(excludeIds);
  if (!candidate) return NextResponse.json({ candidate: null }, { status: 404 });
  return NextResponse.json({ candidate });
}
