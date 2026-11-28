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
import { afterEach, describe, expect, it } from "vitest";
import { migrateRemoveRalphJudgeProtocol } from "./038-remove-ralph-judge-protocol.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

function projectWithJudgeProtocol(content: string): {
  root: string;
  ralphDir: string;
  resourcesDir: string;
  protocolPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "oma-migrate-038-"));
  tempRoots.push(root);
  const ralphDir = join(root, ".agents", "workflows", "ralph");
  const resourcesDir = join(ralphDir, "resources");
  const protocolPath = join(resourcesDir, "judge-protocol.md");
  mkdirSync(resourcesDir, { recursive: true });
  writeFileSync(protocolPath, content);
  return { root, ralphDir, resourcesDir, protocolPath };
}

describe("migrateRemoveRalphJudgeProtocol (038)", () => {
  it("removes the shipped judge-protocol copy and empty parent dirs, then becomes a no-op", () => {
    const { root, ralphDir, protocolPath } = projectWithJudgeProtocol(
      "# JUDGE Protocol: Independent Verifier\n\nLegacy copy.\n",
    );

    expect(migrateRemoveRalphJudgeProtocol.up(root)).toEqual([
      "workflows/ralph/resources/judge-protocol.md (moved to workflows/oma-mode/resources/judge-protocol.md)",
    ]);
    expect(existsSync(protocolPath)).toBe(false);
    expect(existsSync(ralphDir)).toBe(false);
    expect(migrateRemoveRalphJudgeProtocol.up(root)).toEqual([]);
  });

  it("keeps sibling project files inside workflows/ralph/resources", () => {
    const { root, resourcesDir, protocolPath } = projectWithJudgeProtocol(
      "# JUDGE Protocol: Independent Verifier\n",
    );
    const customFile = join(resourcesDir, "custom.md");
    writeFileSync(customFile, "# Custom notes\n");

    expect(migrateRemoveRalphJudgeProtocol.up(root)).toHaveLength(1);
    expect(existsSync(protocolPath)).toBe(false);
    expect(existsSync(customFile)).toBe(true);
  });

  it("leaves a non-shipped file with the same path untouched", () => {
    const { root, protocolPath } = projectWithJudgeProtocol(
      "# Custom Project Rubric\n",
    );

    expect(migrateRemoveRalphJudgeProtocol.up(root)).toEqual([]);
    expect(existsSync(protocolPath)).toBe(true);
  });

  it("does nothing when the legacy file is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-migrate-038-"));
    tempRoots.push(root);

    expect(migrateRemoveRalphJudgeProtocol.up(root)).toEqual([]);
  });

  it("ships judge-protocol.md under workflows/oma-mode/resources/", () => {
    const shippedPath = join(
      repoRoot,
      ".agents",
      "workflows",
      "oma-mode",
      "resources",
      "judge-protocol.md",
    );
    expect(existsSync(shippedPath)).toBe(true);
    expect(readFileSync(shippedPath, "utf-8")).toContain(
      "# JUDGE Protocol: Independent Verifier",
    );
    expect(
      existsSync(
        join(
          repoRoot,
          ".agents",
          "workflows",
          "ralph",
          "resources",
          "judge-protocol.md",
        ),
      ),
    ).toBe(false);
  });
});
