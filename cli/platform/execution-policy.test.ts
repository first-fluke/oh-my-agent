import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadExecutionProtocol } from "./agent-config.js";

const root = join(import.meta.dirname, "../..");
describe("shared execution policy", () => {
  it("injects the common policy and result contract exactly once before vendor transport", () => {
    const prompt = loadExecutionProtocol("codex", root);
    expect(prompt.match(/^# Execution Policy$/gm)).toHaveLength(1);
    expect(prompt.match(/^# Agent Result Contract$/gm)).toHaveLength(1);
    expect(prompt.indexOf("# Execution Policy")).toBeLessThan(
      prompt.indexOf("# Execution Protocol (Codex)"),
    );
  });
  it("keeps shipping policy copies synchronized", () => {
    for (const file of [
      "core/execution-policy.md",
      "runtime/result-contract.md",
      "core/clarification-protocol.md",
    ]) {
      expect(readFileSync(join(root, "skills/_shared", file), "utf8")).toBe(
        readFileSync(join(root, ".agents/skills/_shared", file), "utf8"),
      );
    }
  });
  it("does not reintroduce unconditional approval for authorized fixes or plans", () => {
    for (const workflow of ["debug", "work", "plan", "brainstorm", "design"]) {
      const body = readFileSync(
        join(root, `.agents/workflows/${workflow}.md`),
        "utf8",
      );
      expect(body).toContain("execution-policy.md");
      expect(body).not.toMatch(
        /MUST get user confirmation|Do NOT proceed without confirmation/,
      );
    }
  });
});
