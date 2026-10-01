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
  it("keeps source workflow recovery and dispatch contracts truthful", () => {
    const orchestrate = readFileSync(
      join(root, "com.firstfluke.oma/workflows/orchestrate.md"),
      "utf8",
    );
    const ultrawork = readFileSync(
      join(root, "com.firstfluke.oma/workflows/ultrawork.md"),
      "utf8",
    );
    const judge = readFileSync(
      join(
        root,
        "com.firstfluke.oma/workflows/ralph/resources/judge-protocol.md",
      ),
      "utf8",
    );
    const intelligence = readFileSync(
      join(root, "skills/_shared/core/code-intelligence.md"),
      "utf8",
    );

    expect(orchestrate).toContain("--task-id {task.id}");
    const ultraworkSpawns = ultrawork.match(/^\s*oma agent spawn .+$/gm) ?? [];
    expect(ultraworkSpawns.length).toBeGreaterThan(0);
    expect(ultraworkSpawns.every((line) => line.includes("--task-id"))).toBe(
      true,
    );
    expect(orchestrate).toMatch(/never force-complete/i);
    expect(orchestrate).toContain("aggregate recovery budget");
    expect(orchestrate).toContain("partial` or `failed");
    expect(judge).toContain("`COMPLETED`: every criterion is PASS.");
    expect(judge).toContain("`PARTIAL`");
    expect(intelligence).toContain(
      "native search only for paths outside this project or ignored paths",
    );
    expect(intelligence).toContain("Do not install, initialize, track");
  });
});
