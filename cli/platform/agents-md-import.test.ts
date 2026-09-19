import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendAgentsMdImport,
  claudeMdShadowsAgentsMd,
  ensureAgentsMdImport,
  hasAgentsMdImport,
} from "./agents-md-import.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-agents-import-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("hasAgentsMdImport", () => {
  it("accepts @AGENTS.md and @./AGENTS.md on their own line", () => {
    expect(hasAgentsMdImport("# x\n\n@AGENTS.md\n")).toBe(true);
    expect(hasAgentsMdImport("@./AGENTS.md")).toBe(true);
    expect(hasAgentsMdImport("  @AGENTS.md  \n")).toBe(true);
  });

  it("rejects mentions that are not imports", () => {
    expect(hasAgentsMdImport("see AGENTS.md")).toBe(false);
    expect(hasAgentsMdImport("email me @AGENTS.md please")).toBe(false);
    expect(hasAgentsMdImport("@AGENTS.md.bak")).toBe(false);
    expect(hasAgentsMdImport("")).toBe(false);
  });
});

describe("appendAgentsMdImport", () => {
  it("appends after a blank line and keeps user content", () => {
    expect(appendAgentsMdImport("# Mine\n- a\n")).toBe(
      "# Mine\n- a\n\n@AGENTS.md\n",
    );
    expect(appendAgentsMdImport("")).toBe("@AGENTS.md\n");
  });
});

describe("ensureAgentsMdImport / claudeMdShadowsAgentsMd", () => {
  it("does nothing and never creates CLAUDE.md when it is missing", () => {
    expect(claudeMdShadowsAgentsMd(root)).toBe(false);
    expect(ensureAgentsMdImport(root)).toBe(false);
  });

  it("appends the import once and is idempotent", () => {
    const path = join(root, "CLAUDE.md");
    writeFileSync(path, "# Mine\n");
    expect(claudeMdShadowsAgentsMd(root)).toBe(true);

    expect(ensureAgentsMdImport(root)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe("# Mine\n\n@AGENTS.md\n");
    expect(claudeMdShadowsAgentsMd(root)).toBe(false);

    expect(ensureAgentsMdImport(root)).toBe(false);
    expect(readFileSync(path, "utf-8")).toBe("# Mine\n\n@AGENTS.md\n");
  });
});
