import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureSerenaProject,
  ensureSerenaProjectConfig,
  ensureSerenaRegistered,
  inferSerenaLanguages,
  resolveSerenaLanguages,
} from "./serena.js";

// Mock fs
const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: mockFs.existsSync,
    readFileSync: mockFs.readFileSync,
    writeFileSync: mockFs.writeFileSync,
    mkdirSync: mockFs.mkdirSync,
  };
});

// Mock os
vi.mock("node:os", () => ({
  homedir: () => "/mock/home",
}));

beforeEach(() => {
  vi.clearAllMocks();
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
});

describe("inferSerenaLanguages", () => {
  it("should detect frontend skill", () => {
    mockFs.existsSync.mockImplementation((p: string) =>
      p.includes("oma-frontend"),
    );
    const result = inferSerenaLanguages("/project");
    expect(result).toContain("typescript");
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
});

describe("ensureSerenaRegistered", () => {
  const configPath = "/mock/home/.serena/serena_config.yml";

  it("should return false when config file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(ensureSerenaRegistered("/my/project")).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should return false when project is already registered", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "projects:\n- /my/project\n- /other/project\n",
    );
    expect(ensureSerenaRegistered("/my/project")).toBe(false);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should add project to config when not registered", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "projects:\n- /other/project\nlanguage_backend: LSP\n",
    );
    expect(ensureSerenaRegistered("/my/project")).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining("- /my/project"),
    );
  });

  it("should preserve existing entries when adding", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      "projects:\n- /other/project\nlanguage_backend: LSP\n",
    );
    ensureSerenaRegistered("/my/project");
    const written = mockFs.writeFileSync.mock.calls[0][1] as string;
    expect(written).toContain("- /other/project");
    expect(written).toContain("- /my/project");
    expect(written).toContain("language_backend: LSP");
  });

  it("should return false when projects section is missing", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("gui_log_window: false\n");
    expect(ensureSerenaRegistered("/my/project")).toBe(false);
  });
});

describe("ensureSerenaProjectConfig", () => {
  it("should return false when project.yml already exists", () => {
    mockFs.existsSync.mockReturnValue(true);
    expect(ensureSerenaProjectConfig("/my/project", ["typescript"])).toBe(
      false,
    );
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should create project.yml with correct languages", () => {
    mockFs.existsSync.mockReturnValue(false);
    ensureSerenaProjectConfig("/my/project", ["typescript", "python"]);

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

  it("should create .gitignore and memories directory", () => {
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
  it("should call both config and registration", () => {
    // project.yml doesn't exist, config file exists with projects
    mockFs.existsSync.mockImplementation((p: string) => {
      if ((p as string).includes("project.yml")) return false;
      if ((p as string).includes("serena_config.yml")) return true;
      return false;
    });
    mockFs.readFileSync.mockReturnValue("projects:\n- /other\n");

    const result = ensureSerenaProject("/my/project", ["typescript"]);
    expect(result.configured).toBe(true);
    expect(result.registered).toBe(true);
  });
});
