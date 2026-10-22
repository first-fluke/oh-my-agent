import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.hoisted(() => vi.fn());
const promptState = vi.hoisted(() => ({
  confirm: vi.fn(),
  isCancel: vi.fn((value: unknown) => typeof value === "symbol"),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}));

vi.mock("node:child_process", () => ({ execFileSync }));
vi.mock("@clack/prompts", () => promptState);

import { promptUninstallCompetitors } from "./competitors.js";

function writeFixture(root: string, path: string, content = "keep"): string {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

describe("promptUninstallCompetitors", () => {
  let tempRoot: string;
  let home: string;
  let project: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempRoot = mkdtempSync(join(tmpdir(), "oma-competitor-"));
    home = join(tempRoot, "home");
    project = join(tempRoot, "project");
    mkdirSync(home);
    mkdirSync(project);
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    execFileSync.mockReset().mockImplementation(() => {
      throw new Error("not installed globally");
    });
    promptState.confirm.mockReset().mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("does not prompt when no other tools are detected", async () => {
    expect(await promptUninstallCompetitors(project)).toEqual([]);
    expect(promptState.confirm).not.toHaveBeenCalled();
    expect(promptState.spinner).not.toHaveBeenCalled();
  });

  it.each([false, Symbol("cancel")])(
    "preserves project files when confirmation returns %s",
    async (answer) => {
      const omc = writeFixture(project, ".omc/config.json");
      const omx = writeFixture(project, ".omx/state.json");
      promptState.confirm.mockImplementation(async () => {
        // Detection must not delete files while waiting for an answer.
        expect(readFileSync(omc, "utf-8")).toBe("keep");
        expect(readFileSync(omx, "utf-8")).toBe("keep");
        return answer;
      });

      expect(await promptUninstallCompetitors(project)).toEqual([]);

      expect(promptState.confirm).toHaveBeenCalledWith({
        message: expect.stringMatching(
          /oh-my-claudecode \(project files\).*oh-my-codex \(project files\).*Uninstall/,
        ),
        initialValue: false,
      });
      expect(existsSync(omc)).toBe(true);
      expect(existsSync(omx)).toBe(true);
      expect(promptState.spinner).not.toHaveBeenCalled();
      expect(execFileSync).not.toHaveBeenCalledWith(
        "npx",
        expect.anything(),
        expect.anything(),
      );
    },
  );

  it.each([".omc", ".omx"])(
    "prompts for %s when it is the only detected tool",
    async (directory) => {
      const file = writeFixture(project, `${directory}/state.json`);

      await promptUninstallCompetitors(project);

      expect(promptState.confirm).toHaveBeenCalledTimes(1);
      expect(existsSync(file)).toBe(true);
    },
  );

  it("removes approved project files without touching unrelated global or OMA files", async () => {
    writeFixture(project, ".omc/config.json");
    writeFixture(project, ".omx/state.json");
    const oma = writeFixture(project, ".agents/oma-config.yaml");
    const agent = writeFixture(home, ".claude/agents/architect.md");
    const command = writeFixture(home, ".claude/commands/plan.md");
    const claude = writeFixture(home, ".claude/CLAUDE.md", "User instructions");
    promptState.confirm.mockResolvedValue(true);

    const actions = await promptUninstallCompetitors(project);

    expect(actions).toEqual([
      "oh-my-claudecode (project files) removed",
      "oh-my-codex (project files) removed",
    ]);
    expect(existsSync(join(project, ".omc"))).toBe(false);
    expect(existsSync(join(project, ".omx"))).toBe(false);
    for (const path of [oma, agent, command]) {
      expect(readFileSync(path, "utf-8")).toBe("keep");
    }
    expect(readFileSync(claude, "utf-8")).toBe("User instructions");
    expect(execFileSync).not.toHaveBeenCalledWith(
      "npx",
      expect.anything(),
      expect.anything(),
    );
  });

  it.each([false, Symbol("cancel")])(
    "preserves global tools and settings when confirmation returns %s",
    async (answer) => {
      const fixtures = [
        writeFixture(
          home,
          ".claude/CLAUDE.md",
          "<!-- OMC:START -->\nOMC\n<!-- OMC:END -->",
        ),
        writeFixture(home, ".claude/agents/architect.md"),
        writeFixture(
          home,
          ".config/opencode/opencode.json",
          '{"plugin":["oh-my-opencode","other"]}',
        ),
        writeFixture(home, ".agents/skills/superpowers/SKILL.md"),
        writeFixture(home, ".codex/superpowers/README.md"),
      ];
      const originals = fixtures.map((path) => readFileSync(path, "utf-8"));
      execFileSync.mockReturnValue(Buffer.from("oh-my-codex"));
      promptState.confirm.mockResolvedValue(answer);

      expect(await promptUninstallCompetitors(project)).toEqual([]);

      expect(promptState.confirm).toHaveBeenCalledWith({
        message: expect.stringMatching(
          /oh-my-claudecode.*oh-my-opencode.*superpowers.*oh-my-codex.*Uninstall/,
        ),
        initialValue: false,
      });
      expect(fixtures.map((path) => readFileSync(path, "utf-8"))).toEqual(
        originals,
      );
      expect(execFileSync).not.toHaveBeenCalledWith(
        "npx",
        expect.anything(),
        expect.anything(),
      );
    },
  );

  it("uninstalls detected global tools only after explicit confirmation", async () => {
    const claude = writeFixture(
      home,
      ".claude/CLAUDE.md",
      "User instructions\n<!-- OMC:START -->\nOMC\n<!-- OMC:END -->\n",
    );
    const agent = writeFixture(home, ".claude/agents/architect.md");
    const otherAgent = writeFixture(home, ".claude/agents/custom.md");
    const router = writeFixture(
      home,
      ".claude/skills/ultrawork/SKILL.md",
      "See .agents/workflows/ultrawork.md",
    );
    const settings = writeFixture(
      home,
      ".claude/settings.json",
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              hooks: [
                { command: "keyword-detector.sh" },
                { command: "custom.sh" },
              ],
            },
          ],
        },
        custom: true,
      }),
    );
    const opencode = writeFixture(
      home,
      ".config/opencode/opencode.json",
      '{"plugin":["oh-my-opencode","other"],"model":"keep"}',
    );
    writeFixture(home, ".agents/skills/superpowers/SKILL.md");
    writeFixture(home, ".codex/superpowers/README.md");
    writeFixture(project, ".omc/state.json");
    writeFixture(project, ".omx/state.json");
    execFileSync.mockReturnValue(Buffer.from("oh-my-codex"));
    promptState.confirm.mockImplementation(async () => {
      expect(existsSync(agent)).toBe(true);
      expect(execFileSync).toHaveBeenCalledTimes(1);
      return true;
    });

    expect(await promptUninstallCompetitors(project)).toEqual([
      "oh-my-claudecode removed",
      "oh-my-opencode removed",
      "superpowers removed",
      "oh-my-codex removed",
    ]);

    expect(existsSync(agent)).toBe(false);
    expect(readFileSync(claude, "utf-8")).toBe("User instructions\n");
    expect(readFileSync(otherAgent, "utf-8")).toBe("keep");
    expect(readFileSync(router, "utf-8")).toContain(".agents/workflows/");
    expect(JSON.parse(readFileSync(settings, "utf-8"))).toEqual({
      hooks: { PreToolUse: [{ hooks: [{ command: "custom.sh" }] }] },
      custom: true,
    });
    expect(JSON.parse(readFileSync(opencode, "utf-8"))).toEqual({
      plugin: ["other"],
      model: "keep",
    });
    expect(existsSync(join(home, ".agents/skills/superpowers"))).toBe(false);
    expect(existsSync(join(home, ".codex/superpowers"))).toBe(false);
    expect(existsSync(join(project, ".omc"))).toBe(false);
    expect(existsSync(join(project, ".omx"))).toBe(false);
    expect(execFileSync).toHaveBeenCalledWith(
      "npx",
      ["oh-my-codex@latest", "uninstall", "--yes"],
      { cwd: project, stdio: "pipe", timeout: 60_000 },
    );
  });

  it("reports a failed uninstall without deleting that tool's project files", async () => {
    const state = writeFixture(project, ".omx/state.json");
    execFileSync.mockImplementation((command: string) => {
      if (command === "npx") throw new Error("uninstall failed");
      return Buffer.from("oh-my-codex");
    });
    promptState.confirm.mockResolvedValue(true);

    expect(await promptUninstallCompetitors(project)).toEqual([
      "oh-my-codex removal failed: uninstall failed",
    ]);
    expect(readFileSync(state, "utf-8")).toBe("keep");
  });
});
