import * as fs from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCliSymlinks,
  installClaudeSkills,
  installConfigs,
  installSkill,
  installWorkflows,
  REPO,
} from "../lib/skills.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  cpSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  readlinkSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
  lstatSync: vi.fn(),
  unlinkSync: vi.fn(),
  symlinkSync: vi.fn(),
}));

describe("skills.ts - Workflow and Config Installation", () => {
  const mockSourceDir = "/tmp/extracted-repo";
  const mockTargetDir = "/tmp/test-project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("installWorkflows", () => {
    it("should skip if source directory does not exist", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );

      installWorkflows(mockSourceDir, mockTargetDir);

      expect(fs.cpSync).not.toHaveBeenCalled();
    });

    it("should copy workflows directory from source to target", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      installWorkflows(mockSourceDir, mockTargetDir);

      const src = join(mockSourceDir, ".agents", "workflows");
      const dest = join(mockTargetDir, ".agents", "workflows");
      expect(fs.mkdirSync).toHaveBeenCalledWith(dest, { recursive: true });
      expect(fs.cpSync).toHaveBeenCalledWith(src, dest, {
        recursive: true,
        force: true,
      });
    });
  });

  describe("installConfigs", () => {
    it("should skip existing config files by default", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: "user-preferences.yaml", isDirectory: () => false },
      ]);

      installConfigs(mockSourceDir, mockTargetDir);

      // existsSync returns true for dest file, so cpSync should NOT be called for config files
      // Only mkdirSync should be called
      expect(fs.cpSync).not.toHaveBeenCalledWith(
        join(mockSourceDir, ".agents", "config"),
        join(mockTargetDir, ".agents", "config"),
        { recursive: true, force: true },
      );
    });

    it("should overwrite config files with force flag", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      installConfigs(mockSourceDir, mockTargetDir, true);

      const configSrc = join(mockSourceDir, ".agents", "config");
      const configDest = join(mockTargetDir, ".agents", "config");
      expect(fs.cpSync).toHaveBeenCalledWith(configSrc, configDest, {
        recursive: true,
        force: true,
      });
    });

    it("should skip existing mcp.json by default", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        [],
      );

      installConfigs(mockSourceDir, mockTargetDir);

      const mcpDest = join(mockTargetDir, ".agents", "mcp.json");
      expect(fs.cpSync).not.toHaveBeenCalledWith(
        join(mockSourceDir, ".agents", "mcp.json"),
        mcpDest,
      );
    });

    it("should overwrite mcp.json with force flag", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );

      installConfigs(mockSourceDir, mockTargetDir, true);

      const mcpSrc = join(mockSourceDir, ".agents", "mcp.json");
      const mcpDest = join(mockTargetDir, ".agents", "mcp.json");
      expect(fs.cpSync).toHaveBeenCalledWith(mcpSrc, mcpDest);
    });
  });
});

describe("installClaudeSkills", () => {
  const mockSourceDir = "/tmp/extracted-repo";
  const mockTargetDir = "/tmp/test-project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should copy .claude/skills and .claude/agents directories", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    installClaudeSkills(mockSourceDir, mockTargetDir);

    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".claude", "skills"),
      join(mockTargetDir, ".claude", "skills"),
      { recursive: true, force: true },
    );
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(mockSourceDir, ".claude", "agents"),
      join(mockTargetDir, ".claude", "agents"),
      { recursive: true, force: true },
    );
  });

  it("should skip if source directories do not exist", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    installClaudeSkills(mockSourceDir, mockTargetDir);

    expect(fs.cpSync).not.toHaveBeenCalled();
  });
});

describe("skills.ts - repository metadata", () => {
  it("should use the correct GitHub repository", () => {
    expect(REPO).toBe("first-fluke/oh-my-agent");
  });
});

describe("createCliSymlinks", () => {
  const mockTargetDir = "/tmp/test-project";
  const ssotSkillsDir = resolve(mockTargetDir, ".agents/skills");

  beforeEach(() => {
    vi.clearAllMocks();
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("ENOENT");
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create symlinks for skills that exist", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    const result = createCliSymlinks(mockTargetDir, ["claude"], [
      "oma-frontend",
    ]);

    expect(fs.symlinkSync).toHaveBeenCalledWith(
      relative(
        join(mockTargetDir, ".claude/skills"),
        join(ssotSkillsDir, "oma-frontend"),
      ),
      join(mockTargetDir, ".claude/skills/oma-frontend"),
      "dir",
    );
    expect(result.created).toContain(".claude/skills/oma-frontend");
  });

  it("should skip when source skill directory is missing", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (p === join(mockTargetDir, ".claude/skills")) return true;
        if (p === join(ssotSkillsDir, "oma-missing")) return false;
        return true;
      },
    );

    const result = createCliSymlinks(mockTargetDir, ["claude"], [
      "oma-missing",
    ]);

    expect(fs.symlinkSync).not.toHaveBeenCalled();
    expect(result.skipped).toContain(
      ".claude/skills/oma-missing (source missing)",
    );
  });

  it("should skip when symlink already points to same target", () => {
    const linkPath = join(mockTargetDir, ".claude/skills/oma-frontend");
    const sourcePath = join(ssotSkillsDir, "oma-frontend");
    const relTarget = relative(
      join(mockTargetDir, ".claude/skills"),
      sourcePath,
    );

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSymbolicLink: () => true,
    });
    (fs.readlinkSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      relTarget,
    );

    const result = createCliSymlinks(mockTargetDir, ["claude"], [
      "oma-frontend",
    ]);

    expect(fs.symlinkSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(result.skipped).toContain(
      ".claude/skills/oma-frontend (already linked)",
    );
  });

  it("should replace symlink when pointing to different target", () => {
    const linkPath = join(mockTargetDir, ".claude/skills/oma-frontend");

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSymbolicLink: () => true,
    });
    (fs.readlinkSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "/some/old/path",
    );

    const result = createCliSymlinks(mockTargetDir, ["claude"], [
      "oma-frontend",
    ]);

    expect(fs.unlinkSync).toHaveBeenCalledWith(linkPath);
    expect(fs.symlinkSync).toHaveBeenCalled();
    expect(result.created).toContain(".claude/skills/oma-frontend");
  });

  it("should skip when real directory exists (not a symlink)", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isSymbolicLink: () => false,
    });

    const result = createCliSymlinks(mockTargetDir, ["claude"], [
      "oma-frontend",
    ]);

    expect(fs.symlinkSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(result.skipped).toContain(
      ".claude/skills/oma-frontend (real dir exists)",
    );
  });

  it("should create symlinks for multiple CLI tools", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );

    const result = createCliSymlinks(
      mockTargetDir,
      ["claude", "copilot"],
      ["oma-frontend"],
    );

    expect(fs.symlinkSync).toHaveBeenCalledTimes(2);
    expect(result.created).toContain(".claude/skills/oma-frontend");
    expect(result.created).toContain(".github/skills/oma-frontend");
  });
});

describe("installSkill - variant handling", () => {
  const mockSourceDir = "/tmp/extracted-repo";
  const mockTargetDir = "/tmp/test-project";
  const skillName = "oma-backend";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: lstatSync throws so clearNonDirectory treats dest as non-existent
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("ENOENT");
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should copy variant to stack/ when variant is specified", () => {
    const variantName = "python";
    const srcBase = join(mockSourceDir, ".agents", "skills", skillName);
    const destBase = join(mockTargetDir, ".agents", "skills", skillName);
    // Variant is read from SOURCE, not dest
    const variantSrcDir = join(srcBase, "variants", variantName);
    const destVariantsDir = join(destBase, "variants");
    const stackDir = join(destBase, "stack");
    const stackYaml = join(stackDir, "stack.yaml");

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        // skill source exists
        if (p === srcBase) return true;
        // variant directory exists (in source)
        if (p === variantSrcDir) return true;
        // variants/ dir exists in dest for cleanup
        if (p === destVariantsDir) return true;
        return false;
      },
    );

    installSkill(mockSourceDir, skillName, mockTargetDir, variantName);

    // variant → stack copy (from source)
    expect(fs.cpSync).toHaveBeenCalledWith(variantSrcDir, stackDir, {
      recursive: true,
      force: true,
    });

    // stack.yaml written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      stackYaml,
      `language: ${variantName}\nsource: preset\n`,
    );

    // variants/ cleaned up from dest
    expect(fs.rmSync).toHaveBeenCalledWith(destVariantsDir, {
      recursive: true,
      force: true,
    });
  });

  it("should not create stack/ when variant is not specified", () => {
    const destBase = join(mockTargetDir, ".agents", "skills", skillName);
    const variantsDir = join(destBase, "variants");
    const stackYaml = join(destBase, "stack", "stack.yaml");

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (p === join(mockSourceDir, ".agents", "skills", skillName))
          return true;
        if (p === variantsDir) return true;
        return false;
      },
    );

    installSkill(mockSourceDir, skillName, mockTargetDir);

    expect(fs.writeFileSync).not.toHaveBeenCalledWith(
      stackYaml,
      expect.any(String),
    );
  });

  it("should remove variants/ directory after install", () => {
    const destBase = join(mockTargetDir, ".agents", "skills", skillName);
    const variantsDir = join(destBase, "variants");

    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        if (p === join(mockSourceDir, ".agents", "skills", skillName))
          return true;
        if (p === variantsDir) return true;
        return false;
      },
    );

    installSkill(mockSourceDir, skillName, mockTargetDir);

    expect(fs.rmSync).toHaveBeenCalledWith(variantsDir, {
      recursive: true,
      force: true,
    });
  });
});
