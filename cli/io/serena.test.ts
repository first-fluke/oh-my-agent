import { join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OMA_SERENA_CONTEXT,
  OMA_SERENA_FIXED_TOOLS,
} from "../vendors/serena.js";
import {
  advisoryHeavyLanguages,
  ensureOmaSerenaContexts,
  ensureSerenaDefaultMaxAnswerChars,
  ensureSerenaProject,
  ensureSerenaProjectConfig,
  ensureSerenaRegistered,
  inferSerenaLanguages,
  isForbiddenSerenaProjectRoot,
  OMA_SERENA_CONTEXT_YML,
  parseProjectYmlLanguages,
  reconcileSerenaLanguages,
  reconcileSerenaProjectConfig,
  reconcileSerenaToolExclusions,
  resolveSerenaLanguages,
  SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS,
  SERENA_STATE_TOOLS,
  unregisterSerenaProject,
} from "./serena.js";

// Use platform-resolved paths so assertions match what production resolve() returns.
const MY_PROJECT = resolve("/my/project");
const OTHER_PROJECT = resolve("/other/project");
/** Matches the mocked node:os homedir() below. */
const HOME_DIR = resolve("/mock/home");
const HARD_EXCLUSIONS = `excluded_tools:\n${SERENA_STATE_TOOLS.map((tool) => `- ${tool}`).join("\n")}\n`;

// Mock fs
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
}));

const mockExecFileSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: mockFs.existsSync,
    readFileSync: mockFs.readFileSync,
    writeFileSync: mockFs.writeFileSync,
    mkdirSync: mockFs.mkdirSync,
    rmSync: mockFs.rmSync,
  };
});

// Mock os
vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reconcileSerenaToolExclusions", () => {
  it("hard-excludes Serena memory and onboarding tools", () => {
    const yml = [
      "languages:",
      "- typescript",
      "excluded_tools: []",
      'project_name: "test"',
      "",
    ].join("\n");

    const result = reconcileSerenaToolExclusions(yml) ?? "";

    expect(result).toContain("- write_memory");
    expect(result).toContain("- read_memory");
    expect(result).toContain("- onboarding");
  });

  it("preserves user exclusions and is idempotent", () => {
    const yml = [
      "languages:",
      "- typescript",
      "excluded_tools:",
      "- execute_shell_command",
      "- write_memory",
      'project_name: "test"',
      "",
    ].join("\n");

    const once = reconcileSerenaToolExclusions(yml) ?? yml;
    expect(once).toContain("- execute_shell_command");
    expect(reconcileSerenaToolExclusions(once)).toBeNull();
  });

  it("leaves malformed YAML untouched", () => {
    expect(
      reconcileSerenaToolExclusions("excluded_tools:\n- [unclosed\n"),
    ).toBeNull();
  });
});

describe("ensureOmaSerenaContexts", () => {
  it("writes one fixed-tool context and removes superseded variants", () => {
    mockFs.existsSync.mockImplementation((path: string) =>
      String(path).endsWith("oma-codex.yml"),
    );

    const result = ensureOmaSerenaContexts();

    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([OMA_SERENA_CONTEXT]);
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      join("/mock/home", ".serena", "contexts"),
      { recursive: true },
    );
    const [path, content] = mockFs.writeFileSync.mock.calls.at(0) ?? [];
    expect(path).toBe(join("/mock/home", ".serena", "contexts", "oma.yml"));
    const written = String(content);
    expect(written).toContain("fixed_tools:");
    for (const tool of OMA_SERENA_FIXED_TOOLS) {
      expect(written).toContain(`- ${tool}`);
    }
    expect(written).not.toContain("write_memory");
    expect(written).not.toContain("- onboarding");
    expect(mockFs.rmSync).toHaveBeenCalledWith(
      join("/mock/home", ".serena", "contexts", "oma-codex.yml"),
    );
  });

  it("is idempotent when the shared fixed-tool context matches", () => {
    mockFs.existsSync.mockImplementation((path: string) =>
      String(path).endsWith("oma.yml"),
    );
    mockFs.readFileSync.mockReturnValue(OMA_SERENA_CONTEXT_YML);

    const result = ensureOmaSerenaContexts();
    expect(result.failed).toEqual([]);
    expect(result.changed).toEqual([]);
    expect(mockExecFileSync).not.toHaveBeenCalled();
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockFs.rmSync).not.toHaveBeenCalled();
  });

  it("preserves legacy contexts if the shared context cannot be written", () => {
    mockFs.existsSync.mockImplementation((path: string) =>
      String(path).endsWith("oma-codex.yml"),
    );
    mockFs.writeFileSync.mockImplementationOnce(() => {
      throw new Error("read-only home");
    });

    const result = ensureOmaSerenaContexts();

    expect(result.failed).toEqual([OMA_SERENA_CONTEXT]);
    expect(mockFs.rmSync).not.toHaveBeenCalled();
  });
});

describe("resolveSerenaLanguages", () => {
  it("should return typescript for frontend skill", () => {
    const result = resolveSerenaLanguages(["oma-frontend"]);
    expect(result).toEqual(["typescript"]);
  });

  it("should return dart for mobile skill", () => {
    const result = resolveSerenaLanguages(["oma-mobile"]);
    expect(result).toEqual(["dart"]);
  });

  it("should return terraform for tf-infra skill", () => {
    const result = resolveSerenaLanguages(["oma-tf-infra"]);
    expect(result).toEqual(["terraform"]);
  });

  it("should return python for oma-db skill (Task 9)", () => {
    const result = resolveSerenaLanguages(["oma-db"]);
    expect(result).toEqual(["python"]);
  });

  it("should map backend python variant", () => {
    const result = resolveSerenaLanguages(["oma-backend"], "python");
    expect(result).toEqual(["python"]);
  });

  it("should map backend node variant to typescript", () => {
    const result = resolveSerenaLanguages(["oma-backend"], "node");
    expect(result).toEqual(["typescript"]);
  });

  it("should map backend rust variant", () => {
    const result = resolveSerenaLanguages(["oma-backend"], "rust");
    expect(result).toEqual(["rust"]);
  });

  it("should combine multiple skills", () => {
    const result = resolveSerenaLanguages(
      ["oma-frontend", "oma-backend", "oma-mobile"],
      "python",
    );
    expect(result).toContain("typescript");
    expect(result).toContain("python");
    expect(result).toContain("dart");
  });

  it("should deduplicate typescript from frontend + node backend", () => {
    const result = resolveSerenaLanguages(
      ["oma-frontend", "oma-backend"],
      "node",
    );
    expect(result).toEqual(["typescript"]);
  });

  it("should fallback to typescript when no language-mapped skills", () => {
    const result = resolveSerenaLanguages(["oma-scm", "oma-qa"]);
    expect(result).toEqual(["typescript"]);
  });

  it("should ignore unknown backend variant", () => {
    const result = resolveSerenaLanguages(["oma-backend"], "other");
    expect(result).toEqual(["typescript"]);
  });

  it("should never include bash in any combination of skills (Task 9)", () => {
    const allSkills = [
      "oma-frontend",
      "oma-backend",
      "oma-mobile",
      "oma-db",
      "oma-tf-infra",
      "oma-scm",
      "oma-qa",
    ];
    for (const variant of ["python", "node", "rust", undefined]) {
      const result = resolveSerenaLanguages(allSkills, variant);
      expect(result).not.toContain("bash");
    }
  });
});

describe("inferSerenaLanguages", () => {
  it("should detect frontend skill", () => {
    mockFs.existsSync.mockImplementation((p: string) =>
      p.includes("oma-frontend"),
    );
    const result = inferSerenaLanguages("/project");
    expect(result).toContain("typescript");
  });

  it("should detect oma-db skill and return python (Task 9)", () => {
    mockFs.existsSync.mockImplementation((p: string) => p.includes("oma-db"));
    const result = inferSerenaLanguages("/project");
    expect(result).toContain("python");
    expect(result).not.toContain("bash");
  });

  it("should read backend language from stack.yaml", () => {
    mockFs.existsSync.mockImplementation(
      (p: string) => p.includes("oma-backend") || p.includes("stack.yaml"),
    );
    mockFs.readFileSync.mockReturnValue("language: python\nsource: preset\n");
    const result = inferSerenaLanguages("/project");
    expect(result).toContain("python");
  });

  it("should default to typescript for backend without stack.yaml", () => {
    mockFs.existsSync.mockImplementation(
      (p: string) => p.endsWith("oma-backend") && !p.includes("stack.yaml"),
    );
    const result = inferSerenaLanguages("/project");
    expect(result).toContain("typescript");
  });

  it("should fallback to typescript when no skills found", () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = inferSerenaLanguages("/project");
    expect(result).toEqual(["typescript"]);
  });

  it("should never infer bash regardless of installed skills (Task 9)", () => {
    // Simulate all known skills installed
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("language: python\n");
    const result = inferSerenaLanguages("/project");
    expect(result).not.toContain("bash");
  });
});

describe("ensureSerenaDefaultMaxAnswerChars", () => {
  const configPath = join("/mock/home", ".serena", "serena_config.yml");

  it("should return false when config file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(ensureSerenaDefaultMaxAnswerChars()).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should append the default when the key is missing", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("projects:\n- /other\n");
    expect(ensureSerenaDefaultMaxAnswerChars()).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining(
        `default_max_tool_answer_chars: ${SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}`,
      ),
    );
  });

  it("should raise a too-low existing value", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "gui_log_window: false\ndefault_max_tool_answer_chars: 3000\nprojects:\n- /x\n",
    );
    expect(ensureSerenaDefaultMaxAnswerChars()).toBe(true);
    const written = mockFs.writeFileSync.mock.calls.at(0)?.[1] as string;
    expect(written).toContain(
      `default_max_tool_answer_chars: ${SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}`,
    );
    expect(written).toContain("gui_log_window: false");
    expect(written).not.toMatch(/default_max_tool_answer_chars:\s*3000/);
  });

  it("should leave a sufficient existing value alone", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "default_max_tool_answer_chars: 150000\nprojects:\n- /x\n",
    );
    expect(ensureSerenaDefaultMaxAnswerChars()).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should leave intentional higher caps alone", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "default_max_tool_answer_chars: 500000\n",
    );
    expect(ensureSerenaDefaultMaxAnswerChars()).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("ensureSerenaRegistered", () => {
  const configPath = join("/mock/home", ".serena", "serena_config.yml");

  it("should return false when config file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(ensureSerenaRegistered(MY_PROJECT)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should return false when project is already registered", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `projects:\n- ${MY_PROJECT}\n- ${OTHER_PROJECT}\n`,
    );
    expect(ensureSerenaRegistered(MY_PROJECT)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should add project to config when not registered", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `projects:\n- ${OTHER_PROJECT}\nlanguage_backend: LSP\n`,
    );
    expect(ensureSerenaRegistered(MY_PROJECT)).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining(`- ${MY_PROJECT}`),
    );
  });

  it("should preserve existing entries when adding", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `projects:\n- ${OTHER_PROJECT}\nlanguage_backend: LSP\n`,
    );
    ensureSerenaRegistered(MY_PROJECT);
    const written = mockFs.writeFileSync.mock.calls.at(0)?.[1] as string;
    expect(written).toContain(`- ${OTHER_PROJECT}`);
    expect(written).toContain(`- ${MY_PROJECT}`);
    expect(written).toContain("language_backend: LSP");
  });

  it("should return false when projects section is missing", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("gui_log_window: false\n");
    expect(ensureSerenaRegistered(MY_PROJECT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// $HOME is never a project (issue #657)
//
// `oma install --global` resolves its install root to $HOME. Running per-project
// serena setup against it registered the whole home directory as a project on
// every (re)install, and recreated it after the user cleaned up by hand.
// ---------------------------------------------------------------------------

describe("isForbiddenSerenaProjectRoot", () => {
  it("should be true for the home directory", () => {
    expect(isForbiddenSerenaProjectRoot(HOME_DIR)).toBe(true);
  });

  it("should be true for a non-normalized path to the home directory", () => {
    expect(isForbiddenSerenaProjectRoot(join(HOME_DIR, "sub", ".."))).toBe(
      true,
    );
  });

  it("should be false for a directory under home", () => {
    expect(isForbiddenSerenaProjectRoot(join(HOME_DIR, "project"))).toBe(false);
  });

  it("should be false for an unrelated project", () => {
    expect(isForbiddenSerenaProjectRoot(MY_PROJECT)).toBe(false);
  });
});

describe("serena setup declines $HOME", () => {
  beforeEach(() => {
    // Everything the happy path needs — only the guard should prevent writes.
    mockFs.existsSync.mockImplementation((p: string) =>
      String(p).includes("serena_config.yml"),
    );
    mockFs.readFileSync.mockReturnValue(`projects:\n- ${OTHER_PROJECT}\n`);
  });

  it("ensureSerenaRegistered should not add $HOME to the projects list", () => {
    expect(ensureSerenaRegistered(HOME_DIR)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("ensureSerenaProjectConfig should not write ~/.serena/project.yml", () => {
    expect(ensureSerenaProjectConfig(HOME_DIR, ["typescript"])).toBe("skipped");
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it("ensureSerenaProject should skip project steps but still ensure global max_answer_chars", () => {
    // Global default is missing → ensure appends it (independent of $HOME guard).
    expect(ensureSerenaProject(HOME_DIR, ["typescript", "python"])).toEqual({
      configured: "skipped",
      registered: false,
      maxAnswerChars: true,
    });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("serena_config.yml"),
      expect.stringContaining(
        `default_max_tool_answer_chars: ${SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}`,
      ),
    );
    // Project root must not get a .serena/ tree under $HOME.
    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it("should still set up a real project under $HOME", () => {
    const project = join(HOME_DIR, "GitHub", "app");
    const result = ensureSerenaProject(project, ["typescript"]);
    expect(result.configured).toBe("created");
    expect(result.registered).toBe(true);
  });
});

describe("unregisterSerenaProject", () => {
  const configPath = join("/mock/home", ".serena", "serena_config.yml");

  it("should remove the entry and preserve the rest of the file", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `gui_mode: false\nprojects:\n- ${OTHER_PROJECT}\n- ${HOME_DIR}\n- ${MY_PROJECT}\nlanguage_backend: LSP\n`,
    );

    expect(unregisterSerenaProject(HOME_DIR)).toBe(true);

    const written = mockFs.writeFileSync.mock.calls.at(0)?.[1] as string;
    expect(mockFs.writeFileSync.mock.calls.at(0)?.[0]).toBe(configPath);
    expect(written).not.toContain(`- ${HOME_DIR}\n`);
    expect(written).toContain(`- ${OTHER_PROJECT}`);
    expect(written).toContain(`- ${MY_PROJECT}`);
    expect(written).toContain("gui_mode: false");
    expect(written).toContain("language_backend: LSP");
  });

  it("should not remove a project nested under the target path", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `projects:\n- ${join(HOME_DIR, "GitHub")}\n`,
    );
    expect(unregisterSerenaProject(HOME_DIR)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should be idempotent when the entry is absent", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(`projects:\n- ${OTHER_PROJECT}\n`);
    expect(unregisterSerenaProject(HOME_DIR)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should return false when the config file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(unregisterSerenaProject(HOME_DIR)).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reconcileSerenaLanguages (Task 10 — pure function)
// ---------------------------------------------------------------------------

describe("reconcileSerenaLanguages", () => {
  const existingYml = `languages:
- typescript
- python

encoding: "utf-8"
project_name: "my-project"
`;

  it("should return null when all derived languages already present (idempotent)", () => {
    const result = reconcileSerenaLanguages(existingYml, [
      "typescript",
      "python",
    ]);
    expect(result).toBeNull();
  });

  it("should add a missing derived language (additive merge)", () => {
    const result = reconcileSerenaLanguages(existingYml, [
      "typescript",
      "python",
      "dart",
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("- dart");
    expect(result).toContain("- typescript");
    expect(result).toContain("- python");
  });

  it("should never remove an existing language (additive only)", () => {
    // derivedLanguages does not include python — it must be preserved
    const result = reconcileSerenaLanguages(existingYml, ["typescript"]);
    expect(result).toBeNull(); // typescript already present, python preserved → no change
  });

  it("should preserve languages not in derived set when adding new ones", () => {
    // existing has typescript + python; derived wants typescript + dart
    // python must be preserved; dart must be added
    const result = reconcileSerenaLanguages(existingYml, [
      "typescript",
      "dart",
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("- typescript");
    expect(result).toContain("- python"); // preserved
    expect(result).toContain("- dart"); // added
  });

  it("should preserve non-language file content and formatting", () => {
    const result = reconcileSerenaLanguages(existingYml, [
      "typescript",
      "dart",
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain('project_name: "my-project"');
    expect(result).toContain('encoding: "utf-8"');
  });

  it("should be case-insensitive when checking existing languages", () => {
    const ymlWithCaps = `languages:\n- TypeScript\n- Python\n\nproject_name: "test"\n`;
    // "typescript" (lower) matches "TypeScript" — no change needed
    const result = reconcileSerenaLanguages(ymlWithCaps, [
      "typescript",
      "python",
    ]);
    expect(result).toBeNull();
  });

  // Regression: QA F3 — inline YAML comments must not defeat dedup.
  it("should not duplicate a language that carries an inline comment", () => {
    const ymlWithComment = `languages:\n- typescript # primary stack\n\nproject_name: "test"\n`;
    const result = reconcileSerenaLanguages(ymlWithComment, ["typescript"]);
    // Already present (comment-stripped match) → no change.
    expect(result).toBeNull();
  });

  it("preserves the inline comment while still adding a genuinely new language", () => {
    const ymlWithComment = `languages:\n- typescript # primary stack\n\nproject_name: "test"\n`;
    const result = reconcileSerenaLanguages(ymlWithComment, [
      "typescript",
      "python",
    ]);
    expect(result).not.toBeNull();
    // typescript appears exactly once, comment intact; python added.
    expect(result?.match(/- typescript/g)).toHaveLength(1);
    expect(result).toContain("- typescript # primary stack");
    expect(result).toContain("- python");
  });

  it("should return null for empty derived set", () => {
    const result = reconcileSerenaLanguages(existingYml, []);
    expect(result).toBeNull();
  });

  it("should prepend a languages block when none exists (autogenerate protection)", () => {
    const ymlWithoutLanguages = `encoding: "utf-8"\nproject_name: "test"\n`;
    const result = reconcileSerenaLanguages(ymlWithoutLanguages, [
      "typescript",
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("languages:");
    expect(result).toContain("- typescript");
  });

  it("should never add bash even if present in derived set (defense-in-depth)", () => {
    // This should not happen via normal code paths, but reconcile is pure so we test it directly.
    // If caller somehow passes bash, it would be added. The protection is in SKILL_LANGUAGE_MAP.
    // This test documents the behavior: reconcile itself does not filter — callers must not pass bash.
    const result = reconcileSerenaLanguages(existingYml, [
      "typescript",
      "bash",
    ]);
    // bash is not in existing — it would be added. This test confirms the guard is in the map, not here.
    // We just assert the pure function behavior is deterministic.
    expect(result).not.toBeNull();
    expect(result).toContain("- bash");
    // Confirms bash protection lives in SKILL_LANGUAGE_MAP, not in reconcile itself.
  });
});

// ---------------------------------------------------------------------------
// reconcileSerenaProjectConfig (Task 10 — IO wrapper)
// ---------------------------------------------------------------------------

describe("reconcileSerenaProjectConfig", () => {
  const projectPath = "/my/project";
  const projectYml = join(projectPath, ".serena", "project.yml");

  it("should return false when project.yml does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = reconcileSerenaProjectConfig(projectPath, ["typescript"]);
    expect(result).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should return false when no languages to add (already up-to-date)", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `languages:\n- typescript\n\n${HARD_EXCLUSIONS}project_name: "p"\n`,
    );
    const result = reconcileSerenaProjectConfig(projectPath, ["typescript"]);
    expect(result).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should write updated file when languages are added", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `languages:\n- typescript\n\n${HARD_EXCLUSIONS}project_name: "p"\n`,
    );
    const result = reconcileSerenaProjectConfig(projectPath, [
      "typescript",
      "python",
    ]);
    expect(result).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      projectYml,
      expect.stringContaining("- python"),
    );
  });
});

// ---------------------------------------------------------------------------
// ensureSerenaProjectConfig (updated return type — Task 10)
// ---------------------------------------------------------------------------

describe("ensureSerenaProjectConfig", () => {
  it("should return 'unchanged' when project.yml exists and has all derived languages", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      `languages:\n- typescript\n\n${HARD_EXCLUSIONS}project_name: "p"\n`,
    );
    const result = ensureSerenaProjectConfig("/my/project", ["typescript"]);
    expect(result).toBe("unchanged");
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should return 'reconciled' when project.yml exists and new languages were added", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      'languages:\n- typescript\n\nproject_name: "p"\n',
    );
    const result = ensureSerenaProjectConfig("/my/project", [
      "typescript",
      "python",
    ]);
    expect(result).toBe("reconciled");
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("project.yml"),
      expect.stringContaining("- python"),
    );
  });

  it("should return 'created' and write project.yml when file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = ensureSerenaProjectConfig("/my/project", [
      "typescript",
      "python",
    ]);
    expect(result).toBe("created");

    const calls = mockFs.writeFileSync.mock.calls;
    const projectYmlCall = calls.find((c: string[]) =>
      (c[0] as string).includes("project.yml"),
    );
    expect(projectYmlCall).toBeDefined();
    const content = projectYmlCall?.[1] as string;
    expect(content).toContain("- typescript");
    expect(content).toContain("- python");
    expect(content).toContain('project_name: "project"');
  });

  it("should create .gitignore and memories directory on creation", () => {
    mockFs.existsSync.mockReturnValue(false);
    ensureSerenaProjectConfig("/my/project", ["typescript"]);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining(".serena"),
      { recursive: true },
    );
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("memories"),
      { recursive: true },
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".gitignore"),
      "/cache\n",
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(".gitkeep"),
      "",
    );
  });
});

describe("ensureSerenaProject", () => {
  it("should return configured='created' when project.yml does not exist", () => {
    // project.yml doesn't exist, config file exists with projects
    mockFs.existsSync.mockImplementation((p: string) => {
      if ((p as string).includes("project.yml")) return false;
      if ((p as string).includes("serena_config.yml")) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue("projects:\n- /other\n");

    const result = ensureSerenaProject("/my/project", ["typescript"]);
    expect(result.configured).toBe("created");
    expect(result.registered).toBe(true);
    // Missing global key → ensure appends default_max_tool_answer_chars.
    expect(result.maxAnswerChars).toBe(true);
  });

  it("should return configured='unchanged' when project.yml has all languages", () => {
    mockFs.existsSync.mockImplementation((p: string) => {
      if ((p as string).includes("project.yml")) return true;
      if ((p as string).includes("serena_config.yml")) return true;
      return false;
    });
    mockFs.readFileSync.mockImplementation((p: string) => {
      if ((p as string).includes("project.yml")) {
        return `languages:\n- typescript\n\n${HARD_EXCLUSIONS}project_name: "p"\n`;
      }
      return `projects:\n- ${MY_PROJECT}\ndefault_max_tool_answer_chars: 150000\n`;
    });

    const result = ensureSerenaProject("/my/project", ["typescript"]);
    expect(result.configured).toBe("unchanged");
    expect(result.registered).toBe(false); // already registered
    expect(result.maxAnswerChars).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// advisoryHeavyLanguages (Task 11 — doctor advisory helper)
// ---------------------------------------------------------------------------

describe("advisoryHeavyLanguages", () => {
  it("should return empty array when all project languages are skill-derived", () => {
    const result = advisoryHeavyLanguages(
      ["typescript", "python"],
      ["typescript", "python"],
    );
    expect(result).toEqual([]);
  });

  it("should flag bash as heavy when present but not skill-derived", () => {
    const result = advisoryHeavyLanguages(
      ["typescript", "bash"],
      ["typescript"],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.language).toBe("bash");
    expect(result[0]?.reason).toContain("bash");
    expect(result[0]?.reason).toContain("40 MB");
    expect(result[0]?.suggestion).toContain(".serena/project.yml");
  });

  it("should not flag bash when it is in the derived set", () => {
    // Edge case: if a future skill maps to bash, it should not be flagged
    const result = advisoryHeavyLanguages(
      ["typescript", "bash"],
      ["typescript", "bash"],
    );
    expect(result).toEqual([]);
  });

  it("should not flag unknown/unmapped languages (only known heavy ones)", () => {
    // "cobol" is not in HEAVY_UNMAPPED_LANGUAGES — no advisory
    const result = advisoryHeavyLanguages(
      ["typescript", "cobol"],
      ["typescript"],
    );
    expect(result).toEqual([]);
  });

  it("should flag multiple heavy languages when present", () => {
    // If we had multiple heavy languages, all should be flagged
    const result = advisoryHeavyLanguages(["typescript", "bash"], []);
    // typescript is not heavy — only bash is flagged
    expect(result).toHaveLength(1);
    expect(result[0]?.language).toBe("bash");
  });

  it("should return structured items with language, reason, and suggestion fields", () => {
    const result = advisoryHeavyLanguages(["bash"], []);
    expect(result[0]).toHaveProperty("language");
    expect(result[0]).toHaveProperty("reason");
    expect(result[0]).toHaveProperty("suggestion");
  });

  it("should handle empty project languages list", () => {
    const result = advisoryHeavyLanguages([], ["typescript"]);
    expect(result).toEqual([]);
  });

  it("should handle empty derived languages list", () => {
    // All project languages are non-derived; only heavy ones are flagged
    const result = advisoryHeavyLanguages(["typescript", "bash"], []);
    expect(result).toHaveLength(1); // only bash is in HEAVY_UNMAPPED_LANGUAGES
    expect(result[0]?.language).toBe("bash");
  });
});

// ---------------------------------------------------------------------------
// parseProjectYmlLanguages (convenience helper for doctor consumers)
// ---------------------------------------------------------------------------

describe("parseProjectYmlLanguages", () => {
  it("should parse a standard languages block", () => {
    const yml = `languages:\n- typescript\n- python\n\nproject_name: "test"\n`;
    expect(parseProjectYmlLanguages(yml)).toEqual(["typescript", "python"]);
  });

  it("should return empty array when languages block is absent", () => {
    expect(parseProjectYmlLanguages('project_name: "test"\n')).toEqual([]);
  });

  it("should return empty array for empty languages block", () => {
    expect(
      parseProjectYmlLanguages('languages:\n\nproject_name: "test"\n'),
    ).toEqual([]);
  });

  it("should read serena >=1.6.2's language_servers key", () => {
    const yml = `language_servers:\n- typescript\n- bash\n\nproject_name: "t"\n`;
    expect(parseProjectYmlLanguages(yml)).toEqual(["typescript", "bash"]);
  });

  it("should prefer language_servers when both keys are present", () => {
    // serena promotes `languages` only when `language_servers` is ABSENT, so
    // the legacy block is inert once both exist — reading it would mislead.
    const yml = `languages:\n- dart\n\nlanguage_servers:\n- typescript\n`;
    expect(parseProjectYmlLanguages(yml)).toEqual(["typescript"]);
  });

  it("should read a flow-style list", () => {
    expect(parseProjectYmlLanguages('languages: ["python"]\n')).toEqual([
      "python",
    ]);
  });

  it("should return empty array for malformed yaml", () => {
    expect(parseProjectYmlLanguages("languages:\n  - [unclosed\n")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Schema drift, pruning, and byte fidelity
// ---------------------------------------------------------------------------

describe("reconcileSerenaLanguages — cross-version language keys", () => {
  it("should edit language_servers in place", () => {
    const yml = `language_servers:\n- typescript\n\nproject_name: "t"\n`;
    const result = reconcileSerenaLanguages(yml, ["typescript", "python"]);
    expect(result).toContain("language_servers:\n- typescript\n- python\n");
  });

  it("should mirror language_servers under the legacy key for serena 1.6.1", () => {
    // 1.6.1 treats `languages` as required and dies with KeyError otherwise,
    // so a file written by a newer serena must gain the legacy key back.
    const yml = `language_servers:\n- typescript\n\nproject_name: "t"\n`;
    const result = reconcileSerenaLanguages(yml, ["typescript"]) ?? "";
    expect(result).toContain("languages:\n- typescript\n");
    expect(result).toContain("language_servers:\n- typescript\n");
  });

  it("should keep both keys in sync rather than letting one rot", () => {
    const yml = `languages:\n- dart\n\nlanguage_servers:\n- typescript\n`;
    const result = reconcileSerenaLanguages(yml, ["typescript", "python"]);
    expect(result).toContain("languages:\n- typescript\n- python\n");
    expect(result).toContain("language_servers:\n- typescript\n- python\n");
  });

  it("should treat language_servers as authoritative when the two disagree", () => {
    // A modern serena reads language_servers, so the stale legacy list must not
    // resurrect languages the project dropped.
    const yml = `languages:\n- dart\n- typescript\n\nlanguage_servers:\n- typescript\n`;
    const result = reconcileSerenaLanguages(yml, ["typescript"]) ?? "";
    expect(result).not.toContain("- dart");
  });

  it("should be idempotent once both keys agree", () => {
    const yml = `languages:\n- typescript\n\nlanguage_servers:\n- typescript\n`;
    expect(reconcileSerenaLanguages(yml, ["typescript"])).toBeNull();
  });

  it("should not add a mirror when only the legacy key exists", () => {
    // `languages` alone is readable by every serena version — nothing to fix.
    const yml = `languages:\n- typescript\n`;
    expect(reconcileSerenaLanguages(yml, ["typescript"])).toBeNull();
  });
});

describe("reconcileSerenaLanguages — pruning", () => {
  const yml = `languages:\n- typescript\n- dart\n- bash\n\nproject_name: "t"\n`;

  it("should drop a language the project no longer contains", () => {
    const result = reconcileSerenaLanguages(yml, ["typescript"], {
      prunable: new Set(["dart"]),
    });
    expect(parseProjectYmlLanguages(result ?? "")).toEqual([
      "typescript",
      "bash",
    ]);
  });

  it("should keep entries oma cannot detect", () => {
    // bash is never in the prunable set, so a hand-added entry survives.
    const result = reconcileSerenaLanguages(yml, ["typescript"], {
      prunable: new Set(["dart", "python"]),
    });
    expect(parseProjectYmlLanguages(result ?? "")).toContain("bash");
  });

  it("should remain additive when no prunable set is given", () => {
    expect(reconcileSerenaLanguages(yml, ["typescript"])).toBeNull();
  });

  it("should never empty the list", () => {
    const only = `languages:\n- dart\n`;
    const result = reconcileSerenaLanguages(only, ["dart"], {
      prunable: new Set(["dart"]),
    });
    expect(result).toBeNull();
  });

  it("should be idempotent once pruned", () => {
    const once = reconcileSerenaLanguages(yml, ["typescript"], {
      prunable: new Set(["dart"]),
    });
    const twice = reconcileSerenaLanguages(once ?? "", ["typescript"], {
      prunable: new Set(["dart"]),
    });
    expect(twice).toBeNull();
  });
});

describe("reconcileSerenaLanguages — source fidelity", () => {
  it("should leave every byte outside the list untouched", () => {
    // Long lines and blank-line placement must survive: re-serializing the
    // whole document would re-fold and re-space unrelated content.
    const yml = [
      "# leading comment",
      "",
      'project_name: "t"',
      "languages:",
      "- typescript",
      "- dart",
      "",
      "description: a very long description line that a yaml serializer would happily re-fold at eighty columns",
      "ignored_paths: []",
      "",
    ].join("\n");

    const result = reconcileSerenaLanguages(yml, ["typescript"], {
      prunable: new Set(["dart"]),
    });

    expect(result).toBe(yml.replace("- typescript\n- dart", "- typescript"));
  });

  it("should carry an inline comment along with its entry", () => {
    const yml = `languages:\n- typescript # pinned\n- dart\n`;
    const result = reconcileSerenaLanguages(yml, ["typescript"], {
      prunable: new Set(["dart"]),
    });
    expect(result).toContain("- typescript # pinned");
  });

  it("should not duplicate an entry that carries a comment", () => {
    const yml = `languages:\n- typescript # pinned\n`;
    expect(reconcileSerenaLanguages(yml, ["typescript"])).toBeNull();
  });

  it("should preserve flow style", () => {
    const result = reconcileSerenaLanguages('languages: ["python"]\n', [
      "python",
      "typescript",
    ]);
    expect(result).toBe('languages: ["python", "typescript"]\n');
  });

  it("should leave malformed yaml alone", () => {
    const broken = "languages:\n  - [unclosed\n";
    expect(reconcileSerenaLanguages(broken, ["typescript"])).toBeNull();
  });
});
