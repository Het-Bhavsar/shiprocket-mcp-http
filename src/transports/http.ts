import { API_DOMAINS } from "@/config";
import { connectionsBySessionId } from "@/mcp/connections";
import { createMcpServer } from "@/mcp/index";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import express from "express";
import dotenv from "dotenv";
import crypto from "node:crypto";

dotenv.config();

const app = express();
app.use(express.json());

// --- Shiprocket Auth (happens once at startup) ---
let sellerToken: string;

async function authenticateSeller(): Promise<string> {
  const sellerEmail = process.env.SELLER_EMAIL;
  const sellerPassword = process.env.SELLER_PASSWORD;

  if (!sellerEmail || !sellerPassword) {
    throw new Error(
      "SELLER_EMAIL and SELLER_PASSWORD environment variables are required"
    );
  }

  const url = `${API_DOMAINS.SHIPROCKET}/v1/external/auth/login`;
  const data = (
    await axios.post(url, { email: sellerEmail, password: sellerPassword })
  ).data;

  console.log("Seller authenticated successfully");
  return data.token as string;
}

// --- Session management ---
const transports: Record<string, StreamableHTTPServerTransport> = {};

// POST /mcp — handles client→server JSON-RPC messages
app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Existing session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session — initialize
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.log(`Session initialized: ${newSessionId}`);
          transports[newSessionId] = transport;

          // Store connection info for tools to access
          connectionsBySessionId[newSessionId] = {
            transport,
            sellerToken,
          };
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          console.log(`Session closed: ${sid}`);
          delete transports[sid];
          delete connectionsBySessionId[sid];
        }
      };

      // Create a fresh McpServer and connect it to this transport
      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// GET /mcp — SSE stream for server→client notifications
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// DELETE /mcp — session termination
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});

// GET /health — for Railway health checks
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Start ---
const PORT = parseInt(process.env.APP_PORT || "3000", 10);

(async () => {
  try {
    sellerToken = await authenticateSeller();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Shiprocket MCP HTTP Server listening on http://0.0.0.0:${PORT}`
      );
      console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
    });
  } catch (err) {
    if (err instanceof axios.AxiosError) {
      console.error({ success: false, error: err.response?.data });
    } else if (err instanceof Error) {
      console.error({ success: false, error: err.message });
    }
    process.exit(1);
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
      delete connectionsBySessionId[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down...");
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
      delete connectionsBySessionId[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  process.exit(0);
});
