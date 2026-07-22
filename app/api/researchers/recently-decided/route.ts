import { NextResponse } from "next/server";
import { listRecentStatusEvents } from "../../../../lib/repositories/statusEvents";

export const dynamic = "force-dynamic";

const LIMIT = 5;

export async function GET() {
  const items = await listRecentStatusEvents(LIMIT);
  return NextResponse.json({ items });
}
