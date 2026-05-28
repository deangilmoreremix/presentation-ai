import { env } from "@/env";

export interface MCPServerConfig {
  name: string;
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: unknown;
  isError?: boolean;
}

export class MCPClient {
  private server: MCPServerConfig;

  constructor(server: MCPServerConfig) {
    this.server = server;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const response = await fetch(`${this.server.url}/tools/${toolName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.server.apiKey && {
          Authorization: `Bearer ${this.server.apiKey}`,
        }),
        ...this.server.headers,
      },
      body: JSON.stringify({ arguments: args }),
    });

    if (!response.ok) {
      throw new Error(`MCP tool call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      content: result.content || result,
      isError: result.isError || false,
    };
  }

  async listTools(): Promise<string[]> {
    const response = await fetch(`${this.server.url}/tools`, {
      headers: {
        ...(this.server.apiKey && {
          Authorization: `Bearer ${this.server.apiKey}`,
        }),
        ...this.server.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }

    const result = await response.json();
    return result.tools || [];
  }

  async readResource(uri: string): Promise<unknown> {
    const response = await fetch(`${this.server.url}/resources/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.server.apiKey && {
          Authorization: `Bearer ${this.server.apiKey}`,
        }),
        ...this.server.headers,
      },
      body: JSON.stringify({ uri }),
    });

    if (!response.ok) {
      throw new Error(`Failed to read resource: ${response.statusText}`);
    }

    return response.json();
  }
}

export function createSmartCRMClient(): MCPClient {
  return new MCPClient({
    name: "smartcrm",
    url: (env as any).SMARTCRM_MCP_URL || "https://api.smartcrm.io/mcp",
    apiKey: (env as any).SMARTCRM_API_KEY,
  });
}

export function createZepClient(): MCPClient {
  return new MCPClient({
    name: "zep",
    url: (env as any).ZEP_MCP_URL || "https://api.zep.ai/mcp",
    apiKey: (env as any).ZEP_API_KEY,
  });
}

export function createSupabaseMCPClient(): MCPClient {
  return new MCPClient({
    name: "supabase",
    url: (env as any).SUPABASE_MCP_URL || "https://mcp.supabase.io",
    apiKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export const SMARTCRM_TOOLS = [
  {
    type: "mcp",
    name: "smartcrm",
    config: {
      url: (env as any).SMARTCRM_MCP_URL || "https://api.smartcrm.io/mcp",
      apiKey: (env as any).SMARTCRM_API_KEY,
    },
  },
];

export const ZEP_TOOLS = [
  {
    type: "mcp",
    name: "zep_memory",
    config: {
      url: (env as any).ZEP_MCP_URL || "https://api.zep.ai/mcp",
      apiKey: (env as any).ZEP_API_KEY,
    },
  },
];

export async function fetchCRMData(
  leadId: string,
  userId?: string
): Promise<Record<string, unknown>> {
  const client = createSmartCRMClient();
  try {
    const result = await client.callTool("get_lead_data", { leadId });
    return result.content as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to fetch CRM data:", error);
    return {};
  }
}

export async function fetchCalendarEvents(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<Record<string, unknown>[]> {
  const client = createSmartCRMClient();
  try {
    const result = await client.callTool("get_calendar_events", {
      startDate,
      endDate,
    });
    return (result.content as Record<string, unknown>[]) || [];
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }
}
