import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { initializeTools } from "@/mcp/tools";

// Factory function — creates a new McpServer instance (needed for HTTP: one per session)
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "shiprocket-mcp",
    version: "1.0.0",
  });

  initializeTools(server);
  return server;
}

// Singleton for stdio transport (backward compatible)
export const mcpServer = createMcpServer();
