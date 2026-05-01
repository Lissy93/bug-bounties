import type { APIRoute } from "astro";

export const prerender = false;

const LOOKUPS = [
  {
    type: "website",
    endpoint: "/api/lookup/website",
    param: "url",
    description: "Find security contacts for a website domain",
  },
  {
    type: "github",
    endpoint: "/api/lookup/github",
    param: "repo",
    description: "Find security contacts for a GitHub repository",
  },
  {
    type: "package",
    endpoint: "/api/lookup/package",
    param: "name",
    description:
      "Find security contacts for an npm, PyPI, or crates.io package",
  },
  {
    type: "forge",
    endpoint: "/api/lookup/forge",
    param: "repo",
    description: "Find security contacts for a GitLab or Codeberg repository",
  },
  {
    type: "app",
    endpoint: "/api/lookup/app",
    param: "id",
    description: "Find security contacts for a mobile app",
  },
];

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });

export const GET: APIRoute = () => json({ lookups: LOOKUPS });

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
