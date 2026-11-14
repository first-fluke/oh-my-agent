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
import { parse as parseYaml } from "yaml";
import {
  type BackendStackState,
  restoreBackendStackAfterCopy,
} from "./backend-stack.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

/** A project whose oma-backend stack/ holds only the given manifest. */
function projectWithManifest(manifest: string): {
  cwd: string;
  manifestPath: string;
  state: BackendStackState;
} {
  const cwd = mkdtempSync(join(tmpdir(), "oma-update-stack-"));
  tempRoots.push(cwd);
  const backendStackDir = join(
    cwd,
    ".agents",
    "skills",
    "oma-backend",
    "stack",
  );
  mkdirSync(backendStackDir, { recursive: true });
  const manifestPath = join(backendStackDir, "stack.yaml");
  writeFileSync(manifestPath, manifest);
  return {
    cwd,
    manifestPath,
    state: {
      stackBackupDir: join(cwd, "unused-backup"),
      backendStackDir,
      hasBackendStack: false,
      hasLegacyFiles: false,
    },
  };
}

// Regression: installs made before the installer kept the variant manifest
// hold a two-line stub with no `verify:` block. `oma update` preserves stack/,
// so without a repair those projects never get the verify contract back.
describe("restoreBackendStackAfterCopy — preset stub repair", () => {
  it("restores the variant manifest for an unedited preset stub", () => {
    const { cwd, manifestPath, state } = projectWithManifest(
      "language: node\nsource: preset\n",
    );

    restoreBackendStackAfterCopy(cwd, repoRoot, state);

    const manifest = parseYaml(readFileSync(manifestPath, "utf-8")) as {
      language?: string;
      source?: string;
      verify?: { syntax?: { cmd?: string } };
    };
    expect(manifest.language).toBe("node");
    expect(manifest.source).toBe("preset");
    expect(manifest.verify?.syntax?.cmd).toEqual(expect.any(String));
  });

  it.each([
    [
      "a customized manifest",
      "language: node\nframework: express\nsource: user\n",
    ],
    [
      "a stub for a variant that is not shipped",
      "language: cobol\nsource: preset\n",
    ],
  ])("leaves %s untouched", (_label, original) => {
    const { cwd, manifestPath, state } = projectWithManifest(original);

    restoreBackendStackAfterCopy(cwd, repoRoot, state);

    expect(readFileSync(manifestPath, "utf-8")).toBe(original);
  });
});

// A project from before the Python preset changed framework keeps the one it
// was built on: its code and its stack/ reference files are from that era.
describe("restoreBackendStackAfterCopy — installs from an earlier preset", () => {
  it("repairs a python preset stub without adopting the new framework", () => {
    const { cwd, manifestPath, state } = projectWithManifest(
      "language: python\nsource: preset\n",
    );

    restoreBackendStackAfterCopy(cwd, repoRoot, state);

    const manifest = parseYaml(readFileSync(manifestPath, "utf-8")) as {
      framework?: string;
      source?: string;
      verify?: unknown;
    };
    expect(manifest.framework).toBe("fastapi");
    expect(manifest.source).toBe("preset");
    expect(manifest.verify).toBeDefined();
  });

  it("migrates legacy python resources to a manifest only", () => {
    const cwd = mkdtempSync(join(tmpdir(), "oma-update-legacy-"));
    tempRoots.push(cwd);
    const backendStackDir = join(
      cwd,
      ".agents",
      "skills",
      "oma-backend",
      "stack",
    );

    restoreBackendStackAfterCopy(cwd, repoRoot, {
      stackBackupDir: join(cwd, "unused-backup"),
      backendStackDir,
      hasBackendStack: false,
      hasLegacyFiles: true,
    });

    const manifest = parseYaml(
      readFileSync(join(backendStackDir, "stack.yaml"), "utf-8"),
    ) as { language?: string; framework?: string; source?: string };
    expect(manifest).toMatchObject({
      language: "python",
      framework: "fastapi",
      source: "migrated",
    });
    // The shipped variant's reference files describe another framework.
    expect(existsSync(join(backendStackDir, "snippets.md"))).toBe(false);
  });
});
