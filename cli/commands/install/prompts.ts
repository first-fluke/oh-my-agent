import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  CLI_SKILLS_DIR,
  type ExtensionVendor,
  getAllSkills,
  getVendorDisplayPath,
  isExtensionVendor,
  PRESETS,
  type SkillTargetSpec,
  vendorRequiresHomeConsent,
} from "../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../types/index.js";
import {
  getExistingLanguage,
  getExistingPreset,
  scanLanguages,
} from "./preferences.js";

/**
 * Built-in single-vendor model presets, keyed by the CLI vendor they target.
 * `mixed` is intentionally excluded — it is a cross-vendor meta-preset, not a
 * single vendor. A vendor in this set has a matching preset; a vendor outside
 * it (OpenCode, grok, kiro, copilot, pi, …) relies on native subagent dispatch
 * and only needs `model_preset` for the cross-vendor `oma agent:spawn` fallback.
 */
export const PRESET_BACKED_VENDORS = [
  "claude",
  "codex",
  "cursor",
  "qwen",
  "antigravity",
] as const satisfies readonly CliVendor[];

/** Selected vendors that have a matching single-vendor preset. */
export function selectedPresetVendors(vendors: CliVendor[]): CliVendor[] {
  return vendors.filter((v) =>
    (PRESET_BACKED_VENDORS as readonly CliVendor[]).includes(v),
  );
}

/**
 * Resolve the model_preset default given the user's already-chosen vendors and
 * any preset already in config. Used to seed the interactive prompt and as the
 * value written when the preset step is skipped.
 *
 *   1. an existing preset (re-install) is preserved verbatim — built-in *or*
 *      custom (e.g. a generated OpenCode preset) — so install never clobbers it;
 *   2. else the preset matching the first preset-backed vendor selected;
 *   3. else "mixed" — the neutral cross-vendor default. OpenCode-only and other
 *      native-dispatch installs land here instead of a misleading single-vendor
 *      preset (the root cause of #580).
 */
export function resolveDefaultPreset(
  existingPreset: string | null,
  vendors: CliVendor[],
): string {
  if (existingPreset) return existingPreset;
  const [presetVendor] = selectedPresetVendors(vendors);
  return presetVendor ?? "mixed";
}

export async function promptLanguage(
  repoDir: string,
  installRoot: string,
  nonInteractive: boolean,
  cleanup: () => void,
): Promise<string> {
  const languages = scanLanguages(repoDir);
  const existingLanguage = getExistingLanguage(installRoot);
  const initialLanguage = languages.some(
    (option) => option.value === existingLanguage,
  )
    ? (existingLanguage as string)
    : "en";
  const language = nonInteractive
    ? initialLanguage
    : await p.select({
        message: "Response language?",
        options: languages,
        initialValue: initialLanguage,
      });

  if (p.isCancel(language)) {
    cleanup();
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return language as string;
}

export async function promptModelPreset(
  installRoot: string,
  vendors: CliVendor[],
  nonInteractive: boolean,
  cleanup: () => void,
): Promise<string> {
  const BUILT_IN_PRESET_OPTIONS: {
    value: string;
    label: string;
    hint: string;
  }[] = [
    {
      value: "claude",
      label: "Claude Code",
      hint: "Claude Max subscription holders",
    },
    {
      value: "codex",
      label: "Codex",
      hint: "ChatGPT Plus/Pro subscription holders",
    },
    {
      value: "cursor",
      label: "Cursor Agent",
      hint: "Cursor editor with built-in agent",
    },
    {
      value: "qwen",
      label: "Qwen Code",
      hint: "Qwen Code subscription holders",
    },
    {
      value: "antigravity",
      label: "Antigravity CLI (agy)",
      hint: "Gemini 3.1 Pro impl + Gemini 3.5 Flash orchestration",
    },
    {
      value: "mixed",
      label: "Mixed (cross-vendor)",
      hint: "Claude orchestrator + cross-vendor subagents",
    },
  ];

  const existingPreset = getExistingPreset(installRoot);
  const defaultPreset = resolveDefaultPreset(existingPreset, vendors);

  if (nonInteractive) {
    return defaultPreset;
  }

  // When the user selected only native-dispatch vendors (e.g. OpenCode) that
  // have no matching single-vendor preset, model_preset only affects the
  // cross-vendor `oma agent:spawn` fallback. Make the step optional so these
  // users aren't forced into a misleading single-vendor preset (#580).
  if (selectedPresetVendors(vendors).length === 0) {
    p.log.info(
      pc.dim(
        "Selected CLI(s) use native subagent dispatch. model_preset only " +
          "affects the cross-vendor 'oma agent:spawn' fallback.",
      ),
    );
    const configure = await p.confirm({
      message: `Pick a cross-vendor model preset? (otherwise defaults to '${defaultPreset}')`,
      initialValue: false,
    });
    if (p.isCancel(configure)) {
      cleanup();
      p.cancel("Cancelled.");
      process.exit(0);
    }
    if (!configure) {
      return defaultPreset;
    }
  }

  // Seed the select with a built-in option value — a custom preset cannot be a
  // select initialValue, so fall back to "mixed" when the default isn't built-in.
  const initialPreset = BUILT_IN_PRESET_OPTIONS.some(
    (o) => o.value === defaultPreset,
  )
    ? defaultPreset
    : "mixed";

  const modelPreset = await p.select({
    message: "Model preset?",
    options: BUILT_IN_PRESET_OPTIONS,
    initialValue: initialPreset,
  });

  if (p.isCancel(modelPreset)) {
    cleanup();
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return modelPreset as string;
}

/**
 * CLI tools selection — asked before the model preset so the chosen vendors
 * can drive whether the preset step is required (#580). On re-install the
 * existing preset still seeds the initial vendor selection.
 * Auto-exclude HOME-write vendors on Windows / CI where symlink and
 * HOME semantics are unreliable.
 */
export async function promptVendors(
  installRoot: string,
  nonInteractive: boolean,
): Promise<CliVendor[]> {
  const allowHomeWriteVendors = process.platform !== "win32" && !process.env.CI;

  const vendorOptions: {
    value: CliVendor | ExtensionVendor;
    label: string;
    hint: string;
  }[] = [
    {
      value: "claude",
      label: "Claude Code",
      hint: "hooks + settings + CLAUDE.md",
    },
    { value: "codex", label: "Codex", hint: "hooks + plugin" },
    {
      value: "commandcode",
      label: "Command Code",
      hint: "hooks + skills + .commandcode/agents/",
    },
    {
      value: "copilot",
      label: "GitHub Copilot",
      hint: "skill symlinks + .github/prompts/ wrappers",
    },
    {
      value: "cursor",
      label: "Cursor",
      hint: ".cursor/rules/ export + prompt hooks",
    },
    {
      value: "grok",
      label: "Grok",
      hint: "hooks + project MCP + .grok/agents/",
    },
    {
      value: "kiro",
      label: "Kiro CLI",
      hint: "hooks + Serena MCP + .kiro/agents/",
    },
    {
      value: "opencode",
      label: "OpenCode",
      hint: "in-process plugin bridge — .opencode/plugins/oma/, .opencode/agents/",
    },
    {
      value: "pi",
      label: "pi (Earendil)",
      hint: "in-process extension bridge — .pi/extensions/oma/",
    },
    ...(allowHomeWriteVendors
      ? [
          {
            value: "antigravity" as const,
            label: "Antigravity CLI (agy)",
            hint: "hooks + HUD + Serena MCP — HOME-shared (~/.gemini/antigravity-cli/)",
          },
          {
            value: "hermes" as const,
            label: "Hermes Agent",
            hint: "skills only — workflows N/A, HOME-shared (no per-project isolation)",
          },
          {
            value: "kimi" as const,
            label: "Kimi Code CLI",
            hint: "hooks + skills — HOME-shared (~/.kimi-code/) + project Serena MCP",
          },
        ]
      : []),
    { value: "qwen", label: "Qwen Code", hint: "hooks + settings" },
    {
      value: "zcode",
      label: "ZCode",
      hint: "workflow slash-commands",
    },
  ];

  // Seed the default vendor selection from any preset already in config
  // (re-install UX): a single-vendor preset pre-selects only that vendor. A
  // fresh install (no preset yet) or a cross-vendor preset falls back to the
  // full default list (all non-opt-in, non-home-consent, non-extension vendors).
  const PRESET_TO_VENDOR: Partial<Record<string, CliVendor>> = {
    claude: "claude",
    codex: "codex",
    cursor: "cursor",
    qwen: "qwen",
    antigravity: "antigravity",
  };
  const fullDefaultVendors = vendorOptions
    .filter((opt) => {
      if (isExtensionVendor(opt.value)) return false;
      const spec = (CLI_SKILLS_DIR as Record<string, SkillTargetSpec>)[
        opt.value
      ];
      if (spec?.optIn) return false;
      if (spec?.requiresHomeConsent && !allowHomeWriteVendors) return false;
      return true;
    })
    .map((v) => v.value);
  const existingPreset = getExistingPreset(installRoot);
  const presetVendor = existingPreset
    ? PRESET_TO_VENDOR[existingPreset]
    : undefined;
  const defaultVendorValues =
    presetVendor && vendorOptions.some((o) => o.value === presetVendor)
      ? [presetVendor]
      : fullDefaultVendors;

  const selectedVendors = nonInteractive
    ? defaultVendorValues
    : await p.multiselect({
        message: "CLI tools to configure (deselect all to skip):",
        options: vendorOptions,
        initialValues: defaultVendorValues,
        required: false,
      });

  if (p.isCancel(selectedVendors)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return selectedVendors as CliVendor[];
}

export async function promptProjectSkills(
  nonInteractive: boolean,
): Promise<string[]> {
  const projectType = nonInteractive
    ? "all"
    : await p.select({
        message: "What type of project?",
        options: [
          { value: "all", label: "All", hint: "Install everything" },
          {
            value: "fullstack",
            label: "Fullstack",
            hint: "Web + Mobile + Infra (kitchen sink)",
          },
          {
            value: "fullstack-web",
            label: "Fullstack Web",
            hint: "Frontend + Backend + DB (no mobile/infra)",
          },
          {
            value: "fullstack-mobile",
            label: "Fullstack Mobile",
            hint: "Mobile + Backend + DB",
          },
          { value: "frontend", label: "Frontend", hint: "React/Next.js" },
          {
            value: "backend",
            label: "Backend",
            hint: "Python, Node.js, Rust, ...",
          },
          { value: "mobile", label: "Mobile", hint: "Flutter/Dart" },
          {
            value: "devops",
            label: "DevOps",
            hint: "Terraform + CI/CD + Observability",
          },
          {
            value: "research",
            label: "Research",
            hint: "Scholar + Market + PDF/HWP + Writer",
          },
          {
            value: "content",
            label: "Content",
            hint: "Image + Voice + Design + Writer",
          },
          { value: "custom", label: "Custom", hint: "Choose skills" },
        ],
      });

  if (p.isCancel(projectType)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  let selectedSkills: string[];

  if (projectType === "custom") {
    const allSkills = getAllSkills();
    const selected = await p.multiselect({
      message: "Select skills:",
      options: allSkills.map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.desc,
      })),
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    selectedSkills = selected as string[];
  } else {
    selectedSkills = PRESETS[projectType as string] ?? [];
  }

  return selectedSkills;
}

/**
 * Ask for language variant when backend skill is selected.
 */
export async function promptBackendVariant(
  selectedSkills: string[],
  nonInteractive: boolean,
): Promise<Record<string, string>> {
  const variantSelections: Record<string, string> = {};
  if (selectedSkills.includes("oma-backend")) {
    const backendLang = nonInteractive
      ? "python"
      : await p.select({
          message: "Backend language?",
          options: [
            {
              value: "python",
              label: "🐍 Python",
              hint: "FastAPI/SQLAlchemy (default)",
            },
            {
              value: "node",
              label: "🟢 Node.js",
              hint: "NestJS/Hono + Prisma/Drizzle",
            },
            { value: "rust", label: "🦀 Rust", hint: "Axum/Actix-web" },
            {
              value: "other",
              label: "🔧 Other / Auto-detect",
              hint: "Configure later with /stack-set",
            },
          ],
          initialValue: "python",
        });

    if (p.isCancel(backendLang)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    if (backendLang !== "other") {
      variantSelections["oma-backend"] = backendLang as string;
    }
  }
  return variantSelections;
}

/**
 * Build selectedClis from CLI_SKILLS_DIR (data-driven). Vendors with
 * requiresHomeConsent require explicit consent; other vendors are added directly.
 */
export async function selectClisWithConsent(
  vendors: CliVendor[],
  nonInteractive: boolean,
  cleanup: () => void,
): Promise<CliTool[]> {
  const cliToolKeys = Object.keys(CLI_SKILLS_DIR) as CliTool[];
  const requestedClis = vendors.filter((v): v is CliTool =>
    (cliToolKeys as string[]).includes(v),
  );

  const selectedClis: CliTool[] = [];
  for (const cli of requestedClis) {
    if (vendorRequiresHomeConsent(cli)) {
      // HOME-base vendors require explicit consent. In non-interactive mode
      // we never auto-approve writes to the user's HOME directory.
      if (nonInteractive) {
        p.log.info(
          pc.dim(`Skipped ${cli} export (HOME write requires -y opt-in).`),
        );
        continue;
      }
      const consent = await p.confirm({
        message: `${cli} export writes to HOME (${pc.cyan(getVendorDisplayPath(cli))}). Proceed?`,
        initialValue: false,
      });
      if (p.isCancel(consent)) {
        cleanup();
        p.cancel("Cancelled.");
        process.exit(0);
      }
      if (!consent) {
        p.log.info(pc.dim(`Skipped ${cli} export.`));
        continue;
      }
    }
    selectedClis.push(cli);
  }

  return selectedClis;
}
