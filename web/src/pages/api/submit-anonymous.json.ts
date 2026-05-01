import type { APIRoute } from "astro";

export const prerender = false;

const GITGOST_ENDPOINT =
  "https://gitgost.leapcell.app/v1/gh/Lissy93/bug-bounties/issues/anonymous";

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Server-side proxy for gitGost anonymous-issue submissions. Browsers can't
// call gitgost.leapcell.app directly because of CORS, so the form posts here
// and we forward the request with the anonymous key header.
export const POST: APIRoute = async ({ request }) => {
  let payload: { title?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Request body must be JSON" });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body : "";

  if (!title || !body.trim()) {
    return json(400, { error: "Both `title` and `body` are required" });
  }

  let upstream: Response;
  try {
    upstream = await fetch(GITGOST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gitgost-Key": "gitgost-anonymous",
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["program-submission"],
      }),
    });
  } catch {
    return json(502, {
      error:
        "Could not reach the gitGost service. Try opening the GitHub issue directly instead.",
    });
  }

  const text = await upstream.text();
  // Forward the upstream JSON response unchanged when possible. If gitGost
  // returned non-JSON (rare, usually upstream errors), wrap it.
  try {
    JSON.parse(text);
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return json(upstream.status >= 400 ? upstream.status : 502, {
      error: text.slice(0, 500) || "Unexpected response from gitGost",
    });
  }
};
