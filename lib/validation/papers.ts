import { z } from "zod";

export const resolveTitlesSchema = z.object({
  titles: z
    .array(z.string().trim().min(1))
    .min(1, "At least one title is required")
    .max(10, "Up to 10 titles"),
});
