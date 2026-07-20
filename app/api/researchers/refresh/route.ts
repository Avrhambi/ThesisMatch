import { NextResponse } from "next/server";
import { refreshResearchers } from "../../../../lib/discovery/refresh";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await refreshResearchers();
  return NextResponse.json(result);
}
