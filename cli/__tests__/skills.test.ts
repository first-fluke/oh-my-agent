import * as fs from "node:fs";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  GITHUB_AGENT_ROOT,
  GITHUB_CLAUDE_ROOT,
  GITHUB_RAW,
  installClaudeSkills,
  installConfigs,
  installWorkflows,
  REPO,
} from "../lib/skills.js";

// Mock node:fs module
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("skills.ts - Workflow and Config Installation", () => {
  const mockTargetDir = "/tmp/test-project";
  let mockFetch: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("installWorkflows", () => {
    it("should create workflows directory if it does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => "mock content",
      } as Response);

      await installWorkflows(mockTargetDir);

      const workflowsDir = join(mockTargetDir, ".agents", "workflows");
      expect(fs.existsSync).toHaveBeenCalledWith(workflowsDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(workflowsDir, {
        recursive: true,
      });
    });

    it("should fetch and write workflow files", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => "workflow content",
      } as Response);

      await installWorkflows(mockTargetDir);

      // Check if fetch was called for expected files
      const expectedFiles = [
        "brainstorm.md",
        "coordinate.md",
        "ultrawork.md",
        "debug.md",
        "orchestrate.md",
        "plan.md",
        "review.md",
        "setup.md",
        "tools.md",
      ];

      for (const file of expectedFiles) {
        expect(mockFetch).toHaveBeenCalledWith(
          `${GITHUB_AGENT_ROOT}/workflows/${file}`,
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining(file),
          "workflow content",
          "utf-8",
        );
      }
    });

    it("should skip files if fetch fails", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: false, // Fetch fails
      } as Response);

      await installWorkflows(mockTargetDir);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("installConfigs", () => {
    it("should create config directory and install user-preferences", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockFetch.mockImplementation(async (url) => {
        if (url.toString().includes("user-preferences.yaml")) {
          return {
            ok: true,
            text: async () => "preferences content",
          } as Response;
        }
        return { ok: false } as Response;
      });

      await installConfigs(mockTargetDir);

      const configDir = join(mockTargetDir, ".agents", "config");
      expect(fs.existsSync).toHaveBeenCalledWith(configDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(configDir, { recursive: true });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(configDir, "user-preferences.yaml"),
        "preferences content",
        "utf-8",
      );
    });

    it("should install mcp.json", async () => {
      mockFetch.mockImplementation(async (url) => {
        if (url.toString().includes("mcp.json")) {
          return {
            ok: true,
            text: async () => "mcp content",
          } as Response;
        }
        return { ok: false } as Response;
      });

      await installConfigs(mockTargetDir);

      const agentDir = join(mockTargetDir, ".agents");
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(agentDir, "mcp.json"),
        "mcp content",
        "utf-8",
      );
    });
  });
});

describe("installClaudeSkills", () => {
  const mockTargetDir = "/tmp/test-project";
  let mockFetch: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create .claude/skills and .claude/agents directories", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "mock content",
    } as Response);

    await installClaudeSkills(mockTargetDir);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      join(mockTargetDir, ".claude", "skills"),
      { recursive: true },
    );
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      join(mockTargetDir, ".claude", "agents"),
      { recursive: true },
    );
  });

  it("should fetch and write all 12 workflow skills", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "skill content",
    } as Response);

    await installClaudeSkills(mockTargetDir);

    const expectedSkills = [
      "brainstorm", "commit", "coordinate", "debug", "deepinit",
      "exec-plan", "orchestrate", "plan", "review", "setup",
      "tools", "ultrawork",
    ];

    for (const skill of expectedSkills) {
      expect(mockFetch).toHaveBeenCalledWith(
        `${GITHUB_CLAUDE_ROOT}/skills/${skill}/SKILL.md`,
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(mockTargetDir, ".claude", "skills", skill, "SKILL.md"),
        "skill content",
        "utf-8",
      );
    }
  });

  it("should fetch and write all 7 agent definitions", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "agent content",
    } as Response);

    await installClaudeSkills(mockTargetDir);

    const expectedAgents = [
      "backend-impl.md", "frontend-impl.md", "mobile-impl.md",
      "db-impl.md", "qa-reviewer.md", "debug-investigator.md",
      "pm-planner.md",
    ];

    for (const agent of expectedAgents) {
      expect(mockFetch).toHaveBeenCalledWith(
        `${GITHUB_CLAUDE_ROOT}/agents/${agent}`,
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        join(mockTargetDir, ".claude", "agents", agent),
        "agent content",
        "utf-8",
      );
    }
  });

  it("should skip files if fetch fails", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: false,
    } as Response);

    await installClaudeSkills(mockTargetDir);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe("skills.ts - repository metadata", () => {
  it("should use the renamed GitHub repository for skill downloads", () => {
    expect(REPO).toBe("first-fluke/oh-my-agent");
    expect(GITHUB_RAW).toBe(
      "https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/.agents/skills",
    );
    expect(GITHUB_AGENT_ROOT).toBe(
      "https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/.agents",
    );
  });
});
