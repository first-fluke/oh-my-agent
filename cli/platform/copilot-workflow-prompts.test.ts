import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installCopilotWorkflowPrompts } from "./skills-installer.js";

function setupSource(root: string, workflows: Record<string, string>): void {
  const dir = join(root, ".agents", "workflows");
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(workflows)) {
    writeFileSync(join(dir, `${name}.md`), content);
  }
}

describe("installCopilotWorkflowPrompts", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  function mkTemp(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempRoots.push(dir);
    return dir;
  }

  it("generates a .github/prompts/ .prompt.md for each top-level workflow", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, {
      ralph: "---\ndescription: Ralph loop\n---\n\n# body",
      debug: "---\ndescription: Bug diagnosis\n---\n\n# body",
    });

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    // Copilot uses .prompt.md wrappers (mode: agent) — it does NOT get a
    // generated .agents/skills/ wrapper (workflows symlink directly elsewhere).
    expect(existsSync(join(targetDir, ".agents", "skills"))).toBe(false);

    const ralphFile = join(targetDir, ".github", "prompts", "ralph.prompt.md");
    const debugFile = join(targetDir, ".github", "prompts", "debug.prompt.md");
    expect(existsSync(ralphFile)).toBe(true);
    expect(existsSync(debugFile)).toBe(true);

    const ralphBody = readFileSync(ralphFile, "utf-8");
    expect(ralphBody).toContain("description: Ralph loop");
    expect(ralphBody).toContain("mode: agent");
    expect(ralphBody).toContain("<!-- oma:generated -->");
    expect(ralphBody).toContain(
      "Read and follow [.agents/workflows/ralph.md](../../.agents/workflows/ralph.md) step by step.",
    );
  });

  it("falls back to a default description when frontmatter is missing", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, {
      bare: "# no frontmatter here\n",
    });

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    const promptBody = readFileSync(
      join(targetDir, ".github", "prompts", "bare.prompt.md"),
      "utf-8",
    );
    expect(promptBody).toContain("description: Workflow: bare");
  });

  it("skips subdirectories under workflows/", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, {
      ralph: "---\ndescription: Ralph\n---\n",
    });
    mkdirSync(join(sourceDir, ".agents", "workflows", "ralph", "resources"), {
      recursive: true,
    });
    writeFileSync(
      join(sourceDir, ".agents", "workflows", "ralph", "resources", "judge.md"),
      "nested",
    );

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(
      existsSync(join(targetDir, ".github", "prompts", "resources.prompt.md")),
    ).toBe(false);
    expect(
      existsSync(join(targetDir, ".github", "prompts", "judge.prompt.md")),
    ).toBe(false);
  });

  it("prunes stale oma-generated prompts whose workflow was removed", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });

    const promptsDir = join(targetDir, ".github", "prompts");
    mkdirSync(promptsDir, { recursive: true });
    const stalePrompt = join(promptsDir, "ralph.prompt.md");
    writeFileSync(
      stalePrompt,
      "---\ndescription: old\nmode: agent\n---\n<!-- oma:generated -->\n\nRead and follow [.agents/workflows/ralph.md](../../.agents/workflows/ralph.md) step by step.\n",
    );

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(existsSync(stalePrompt)).toBe(false);
    expect(existsSync(join(promptsDir, "debug.prompt.md"))).toBe(true);
  });

  it("does not touch user-authored prompts without the oma marker", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });

    const promptsDir = join(targetDir, ".github", "prompts");
    mkdirSync(promptsDir, { recursive: true });
    const userPrompt = join(promptsDir, "my-custom.prompt.md");
    const userBody =
      "---\ndescription: User prompt\nmode: agent\n---\nDo my thing.\n";
    writeFileSync(userPrompt, userBody);

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(readFileSync(userPrompt, "utf-8")).toBe(userBody);
  });

  it("preserves a user prompt with the same name as a workflow", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });
    const promptsDir = join(targetDir, ".github", "prompts");
    mkdirSync(promptsDir, { recursive: true });
    const userPrompt = join(promptsDir, "debug.prompt.md");
    const userBody = "Diagnose using my project-specific instructions.\n";
    writeFileSync(userPrompt, userBody);

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(readFileSync(userPrompt, "utf-8")).toBe(userBody);
  });

  it.each([false, true])(
    "preserves a same-name prompt symlink, even when its target has an oma marker (%s)",
    (hasMarker) => {
      const sourceDir = mkTemp("oma-copilot-src-");
      const targetDir = mkTemp("oma-copilot-dst-");
      setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });
      const promptsDir = join(targetDir, ".github", "prompts");
      mkdirSync(promptsDir, { recursive: true });
      const target = join(targetDir, "shared-prompt.md");
      const content = `${hasMarker ? "<!-- oma:generated -->\n" : ""}Shared instructions.\n`;
      writeFileSync(target, content);
      const prompt = join(promptsDir, "debug.prompt.md");
      symlinkSync(target, prompt);

      installCopilotWorkflowPrompts(sourceDir, targetDir);

      expect(lstatSync(prompt).isSymbolicLink()).toBe(true);
      expect(readlinkSync(prompt)).toBe(target);
      expect(readFileSync(target, "utf-8")).toBe(content);
    },
  );

  it("preserves a dangling same-name prompt symlink", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, { debug: "---\ndescription: Bug\n---\n" });
    const promptsDir = join(targetDir, ".github", "prompts");
    mkdirSync(promptsDir, { recursive: true });
    const prompt = join(promptsDir, "debug.prompt.md");
    const missingTarget = join(targetDir, "missing.md");
    symlinkSync(missingTarget, prompt);

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(lstatSync(prompt).isSymbolicLink()).toBe(true);
    expect(readlinkSync(prompt)).toBe(missingTarget);
    expect(existsSync(missingTarget)).toBe(false);
  });

  it("refreshes an existing oma-generated prompt", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, {
      debug: "---\ndescription: Updated diagnosis\n---\n",
    });
    const promptsDir = join(targetDir, ".github", "prompts");
    mkdirSync(promptsDir, { recursive: true });
    const prompt = join(promptsDir, "debug.prompt.md");
    writeFileSync(
      prompt,
      "<!-- oma:generated -->\nOld generated instructions.\n",
    );

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(readFileSync(prompt, "utf-8")).toContain(
      "description: Updated diagnosis",
    );
    expect(readFileSync(prompt, "utf-8")).not.toContain(
      "Old generated instructions.",
    );
  });

  it("is idempotent on repeated calls", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");
    setupSource(sourceDir, { ralph: "---\ndescription: Ralph\n---\n" });

    installCopilotWorkflowPrompts(sourceDir, targetDir);
    const firstPrompt = readFileSync(
      join(targetDir, ".github", "prompts", "ralph.prompt.md"),
      "utf-8",
    );

    installCopilotWorkflowPrompts(sourceDir, targetDir);
    const secondPrompt = readFileSync(
      join(targetDir, ".github", "prompts", "ralph.prompt.md"),
      "utf-8",
    );

    expect(secondPrompt).toBe(firstPrompt);
  });

  it("does nothing when the workflows source does not exist", () => {
    const sourceDir = mkTemp("oma-copilot-src-");
    const targetDir = mkTemp("oma-copilot-dst-");

    installCopilotWorkflowPrompts(sourceDir, targetDir);

    expect(existsSync(join(targetDir, ".agents", "skills"))).toBe(false);
    expect(existsSync(join(targetDir, ".github", "prompts"))).toBe(false);
  });
});
