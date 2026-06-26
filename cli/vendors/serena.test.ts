import { describe, expect, it } from "vitest";
import { withSerenaContext } from "./serena.js";

describe("withSerenaContext", () => {
  it("rewrites an existing --context value", () => {
    const out = withSerenaContext(
      {
        command: "serena",
        args: ["start-mcp-server", "--context", "claude-code"],
      },
      "antigravity",
    );
    expect(out.args).toEqual(["start-mcp-server", "--context", "antigravity"]);
  });

  it("appends --context when absent", () => {
    const out = withSerenaContext(
      { command: "serena", args: ["start-mcp-server"] },
      "antigravity",
    );
    expect(out.args).toEqual(["start-mcp-server", "--context", "antigravity"]);
  });

  it("is idempotent when the context already matches", () => {
    const server = {
      command: "serena",
      args: ["start-mcp-server", "--context", "antigravity"],
    };
    const out = withSerenaContext(server, "antigravity");
    expect(out).toBe(server);
  });

  it("leaves non-serena entries untouched", () => {
    const server = { command: "uvx", args: ["--context", "claude-code"] };
    const out = withSerenaContext(server, "antigravity");
    expect(out).toBe(server);
    expect(out.args).toEqual(["--context", "claude-code"]);
  });

  it("no-ops when args is not an array", () => {
    const server = { command: "serena" };
    expect(withSerenaContext(server, "antigravity")).toBe(server);
  });
});
