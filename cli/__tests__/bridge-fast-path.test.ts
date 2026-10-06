import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLI = resolve(import.meta.dirname, "..", "cli.ts");

// `oma bridge` registers only its own command (cli.ts fast path), so it must
// still parse its arguments and reach the bridge without the full tree.
describe("oma bridge fast path", () => {
  it("lists only the bridge command's own options", () => {
    const result = spawnSync("bun", [CLI, "bridge", "--help"], {
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: oh-my-agent bridge");
    expect(result.stdout).toContain("--context <name>");
  });

  it("reaches the bridge with an explicit endpoint", () => {
    const result = spawnSync("bun", [CLI, "bridge", "http://127.0.0.1:1/mcp"], {
      encoding: "utf-8",
      input: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "No MCP server reachable at http://127.0.0.1:1/mcp",
    );
  });
});
