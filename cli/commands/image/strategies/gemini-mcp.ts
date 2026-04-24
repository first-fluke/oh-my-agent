import type { GeminiStrategy } from "./gemini-stream.js";

// MCP genmedia routing is gated behind an externally-installed MCP server.
// Detection heuristic: presence of `mcp-genmedia` on $PATH or an env flag.
export const geminiMcpStrategy: GeminiStrategy = {
  name: "mcp",
  async precheck() {
    if (process.env.OMA_IMAGE_GEMINI_MCP === "1") return { ok: true };
    return { ok: false, reason: "mcp-genmedia not installed" };
  },
  async run() {
    throw {
      kind: "other",
      cause: new Error("gemini mcp strategy not yet implemented"),
    };
  },
};
