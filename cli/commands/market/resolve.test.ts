import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SkillsCliSpawn } from "../../platform/skill-install.js";
import {
  findEngine,
  LAST30DAYS_INSTALL_COMMAND,
  loadMarketConfig,
  marketConfigFrom,
  resolveMarketEngine,
  resolvePython,
  updateMarketEngine,
} from "./resolve.js";

function fakeEngine(root: string, version = "3.21.1"): void {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "last30days.py"), "# stub\n");
  fs.writeFileSync(
    path.join(root, "SKILL.md"),
    `---\nname: last30days\nversion: "${version}"\n---\n# stub\n`,
  );
}

const pyOk = (c: string) => (c === "python3.12" ? "3.12.4" : undefined);

describe("oma market engine resolution (last30days)", () => {
  let cwd: string;
  let home: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "oma-market-cwd-"));
    home = fs.mkdtempSync(path.join(os.tmpdir(), "oma-market-home-"));
  });
  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("defaults keep only save_dir and flag the retired managed keys", () => {
    const cfg = marketConfigFrom(undefined);
    expect(cfg.save_dir).toBe(path.join(".agents", "results", "market", "raw"));
    expect(cfg.deprecated).toEqual([]);
    expect(
      marketConfigFrom({ managed: false, channel: "main", path: "/x" }),
    ).toMatchObject({ path: "/x", deprecated: ["managed", "channel"] });
  });

  it("reads the market section from .agents/oma-config.yaml", () => {
    fs.mkdirSync(path.join(cwd, ".agents"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".agents", "oma-config.yaml"),
      "language: en\nmarket:\n  check_interval_min: 5\n  python: /opt/py/bin/python3\n",
    );
    const cfg = loadMarketConfig(cwd);
    expect(cfg.python).toBe("/opt/py/bin/python3");
    expect(cfg.deprecated).toEqual(["check_interval_min"]);
  });

  it("resolves an installed skill, but pins win", async () => {
    fakeEngine(path.join(home, ".agents", "skills", "last30days"), "3.21.1");
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      config: marketConfigFrom({ check_interval_min: 0 }),
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(res.ok).toBe(true);
    expect(res.engine?.source).toBe("home:~/.agents/skills");
    expect(res.engine?.skillMd).toBe(
      path.join(home, ".agents", "skills", "last30days", "SKILL.md"),
    );
    expect(res.python.path).toBe("python3.12");
    expect(res.warnings[0]).toContain("market.check_interval_min is ignored");

    const pin = path.join(home, "pin");
    fakeEngine(pin, "0.1.0");
    const pinned = await resolveMarketEngine({
      cwd,
      home,
      env: { LAST30DAYS_HOME: pin },
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(pinned.engine?.source).toBe("env:LAST30DAYS_HOME");
    expect(pinned.engine?.version).toBe("0.1.0");
  });

  it("finds a project install first, then the Claude plugin cache", () => {
    const cache = path.join(
      home,
      ".claude",
      "plugins",
      "cache",
      "last30days-skill",
      "last30days",
    );
    fakeEngine(path.join(cache, "3.9.0", "skills", "last30days"), "3.9.0");
    fakeEngine(path.join(cache, "3.10.0", "skills", "last30days"), "3.10.0");
    const res = findEngine({ cwd, home, env: {} });
    expect(res.install?.version).toBe("3.10.0");
    expect(res.install?.source).toBe("home:claude-plugin-cache:3.10.0");

    fakeEngine(path.join(cwd, ".agents", "skills", "last30days"), "3.5.0");
    expect(findEngine({ cwd, home, env: {} }).install?.source).toBe(
      "project:.agents/skills",
    );
  });

  it("is not ok when nothing is installed, naming the install command", async () => {
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("oma market update");
    expect(res.reason).toContain(LAST30DAYS_INSTALL_COMMAND);
    expect(LAST30DAYS_INSTALL_COMMAND).toBe(
      "bunx skills add mvanhorn/last30days-skill --skill last30days -g -y",
    );
  });

  describe("updateMarketEngine", () => {
    function spawnThatInstalls(into?: string) {
      const calls: string[][] = [];
      const spawn: SkillsCliSpawn = (args) => {
        calls.push(args);
        if (into) fakeEngine(into, "3.22.0");
        return { status: 0, stdout: "", stderr: "", error: undefined };
      };
      return { calls, spawn };
    }

    it("installs when missing", async () => {
      const dest = path.join(home, ".agents", "skills", "last30days");
      const { calls, spawn } = spawnThatInstalls(dest);
      const res = await updateMarketEngine({ cwd, home, env: {}, spawn });
      expect(calls[0]?.slice(0, 3)).toEqual([
        "skills",
        "add",
        "mvanhorn/last30days-skill",
      ]);
      expect(res.action).toBe("installed");
      expect(res.resolution.engine?.version).toBe("3.22.0");
    });

    it("updates an existing skill-dir install", async () => {
      fakeEngine(path.join(home, ".agents", "skills", "last30days"));
      const { calls, spawn } = spawnThatInstalls();
      const res = await updateMarketEngine({ cwd, home, env: {}, spawn });
      expect(calls[0]).toEqual(["skills", "update", "last30days", "-g", "-y"]);
      expect(res.action).toBe("updated");
    });

    it("leaves pins alone and reports skills CLI failures", async () => {
      const pin = path.join(home, "pin");
      fakeEngine(pin);
      const { calls, spawn } = spawnThatInstalls();
      const pinned = await updateMarketEngine({
        cwd,
        home,
        env: { LAST30DAYS_HOME: pin },
        spawn,
      });
      expect(pinned.action).toBe("skipped-pinned");
      expect(calls).toHaveLength(0);

      const failed = await updateMarketEngine({
        cwd,
        home,
        env: {},
        spawn: () => ({
          status: 1,
          stdout: "",
          stderr: "boom",
          error: undefined,
        }),
      });
      expect(failed.action).toBe("failed");
      expect(failed.detail).toContain("boom");
    });
  });

  it("is not ok when the engine exists but Python 3.12+ is missing", async () => {
    fakeEngine(path.join(cwd, ".agents", "skills", "last30days"));
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      pythonProbe: () => undefined,
      uvFind: () => undefined,
    });
    expect(res.ok).toBe(false);
    expect(res.engine).toBeDefined();
    expect(res.reason).toContain("Python 3.12+");
  });

  it("resolves Python: env pin → config → PATH ladder → uv", () => {
    const seen: string[] = [];
    const probe = (c: string) => {
      seen.push(c);
      return c === "/uv/py" ? "3.13.0" : undefined;
    };
    const res = resolvePython({
      env: { LAST30DAYS_PYTHON: "/pin/py" },
      configPython: "/cfg/py",
      probe,
      uvFind: () => "/uv/py",
    });
    expect(res.source).toBe("uv");
    expect(seen.slice(0, 2)).toEqual(["/pin/py", "/cfg/py"]);
    expect(seen).toContain("python3.12");

    const none = resolvePython({
      env: {},
      probe: () => undefined,
      uvFind: () => undefined,
    });
    expect(none.path).toBeUndefined();
    expect(none.hint).toContain("3.12");
  });
});
