import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { chainTimeoutSeconds } from "../hooks-composer.js";
import {
  buildCopilotCommand,
  buildCopilotHooksConfig,
  buildCopilotRule,
  COPILOT_EXTENSION_NAMESPACE,
  COPILOT_PLUGIN_SCRIPTS,
  emitCopilotExtension,
} from "./copilot-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

const roots: string[] = [];
function temp(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of roots.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** Fixture repo plus the real plugin scripts (fixtures ship none). */
function repoWithScripts(): string {
  const repo = temp("oma-copilot-plugin-src-");
  cpSync(FIXTURES_REPO, repo, { recursive: true });
  mkdirSync(path.join(repo, "scripts"), { recursive: true });
  for (const script of COPILOT_PLUGIN_SCRIPTS) {
    cpSync(
      path.join(REPO_ROOT, "scripts", script),
      path.join(repo, "scripts", script),
    );
  }
  return repo;
}

describe("buildCopilotRule", () => {
  it("maps file-scoped globs to applyTo and keeps the body", () => {
    const rule = buildCopilotRule(
      '---\ndescription: "Scoped"\nglobs: "**/*.ts"\nalwaysApply: false\n---\n\n# Scoped\n\nBody.\n',
    );
    expect(rule?.frontmatter).toEqual({
      description: "Scoped",
      applyTo: "**/*.ts",
    });
    const { frontmatter, body } = parseFrontmatter(rule?.content ?? "");
    expect(frontmatter).toEqual({ description: "Scoped", applyTo: "**/*.ts" });
    expect(body).toContain("# Scoped");
    expect(body).toContain("Body.");
    expect(rule?.content).not.toContain("globs:");
    expect(rule?.content).not.toContain("alwaysApply");
  });

  it("maps alwaysApply rules to every file", () => {
    const rule = buildCopilotRule(
      "---\ndescription: Always\nglobs:\nalwaysApply: true\n---\n\nBody.\n",
    );
    expect(rule?.frontmatter.applyTo).toBe("**");
  });

  it("skips on-request rules (no globs, not alwaysApply)", () => {
    expect(
      buildCopilotRule(
        "---\ndescription: On request\nglobs:\nalwaysApply: false\n---\n\nBody.\n",
      ),
    ).toBeUndefined();
    expect(buildCopilotRule("# No frontmatter\n")).toBeUndefined();
  });
});

describe("buildCopilotCommand", () => {
  it("writes a description-only frontmatter and points at the installed workflow", () => {
    const command = buildCopilotCommand("plan", "Plan the work");
    const { frontmatter, body } = parseFrontmatter(command);
    expect(frontmatter).toEqual({ description: "Plan the work" });
    expect(body).toContain("<!-- oma:generated -->");
    expect(body).toContain("`.agents/workflows/plan.md`");
    expect(command).not.toContain("mode:");
  });
});

describe("buildCopilotHooksConfig", () => {
  it("emits a version-1 Copilot hook file whose commands are fail-open", () => {
    type HookEntry = {
      type: string;
      bash: string;
      timeoutSec: number;
      matcher?: string;
    };
    const config = buildCopilotHooksConfig(FIXTURES_REPO) as {
      version: number;
      hooks: Record<string, HookEntry[]>;
    };
    const first = (event: string): HookEntry =>
      config.hooks[event]?.[0] as HookEntry;
    expect(config.version).toBe(1);
    expect(Object.keys(config.hooks)).toEqual([
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "Stop",
    ]);
    for (const [event, entries] of Object.entries(config.hooks)) {
      expect(entries).toHaveLength(1);
      const entry = first(event);
      expect(entry.type).toBe("command");
      expect(entry.bash.startsWith("OMA_PLUGIN_VENDOR=copilot sh ")).toBe(true);
      expect(entry.bash).toContain(
        `"\${PLUGIN_ROOT}/${COPILOT_EXTENSION_NAMESPACE}/scripts/`,
      );
      expect(entry.bash.endsWith(" || true")).toBe(true);
      expect(entry.bash).toContain(
        event === "SessionStart"
          ? 'plugin-bootstrap.sh" all'
          : `plugin-hook.sh" ${event}`,
      );
    }
    expect(first("SessionStart").timeoutSec).toBe(600);
    expect(first("PreToolUse").matcher).toBe("Bash");
    expect(first("PreToolUse").bash).toContain("PreToolUse Bash");
    expect(first("UserPromptSubmit").matcher).toBeUndefined();
    // Fixture repo has no Copilot hook variant: the Claude marketplace floors apply.
    expect(first("UserPromptSubmit").timeoutSec).toBe(15);
    expect(first("PreToolUse").timeoutSec).toBe(15);
    expect(first("Stop").timeoutSec).toBe(40);
  });

  it("allows the same handler budgets as a project-installed Copilot hook", () => {
    const variant = JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, ".agents/hooks/variants/copilot.json"),
        "utf8",
      ),
    );
    const config = buildCopilotHooksConfig(REPO_ROOT) as {
      hooks: Record<string, Array<{ timeoutSec: number }>>;
    };
    for (const event of ["UserPromptSubmit", "PreToolUse", "Stop"]) {
      expect(config.hooks[event]?.[0]?.timeoutSec).toBeGreaterThanOrEqual(
        chainTimeoutSeconds(variant.events[event]),
      );
    }
  });
});

describe("emitCopilotExtension", () => {
  it("renders agents as NAME.agent.md with Copilot frontmatter", () => {
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(FIXTURES_REPO, out);
    expect(report.dir).toBe(path.join(out, COPILOT_EXTENSION_NAMESPACE));
    expect(report.agents).toEqual(["fixture-agent.agent.md"]);
    const { frontmatter, body } = parseFrontmatter(
      readFileSync(
        path.join(report.dir, "agents", "fixture-agent.agent.md"),
        "utf8",
      ),
    );
    expect(frontmatter).toEqual({
      name: "fixture-agent",
      description: "Fixture agent used for oma emit tests.",
      "include-custom-instructions": true,
    });
    expect(body).toContain("# Fixture Agent");
  });

  it("wraps top-level workflows as commands and skips nested files", () => {
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(FIXTURES_REPO, out);
    expect(report.commands).toEqual(["fixture-workflow.md"]);
    expect(readdirSync(path.join(report.dir, "commands"))).toEqual([
      "fixture-workflow.md",
    ]);
    const { frontmatter } = parseFrontmatter(
      readFileSync(
        path.join(report.dir, "commands", "fixture-workflow.md"),
        "utf8",
      ),
    );
    expect(frontmatter.description).toBe(
      "Fixture workflow for oma emit tests.",
    );
  });

  it("converts file-scoped rules to NAME.instructions.md", () => {
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(FIXTURES_REPO, out);
    expect(report.rules).toEqual(["fixture-rule.instructions.md"]);
    const { frontmatter } = parseFrontmatter(
      readFileSync(
        path.join(report.dir, "rules", "fixture-rule.instructions.md"),
        "utf8",
      ),
    );
    expect(frontmatter).toEqual({
      description: "Fixture rule for oma emit tests",
      applyTo: "**/*.fixture",
    });
  });

  it("omits hooks when the plugin scripts are unavailable", () => {
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(FIXTURES_REPO, out);
    expect(report.hooks).toBe(false);
    expect(existsSync(path.join(report.dir, "hooks"))).toBe(false);
    expect(existsSync(path.join(report.dir, "scripts"))).toBe(false);
  });

  it("ships hooks.json beside verbatim copies of the plugin scripts", () => {
    const repo = repoWithScripts();
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(repo, out);
    expect(report.hooks).toBe(true);
    const hooks = JSON.parse(
      readFileSync(path.join(report.dir, "hooks", "hooks.json"), "utf8"),
    );
    expect(hooks).toEqual(buildCopilotHooksConfig(repo));
    for (const script of COPILOT_PLUGIN_SCRIPTS) {
      expect(readFileSync(path.join(report.dir, "scripts", script))).toEqual(
        readFileSync(path.join(REPO_ROOT, "scripts", script)),
      );
    }
  });

  it("rebuilds the namespace so stale files cannot linger", () => {
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(FIXTURES_REPO, out);
    const stale = path.join(report.dir, "agents", "stale.agent.md");
    writeFileSync(stale, "stale");
    emitCopilotExtension(FIXTURES_REPO, out);
    expect(existsSync(stale)).toBe(false);
  });

  it("tolerates a repo without agents, workflows, or rules", () => {
    const repo = temp("oma-copilot-plugin-empty-");
    mkdirSync(path.join(repo, ".agents"), { recursive: true });
    const out = temp("oma-copilot-plugin-out-");
    const report = emitCopilotExtension(repo, out);
    expect(report).toEqual({
      dir: path.join(out, COPILOT_EXTENSION_NAMESPACE),
      agents: [],
      commands: [],
      rules: [],
      hooks: false,
    });
    expect(existsSync(report.dir)).toBe(true);
  });
});
