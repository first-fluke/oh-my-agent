import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HUD_PATH = join(__dirname, "../../.agents/hooks/core/hud.ts");
const HUD_PROJECT_DIR = join(tmpdir(), "oma-hud-test-empty-project");

// Strip ANSI escape codes for readable assertions
// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping requires matching \x1b
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function hud(input: Record<string, unknown>): string {
  return execSync(`bun "${HUD_PATH}"`, {
    input: JSON.stringify(input),
    encoding: "utf-8",
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: HUD_PROJECT_DIR,
    },
  });
}

describe("hud.ts", () => {
  describe("OMA label", () => {
    it("should always show [OMA]", () => {
      const result = stripAnsi(hud({}));
      expect(result).toContain("[OMA]");
    });
  });

  describe("model", () => {
    it("should shorten Opus display name", () => {
      const result = stripAnsi(
        hud({ model: { display_name: "Claude Opus 4.6 (1M context)" } }),
      );
      expect(result).toContain("Opus 4.6");
    });

    it("should shorten Sonnet display name", () => {
      const result = stripAnsi(
        hud({ model: { display_name: "Claude Sonnet 4.6" } }),
      );
      expect(result).toContain("Sonnet 4.6");
    });

    it("should shorten Haiku display name", () => {
      const result = stripAnsi(
        hud({ model: { display_name: "Claude Haiku 4.5" } }),
      );
      expect(result).toContain("Haiku 4.5");
    });

    it("should shorten Gemini Flash display name (agy)", () => {
      const result = stripAnsi(
        hud({ model: { display_name: "Gemini 3.5 Flash (High)" } }),
      );
      expect(result).toContain("Gemini 3.5 Flash");
      expect(result).not.toContain("(High)");
    });

    it("should shorten Gemini Pro display name (agy)", () => {
      const result = stripAnsi(
        hud({ model: { display_name: "Gemini 2.5 Pro" } }),
      );
      expect(result).toContain("Gemini 2.5 Pro");
    });

    it("should fall back to model id", () => {
      const result = stripAnsi(hud({ model: { id: "custom/my-model" } }));
      expect(result).toContain("my-model");
    });
  });

  describe("context usage", () => {
    it("should show context percentage", () => {
      const result = stripAnsi(
        hud({ context_window: { used_percentage: 42 } }),
      );
      expect(result).toContain("ctx:42%");
    });

    it("should round context percentage", () => {
      const result = stripAnsi(
        hud({ context_window: { used_percentage: 33.7 } }),
      );
      expect(result).toContain("ctx:34%");
    });
  });

  describe("agy fields", () => {
    it("formats input/output tokens (under 10k → 1 decimal k)", () => {
      const result = stripAnsi(
        hud({
          context_window: {
            used_percentage: 42,
            total_input_tokens: 1234,
            total_output_tokens: 5678,
          },
          agent_state: "running",
        }),
      );
      expect(result).toContain("tok:1.2k↑5.7k↓");
      expect(result.endsWith("tok:1.2k↑5.7k↓")).toBe(true);
      expect(result.indexOf("running")).toBeLessThan(result.indexOf("tok:"));
    });

    it("formats tokens over 10k without decimal", () => {
      const result = stripAnsi(
        hud({
          context_window: {
            total_input_tokens: 42_000,
            total_output_tokens: 0,
          },
        }),
      );
      expect(result).toContain("tok:42k↑0↓");
    });

    it("hides tokens block when both are zero", () => {
      const result = stripAnsi(
        hud({
          context_window: {
            total_input_tokens: 0,
            total_output_tokens: 0,
          },
        }),
      );
      expect(result).not.toContain("tok:");
    });

    it("shows agent_state when not idle", () => {
      const result = stripAnsi(hud({ agent_state: "running" }));
      expect(result).toContain("running");
    });

    it("hides agent_state when idle", () => {
      const result = stripAnsi(hud({ agent_state: "idle" }));
      expect(result).not.toContain("idle");
    });

    it("shows sandbox flag when enabled", () => {
      const result = stripAnsi(hud({ sandbox: { enabled: true } }));
      expect(result).toContain("sandbox");
    });

    it("hides sandbox flag when disabled", () => {
      const result = stripAnsi(hud({ sandbox: { enabled: false } }));
      expect(result).not.toContain("sandbox");
    });

    it("shows git branch from vcs, with dirty marker", () => {
      const clean = stripAnsi(hud({ vcs: { type: "git", branch: "dev" } }));
      expect(clean).toContain("⎇ dev");
      expect(clean).not.toContain("dev*");
      const dirty = stripAnsi(
        hud({ vcs: { type: "git", branch: "dev", dirty: true } }),
      );
      expect(dirty).toContain("⎇ dev*");
    });

    it("hides branch when vcs is absent", () => {
      const result = stripAnsi(hud({}));
      expect(result).not.toContain("⎇");
    });

    it("shows active subagent count", () => {
      const result = stripAnsi(
        hud({ subagents: [{ name: "a" }, { name: "b" }] }),
      );
      expect(result).toContain("subagents:2");
    });

    it("shows background task count", () => {
      const result = stripAnsi(hud({ background_tasks: [{ name: "build" }] }));
      expect(result).toContain("bg:1");
    });

    it("shows queued input count when > 0, hides when 0", () => {
      expect(stripAnsi(hud({ pending_input_count: 3 }))).toContain("queue:3");
      expect(stripAnsi(hud({ pending_input_count: 0 }))).not.toContain(
        "queue:",
      );
    });

    it("flags a pending tool confirmation", () => {
      expect(stripAnsi(hud({ tool_confirmation_pending: true }))).toContain(
        "confirm?",
      );
      expect(
        stripAnsi(hud({ tool_confirmation_pending: false })),
      ).not.toContain("confirm?");
    });

    it("keeps the token block last when agy-rich fields are present", () => {
      const result = stripAnsi(
        hud({
          vcs: { type: "git", branch: "main", dirty: true },
          subagents: [{ name: "x" }],
          background_tasks: [{ name: "t" }],
          pending_input_count: 2,
          tool_confirmation_pending: true,
          agent_state: "working",
          context_window: {
            total_input_tokens: 1234,
            total_output_tokens: 5678,
          },
        }),
      );
      expect(result.endsWith("tok:1.2k↑5.7k↓")).toBe(true);
      expect(result).toContain("⎇ main*");
      expect(result).toContain("subagents:1");
      expect(result).toContain("bg:1");
      expect(result).toContain("queue:2");
      expect(result).toContain("confirm?");
    });

    it("renders the captured agy payload end-to-end", () => {
      const result = stripAnsi(
        hud({
          cwd: "/repo",
          model: {
            id: "Gemini 3.5 Flash (High)",
            display_name: "Gemini 3.5 Flash (High)",
          },
          context_window: {
            total_input_tokens: 0,
            total_output_tokens: 0,
            used_percentage: 0,
          },
          agent_state: "idle",
          sandbox: { enabled: false },
          product: "antigravity",
        }),
      );
      expect(result).toContain("[OMA]");
      expect(result).toContain("Gemini 3.5 Flash");
      expect(result).not.toContain("(High)");
      expect(result).toContain("ctx:0%");
      expect(result).not.toContain("tok:");
      expect(result).not.toContain("idle");
      expect(result).not.toContain("sandbox");
    });
  });

  describe("session cost", () => {
    it("should show cost when > 0", () => {
      const result = stripAnsi(hud({ cost: { total_cost_usd: 1.37 } }));
      expect(result).toContain("$1.37");
    });

    it("should hide cost when 0", () => {
      const result = stripAnsi(hud({ cost: { total_cost_usd: 0 } }));
      expect(result).not.toContain("$");
    });

    it("should hide cost when absent", () => {
      const result = stripAnsi(hud({}));
      expect(result).not.toContain("$");
    });
  });

  describe("rate limits", () => {
    it("should show 5h rate limit percentage", () => {
      const result = stripAnsi(
        hud({ rate_limits: { five_hour: { used_percentage: 12 } } }),
      );
      expect(result).toContain("5h:12%");
    });

    it("should show 7d rate limit percentage", () => {
      const result = stripAnsi(
        hud({ rate_limits: { seven_day: { used_percentage: 5 } } }),
      );
      expect(result).toContain("7d:5%");
    });

    it("should show both rate limits", () => {
      const result = stripAnsi(
        hud({
          rate_limits: {
            five_hour: { used_percentage: 12 },
            seven_day: { used_percentage: 5 },
          },
        }),
      );
      expect(result).toContain("5h:12%");
      expect(result).toContain("7d:5%");
    });

    it("should show reset countdown", () => {
      const future = new Date(Date.now() + 2 * 3_600_000 + 30 * 60_000);
      const result = stripAnsi(
        hud({
          rate_limits: {
            five_hour: {
              used_percentage: 50,
              resets_at: future.toISOString(),
            },
          },
        }),
      );
      expect(result).toMatch(/5h:50%\(2h\d+m\)/);
    });

    it("should omit countdown when resets_at is in the past", () => {
      const past = new Date(Date.now() - 60_000);
      const result = stripAnsi(
        hud({
          rate_limits: {
            five_hour: {
              used_percentage: 50,
              resets_at: past.toISOString(),
            },
          },
        }),
      );
      expect(result).toContain("5h:50%");
      expect(result).not.toMatch(/5h:50%\(/);
    });

    it("should hide rate limits when absent", () => {
      const result = stripAnsi(hud({}));
      expect(result).not.toContain("5h:");
      expect(result).not.toContain("7d:");
    });
  });

  describe("lines changed", () => {
    it("should show added and removed", () => {
      const result = stripAnsi(
        hud({ cost: { total_lines_added: 156, total_lines_removed: 23 } }),
      );
      expect(result).toContain("+156");
      expect(result).toContain("-23");
    });

    it("should show only added when no removals", () => {
      const result = stripAnsi(
        hud({ cost: { total_lines_added: 42, total_lines_removed: 0 } }),
      );
      expect(result).toContain("+42");
      expect(result).not.toContain("-");
    });

    it("should show only removed when no additions", () => {
      const result = stripAnsi(
        hud({ cost: { total_lines_added: 0, total_lines_removed: 10 } }),
      );
      expect(result).toContain("-10");
      expect(result).not.toMatch(/\+\d/);
    });

    it("should hide lines when both are 0", () => {
      const result = stripAnsi(
        hud({ cost: { total_lines_added: 0, total_lines_removed: 0 } }),
      );
      expect(result).not.toMatch(/[+-]\d/);
    });
  });

  describe("full output", () => {
    it("should show all sections separated by │", () => {
      const result = stripAnsi(
        hud({
          model: { display_name: "Claude Opus 4.6 (1M context)" },
          context_window: { used_percentage: 42 },
          cost: {
            total_cost_usd: 1.37,
            total_lines_added: 100,
            total_lines_removed: 20,
          },
          rate_limits: {
            five_hour: { used_percentage: 12 },
            seven_day: { used_percentage: 5 },
          },
        }),
      );
      expect(result).toContain("[OMA]");
      expect(result).toContain("Opus 4.6");
      expect(result).toContain("ctx:42%");
      expect(result).toContain("$1.37");
      expect(result).toContain("5h:12%");
      expect(result).toContain("7d:5%");
      expect(result).toContain("+100");
      expect(result).toContain("-20");
      // Sections separated by │
      expect(result.split("│").length).toBeGreaterThanOrEqual(5);
    });

    it("should gracefully handle empty input", () => {
      const result = stripAnsi(hud({}));
      expect(result).toContain("[OMA]");
      expect(result.split("│").length).toBe(1);
    });
  });
});
