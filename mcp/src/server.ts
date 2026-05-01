import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApi } from "./api.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";

export const VERSION = "0.1.0";
export const DEFAULT_API_URL = "https://bug-bounties.as93.net";

export function createServer(apiUrl: string): McpServer {
  const server = new McpServer({
    name: "bug-bounties-mcp",
    version: VERSION,
  });
  const api = createApi(apiUrl);
  registerTools(server, api);
  registerResources(server, api);
  return server;
}
