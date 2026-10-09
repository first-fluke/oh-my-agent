import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installKimiHooks } from "../vendors/kimi/hooks.js";
import { applyKiroOmaHooksAgent } from "../vendors/kiro/settings.js";
import { type AgentVariant, installVendorAgents } from "./agent-composer.js";
import {
  generateOmaHookWrapper,
  type HookVariant,
  installHooksFromVariant,
} from "./hooks-composer.js";
import { _resetInstallContext, setInstallContext } from "./install-context.js";
import {
  installOpencodePlugin,
  registerOpencodePlugin,
} from "./opencode-plugin-composer.js";
import { installPiExtension } from "./pi-extension-composer.js";
import { installPiPromptTemplates } from "./pi-prompts.js";
import {
  applyCursorRules,
  generateClaudeRules,
  mergeRulesIndexForVendor,
} from "./rules.js";
import { installZcodeWorkflowCommands } from "./skills-installer/workflow-links.js";

const repository = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
describe("global definitions and native vendor projections", () => {
  let root: string;
  let home: string;
  let oma: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-global-projections-"));
    home = join(root, "native-home");
    oma = join(root, "custom '$& oma");
    mkdirSync(home);
    mkdirSync(join(oma, ".agents", "hooks", "core"), { recursive: true });
    writeFileSync(
      join(oma, ".agents", "hooks", "core", "keyword-detector.ts"),
      "// fixture handler",
    );
    vi.stubEnv("OMA_HOME", oma);
    _resetInstallContext();
    setInstallContext({ mode: "global", installRoot: oma });
  });
  afterEach(() => {
    _resetInstallContext();
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("pins a custom global home when a GUI-launched wrapper has no OMA_HOME", () => {
    const wrapper = join(home, "wrapper.sh");
    const fakeOma = join(home, "fake-oma");
    writeFileSync(wrapper, generateOmaHookWrapper(oma));
    writeFileSync(fakeOma, "#!/bin/sh\nprintf '%s' \"$OMA_HOME\"\n");
    chmodSync(fakeOma, 0o755);
    const env: NodeJS.ProcessEnv = { ...process.env, OMA_BIN: fakeOma };
    delete env.OMA_HOME;
    const result = spawnSync(
      "bash",
      [wrapper, "--vendor", "codex", "--event", "SessionStart"],
      { env, cwd: home, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(oma);
  });

  it("writes absolute native hook registrations and pins Kiro and Kimi wrappers", () => {
    const variant = JSON.parse(
      readFileSync(
        join(repository, ".agents", "hooks", "variants", "codex.json"),
        "utf8",
      ),
    ) as HookVariant;
    installHooksFromVariant(oma, home, variant);
    const config = JSON.parse(
      readFileSync(join(home, ".codex", "hooks.json"), "utf8"),
    );
    expect(config.hooks.UserPromptSubmit[0].hooks[0].command).toContain(
      join(home, ".codex", "hooks", "oma-hook.sh"),
    );
    expect(
      readFileSync(join(home, ".codex", "hooks", "oma-hook.sh"), "utf8"),
    ).toBe(generateOmaHookWrapper(oma));
    applyKiroOmaHooksAgent(home);
    const kiro = JSON.parse(
      readFileSync(join(home, ".kiro", "agents", "oma-hooks.json"), "utf8"),
    );
    expect(kiro.hooks.userPromptSubmit[0].command).toContain(
      join(home, ".kiro", "hooks", "oma-hook.sh"),
    );
    vi.stubEnv("KIMI_CODE_HOME", join(home, ".kimi-code"));
    mkdirSync(join(home, ".kimi-code"));
    expect(installKimiHooks(oma).installed).toBe(true);
    expect(
      readFileSync(join(home, ".kimi-code", "hooks", "oma-hook.sh"), "utf8"),
    ).toBe(generateOmaHookWrapper(oma));
    expect(existsSync(join(oma, ".codex"))).toBe(false);
  });

  it("projects pi, opencode and workflow commands into their native global locations", () => {
    const workflows = join(oma, ".agents", "workflows");
    mkdirSync(workflows);
    writeFileSync(
      join(workflows, "debug.md"),
      "---\ndescription: Debug\n---\n# Debug\n",
    );
    installPiExtension(oma, home);
    installPiPromptTemplates(oma, home);
    installOpencodePlugin(oma, home);
    registerOpencodePlugin(home);
    installZcodeWorkflowCommands(oma, home);
    for (const dir of [
      join(home, ".pi", "agent", "extensions", "oma"),
      join(home, ".config", "opencode", "plugins", "oma"),
    ]) {
      const generated = readdirSync(dir)
        .filter((name) => name.endsWith(".ts"))
        .map((name) => readFileSync(join(dir, name), "utf8"))
        .join("\n");
      expect(generated).toContain(`OMA_HOME: ${JSON.stringify(oma)}`);
    }
    expect(
      readFileSync(join(home, ".pi", "agent", "prompts", "debug.md"), "utf8"),
    ).toContain(join(workflows, "debug.md"));
    expect(
      existsSync(join(home, ".config", "opencode", "opencode.jsonc")),
    ).toBe(true);
    expect(
      readFileSync(join(home, ".zcode", "commands", "debug.md"), "utf8"),
    ).toContain("# Debug");
    expect(existsSync(join(oma, ".pi"))).toBe(false);
    expect(existsSync(join(oma, ".config"))).toBe(false);
  });

  it("binds agent definitions while leaving plan, result and state output in the project", () => {
    const body =
      "Read .agents/skills/oma-pm/SKILL.md and .agents/rules/backend.md. Write .agents/results/plan-session.json, .agents/results/architecture/adr.md and .agents/state/progress.json.";
    const definition = {
      agentKey: "pm-planner",
      entry: "pm-planner.md",
      frontmatter: { name: "pm-planner", skills: ["oma-pm"] },
      body,
    };
    const variant: AgentVariant = {
      vendor: "codex",
      destDir: ".codex/agents",
      modelDefault: "gpt-6",
      toolsDefault: [],
      protocolPath: ".agents/skills/_shared/protocol.md",
      agents: {},
    };
    const definitions = join(oma, ".agents");
    const agents = join(definitions, "agents");
    mkdirSync(join(agents, "variants"), { recursive: true });
    writeFileSync(
      join(agents, definition.entry),
      `---\nname: pm-planner\nskills: [oma-pm]\n---\n${definition.body}`,
    );
    for (const vendor of ["codex", "claude"]) {
      writeFileSync(
        join(agents, "variants", `${vendor}.json`),
        JSON.stringify({
          ...variant,
          vendor,
          destDir: `.${vendor}/agents`,
          agents: { "pm-planner": {} },
        }),
      );
      expect(installVendorAgents(oma, home, vendor)).toBe(1);
    }
    const codex = readFileSync(
      join(home, ".codex", "agents", "pm-planner.toml"),
      "utf8",
    );
    const markdown = readFileSync(
      join(home, ".claude", "agents", "pm-planner.md"),
      "utf8",
    );
    for (const content of [codex, markdown]) {
      expect(content).toContain(`${definitions}/skills/oma-pm/SKILL.md`);
      expect(content).toContain(`${definitions}/rules/backend.md`);
      expect(content).toContain(".agents/results/plan-session.json");
      expect(content).toContain(".agents/results/architecture/adr.md");
      expect(content).toContain(".agents/state/progress.json");
      expect(content).not.toContain(`${definitions}/results/`);
      expect(content).not.toContain(`${definitions}/state/`);
    }
  });

  it("exports rules from H and leaves their project output references local", () => {
    const rules = join(oma, ".agents", "rules");
    mkdirSync(rules);
    writeFileSync(
      join(rules, "backend.md"),
      "---\ndescription: Backend\nalwaysApply: true\n---\nRead .agents/skills/oma-backend/SKILL.md. Write .agents/results/review.md and .agents/state/progress.json.\n",
    );
    applyCursorRules(home, oma);
    generateClaudeRules(home, oma);
    mergeRulesIndexForVendor(home, "codex", [], oma);
    for (const file of [
      join(home, ".cursor", "rules", "backend.mdc"),
      join(home, ".claude", "rules", "backend.md"),
    ]) {
      const content = readFileSync(file, "utf8");
      expect(content).toContain(
        join(oma, ".agents", "skills", "oma-backend", "SKILL.md"),
      );
      expect(content).toContain(".agents/results/review.md");
      expect(content).toContain(".agents/state/progress.json");
    }
    expect(readFileSync(join(home, "AGENTS.md"), "utf8")).toContain(
      join(oma, ".agents", "rules", "backend.md"),
    );
  });
});
