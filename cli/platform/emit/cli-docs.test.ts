import {
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

  it("writes both vendor docs under outDir and reports changed against committed", () => {
    const repoRoot = makeDir("oma-cli-docs-repo-");
    const outDir = makeDir("oma-cli-docs-out-");
    // Committed claude doc is already fresh; codex doc is missing.
    mkdirSync(join(repoRoot, "cli"), { recursive: true });
    writeFileSync(
      join(repoRoot, "cli", "CLAUDE.md"),
      renderCliVendorDoc("claude", null),
    );

    const report = emitCliDocs(repoRoot, outDir);

    expect(report.target).toBe("cli-docs");
    expect(report.files).toHaveLength(2);
    const claude = report.files.find((f) => f.vendor === "claude");
    const codex = report.files.find((f) => f.vendor === "codex");
    expect(claude?.changed).toBe(false);
    expect(codex?.changed).toBe(true);
    expect(readFileSync(join(outDir, "cli", "CLAUDE.md"), "utf-8")).toContain(
      "Claude Code Agent tool",
    );
    expect(readFileSync(join(outDir, "cli", "AGENTS.md"), "utf-8")).toContain(
      ".codex/agents/{name}.toml",
    );
  });

  it("is idempotent: emitting over a fresh committed doc reports unchanged", () => {
    const repoRoot = makeDir("oma-cli-docs-repo2-");
    mkdirSync(join(repoRoot, "cli"), { recursive: true });
    for (const vendor of ["claude", "codex"] as const) {
      const rel = vendor === "claude" ? "CLAUDE.md" : "AGENTS.md";
      writeFileSync(
        join(repoRoot, "cli", rel),
        renderCliVendorDoc(vendor, null),
      );
    }
    const report = emitCliDocs(repoRoot, repoRoot);
    expect(report.files.every((f) => f.changed === false)).toBe(true);
  });
});
