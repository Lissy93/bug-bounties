const VERSION = "0.1.0";
const USER_AGENT = `bug-bounties-mcp/${VERSION} (+https://github.com/Lissy93/bug-bounties)`;
const TIMEOUT_MS = 30_000;
const MAX_BYTES = 2 * 1024 * 1024;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClient {
  get(path: string, query?: Record<string, unknown>): Promise<unknown>;
  baseUrl: string;
}

export function createApi(baseUrl: string): ApiClient {
  const root = baseUrl.replace(/\/+$/, "");
  return {
    baseUrl: root,
    get: (path, query) => apiGet(root, path, query),
  };
}

async function apiGet(
  baseUrl: string,
  path: string,
  query?: Record<string, unknown>,
): Promise<unknown> {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v == null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const cause = err instanceof Error ? err.message : String(err);
    throw new ApiError(`Network error: ${cause}`);
  }
  clearTimeout(timer);

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "");
    throw new ApiError(
      `Rate limited by upstream API${Number.isFinite(retryAfter) ? `, retry after ${retryAfter}s` : ""}`,
      429,
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }

  const text = await readCapped(res, MAX_BYTES);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(
      `Invalid JSON from upstream (status ${res.status})`,
      res.status,
    );
  }

  if (!res.ok) {
    const msg =
      (typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Upstream error (status ${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return body;
}

async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();
  const decoder = new TextDecoder();
  let total = 0;
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      reader.cancel().catch(() => {});
      throw new ApiError(`Response exceeded ${max} bytes`);
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}
