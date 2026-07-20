// Rough estimate (no tokenizer dependency approved for this app): ~4 chars
// per token is a standard conservative approximation for English text.
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
