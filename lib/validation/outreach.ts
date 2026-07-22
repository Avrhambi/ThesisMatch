import { z } from "zod";
import { decisionStatusSchema } from "./researcher";

export const researcherNoteContentSchema = z
  .string()
  .trim()
  .min(1, "Content is required")
  .max(10000, "Up to 10,000 characters");

export const generateOutreachRequestSchema = z.object({
  note: researcherNoteContentSchema,
  confirmExtra: z.boolean().optional().default(false),
  regenerate: z.boolean().optional().default(false),
  overrideLowFit: z.boolean().optional().default(false),
});

export const markOutreachRequestSchema = z.object({
  action: z.enum(["copy", "sent"]),
  decision: decisionStatusSchema.optional(),
});
