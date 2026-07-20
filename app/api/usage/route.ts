import { NextResponse } from "next/server";
import { countCompletedAnalysesForDate } from "../../../lib/repositories/analyses";
import { localDateString } from "../../../lib/time";
import type { DailyUsageResponse } from "../../../lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const localDate = localDateString();
  const counts = await countCompletedAnalysesForDate(localDate);

  const response: DailyUsageResponse = {
    localDate,
    standardUsed: counts.standardUsed,
    standardLimit: 5,
    extraUsed: counts.extraUsed,
  };
  return NextResponse.json(response);
}
