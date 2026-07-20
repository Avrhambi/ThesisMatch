import { NextResponse } from "next/server";
import { listContactEvents } from "../../../../../lib/repositories/contactEvents";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await listContactEvents(id);
  return NextResponse.json({ events });
}
