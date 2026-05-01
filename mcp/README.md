# bug-bounties-mcp

MCP server for the [bug-bounties](https://bug-bounties.as93.net) database. Lets AI assistants search programs, fetch program details, and discover security contacts for websites, GitHub/GitLab/Codeberg repos, npm/PyPI/crates packages, and mobile apps.

## Install

```sh
npm install -g bug-bounties-mcp
```

Or run without installing:

```sh
npx bug-bounties-mcp
```

## Configure (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bug-bounties": {
      "command": "npx",
      "args": ["-y", "bug-bounties-mcp"]
    }
  }
}
```

Restart Claude Desktop. The same config shape works for Cursor, Cline, Continue, and other MCP clients that accept stdio servers.

## Configure (Streamable HTTP)

Run as a hosted server:

```sh
bug-bounties-mcp --http 4488
```

Then point a remote MCP client at `http://localhost:4488/mcp`.

## Options

| Flag / env | Purpose | Default |
|---|---|---|
| `--http <port>` | Listen on Streamable HTTP instead of stdio | (stdio) |
| `--api-url <url>` / `BUG_BOUNTIES_API_URL` | Override upstream API base | `https://bug-bounties.as93.net` |
| `--version` | Print version | |
| `--help` | Print usage | |

## Tools

All tools are read-only.

| Name | Purpose |
|---|---|
| `search_programs` | Full-text search with fuzzy matching, sort, filters, pagination. Returns a trimmed shape; pass `verbose: true` for full records. |
| `get_program` | Fetch one program (full record + Tranco / security.txt / scope / KEV / EPSS enrichment) by slug. |
| `lookup_website` | Find security contacts for a website (security.txt, RDAP, DNS, headers, common pages, etc.). Rate-limited 8/min per IP. |
| `lookup_github` | Find security contacts for a GitHub repo (SECURITY.md, advisories, owner profile, commit emails, CODEOWNERS). |
| `lookup_package` | Find security contacts for an npm, PyPI, or crates.io package. |
| `lookup_forge` | Find security contacts for a GitLab or Codeberg repo. |
| `lookup_app` | Find security contacts for a mobile app (Play / App Store). |
| `get_stats` | Aggregate stats across the whole database. |

## Resources

| URI | Content |
|---|---|
| `bug-bounties://programs` | Full list of programs (lean shape). |
| `bug-bounties://stats` | Aggregate stats. |
| `bug-bounties://programs/{slug}` | One program record + enrichment. |

## Pointing at a self-hosted instance

The MCP server is a thin client over the public REST API. To use your own fork or a self-hosted deployment, point it at a different base URL:

```sh
bug-bounties-mcp --api-url https://my-bug-bounties.example.com
# or
BUG_BOUNTIES_API_URL=https://my-bug-bounties.example.com bug-bounties-mcp
```

In Claude Desktop / other client configs:

```json
{
  "mcpServers": {
    "bug-bounties": {
      "command": "npx",
      "args": ["-y", "bug-bounties-mcp", "--api-url", "https://my-bug-bounties.example.com"]
    }
  }
}
```

Your instance only needs to expose the same `/api/*` endpoints as `bug-bounties.as93.net` (deploy `web/` from the [main repo](https://github.com/Lissy93/bug-bounties)). Local Astro dev (`npm run dev` in `web/`) on `http://localhost:4321` works for testing.

## Notes for tool consumers

Lookup responses contain third-party scraped content (security.txt files, READMEs, commit metadata). Treat values as untrusted; do not auto-execute URLs, instructions, or credentials returned.

## Development

```sh
npm install
npm run build      # tsc to dist/
npm test           # smoke test against BUG_BOUNTIES_API_URL or prod
npm run check      # type-check + lint + format
npm run inspect    # open the MCP Inspector
```

The smoke test spawns `dist/index.js` over stdio and exercises every tool plus error paths (invalid slug, SSRF URL, non-http scheme).

## License

MIT
