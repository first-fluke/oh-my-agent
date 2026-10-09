import * as fs from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetInstallContext,
  setInstallContext,
} from "../../platform/install-context.js";
import { installAntigravityHud } from "./hud.js";

const FAKE_HOME = "/tmp/fake-home";
const AGY_DIR = join(FAKE_HOME, ".gemini/antigravity-cli");
const SETTINGS = join(AGY_DIR, "settings.json");
const HOME_HOOKS_DIR = join(AGY_DIR, "hooks"); // HOME copy backing statusLine
const PROJECT_HOOKS_JSON = "/repo/.agents/hooks.json"; // agy auto-loads this
const CORE = "/repo/.agents/hooks/core"; // protected project source
const VARIANT = "/repo/.agents/hooks/variants/antigravity.json";

const variantJson = JSON.stringify({
  events: {
    PreInvocation: [
      { hook: "keyword-detector.ts", timeout: 5 },
      { hook: "state-boundary.ts", timeout: 5 },
      { hook: "skill-injector.ts", timeout: 3 },
    ],
    PreToolUse: {
      hook: "test-filter.ts",
      matcher: "run_command",
      timeout: 5,
    },
    Stop: { hook: "persistent-mode.ts", timeout: 5 },
  },
  statusLine: { hook: "hud.ts" },
});

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: vi.fn(() => FAKE_HOME) };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  cpSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  lstatSync: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Shim safe-write through the mocked fs so assertions keep observing the
// final target path + content (the atomic tmp/rename dance is covered by
// utils/safe-write.test.ts).
vi.mock("../../utils/safe-write.js", async () => {
  const mockedFs = await import("node:fs");
  return {
    safeWriteJson: vi.fn((path: string, value: unknown) => {
      mockedFs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    }),
    safeWriteFile: vi.fn((path: string, content: string) => {
      mockedFs.writeFileSync(path, content);
    }),
  };
});

describe("installAntigravityHud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetInstallContext();
    (os.homedir as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      FAKE_HOME,
    );
    (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (fs.lstatSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("ENOENT");
      },
    );
  });

  afterEach(() => {
    _resetInstallContext();
    vi.restoreAllMocks();
  });

  it("bails when agy config dir is absent", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    const result = installAntigravityHud("/repo");
    expect(result.installed).toBe(false);
    expect(result.reason).toMatch(/agy config dir not found/);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("writes project .agents/hooks.json (official schema) + HOME statusLine", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.endsWith(".gemini/antigravity-cli")) return true;
        if (norm.includes(".agents/hooks/core")) return true;
        if (norm.includes(".agents/hooks/variants/antigravity.json"))
          return true;
        return false; // settings.json missing -> start fresh
      },
    );
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.includes(".agents/hooks/variants/antigravity.json"))
          return variantJson;
        return "{}";
      },
    );

    const result = installAntigravityHud("/repo");

    expect(result.installed).toBe(true);
    expect(result.hooksJsonPath).toBe(PROJECT_HOOKS_JSON);
    // HOME copy of core hooks backs the statusLine
    expect(fs.cpSync).toHaveBeenCalledWith(CORE, HOME_HOOKS_DIR, {
      recursive: true,
      force: true,
      dereference: true,
    });

    const writes = (fs.writeFileSync as unknown as ReturnType<typeof vi.fn>)
      .mock.calls;

    // hooks.json: official top-level map of NAME -> event config (no `hooks` wrapper).
    const hooksWrite = writes.find(
      (call: string[]) => call[0] === PROJECT_HOOKS_JSON,
    );
    expect(hooksWrite).toBeTruthy();
    const doc = JSON.parse(hooksWrite?.[1] as string);
    expect(doc.hooks).toBeUndefined();

    // lifecycle (PreInvocation): handler array directly, no matcher
    expect(doc["oma-keyword-detector"].PreInvocation[0]).toMatchObject({
      type: "command",
      command: `bun "${join(HOME_HOOKS_DIR, "keyword-detector.ts")}"`,
      timeout: 5,
    });
    expect(doc["oma-state-boundary"].PreInvocation[0].command).toBe(
      `bun "${join(HOME_HOOKS_DIR, "state-boundary.ts")}"`,
    );
    expect(doc["oma-skill-injector"].PreInvocation[0].command).toBe(
      `bun "${join(HOME_HOOKS_DIR, "skill-injector.ts")}"`,
    );

    // tool event (PreToolUse): { matcher, hooks: [handler] }
    expect(doc["oma-test-filter"].PreToolUse[0].matcher).toBe("run_command");
    expect(doc["oma-test-filter"].PreToolUse[0].hooks[0].command).toBe(
      `bun "${join(HOME_HOOKS_DIR, "test-filter.ts")}"`,
    );

    // lifecycle (Stop): handler array directly
    expect(doc["oma-persistent-mode"].Stop[0].command).toBe(
      `bun "${join(HOME_HOOKS_DIR, "persistent-mode.ts")}"`,
    );

    // settings.json: statusLine (HOME copy) only — agy strips hooks/defaultHooksPath.
    const settingsWrite = writes.find((call: string[]) => call[0] === SETTINGS);
    expect(settingsWrite).toBeTruthy();
    const settings = JSON.parse(settingsWrite?.[1] as string);
    expect(settings.statusLine.type).toBe("command");
    expect(settings.statusLine.command).toBe(
      `bun "${join(HOME_HOOKS_DIR, "hud.ts")}"`,
    );
    expect(settings.hooks).toBeUndefined();
    expect(settings.defaultHooksPath).toBeUndefined();
  });

  it("binds global hooks and native HUD to the custom OMA home", () => {
    const omaHome = "/custom OMA's $root";
    setInstallContext({ installRoot: omaHome, mode: "global" });
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      const value = String(path);
      return (
        value === AGY_DIR ||
        value.includes(".agents/hooks/core") ||
        value.endsWith(".agents/hooks/variants/antigravity.json")
      );
    });
    vi.mocked(fs.readFileSync).mockImplementation((path) =>
      String(path).endsWith(".agents/hooks/variants/antigravity.json")
        ? variantJson
        : "{}",
    );

    const result = installAntigravityHud(omaHome);

    expect(result.hooksJsonPath).toBe(join(omaHome, ".agents/hooks.json"));
    expect(fs.cpSync).toHaveBeenCalledWith(
      join(omaHome, ".agents/hooks/core"),
      HOME_HOOKS_DIR,
      { recursive: true, force: true, dereference: true },
    );
    const writes = vi.mocked(fs.writeFileSync).mock.calls;
    const handler = writes.find(
      ([path]) => path === join(HOME_HOOKS_DIR, "state-boundary.ts"),
    );
    expect(handler?.[1]).toContain(
      `env: { ...process.env, OMA_HOME: ${JSON.stringify(omaHome)} }`,
    );
    const settingsWrite = writes.find(([path]) => path === SETTINGS);
    const settings = JSON.parse(settingsWrite?.[1] as string);
    expect(settings.statusLine.command).toBe(
      `OMA_HOME='/custom OMA'\\''s $root' bun "${join(HOME_HOOKS_DIR, "hud.ts")}"`,
    );
    expect(
      writes.some(
        ([path]) =>
          path === join(omaHome, ".gemini/antigravity-cli/settings.json"),
      ),
    ).toBe(false);
  });

  it("preserves unrelated keys and removes the legacy settings.hooks key", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.endsWith(".gemini/antigravity-cli")) return true;
        if (norm === SETTINGS) return true;
        if (norm.includes(".agents/hooks/core")) return true;
        if (norm.includes(".agents/hooks/variants/antigravity.json"))
          return true;
        return false;
      },
    );
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) =>
        p === VARIANT
          ? variantJson
          : JSON.stringify({
              colorScheme: "tokyo night",
              enableTelemetry: false,
              toolPermission: "always-proceed",
              trustedWorkspaces: ["/repo"],
              // dead keys from a previous OMA install — both must be removed
              hooks: { PreInvocation: [{ hooks: [] }] },
              defaultHooksPath: "/stale/hooks.json",
            }),
    );

    installAntigravityHud("/repo");

    const writeCall = (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find(
      (call: string[]) => typeof call[0] === "string" && call[0] === SETTINGS,
    );
    const settings = JSON.parse(writeCall?.[1] as string);

    expect(settings.colorScheme).toBe("tokyo night");
    expect(settings.enableTelemetry).toBe(false);
    expect(settings.toolPermission).toBe("always-proceed");
    expect(settings.trustedWorkspaces).toEqual(["/repo"]);
    // HUD wired; dead settings.hooks + defaultHooksPath keys stripped
    expect(settings.statusLine).toBeDefined();
    expect(settings.hooks).toBeUndefined();
    expect(settings.defaultHooksPath).toBeUndefined();
  });

  // agy honors a top-level `enableTelemetry` boolean (verified present in real
  // installs and preserved across launches). oma manages it like the telemetry
  // opt-out it writes for Claude/Gemini/Qwen/Codex/Grok.
  describe("telemetry opt-out", () => {
    const mockAgyPresent = (settingsJson: string) => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) => {
          const norm = p.replace(/\\/g, "/");
          if (norm.endsWith(".gemini/antigravity-cli")) return true;
          if (norm === SETTINGS) return true;
          if (norm.includes(".agents/hooks/core")) return true;
          if (norm.includes(".agents/hooks/variants/antigravity.json"))
            return true;
          return false;
        },
      );
      (
        fs.readFileSync as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((p: string) =>
        p === VARIANT ? variantJson : settingsJson,
      );
    };
    const writtenSettings = () => {
      const call = (
        fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: string[]) => c[0] === SETTINGS);
      return JSON.parse(call?.[1] as string);
    };

    it("disables telemetry by default (no telemetry option)", () => {
      mockAgyPresent("{}");
      installAntigravityHud("/repo");
      expect(writtenSettings().enableTelemetry).toBe(false);
    });

    it("forces enableTelemetry:false even when the user had it true", () => {
      mockAgyPresent(JSON.stringify({ enableTelemetry: true }));
      installAntigravityHud("/repo", { telemetry: false });
      expect(writtenSettings().enableTelemetry).toBe(false);
    });

    it("opting in (telemetry:true) removes oma's enableTelemetry:false override", () => {
      mockAgyPresent(JSON.stringify({ enableTelemetry: false }));
      installAntigravityHud("/repo", { telemetry: true });
      expect("enableTelemetry" in writtenSettings()).toBe(false);
    });

    it("opting in leaves a user's explicit enableTelemetry:true intact", () => {
      mockAgyPresent(JSON.stringify({ enableTelemetry: true }));
      installAntigravityHud("/repo", { telemetry: true });
      expect(writtenSettings().enableTelemetry).toBe(true);
    });
  });

  // agy honors a top-level `showFeedbackSurvey` boolean (json:"…,omitempty" in
  // the binary) that gates the recurring "How's the CLI experience so far?"
  // prompt. oma rides it on the same opt-out lever as telemetry — survey
  // responses are feedback data.
  describe("feedback survey opt-out", () => {
    const mockAgyPresent = (settingsJson: string) => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) => {
          const norm = p.replace(/\\/g, "/");
          if (norm.endsWith(".gemini/antigravity-cli")) return true;
          if (norm === SETTINGS) return true;
          if (norm.includes(".agents/hooks/core")) return true;
          if (norm.includes(".agents/hooks/variants/antigravity.json"))
            return true;
          return false;
        },
      );
      (
        fs.readFileSync as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((p: string) =>
        p === VARIANT ? variantJson : settingsJson,
      );
    };
    const writtenSettings = () => {
      const call = (
        fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
      ).mock.calls.find((c: string[]) => c[0] === SETTINGS);
      return JSON.parse(call?.[1] as string);
    };

    it("disables the survey by default (no telemetry option)", () => {
      mockAgyPresent("{}");
      installAntigravityHud("/repo");
      expect(writtenSettings().showFeedbackSurvey).toBe(false);
    });

    it("forces showFeedbackSurvey:false even when the user had it true", () => {
      mockAgyPresent(JSON.stringify({ showFeedbackSurvey: true }));
      installAntigravityHud("/repo", { telemetry: false });
      expect(writtenSettings().showFeedbackSurvey).toBe(false);
    });

    it("opting in (telemetry:true) removes oma's showFeedbackSurvey:false override", () => {
      mockAgyPresent(JSON.stringify({ showFeedbackSurvey: false }));
      installAntigravityHud("/repo", { telemetry: true });
      expect("showFeedbackSurvey" in writtenSettings()).toBe(false);
    });

    it("opting in leaves a user's explicit showFeedbackSurvey:true intact", () => {
      mockAgyPresent(JSON.stringify({ showFeedbackSurvey: true }));
      installAntigravityHud("/repo", { telemetry: true });
      expect(writtenSettings().showFeedbackSurvey).toBe(true);
    });
  });

  it("is idempotent — second run produces the same settings", () => {
    (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => {
        const norm = p.replace(/\\/g, "/");
        if (norm.endsWith(".gemini/antigravity-cli")) return true;
        if (norm === SETTINGS) return true;
        if (norm.includes(".agents/hooks/core")) return true;
        if (norm.includes(".agents/hooks/variants/antigravity.json"))
          return true;
        return false;
      },
    );

    let snapshot = "{}";
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (p: string) => (p === SETTINGS ? snapshot : variantJson),
    );
    (
      fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation((p: string, content: string) => {
      if (p === SETTINGS) snapshot = content;
    });

    installAntigravityHud("/repo");
    const firstSnapshot = snapshot;
    installAntigravityHud("/repo");
    expect(snapshot).toBe(firstSnapshot);
  });

  describe("user-registered hooks are never destroyed", () => {
    const STALE_HOME_HOOKS = join(AGY_DIR, "hooks.json");

    function mockFsWith(opts: {
      projectHooksJson?: string;
      homeHooksJson?: string;
    }) {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) => {
          const norm = p.replace(/\\/g, "/");
          if (norm.endsWith(".gemini/antigravity-cli")) return true;
          if (norm.includes(".agents/hooks/core")) return true;
          if (norm.includes(".agents/hooks/variants/antigravity.json"))
            return true;
          if (norm === STALE_HOME_HOOKS)
            return opts.homeHooksJson !== undefined;
          if (norm === PROJECT_HOOKS_JSON)
            return opts.projectHooksJson !== undefined;
          return false;
        },
      );
      (
        fs.readFileSync as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation((p: string) => {
        const norm = String(p).replace(/\\/g, "/");
        if (norm.includes(".agents/hooks/variants/antigravity.json"))
          return variantJson;
        if (norm === PROJECT_HOOKS_JSON && opts.projectHooksJson !== undefined)
          return opts.projectHooksJson;
        if (norm === STALE_HOME_HOOKS && opts.homeHooksJson !== undefined)
          return opts.homeHooksJson;
        return "{}";
      });
    }

    function writtenProjectHooksDoc(): Record<string, unknown> {
      const call = (
        fs.writeFileSync as unknown as ReturnType<typeof vi.fn>
      ).mock.calls.find(([p]) => p === PROJECT_HOOKS_JSON);
      expect(call).toBeDefined();
      return JSON.parse(call?.[1] as string);
    }

    it("merges into .agents/hooks.json — user hooks survive, stale oma-* swept", () => {
      mockFsWith({
        projectHooksJson: JSON.stringify({
          "user-custom-hook": {
            PreInvocation: [{ type: "command", command: "whoami" }],
          },
          "oma-removed-handler": { PreInvocation: [] },
        }),
      });

      installAntigravityHud("/repo");

      const doc = writtenProjectHooksDoc();
      expect(doc["user-custom-hook"]).toEqual({
        PreInvocation: [{ type: "command", command: "whoami" }],
      });
      expect(doc["oma-removed-handler"]).toBeUndefined();
      expect(doc["oma-keyword-detector"]).toBeDefined();
    });

    it("leaves the HOME hooks.json alone when it holds user-registered hooks (agy /hooks UI writes there)", () => {
      mockFsWith({
        homeHooksJson: JSON.stringify({
          "user-custom-hook": {
            PreInvocation: [{ type: "command", command: "whoami" }],
          },
        }),
      });

      installAntigravityHud("/repo");

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("removes the HOME hooks.json only when it contains nothing but oma-* artifacts", () => {
      mockFsWith({
        homeHooksJson: JSON.stringify({
          "oma-keyword-detector": { PreInvocation: [] },
        }),
      });

      installAntigravityHud("/repo");

      expect(fs.unlinkSync).toHaveBeenCalledWith(STALE_HOME_HOOKS);
    });
  });
});
