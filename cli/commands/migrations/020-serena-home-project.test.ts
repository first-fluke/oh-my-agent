import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// A real temp directory standing in for $HOME. It has to be minted inside the
// mock factory: io/serena.ts computes SERENA_CONFIG_PATH from homedir() at
// module load, so the value must be fixed before any import of it runs.
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
  const path = await vi.importActual<typeof import("node:path")>("node:path");
  const home = fs.mkdtempSync(path.join(actual.tmpdir(), "oma-mig020-home-"));
  return { ...actual, homedir: () => home };
});

const FAKE_HOME = homedir();

const { isOmaGeneratedProjectYml, migrateSerenaHomeProject } = await import(
  "./020-serena-home-project.js"
);

const serenaDir = join(FAKE_HOME, ".serena");
const configPath = join(serenaDir, "serena_config.yml");
const projectYmlPath = join(serenaDir, "project.yml");

/** The file oma's DEFAULT_PROJECT_YML produced at $HOME. */
const OMA_PROJECT_YML = `languages:
- python
- typescript

encoding: "utf-8"
ignore_all_files_in_gitignore: true
ignored_paths:
- .serena/cache
read_only: false
project_name: "home"
ls_specific_settings: {}
`;

beforeEach(() => {
  rmSync(serenaDir, { recursive: true, force: true });
  mkdirSync(serenaDir, { recursive: true });
});

afterAll(() => {
  rmSync(FAKE_HOME, { recursive: true, force: true });
});

describe("migration 020 — $HOME as a serena project", () => {
  it("removes the $HOME entry and its generated project.yml", () => {
    writeFileSync(
      configPath,
      `gui_mode: false\nprojects:\n- /Users/x/GitHub\n- ${FAKE_HOME}\nlanguage_backend: LSP\n`,
    );
    writeFileSync(projectYmlPath, OMA_PROJECT_YML);

    const actions = migrateSerenaHomeProject.up(FAKE_HOME);

    expect(actions).toHaveLength(2);
    const config = readFileSync(configPath, "utf-8");
    expect(config).not.toContain(FAKE_HOME);
    expect(config).toContain("- /Users/x/GitHub");
    expect(config).toContain("gui_mode: false");
    expect(config).toContain("language_backend: LSP");
    expect(existsSync(projectYmlPath)).toBe(false);
  });

  it("leaves real projects registered", () => {
    const nested = join(FAKE_HOME, "GitHub", "app");
    writeFileSync(configPath, `projects:\n- ${nested}\n`);

    expect(migrateSerenaHomeProject.up(FAKE_HOME)).toEqual([]);
    expect(readFileSync(configPath, "utf-8")).toContain(`- ${nested}`);
  });

  it("keeps a project.yml the user wrote themselves", () => {
    writeFileSync(configPath, `projects:\n- ${FAKE_HOME}\n`);
    writeFileSync(
      projectYmlPath,
      "# my own home-wide serena project\nlanguages:\n- python\n",
    );

    const actions = migrateSerenaHomeProject.up(FAKE_HOME);

    // The registration is oma's artifact and goes; the file is not, and stays.
    expect(actions).toHaveLength(1);
    expect(existsSync(projectYmlPath)).toBe(true);
  });

  it("is a no-op on a clean home directory", () => {
    writeFileSync(configPath, "projects:\n- /Users/x/GitHub\n");
    expect(migrateSerenaHomeProject.up(FAKE_HOME)).toEqual([]);
  });

  it("is idempotent", () => {
    writeFileSync(configPath, `projects:\n- ${FAKE_HOME}\n`);
    writeFileSync(projectYmlPath, OMA_PROJECT_YML);

    expect(migrateSerenaHomeProject.up(FAKE_HOME)).toHaveLength(2);
    expect(migrateSerenaHomeProject.up(FAKE_HOME)).toEqual([]);
  });

  it("tolerates a missing serena config", () => {
    rmSync(serenaDir, { recursive: true, force: true });
    expect(migrateSerenaHomeProject.up(FAKE_HOME)).toEqual([]);
  });
});

describe("isOmaGeneratedProjectYml", () => {
  it("recognizes oma's template", () => {
    expect(isOmaGeneratedProjectYml(OMA_PROJECT_YML)).toBe(true);
  });

  it("rejects a file carrying any comment", () => {
    expect(isOmaGeneratedProjectYml(`# pinned\n${OMA_PROJECT_YML}`)).toBe(
      false,
    );
  });

  it("rejects a file missing oma's marker keys", () => {
    expect(isOmaGeneratedProjectYml("languages:\n- python\n")).toBe(false);
  });
});
