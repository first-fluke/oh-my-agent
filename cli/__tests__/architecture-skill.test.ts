import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  getAllSkills,
  installShared,
  installSkill,
  PRESETS,
} from "../platform/skills-installer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../../");

describe("oma-architecture skill", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("is registered and included in the major presets", () => {
    const skillNames = getAllSkills().map((skill) => skill.name);

    expect(skillNames).toContain("oma-architecture");
    expect(PRESETS.fullstack).toContain("oma-architecture");
    expect(PRESETS.frontend).toContain("oma-architecture");
    expect(PRESETS.backend).toContain("oma-architecture");
    expect(PRESETS.mobile).toContain("oma-architecture");
    expect(PRESETS.devops).toContain("oma-architecture");
  });

  it("installs the full architecture skill payload into a target project", () => {
    const sourceDir = PROJECT_ROOT;
    const targetDir = mkdtempSync(join(tmpdir(), "oma-architecture-"));
    tempRoots.push(targetDir);

    installShared(sourceDir, targetDir);
    expect(installSkill(sourceDir, "oma-architecture", targetDir)).toBe(true);

    const skillRoot = join(targetDir, ".agents", "skills", "oma-architecture");
    const expectedFiles = [
      "SKILL.md",
      "resources/execution-protocol.md",
      "resources/checklist.md",
      "resources/examples.md",
      "resources/methodology-selection.md",
      "resources/stakeholder-synthesis.md",
      "resources/output-templates.md",
    ];

    for (const file of expectedFiles) {
      expect(existsSync(join(skillRoot, file))).toBe(true);
    }

    const skillMd = readFileSync(join(skillRoot, "SKILL.md"), "utf-8");
    const methodologyGuide = readFileSync(
      join(skillRoot, "resources", "methodology-selection.md"),
      "utf-8",
    );

    expect(skillMd).toContain("name: oma-architecture");
    expect(skillMd).toContain("Design-Twice Mode");
    expect(skillMd).toContain("ATAM-style Mode");
    expect(skillMd).toContain("CBAM-style Mode");

    expect(methodologyGuide).toContain("## 1. Diagnostic Mode");
    expect(methodologyGuide).toContain("## 2. Recommendation Mode");
    expect(methodologyGuide).toContain("## 6. ADR Mode");
  });

  it("wires architecture workflow auto-detection and workflow guidance", () => {
    const triggers = JSON.parse(
      readFileSync(
        join(PROJECT_ROOT, ".agents/hooks/core/triggers.json"),
        "utf-8",
      ),
    ) as {
      workflows: Record<
        string,
        { persistent: boolean; keywords: Record<string, string[]> }
      >;
    };

    const architectureTrigger = triggers.workflows.architecture;
    expect(architectureTrigger).toBeDefined();
    expect(architectureTrigger?.persistent).toBe(false);
    expect(architectureTrigger?.keywords["*"]).toContain("architecture");
    expect(architectureTrigger?.keywords.en).toContain("system design");

    const workflow = readFileSync(
      join(PROJECT_ROOT, ".agents/workflows/architecture.md"),
      "utf-8",
    );
    expect(workflow).toContain("Software architecture workflow");
    expect(workflow).toContain(".agents/skills/oma-architecture/SKILL.md");
    expect(workflow).toContain("suggest `/plan`");
  });

  it("routes architecture prompts to the architecture workflow hook", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "oma-architecture-hook-"));
    tempRoots.push(targetDir);

    const agentsDir = join(targetDir, ".agents");
    const configPath = join(agentsDir, "oma-config.yaml");
    rmSync(agentsDir, { recursive: true, force: true });
    installShared(PROJECT_ROOT, targetDir);
    installSkill(PROJECT_ROOT, "oma-architecture", targetDir);

    // Minimal config so the hook resolves language from the disposable project.
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(configPath, "language: en\n", "utf-8");

    const hook = join(
      PROJECT_ROOT,
      ".agents",
      "hooks",
      "core",
      "keyword-detector.ts",
    );
    const input = JSON.stringify({
      prompt:
        "Need an architecture review for our service boundary and system design tradeoffs",
      session_id: "sess-arch-1",
      cwd: targetDir,
      hook_event_name: "UserPromptSubmit",
    });

    const result = spawnSync("bun", [hook], {
      cwd: PROJECT_ROOT,
      input,
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[OMA WORKFLOW: ARCHITECTURE]");
    expect(result.stdout).toContain(
      "Read and follow `.agents/workflows/architecture.md` step by step.",
    );
  });
});
