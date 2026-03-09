export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 2000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // Retry on server errors (502, 503, 504) and 408 timeout — common with free Mongo + Vercel cold starts
      if ((res.status === 502 || res.status === 503 || res.status === 504 || res.status === 408) && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      // Don't retry if the request was intentionally aborted
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
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
