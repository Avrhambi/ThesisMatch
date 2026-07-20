import { z } from "zod";

export const decisionStatusSchema = z.enum([
  "new",
  "interested",
  "analyze_later",
  "not_interested",
  "already_contacted",
  "contact_planned",
  "waiting_for_reply",
  "meeting_scheduled",
  "temporarily_unavailable",
  "closed",
]);

export const updateResearcherSchema = z.object({
  decision: decisionStatusSchema.optional(),
  personalNote: z.string().nullable().optional(),
});
