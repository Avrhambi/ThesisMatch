import { GoogleGenAI } from "@google/genai";
import { runSerialized } from "./rateLimiter";
import { estimateTokenCount } from "./tokens";

const MODEL = "gemini-3.1-flash-lite";
const MAX_INPUT_TOKENS = 20_000;
const MAX_OUTPUT_TOKENS = 2_000;
const TIMEOUT_MS = 30_000;

export type GeminiOutcome<T> = { ok: true; data: T } | { ok: false; errorCode: string };

// One Gemini request at a time, structured JSON output only, no automatic
// retry (CLAUDE.md). The client is constructed per call rather than at
// module load so `next build` doesn't require GEMINI_API_KEY to be set.
export async function generateStructured<T>(
  systemInstruction: string,
  prompt: string,
  responseJsonSchema: unknown,
): Promise<GeminiOutcome<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, errorCode: "missing_api_key" };

  if (estimateTokenCount(systemInstruction) + estimateTokenCount(prompt) > MAX_INPUT_TOKENS) {
    return { ok: false, errorCode: "input_too_large" };
  }

  return runSerialized(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          abortSignal: controller.signal,
        },
      });

      const text = response.text;
      if (!text) return { ok: false, errorCode: "empty_response" };

      try {
        return { ok: true, data: JSON.parse(text) as T };
      } catch {
        return { ok: false, errorCode: "invalid_json_response" };
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return { ok: false, errorCode: "timeout" };
      const message = err instanceof Error ? err.message : "";
      if (message.includes("429")) return { ok: false, errorCode: "rate_limited" };
      return { ok: false, errorCode: "network_error" };
    } finally {
      clearTimeout(timer);
    }
  });
}
