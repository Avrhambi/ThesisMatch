import { z } from "zod";

export const analyzeRequestSchema = z.object({
  confirmExtra: z.boolean().optional().default(false),
});

export const addPapersRequestSchema = z.object({
  titles: z
    .array(z.string().trim().min(1))
    .min(1, "At least one title is required")
    .max(10, "Up to 10 titles"),
  confirmExtra: z.boolean().optional().default(false),
});
