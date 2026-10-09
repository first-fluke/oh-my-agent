import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderCliVendorDoc } from "../rules.js";
import { emitCliDocs } from "./cli-docs.js";

const OMA_START =
  "<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->";
const OMA_END = "<!-- OMA:END -->";

describe("renderCliVendorDoc", () => {
  it("inherits provider selection instead of overriding the root with Serena", () => {
    const doc = renderCliVendorDoc("codex", null);
    expect(doc).toContain("code-intelligence.md");
    expect(doc).toContain("does not select a separate provider");
    expect(doc).not.toContain("Serena MCP is required");
  });
  it("renders the vendor-specific Subagents line", () => {
    const claude = renderCliVendorDoc("claude", null);
    const codex = renderCliVendorDoc("codex", null);
    expect(claude).toContain("Claude Code Agent tool");
    expect(codex).toContain(".codex/agents/{name}.toml");
    expect(claude).not.toContain(".codex/agents/{name}.toml");
  });

  it("omits the project-rules index (project-root concern)", () => {
    expect(renderCliVendorDoc("claude", null)).not.toContain(
      "## Project Rules",
    );
  });

  it("routes to workflow instructions without embedding the workflow catalog", () => {
    const doc = renderCliVendorDoc("claude", null);
    expect(doc).toContain("`.agents/workflows/{name}.md`");
    expect(doc).toContain(
      "only when explicitly requested or detected by a hook; never self-initiate",
    );
    expect(doc).not.toContain("| Workflow | File | Description |");
    expect(doc).not.toContain("## Auto-Detection");
  });

  it("splices into existing OMA markers, preserving outside content", () => {
    const existing = `# Custom header\n\n${OMA_START}\nstale block\n${OMA_END}\n\nCustom footer\n`;
    const doc = renderCliVendorDoc("claude", existing);
    expect(doc.startsWith("# Custom header")).toBe(true);
    expect(doc.endsWith("Custom footer\n")).toBe(true);
    expect(doc).not.toContain("stale block");
    expect(doc).toContain("## Workflows");
  });

  it("appends a block when the existing file has no markers", () => {
    const doc = renderCliVendorDoc("claude", "# Bare file\n");
    expect(doc.startsWith("# Bare file")).toBe(true);
    expect(doc).toContain(OMA_END);
  });
});

describe("emitCliDocs", () => {
  const tmp: string[] = [];
  const makeDir = (prefix: string) => {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tmp.push(dir);
    return dir;
  };

  afterEach(() => {
    for (const dir of tmp.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  it("writes only AGENTS.md under outDir and reports changed against committed", () => {
    const repoRoot = makeDir("oma-cli-docs-repo-");
    const outDir = makeDir("oma-cli-docs-out-");
    // Existing Claude instructions must not be copied into emitted output.
    mkdirSync(join(repoRoot, "cli"), { recursive: true });
    writeFileSync(
      join(repoRoot, "cli", "CLAUDE.md"),
      "# User Claude instructions\n",
    );

    const report = emitCliDocs(repoRoot, outDir);

    expect(report.target).toBe("cli-docs");
    expect(report.files).toHaveLength(1);
    const codex = report.files.find((f) => f.vendor === "codex");
    expect(codex?.changed).toBe(true);
    expect(existsSync(join(outDir, "cli", "CLAUDE.md"))).toBe(false);
    expect(readFileSync(join(outDir, "cli", "AGENTS.md"), "utf-8")).toContain(
      ".codex/agents/{name}.toml",
    );
  });

  it("is idempotent: emitting over a fresh committed doc reports unchanged", () => {
    const repoRoot = makeDir("oma-cli-docs-repo2-");
    mkdirSync(join(repoRoot, "cli"), { recursive: true });
    writeFileSync(
      join(repoRoot, "cli", "AGENTS.md"),
      renderCliVendorDoc("codex", null),
    );
    const report = emitCliDocs(repoRoot, repoRoot);
    expect(report.files.every((f) => f.changed === false)).toBe(true);
    expect(existsSync(join(repoRoot, "cli", "CLAUDE.md"))).toBe(false);
  });

  it("preserves an existing user CLAUDE.md when emitting in place", () => {
    const repoRoot = makeDir("oma-cli-docs-user-");
    mkdirSync(join(repoRoot, "cli"), { recursive: true });
    const claudePath = join(repoRoot, "cli", "CLAUDE.md");
    const userContent = "# User Claude instructions\n";
    writeFileSync(claudePath, userContent);

    const report = emitCliDocs(repoRoot, repoRoot);

    expect(report.files).toHaveLength(1);
    expect(readFileSync(claudePath, "utf-8")).toBe(userContent);
  });
});
