import { countCompletedAnalysesForDate, findNextAnalysisCandidate, listReadyForReviewResearchers } from "../repositories/analyses";
import { localDateString } from "../time";
import { evaluateUsageGate } from "./dailyUsage";
import { runDeepAnalysis } from "./runDeepAnalysis";

const TARGET = 5;
const MAX_ATTEMPTS = 15;

// Server-side counterpart to ReadyForReviewPanel's client-side auto-fill:
// same target, same "never touch the extra/confirmExtra quota" rule, but
// callable from a background scheduler with no browser involved.
export async function autoFillReadyForReview(): Promise<{ filled: number; attempted: number }> {
  let items = await listReadyForReviewResearchers();
  const tried: string[] = [];
  let attempted = 0;

  while (items.length < TARGET && attempted < MAX_ATTEMPTS) {
    const counts = await countCompletedAnalysesForDate(localDateString());
    const gate = evaluateUsageGate(counts, false);
    if (!gate.allowed) break;

    const candidate = await findNextAnalysisCandidate(tried);
    if (!candidate) break;
    tried.push(candidate.id);
    attempted += 1;

    const outcome = await runDeepAnalysis(candidate.id, false);
    if (outcome.status === "ran" || outcome.status === "cached") {
      items = await listReadyForReviewResearchers();
    }
  }

  return { filled: items.length, attempted };
}
