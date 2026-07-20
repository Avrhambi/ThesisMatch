import { NextResponse } from "next/server";
import { listSourcesForResearcher } from "../../../../../lib/repositories/papers";
import { listClaimsForResearcher } from "../../../../../lib/repositories/claims";

export const dynamic = "force-dynamic";

// Backs the researcher-detail evidence view: source coverage (what was
// fetched, when, at what access level) plus every stored claim so the UI can
// surface contradictions (status "conflicting") and missing-data
// indicators (status "missing") alongside verified facts.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sources, claims] = await Promise.all([listSourcesForResearcher(id), listClaimsForResearcher(id)]);
  return NextResponse.json({ sources, claims });
}
