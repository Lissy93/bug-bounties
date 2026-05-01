#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, DEFAULT_API_URL, VERSION } from "./server.js";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

interface Argv {
  http?: number;
  apiUrl: string;
}

function parseArgv(argv: string[]): Argv {
  const out: Argv = {
    apiUrl: process.env.BUG_BOUNTIES_API_URL ?? DEFAULT_API_URL,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--http") {
      const port = Number(argv[++i]);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        die(`--http requires a port (1-65535), got ${argv[i]}`);
      }
      out.http = port;
    } else if (a === "--api-url") {
      const v = argv[++i];
      if (!v) die("--api-url requires a value");
      out.apiUrl = v;
    } else if (a === "--version" || a === "-v") {
      console.log(VERSION);
      process.exit(0);
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    } else {
      die(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function printHelp(): void {
  process.stderr.write(
    `bug-bounties-mcp ${VERSION}

Usage:
  bug-bounties-mcp [--http <port>] [--api-url <url>]

Options:
  --http <port>    Listen on HTTP (Streamable transport) instead of stdio
  --api-url <url>  Override the upstream API base URL
                   (env: BUG_BOUNTIES_API_URL, default: ${DEFAULT_API_URL})
  -v, --version    Print version
  -h, --help       Show this help
`,
  );
}

function die(msg: string): never {
  process.stderr.write(`bug-bounties-mcp: ${msg}\n`);
  process.exit(2);
}

async function runStdio(apiUrl: string): Promise<void> {
  const server = createServer(apiUrl);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function runHttp(apiUrl: string, port: number): Promise<void> {
  const server = createServer(apiUrl);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const http = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url !== "/mcp") {
      res.statusCode = 404;
      res.end();
      return;
    }
    transport.handleRequest(req, res).catch((err) => {
      process.stderr.write(`http error: ${String(err)}\n`);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end();
      }
    });
  });
  http.listen(port, () => {
    process.stderr.write(
      `bug-bounties-mcp listening on http://localhost:${port}/mcp (api: ${apiUrl})\n`,
    );
  });

  const shutdown = () => {
    http.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main(): Promise<void> {
  const args = parseArgv(process.argv.slice(2));
  if (args.http != null) await runHttp(args.apiUrl, args.http);
  else await runStdio(args.apiUrl);
}

main().catch((err) => {
  process.stderr.write(`bug-bounties-mcp: ${String(err)}\n`);
  process.exit(1);
});
