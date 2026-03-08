export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2,
  delay = 1500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // On 503 (DB connection failed), retry
      if (res.status === 503 && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  // Fallback — should not reach here
  return fetch(url, options);
}
