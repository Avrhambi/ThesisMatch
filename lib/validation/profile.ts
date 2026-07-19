import { z } from "zod";

export const profileTextSchema = z
  .string()
  .trim()
  .min(100, "Research profile text must be at least 100 characters")
  .max(20000, "Research profile text must be at most 20000 characters");

export interface ProfileValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateProfileText(text: string): ProfileValidationResult {
  const result = profileTextSchema.safeParse(text);
  if (result.success) {
    return { valid: true, error: null };
  }
  return { valid: false, error: result.error.issues[0]?.message ?? "Invalid profile text" };
}
