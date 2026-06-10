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
} from "../../../platform/skills-installer.js";
import type { CliTool, CliVendor } from "../../../types/index.js";
import {
  getExistingLanguage,
  getExistingPreset,
  scanLanguages,
} from "./preferences.js";

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
  const initialPreset = BUILT_IN_PRESET_OPTIONS.some(
    (o) => o.value === existingPreset,
  )
    ? (existingPreset as string)
    : "claude";

  const modelPreset = nonInteractive
    ? initialPreset
    : await p.select({
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
 * CLI tools selection — placed immediately after preset so the preset
 * can seed the initial vendor selection.
 * Auto-exclude HOME-write vendors on Windows / CI where symlink and
 * HOME semantics are unreliable.
 */
export async function promptVendors(
  modelPreset: string,
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
        ]
      : []),
    { value: "qwen", label: "Qwen Code", hint: "hooks + settings" },
  ];

  // Infer default vendor selection from the chosen preset. Single-vendor
  // presets pre-select only that vendor; mixed falls back to the full
  // default list (all non-opt-in, non-home-consent, non-extension vendors).
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
  const presetVendor = PRESET_TO_VENDOR[modelPreset];
  const defaultVendorValues =
    presetVendor && vendorOptions.some((o) => o.value === presetVendor)
      ? [presetVendor]
      : fullDefaultVendors;

  const selectedVendors = nonInteractive
    ? defaultVendorValues
    : await p.multiselect({
        message: "CLI tools to configure:",
        options: vendorOptions,
        initialValues: defaultVendorValues,
        required: true,
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
