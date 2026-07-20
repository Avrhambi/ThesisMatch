import { z } from "zod";

export const analyzeRequestSchema = z.object({
  confirmExtra: z.boolean().optional().default(false),
});

export const addPapersRequestSchema = z.object({
  titles: z
    .array(z.string().trim().min(1))
    .min(1, "יש להזין כותרת אחת לפחות")
    .max(10, "ניתן להזין עד 10 כותרות"),
  confirmExtra: z.boolean().optional().default(false),
});
