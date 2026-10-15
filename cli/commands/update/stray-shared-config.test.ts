import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfigLayers } from "../../utils/config-layers.js";
import {
  formatStrayCueRemoval,
  isShippedCueTemplate,
  normalizeSharedConfigText,
  removeStrayCueTemplate,
  SHIPPED_CUE_TEMPLATE_HASHES,
  SHIPPED_CUE_TEMPLATE_MASKED_HASHES,
} from "./stray-shared-config.js";

// `.agents/oma-config.cue` as shipped by b5a5598a — the last template that
// pinned `timezone: "Asia/Seoul"` and that older `oma update` runs copied into
// YAML-only projects.
const SHIPPED_TEMPLATE = readFileSync(
  new URL("./__fixtures__/oma-config.b5a5598a.cue", import.meta.url),
  "utf-8",
);
const USER_YAML = "language: ko\nmodel_preset: auto\ntimezone: Europe/Berlin\n";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function project(files: { cue?: string; yaml?: string }): {
  root: string;
  cue: string;
  yaml: string;
} {
  const root = mkdtempSync(join(tmpdir(), "oma-stray-cue-"));
  roots.push(root);
  mkdirSync(join(root, ".agents"), { recursive: true });
  const cue = join(root, ".agents", "oma-config.cue");
  const yaml = join(root, ".agents", "oma-config.yaml");
  if (files.cue !== undefined) writeFileSync(cue, files.cue);
  if (files.yaml !== undefined) writeFileSync(yaml, files.yaml);
  return { root, cue, yaml };
}

function backups(root: string): string[] {
  const dir = join(root, ".agents", "backup", "stray-shared-config");
  return existsSync(dir) ? readdirSync(dir) : [];
}

describe("removeStrayCueTemplate", () => {
  it("removes a shipped template next to the user's YAML and backs it up", () => {
    const { root, cue, yaml } = project({
      cue: SHIPPED_TEMPLATE,
      yaml: USER_YAML,
    });

    const result = removeStrayCueTemplate(root);

    expect(result?.removed).toBe(cue);
    expect(existsSync(cue)).toBe(false);
    expect(readFileSync(result?.backup ?? "", "utf-8")).toBe(SHIPPED_TEMPLATE);
    expect(result?.backup.startsWith(join(root, ".agents", "backup"))).toBe(
      true,
    );
    expect(readFileSync(yaml, "utf-8")).toBe(USER_YAML);
    // The user's YAML is the shared source again (no CUE CLI needed).
    const layers = loadConfigLayers(root, { OMA_HOME: join(root, "oma-home") });
    expect(layers.sources.shared).toBe(yaml);
    expect(layers.config).toMatchObject({
      language: "ko",
      timezone: "Europe/Berlin",
    });
    expect(
      formatStrayCueRemoval(root, result as NonNullable<typeof result>),
    ).toContain("Removed .agents/oma-config.cue");
  });

  it("treats line-ending and trailing-whitespace noise as the template", () => {
    const noisy = `${SHIPPED_TEMPLATE.replace(/\n/g, "  \r\n")}\r\n\r\n`;
    const { root, cue } = project({ cue: noisy, yaml: USER_YAML });

    expect(removeStrayCueTemplate(root)).not.toBeNull();
    expect(existsSync(cue)).toBe(false);
  });

  it("removes a template whose installer-patched values match the YAML", () => {
    // `oma install` patches language/model_preset in both files at once.
    const patched = SHIPPED_TEMPLATE.replace(
      /^(\tlanguage:\s*)"en"$/m,
      '$1"ko"',
    );
    expect(patched).not.toBe(SHIPPED_TEMPLATE);
    const { root, cue } = project({ cue: patched, yaml: USER_YAML });

    expect(removeStrayCueTemplate(root)).not.toBeNull();
    expect(existsSync(cue)).toBe(false);
  });

  it("keeps an installer-patched value that differs from the YAML", () => {
    const patched = SHIPPED_TEMPLATE.replace(
      /^(\tlanguage:\s*)"en"$/m,
      '$1"ja"',
    );
    const { root, cue } = project({ cue: patched, yaml: USER_YAML });

    expect(removeStrayCueTemplate(root)).toBeNull();
    expect(readFileSync(cue, "utf-8")).toBe(patched);
  });

  it("never touches a CUE file the user edited", () => {
    const edited = SHIPPED_TEMPLATE.replace(
      'timezone:          "Asia/Seoul"',
      'timezone:          "Europe/Berlin"',
    );
    expect(edited).not.toBe(SHIPPED_TEMPLATE);
    const { root, cue } = project({ cue: edited, yaml: USER_YAML });

    expect(removeStrayCueTemplate(root)).toBeNull();
    expect(readFileSync(cue, "utf-8")).toBe(edited);
    expect(backups(root)).toEqual([]);
  });

  it("keeps the only shared config of a CUE-only project", () => {
    const { root, cue } = project({ cue: SHIPPED_TEMPLATE });

    expect(removeStrayCueTemplate(root)).toBeNull();
    expect(readFileSync(cue, "utf-8")).toBe(SHIPPED_TEMPLATE);
  });

  it("does nothing for a YAML-only project", () => {
    const { root } = project({ yaml: USER_YAML });

    expect(removeStrayCueTemplate(root)).toBeNull();
    expect(backups(root)).toEqual([]);
  });
});

describe("shipped CUE template hashes", () => {
  it("do not match the current template, so this source repo keeps both files", () => {
    // Templates after 85a9cd34 ship only with the fixed update, which never
    // adds a second shared config; the repo itself keeps both as templates.
    const current = readFileSync(
      new URL("../../../.agents/oma-config.cue", import.meta.url),
      "utf-8",
    );
    expect(
      isShippedCueTemplate(current, { language: "en", model_preset: "auto" }),
    ).toBe(false);
  });

  it("recognise the fixture template and hold one masked hash per version", () => {
    const hash = createHash("sha256")
      .update(normalizeSharedConfigText(SHIPPED_TEMPLATE))
      .digest("hex");
    expect(SHIPPED_CUE_TEMPLATE_HASHES.has(hash)).toBe(true);
    expect(SHIPPED_CUE_TEMPLATE_MASKED_HASHES.size).toBe(
      SHIPPED_CUE_TEMPLATE_HASHES.size,
    );
    for (const value of [
      ...SHIPPED_CUE_TEMPLATE_HASHES,
      ...SHIPPED_CUE_TEMPLATE_MASKED_HASHES,
    ])
      expect(value).toMatch(/^[0-9a-f]{64}$/);
  });
});
