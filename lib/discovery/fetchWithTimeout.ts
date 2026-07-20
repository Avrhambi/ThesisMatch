export type FetchOutcome =
  | { ok: true; response: Response }
  | { ok: false; errorCode: string };

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return { ok: false, errorCode: `http_${response.status}` };
    return { ok: true, response };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, errorCode: "timeout" };
    }
    return { ok: false, errorCode: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}
