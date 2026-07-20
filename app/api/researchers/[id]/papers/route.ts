import { NextResponse } from "next/server";
import { listPapersForResearcher } from "../../../../../lib/repositories/papers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const papers = await listPapersForResearcher(id);
  return NextResponse.json(papers);
}
