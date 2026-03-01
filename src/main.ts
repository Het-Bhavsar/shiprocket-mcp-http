import dotenv from "dotenv";
dotenv.config();

const transport = process.env.MCP_TRANSPORT?.toUpperCase();

if (transport === "HTTP") {
  require("@/transports/http.js");
} else {
  require("@/transports/stdio.js");
  process.env.MCP_TRANSPORT = "STDIO";
}
