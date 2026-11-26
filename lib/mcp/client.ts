// MCP client for the Clinical Decision Assistant.
// Default: the in-process Epic FHIR MCP bridge (real MCP protocol over an in-memory transport).
// When EPIC_MCP_URL is set (Epic's incoming MCP connectors, announced for Q1 2027), the same
// agent connects over Streamable HTTP with the clinician's token instead — no agent changes.
import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { config } from "@/lib/config";
import { type BridgeContext, createEpicFhirMcpServer } from "./epic-fhir-server";

export interface ConnectedMcp {
  client: Client;
  transportLabel: string;
  close: () => Promise<void>;
}

export async function connectMcp(ctx: BridgeContext, bearer: string | null): Promise<ConnectedMcp> {
  const client = new Client({ name: "actu-decision-assistant", version: "0.1.0" });
  if (config.epic.mcpUrl) {
    const transport = new StreamableHTTPClientTransport(new URL(config.epic.mcpUrl), {
      requestInit: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined,
    });
    await client.connect(transport);
    return { client, transportLabel: `Streamable HTTP → ${new URL(config.epic.mcpUrl).host}`, close: () => client.close() };
  }
  const server = createEpicFhirMcpServer(ctx);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  await client.connect(clientT);
  return {
    client,
    transportLabel: "in-process Epic FHIR MCP bridge (stand-in for Epic MCP connectors)",
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
