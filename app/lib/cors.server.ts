/**
 * App proxy üzerinden gelen istekler mağazanın kendi alan adından geldiği için
 * tarayıcı açısından same-origin'dir; CORS başlığına ihtiyaç duymaz.
 * Yine de yanıtların önbelleğe alınmaması ve içerik türünün net olması gerekir.
 */
export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function tooManyRequests(retryAfter: number) {
  return json(
    { ok: false, error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
