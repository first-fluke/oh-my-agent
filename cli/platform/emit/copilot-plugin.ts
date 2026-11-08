import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../../utils/frontmatter.js";
import { renderVendorAgentFiles } from "../agent-composer.js";
import { chainTimeoutSeconds } from "../hooks-composer.js";
import { inspectWorkflowAvailability } from "../skills-installer/workflow-dependencies.js";
import type { CopilotExtensionEmitReport } from "./types.js";

/**
 * GitHub Copilot CLI's reverse-domain client-extension namespace. In an Agent
 * Plugins 1.0 package Copilot reads its non-portable components only from this
 * directory (docs.github.com cli-plugin-reference, "Agent Plugins layout"):
 * `agents/`, `commands/`, `rules/`, `hooks/hooks.json`. Other clients ignore it.
 */
export const COPILOT_EXTENSION_NAMESPACE = "com.github.copilot";

/** Marker shared with the project-level `.github/prompts` wrappers. */
const GENERATED_MARKER = "<!-- oma:generated -->";

const AGENTS_DIR = ".agents/agents";
const WORKFLOWS_DIR = ".agents/workflows";
const RULES_DIR = ".agents/rules";
const HOOK_VARIANT = ".agents/hooks/variants/copilot.json";

/**
 * Plugin lifecycle scripts, copied from `scripts/` beside the hooks file. Both
 * are the same fail-open scripts the Claude marketplace entries ship; they
 * read `OMA_PLUGIN_VENDOR=copilot` to pick Copilot's project registration
 * (`.github/hooks/oma.json`) and event dispatch (`oma hook --vendor copilot`).
 */
export const COPILOT_PLUGIN_SCRIPTS = [
  "plugin-bootstrap.sh",
  "plugin-hook.sh",
] as const;

/**
 * Hook events the package registers, mirroring the Claude marketplace entry:
 * SessionStart bootstraps the project, the other three forward to the CLI's
 * in-process handler chain. PascalCase names opt into Copilot's Claude-
 * compatible payloads (snake_case fields, canonical tool names), which is the
 * contract `oma hook --vendor copilot` consumes.
 */
const HOOK_EVENTS: ReadonlyArray<{
  event: string;
  matcher?: string;
  /** Floor when the SSOT variant declares no handler chain for the event. */
  minTimeoutSec: number;
}> = [
  { event: "UserPromptSubmit", minTimeoutSec: 15 },
  { event: "PreToolUse", matcher: "Bash", minTimeoutSec: 15 },
  { event: "Stop", minTimeoutSec: 40 },
];

const BOOTSTRAP_TIMEOUT_SEC = 600;

interface HookVariantShape {
  events?: Record<
    string,
    { timeout: number } | ReadonlyArray<{ timeout: number }>
  >;
}

function readHookVariant(repoRoot: string): HookVariantShape | undefined {
  const file = join(repoRoot, HOOK_VARIANT);
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as HookVariantShape;
  } catch {
    return undefined;
  }
}

/**
 * Vendor-side timeout for one event: the whole handler chain's budget plus
 * the CLI startup margin (see `chainTimeoutSeconds`), never below the floor
 * the Claude marketplace entry uses for the same event.
 */
function eventTimeoutSeconds(
  variant: HookVariantShape | undefined,
  event: string,
  floor: number,
): number {
  const raw = variant?.events?.[event];
  if (!raw) return floor;
  const configs = Array.isArray(raw) ? raw : [raw as { timeout: number }];
  return Math.max(floor, chainTimeoutSeconds(configs));
}

function hookCommand(script: string, args: string): string {
  // `${PLUGIN_ROOT}` is the token Copilot substitutes in Agent Plugins hook
  // commands (`${CLAUDE_PLUGIN_ROOT}` is the legacy-plugin spelling). It is
  // also valid shell, so a runtime that exports the variable instead of
  // rewriting the string resolves the same path. `|| true` keeps the hook
  // fail-open when neither happens: a missing script would otherwise exit
  // 127, which Copilot treats as a deny on PreToolUse.
  return `OMA_PLUGIN_VENDOR=copilot sh "\${PLUGIN_ROOT}/${COPILOT_EXTENSION_NAMESPACE}/scripts/${script}" ${args} || true`;
}

/** Build `com.github.copilot/hooks/hooks.json` (Copilot hook file, version 1). */
export function buildCopilotHooksConfig(
  repoRoot: string,
): Record<string, unknown> {
  const variant = readHookVariant(repoRoot);
  const hooks: Record<string, unknown[]> = {
    SessionStart: [
      {
        type: "command",
        bash: hookCommand("plugin-bootstrap.sh", "all"),
        timeoutSec: BOOTSTRAP_TIMEOUT_SEC,
      },
    ],
  };
  for (const { event, matcher, minTimeoutSec } of HOOK_EVENTS) {
    hooks[event] = [
      {
        type: "command",
        bash: hookCommand(
          "plugin-hook.sh",
          matcher ? `${event} ${matcher}` : event,
        ),
        timeoutSec: eventTimeoutSeconds(variant, event, minTimeoutSec),
        ...(matcher ? { matcher } : {}),
      },
    ];
  }
  return { version: 1, hooks };
}

/**
 * Copilot plugin slash command for one workflow. Copilot plugin commands are
 * `commands/<name>.md` files whose frontmatter carries `description`; the
 * body is the prompt. The workflow file itself ships under
 * `com.firstfluke.oma/workflows/`, but its own references resolve against
 * the project's `.agents/` tree, which the SessionStart bootstrap installs.
 */
export function buildCopilotCommand(name: string, description: string): string {
  return serializeFrontmatter(
    { description },
    `${GENERATED_MARKER}\n\nRead and follow \`.agents/workflows/${name}.md\` step by step. If that file is missing, run \`oma install\` in the project first (the oma plugin's session-start hook does this automatically when the oma CLI is installed).\n`,
  );
}

/**
 * Convert one SSOT rule into a Copilot instructions file, or return undefined
 * for rules that only load on request. Copilot applies a rule to every turn
 * (`applyTo: "**"`) or to matching files; it has no "on request" scope, so
 * rules without `globs` and without `alwaysApply` are left to `oma install`.
 */
export function buildCopilotRule(
  content: string,
): { frontmatter: Record<string, unknown>; content: string } | undefined {
  const { frontmatter, body } = parseFrontmatter(content);
  const globs =
    typeof frontmatter.globs === "string" ? frontmatter.globs.trim() : "";
  const applyTo = globs || (frontmatter.alwaysApply === true ? "**" : "");
  if (!applyTo) return undefined;
  const header: Record<string, unknown> = {};
  if (typeof frontmatter.description === "string") {
    header.description = frontmatter.description;
  }
  header.applyTo = applyTo;
  return {
    frontmatter: header,
    content: serializeFrontmatter(header, body.replace(/^\n+/, "")),
  };
}

function workflowDescription(file: string): string | undefined {
  const { frontmatter } = parseFrontmatter(readFileSync(file, "utf-8"));
  return typeof frontmatter.description === "string"
    ? frontmatter.description.replace(/\s+/g, " ").trim()
    : undefined;
}

/**
 * Emit the `com.github.copilot/` tree into `packageRoot`. The directory is
 * owned by the emitter and rebuilt from scratch so removed SSOT entries cannot
 * linger. Agents come from the Copilot agent composer (same frontmatter as a
 * project install's `.github/agents`), commands wrap each available workflow,
 * rules are the file-scoped and always-on SSOT rules, and hooks forward to the
 * fail-open plugin scripts.
 */
export function emitCopilotExtension(
  repoRoot: string,
  packageRoot: string,
): CopilotExtensionEmitReport {
  const dir = join(packageRoot, COPILOT_EXTENSION_NAMESPACE);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const agents: string[] = [];
  if (existsSync(join(repoRoot, AGENTS_DIR))) {
    for (const file of renderVendorAgentFiles(repoRoot, "copilot")) {
      // Copilot plugin agents are `NAME.agent.md` (plugins-creating guide).
      const fileName = `${file.agentKey}.agent.md`;
      mkdirSync(join(dir, "agents"), { recursive: true });
      writeFileSync(join(dir, "agents", fileName), file.content);
      agents.push(fileName);
    }
  }

  const commands: string[] = [];
  const workflowsDir = join(repoRoot, WORKFLOWS_DIR);
  if (existsSync(workflowsDir)) {
    const names = readdirSync(workflowsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.slice(0, -".md".length))
      .sort();
    for (const name of names) {
      if (!inspectWorkflowAvailability(repoRoot, name).available) continue;
      const description =
        workflowDescription(join(workflowsDir, `${name}.md`)) ??
        `Workflow: ${name}`;
      mkdirSync(join(dir, "commands"), { recursive: true });
      writeFileSync(
        join(dir, "commands", `${name}.md`),
        buildCopilotCommand(name, description),
      );
      commands.push(`${name}.md`);
    }
  }

  const rules: string[] = [];
  const rulesDir = join(repoRoot, RULES_DIR);
  if (existsSync(rulesDir)) {
    const names = readdirSync(rulesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
    for (const name of names) {
      const rule = buildCopilotRule(
        readFileSync(join(rulesDir, name), "utf-8"),
      );
      if (!rule) continue;
      // Copilot's rule files are `NAME.instructions.md`.
      const fileName = `${name.slice(0, -".md".length)}.instructions.md`;
      mkdirSync(join(dir, "rules"), { recursive: true });
      writeFileSync(join(dir, "rules", fileName), rule.content);
      rules.push(fileName);
    }
  }

  let hooks = false;
  const scripts = COPILOT_PLUGIN_SCRIPTS.filter((script) =>
    existsSync(join(repoRoot, "scripts", script)),
  );
  if (scripts.length === COPILOT_PLUGIN_SCRIPTS.length) {
    mkdirSync(join(dir, "scripts"), { recursive: true });
    for (const script of scripts) {
      cpSync(join(repoRoot, "scripts", script), join(dir, "scripts", script));
    }
    mkdirSync(join(dir, "hooks"), { recursive: true });
    writeFileSync(
      join(dir, "hooks", "hooks.json"),
      `${JSON.stringify(buildCopilotHooksConfig(repoRoot), null, 2)}\n`,
    );
    hooks = true;
  }

  return { dir, agents, commands, rules, hooks };
}
