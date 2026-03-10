export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2,
  delay = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // Only retry on 503 (server starting up / cold start) — the most common transient error
      // Don't retry on 500 (actual server bug) or 4xx (client errors)
      if (res.status === 503 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      // Don't retry if the request was intentionally aborted
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      // Network error — retry
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  // Fallback — should not reach here
  return fetch(url, options);
}
