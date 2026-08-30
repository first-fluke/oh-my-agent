import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findEngine,
  loadMarketConfig,
  marketConfigFrom,
  resolveMarketEngine,
  resolvePython,
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

  it("defaults are managed/stable/60min and tolerate a malformed section", () => {
    const cfg = marketConfigFrom(undefined);
    expect(cfg.managed).toBe(true);
    expect(cfg.channel).toBe("stable");
    expect(cfg.check_interval_min).toBe(60);
    expect(cfg.save_dir).toBe(path.join(".agents", "results", "market", "raw"));
    expect(
      marketConfigFrom({ channel: "bogus", check_interval_min: -1 }),
    ).toMatchObject({
      channel: "stable",
      check_interval_min: 60,
    });
  });

  it("reads the market section from .agents/oma-config.yaml", () => {
    fs.mkdirSync(path.join(cwd, ".agents"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".agents", "oma-config.yaml"),
      "language: en\nmarket:\n  channel: main\n  python: /opt/py/bin/python3\n",
    );
    const cfg = loadMarketConfig(cwd);
    expect(cfg.channel).toBe("main");
    expect(cfg.python).toBe("/opt/py/bin/python3");
  });

  it("prefers the managed latest copy over skill dirs, but not over pins", async () => {
    fakeEngine(path.join(home, ".claude", "skills", "last30days"), "3.0.0");
    const managedRoot = path.join(home, "managed", "v3.21.1");
    fakeEngine(managedRoot, "3.21.1");
    const managed = async () => ({
      root: managedRoot,
      entry: path.join(managedRoot, "scripts", "last30days.py"),
      ref: "v3.21.1",
      version: "3.21.1",
      status: "current" as const,
    });
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      managed,
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(res.ok).toBe(true);
    expect(res.engine?.source).toBe("managed:v3.21.1");
    expect(res.engine?.skillMd).toBe(path.join(managedRoot, "SKILL.md"));
    expect(res.python.path).toBe("python3.12");

    const pin = path.join(home, "pin");
    fakeEngine(pin, "0.1.0");
    const pinned = await resolveMarketEngine({
      cwd,
      home,
      env: { LAST30DAYS_HOME: pin },
      managed,
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(pinned.engine?.source).toBe("env:LAST30DAYS_HOME");
    expect(pinned.engine?.version).toBe("0.1.0");
  });

  it("falls back to a skill dir or the Claude plugin cache when managed yields nothing", async () => {
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
    const res = await findEngine({
      cwd,
      home,
      env: {},
      managed: async () => undefined,
    });
    expect(res.install?.version).toBe("3.10.0");
    expect(res.install?.source).toBe("home:claude-plugin-cache:3.10.0");

    fakeEngine(path.join(cwd, ".agents", "skills", "last30days"), "3.5.0");
    const local = await findEngine({
      cwd,
      home,
      env: {},
      managed: async () => undefined,
    });
    expect(local.install?.source).toBe("project:.agents/skills");
  });

  it("is not ok when no engine resolves, with an update hint", async () => {
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      managed: null,
      pythonProbe: pyOk,
      uvFind: () => undefined,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("oma market update");
  });

  it("is not ok when the engine exists but Python 3.12+ is missing", async () => {
    fakeEngine(path.join(cwd, ".agents", "skills", "last30days"));
    const res = await resolveMarketEngine({
      cwd,
      home,
      env: {},
      managed: null,
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
