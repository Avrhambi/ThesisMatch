import { NextResponse } from "next/server";
import { listReadyForReviewResearchers } from "../../../../lib/repositories/analyses";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listReadyForReviewResearchers();
  return NextResponse.json({ items });
}
