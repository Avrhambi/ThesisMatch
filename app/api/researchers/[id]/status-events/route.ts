import { NextResponse } from "next/server";
import { listStatusEvents } from "../../../../../lib/repositories/statusEvents";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await listStatusEvents(id);
  return NextResponse.json({ events });
}
