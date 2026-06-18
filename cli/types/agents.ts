export interface AgentAbstract {
  name: string;
  description: string;
  skills?: string[];
  body: string;
}

export interface VendorAgentConfig {
  claude?: { tools?: string; model?: string; maxTurns?: number };
  codex?: { sandbox_mode?: string };
}
