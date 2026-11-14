import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { installSkill } from "./ssot-install.js";
import {
  barePresetStubLanguage,
  seededStackManifest,
} from "./stack-manifest.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const tempRoots: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
});

describe("seededStackManifest", () => {
  it("keeps the variant manifest and re-stamps only source", () => {
    const variantDir = tempDir("oma-variant-");
    writeFileSync(
      join(variantDir, "stack.yaml"),
      [
        "# yaml-language-server: $schema=../stack.schema.json",
        "language: node",
        "framework: hono",
        "source: variant",
        "",
        "verify:",
        "  syntax:",
        '    cmd: "bunx tsc --noEmit"',
        "",
      ].join("\n"),
    );

    const manifest = seededStackManifest(variantDir, "node", "preset");

    expect(parseYaml(manifest)).toEqual({
      language: "node",
      framework: "hono",
      source: "preset",
      verify: { syntax: { cmd: "bunx tsc --noEmit" } },
    });
    // The hint points into variants/, which an installed project does not keep.
    expect(manifest).not.toContain("yaml-language-server");
  });

  it("adds source when the variant manifest has none", () => {
    const variantDir = tempDir("oma-variant-");
    writeFileSync(join(variantDir, "stack.yaml"), "language: rust\n");

    expect(
      parseYaml(seededStackManifest(variantDir, "rust", "migrated")),
    ).toEqual({ language: "rust", source: "migrated" });
  });

  it("falls back to a minimal manifest for a variant without one", () => {
    expect(
      seededStackManifest(tempDir("oma-variant-"), "python", "preset"),
    ).toBe("language: python\nsource: preset\n");
  });
});

describe("barePresetStubLanguage", () => {
  it("recognizes the stub an older installer wrote", () => {
    expect(barePresetStubLanguage("language: python\nsource: preset\n")).toBe(
      "python",
    );
  });

  it.each([
    [
      "a manifest with more fields",
      "language: node\nframework: hono\nsource: preset\n",
    ],
    ["another source", "language: node\nsource: user\n"],
    [
      "a language that is not a plain slug",
      "language: ../../etc\nsource: preset\n",
    ],
    ["an empty file", ""],
  ])("ignores %s", (_label, manifest) => {
    expect(barePresetStubLanguage(manifest)).toBeNull();
  });
});

// Regression: the installer overwrote the chosen variant's stack.yaml with
// `language` + `source: preset`, dropping the `verify:` block, so
// `oma verify agent backend` reported "No syntax check configured" for every
// preset install.
describe("installSkill — shipped variants", () => {
  const backendVariants = readdirSync(
    join(repoRoot, ".agents", "skills", "oma-backend", "variants"),
    { withFileTypes: true },
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  it.each(backendVariants)("keeps the verify contract of %s", (variant) => {
    const installRoot = tempDir("oma-install-");

    expect(installSkill(repoRoot, "oma-backend", installRoot, variant)).toBe(
      true,
    );

    const skillDir = join(installRoot, ".agents", "skills", "oma-backend");
    const manifest = parseYaml(
      readFileSync(join(skillDir, "stack", "stack.yaml"), "utf-8"),
    ) as { source?: string; verify?: { syntax?: { cmd?: string } } };
    expect(manifest.source).toBe("preset");
    expect(manifest.verify?.syntax?.cmd).toEqual(expect.any(String));
    expect(existsSync(join(skillDir, "variants"))).toBe(false);
  });

  // Regression: variants/ was removed from every skill. oma-mobile is installed
  // without a variant and its SKILL.md reads variants/<platform>/ directly.
  it("keeps variants/ for a skill installed without a variant", () => {
    const installRoot = tempDir("oma-install-");

    installSkill(repoRoot, "oma-mobile", installRoot);

    const skillDir = join(installRoot, ".agents", "skills", "oma-mobile");
    expect(existsSync(join(skillDir, "variants", "README.md"))).toBe(true);
    expect(existsSync(join(skillDir, "stack"))).toBe(false);
  });

  it("uses a value the shipped schema allows for source", () => {
    for (const skill of ["oma-backend", "oma-mobile"]) {
      const schema = JSON.parse(
        readFileSync(
          join(
            repoRoot,
            ".agents",
            "skills",
            skill,
            "variants",
            "stack.schema.json",
          ),
          "utf-8",
        ),
      ) as { properties: { source: { enum: string[] } } };
      expect(schema.properties.source.enum).toEqual(
        expect.arrayContaining(["preset", "migrated"]),
      );
    }
  });
});
