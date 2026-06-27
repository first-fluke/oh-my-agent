import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOpencodeSpawnWrapper,
  opencodeWrapperName,
  removeOpencodeSpawnWrapper,
  swapOpencodeAgentArg,
} from "./opencode-wrapper.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

describe("opencode-wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives a deterministic wrapper name from subagent + session", () => {
    expect(opencodeWrapperName("backend-engineer", "sess-1")).toBe(
      "oma-spawn-backend-engineer-sess-1",
    );
  });

  describe("createOpencodeSpawnWrapper", () => {
    it("writes a primary wrapper that delegates to the subagent via the task tool", () => {
      const wrapper = createOpencodeSpawnWrapper(
        "qa-reviewer",
        "sess-1",
        "/project",
      );

      expect(wrapper.name).toBe("oma-spawn-qa-reviewer-sess-1");
      expect(n(wrapper.filePath)).toBe(
        "/project/.opencode/agents/oma-spawn-qa-reviewer-sess-1.md",
      );

      // Directory is created before the write.
      expect(mockFsFunctions.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(n("/project/.opencode/agents")),
        { recursive: true },
      );

      const [, content] = mockFsFunctions.writeFileSync.mock.calls[0] as [
        string,
        string,
      ];
      // Must be a PRIMARY agent (so `opencode run --agent` accepts it)...
      expect(content).toContain("mode: primary");
      // ...that immediately delegates to the real subagent via the task tool.
      expect(content).toContain('subagent_type: "qa-reviewer"');
      expect(content).toContain("task");
    });

    it("pins the resolved model on the wrapper when provided", () => {
      createOpencodeSpawnWrapper(
        "backend-engineer",
        "s",
        "/p",
        "openai/gpt-5.5",
      );
      const [, content] = mockFsFunctions.writeFileSync.mock.calls[0] as [
        string,
        string,
      ];
      expect(content).toContain("model: openai/gpt-5.5");
    });

    it("omits the model line when no model is provided", () => {
      createOpencodeSpawnWrapper("backend-engineer", "s", "/p");
      const [, content] = mockFsFunctions.writeFileSync.mock.calls[0] as [
        string,
        string,
      ];
      expect(content).not.toContain("model:");
    });
  });

  describe("removeOpencodeSpawnWrapper", () => {
    it("unlinks the wrapper file when present", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      removeOpencodeSpawnWrapper("/p/.opencode/agents/x.md");
      expect(mockFsFunctions.unlinkSync).toHaveBeenCalledWith(
        "/p/.opencode/agents/x.md",
      );
    });

    it("is a no-op when the file is absent", () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      removeOpencodeSpawnWrapper("/p/.opencode/agents/x.md");
      expect(mockFsFunctions.unlinkSync).not.toHaveBeenCalled();
    });

    it("swallows unlink errors (best-effort cleanup)", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.unlinkSync.mockImplementation(() => {
        throw new Error("EBUSY");
      });
      expect(() =>
        removeOpencodeSpawnWrapper("/p/.opencode/agents/x.md"),
      ).not.toThrow();
    });
  });

  describe("swapOpencodeAgentArg", () => {
    it("swaps the --agent value and returns true on match", () => {
      const args = [
        "run",
        "-m",
        "openai/gpt-5.5",
        "--agent",
        "backend-engineer",
        "--dir",
        "/p",
        "prompt",
      ];
      expect(
        swapOpencodeAgentArg(args, "backend-engineer", "oma-spawn-backend"),
      ).toBe(true);
      expect(args[4]).toBe("oma-spawn-backend");
      // Surrounding args are untouched.
      expect(args).toContain("--dir");
      expect(args.at(-1)).toBe("prompt");
    });

    it("returns false when --agent is absent", () => {
      const args = ["run", "-m", "m", "--dir", "/p", "prompt"];
      expect(swapOpencodeAgentArg(args, "backend-engineer", "w")).toBe(false);
      expect(args).not.toContain("w");
    });

    it("returns false when --agent value does not match the subagent", () => {
      const args = ["run", "--agent", "other-agent", "prompt"];
      expect(swapOpencodeAgentArg(args, "backend-engineer", "w")).toBe(false);
      expect(args[2]).toBe("other-agent");
    });
  });
});
