# 🚀 Shiprocket MCP Integration (HTTP Transport Fork)

> **Credits:** This is a fork of the original official Shiprocket MCP server created by [bfrs](https://github.com/bfrs/shiprocket-mcp). This fork extends the original repository by adding an **HTTP Layer (StreamableHTTPServerTransport)** to support remote MCP clients (like Claude AI's Custom Connector).

This is a Model Context Protocol (MCP) server for Shiprocket.

With this, you can:
- Check best and fastest serviceable courier partners (based on city or pincodes) and their shipping rates
- Create, update (single or bulk), and cancel orders
- Ship orders directly
- Track orders using the AWB number, Shiprocket Order ID, or Source Order ID

It connects to your personal Shiprocket account directly via Email and password.

---

## What this fork adds

The original repository only supports `stdio` transport, which is required for local MCP clients like Claude Desktop and Cursor. 

This repository adds a full Express-based HTTP server using the official MCP SDK's `StreamableHTTPServerTransport`. This allows you to deploy the server to any cloud provider and use it with remote MCP clients (like Claude AI web's Custom Connectors). 

The server provides:
- `POST /mcp` — Handles initialization and tool calls
- `GET /mcp` — SSE stream for notifications
- `DELETE /mcp` — Session termination
- `GET /health` — Health check endpoint

Both the original `stdio` transport and the new `HTTP` transport are supported.

---

## 🛠️ Prerequisites
- Node (version > 20.0.0 and < 23.0.0)
- Claude Desktop app (or Cursor) OR a remote Client like Claude AI

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Het-Bhavsar/shiprocket-mcp-http.git
cd shiprocket-mcp-http
```

### 2. Install Dependencies
```bash
npm install
npm run build
```

## 🔌 Using as a Local MCP Server (stdio)

If you are using Claude Desktop or Cursor, you can still use this via `stdio`. Add the following to your `claude_desktop_config.json` or `mcp.json`.

```json
{
 "mcpServers": {
   "Shiprocket": {
     "command": "npm",
      "args": [
        "--prefix",
        "{{PATH_TO_SRC}}",
        "start",
        "--silent"
      ],
      "env": {
       "SELLER_EMAIL":"<Your Shiprocket Email>",
       "SELLER_PASSWORD":"<Your Shiprocket password>"
     }
   }
 }
}
```

## 🌐 Using as a Remote MCP Server (HTTP)

You can deploy this server to any cloud provider (e.g. EC2, DigitalOcean, Heroku) to get a public HTTP URL for remote clients.

### 1. Set Environment Variables
Your deployment environment must have the following environment variables:

- `SELLER_EMAIL`: Your Shiprocket account email
- `SELLER_PASSWORD`: Your Shiprocket account password
- `MCP_TRANSPORT`: `HTTP`
- `APP_PORT`: `3000` (or whatever port your provider expects)

### 2. Start the Server
```bash
npm run start:http
```
Or use the provided `Dockerfile`.

### 3. Connect to Claude AI Custom Connector
In Claude AI settings, add a new **MCP Connector** with the URL of your deployed server:
- **URL**: `https://your-deployed-app.com/mcp`

### Local HTTP Testing
You can also run the HTTP server locally to test it:
```bash
npm run build
npm run start:http
```
The server will start on `http://localhost:3000`. Test the health endpoint:
```bash
curl http://localhost:3000/health
```

---

## MCP Tools
Clients can access the following tools to interact with Shiprocket:

- `estimated_date_of_delivery` - To know more about the date of delivery for any location.
- `shipping_rate_calculator` - To check shippable couriers with their rates and coverage.
- `list_pickup_addresses` - List all the configured pickup addresses.
- `order_list` - Fetch recently created orders 
- `order_track` - Track any order to know more about the current status of the order. 
- `order_ship` - Ship an order to any serviceable courier partner based on the configured rules or specifying names.
- `order_pickup_schedule` - Schedule pickup of an order
- `generate_shipment_label` - Generate label of an order or shipment
- `order_cancel` - Cancel an order by providing order ID
- `order_create` - Create an order

## Examples:
- "Show me the fastest serviceable courier from Delhi to Banglore"
- "What are the courier options and delivery times from Delhi to Bangalore for a 0.5 KG COD package?"
- "Where is my order?"
- "How long will it take to deliver a package to Mumbai?"
