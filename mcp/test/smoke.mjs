#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const SERVER = process.env.MCP_SERVER ?? "dist/index.js";
const API = process.env.BUG_BOUNTIES_API_URL ?? "https://bug-bounties.as93.net";

let nextId = 1;
const pending = new Map();

const child = spawn("node", [SERVER, "--api-url", API], {
  stdio: ["pipe", "pipe", "inherit"],
});

const rl = createInterface({ input: child.stdout });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    process.stderr.write(`! non-json from server: ${line}\n`);
    return;
  }
  if (msg.id != null && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

function call(method, params) {
  const id = nextId++;
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  child.stdin.write(body + "\n");
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

const failures = [];
function check(label, cond, detail) {
  const status = cond ? "ok" : "FAIL";
  process.stdout.write(`  ${status} ${label}${detail ? ` - ${detail}` : ""}\n`);
  if (!cond) failures.push(label);
}

async function main() {
  const init = await call("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke", version: "1" },
  });
  check(
    "initialize returns server name",
    init.serverInfo?.name === "bug-bounties-mcp",
  );
  check("initialize advertises tools cap", !!init.capabilities?.tools);
  check("initialize advertises resources cap", !!init.capabilities?.resources);
  notify("notifications/initialized");

  const { tools } = await call("tools/list", {});
  const names = new Set(tools.map((t) => t.name));
  for (const expected of [
    "search_programs",
    "get_program",
    "lookup_website",
    "lookup_github",
    "lookup_package",
    "lookup_forge",
    "lookup_app",
    "get_stats",
  ]) {
    check(`tools/list contains ${expected}`, names.has(expected));
  }
  const search = tools.find((t) => t.name === "search_programs");
  check(
    "search_programs has readOnlyHint",
    search?.annotations?.readOnlyHint === true,
  );

  const { resources } = await call("resources/list", {});
  check(
    "resources/list contains programs + stats",
    resources.some((r) => r.uri === "bug-bounties://programs") &&
      resources.some((r) => r.uri === "bug-bounties://stats"),
  );
  const tmpls = await call("resources/templates/list", {});
  check(
    "resource template for per-program slug present",
    (tmpls.resourceTemplates ?? []).some((t) =>
      t.uriTemplate.includes("bug-bounties://programs/"),
    ),
  );

  const sr = await call("tools/call", {
    name: "search_programs",
    arguments: { q: "apple", limit: 3 },
  });
  check(
    "search_programs structuredContent has results",
    Array.isArray(sr.structuredContent?.results) &&
      sr.structuredContent.results.length > 0,
  );
  const top = sr.structuredContent?.results?.[0];
  check(
    "top search result is Apple",
    top?.slug === "apple",
    `got ${top?.slug}`,
  );
  check("trim removes domains by default", top?.domains === undefined);

  const verbose = await call("tools/call", {
    name: "search_programs",
    arguments: { q: "github", limit: 1, verbose: true },
  });
  const verboseTop = verbose.structuredContent?.results?.[0];
  const trimmed = await call("tools/call", {
    name: "search_programs",
    arguments: { q: "github", limit: 1 },
  });
  const trimmedTop = trimmed.structuredContent?.results?.[0];
  check(
    "verbose=true keeps fields stripped from default trim",
    Array.isArray(verboseTop?.domains) && trimmedTop?.domains === undefined,
  );

  const get = await call("tools/call", {
    name: "get_program",
    arguments: { slug: "apple" },
  });
  check(
    "get_program returns Apple",
    get.structuredContent?.program?.company === "Apple",
  );

  const badSlug = await call("tools/call", {
    name: "get_program",
    arguments: { slug: "../etc" },
  });
  check("invalid slug rejected", badSlug.isError === true);

  const ssrf = await call("tools/call", {
    name: "lookup_website",
    arguments: { url: "http://127.0.0.1" },
  });
  check("ssrf url rejected", ssrf.isError === true);

  const nonHttp = await call("tools/call", {
    name: "lookup_website",
    arguments: { url: "file:///etc/passwd" },
  });
  check("non-http scheme rejected", nonHttp.isError === true);

  const stats = await call("tools/call", {
    name: "get_stats",
    arguments: {},
  });
  check(
    "get_stats has total_programs > 0",
    typeof stats.structuredContent?.total_programs === "number" &&
      stats.structuredContent.total_programs > 0,
  );

  const programsRes = await call("resources/read", {
    uri: "bug-bounties://programs",
  });
  const body = JSON.parse(programsRes.contents[0].text);
  check(
    "programs resource returns list",
    Array.isArray(body.programs) && body.programs.length > 0,
  );

  const programDetail = await call("resources/read", {
    uri: "bug-bounties://programs/apple",
  });
  const detail = JSON.parse(programDetail.contents[0].text);
  check("templated program resource works", detail.program?.slug === "apple");
}

main()
  .then(() => {
    child.kill();
    if (failures.length) {
      process.stderr.write(`\n${failures.length} failure(s)\n`);
      process.exit(1);
    }
    process.stdout.write("\nAll smoke checks passed.\n");
    process.exit(0);
  })
  .catch((err) => {
    child.kill();
    process.stderr.write(`smoke test crashed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
