import { execFileSync } from "node:child_process";
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
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const cli = fileURLToPath(new URL("../../cli.ts", import.meta.url));

describe("oma docs migrate", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-layout-command-"));
    mkdirSync(join(root, "docs/plans/designs"), { recursive: true });
    writeFileSync(
      join(root, "docs/plans/designs/001-api.md"),
      "# API decision\n",
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function run(...args: string[]) {
    return execFileSync("bun", [cli, "docs", "migrate", ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, OMA_SKIP_VERSION_CHECK: "1" },
    });
  }

  it("previews without mutation, applies the plan, and repeats without moving files", () => {
    const preview = JSON.parse(run("--dry-run", "--json"));
    expect(preview.dryRun).toBe(true);
    expect(preview.moved).toContainEqual({
      from: "docs/plans/designs/001-api.md",
      to: "docs/decisions/001-api.md",
    });
    expect(existsSync(join(root, "docs/decisions"))).toBe(false);
    expect(existsSync(join(root, "docs/plans/designs/001-api.md"))).toBe(true);

    const applied = JSON.parse(run("--json"));
    expect(applied.dryRun).toBe(false);
    expect(applied.moved).toEqual(preview.moved);
    expect(readFileSync(join(root, "docs/decisions/001-api.md"), "utf8")).toBe(
      "# API decision\n",
    );
    expect(existsSync(join(root, "docs/plans/designs/001-api.md"))).toBe(false);
    expect(JSON.parse(run("--json")).moved).toEqual([]);
  });

  it("advertises preview and machine-readable output in command help", () => {
    const help = run("--help");
    expect(help).toContain("--dry-run");
    expect(help).toContain("--json");
  });
});
