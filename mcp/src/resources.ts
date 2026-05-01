import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./api.js";
import { validSlug } from "./validate.js";

const JSON_MIME = "application/json";

async function asJsonText(api: ApiClient, path: string): Promise<string> {
  const data = await api.get(path);
  return JSON.stringify(data, null, 2);
}

export function registerResources(server: McpServer, api: ApiClient): void {
  server.registerResource(
    "programs",
    "bug-bounties://programs",
    {
      title: "All bug bounty programs",
      description: "Lean list of every program with tranco_rank and kev_count.",
      mimeType: JSON_MIME,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: JSON_MIME,
          text: await asJsonText(api, "/api/programs.json"),
        },
      ],
    }),
  );

  server.registerResource(
    "stats",
    "bug-bounties://stats",
    {
      title: "Aggregate statistics",
      description: "Totals, reward types, payout range, coverage metrics.",
      mimeType: JSON_MIME,
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: JSON_MIME,
          text: await asJsonText(api, "/api/stats.json"),
        },
      ],
    }),
  );

  server.registerResource(
    "program",
    new ResourceTemplate("bug-bounties://programs/{slug}", { list: undefined }),
    {
      title: "Program detail",
      description: "Full program record + enrichment by slug.",
      mimeType: JSON_MIME,
    },
    async (uri, { slug }) => {
      const s = Array.isArray(slug) ? slug[0] : slug;
      if (!s || !validSlug(s)) throw new Error("Invalid slug");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: JSON_MIME,
            text: await asJsonText(api, `/api/programs/${s}.json`),
          },
        ],
      };
    },
  );
}
