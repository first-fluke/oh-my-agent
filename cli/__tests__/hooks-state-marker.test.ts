import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimActiveSession,
  defaultIndex,
  getActiveSid,
  indexPath,
  readIndex,
  setActiveSession,
  setLastSession,
  updateIndex,
} from "../../.agents/hooks/core/state-marker.ts";

const STATE_MARKER_PATH = fileURLToPath(
  new URL("../../.agents/hooks/core/state-marker.ts", import.meta.url),
);
const KEYWORD_DETECTOR_PATH = fileURLToPath(
  new URL("../../.agents/hooks/core/keyword-detector.ts", import.meta.url),
);

/** Run a writer module in a real bun subprocess; resolve with its exit code. */
function runWriter(scriptPath: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    // Explicit "bun" (repo convention): vitest workers may run under node,
    // which cannot import the TypeScript hook modules directly.
    const child = spawn("bun", [scriptPath, ...args], {
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? -1));
  });
}

describe("hook state-marker", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-state-marker-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns a default index when none exists", () => {
    expect(readIndex(projectDir)).toEqual(defaultIndex());
  });

  it("writes and reads the active map and last marker", () => {
    setActiveSession(projectDir, "main", "oma-1");
    setLastSession(projectDir, "claude", "claude-session-1");
    const index = readIndex(projectDir);
    expect(index.active.main).toBe("oma-1");
    expect(index.lastSession).toMatchObject({
      vendor: "claude",
      vendorSid: "claude-session-1",
    });
  });

  it("falls back to main when a category is absent", () => {
    setActiveSession(projectDir, "main", "oma-main");
    const index = readIndex(projectDir);
    expect(getActiveSid(index, "tool.deepsec")).toBe("oma-main");
    expect(getActiveSid(index, "main")).toBe("oma-main");
  });

  it("runs mutate exactly once under the lock and persists the result", () => {
    setActiveSession(projectDir, "main", "seed");
    let calls = 0;
    const result = updateIndex(projectDir, (index) => {
      index.active.main = "oma-updated";
      calls += 1;
    });
    expect(calls).toBe(1);
    expect(result.active.main).toBe("oma-updated");
    expect(readIndex(projectDir).active.main).toBe("oma-updated");
    // The lock is released after the update.
    expect(existsSync(`${indexPath(projectDir)}.lock`)).toBe(false);
  });

  // Lock acquisition/recovery semantics (dead-owner reclaim, timeout) are
  // covered by the upstream state-index-lock suite; the index-level guarantees
  // (single mutate, no lost updates, quarantine) are tested here.

  it("quarantines a corrupt index instead of silently discarding it", () => {
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockReturnValue(true as unknown as boolean);
    const path = indexPath(projectDir);
    setActiveSession(projectDir, "main", "seed");
    writeFileSync(path, "{corrupt!!!");

    expect(readIndex(projectDir)).toEqual(defaultIndex());
    expect(existsSync(path)).toBe(false);
    const sessionsRoot = dirname(path);
    const quarantined = readdirSync(sessionsRoot).filter((name) =>
      name.startsWith("_index.json.corrupt-"),
    );
    expect(quarantined).toHaveLength(1);
    expect(
      readFileSync(join(sessionsRoot, quarantined[0] as string), "utf-8"),
    ).toBe("{corrupt!!!");
    const messages = stderr.mock.calls.map((call) => String(call[0])).join("");
    expect(messages).toContain("quarantined");
  });

  it("concurrent processes do not lose active entries (M12 lost-update regression)", async () => {
    const writerPath = join(projectDir, "writer.mjs");
    writeFileSync(
      writerPath,
      `import { setActiveSession } from ${JSON.stringify(STATE_MARKER_PATH)};\n` +
        `const [dir, prefix] = process.argv.slice(2);\n` +
        `for (let i = 0; i < 8; i++) setActiveSession(dir, prefix + "-" + i, "sid-" + prefix + "-" + i);\n`,
    );
    const prefixes = ["w1", "w2", "w3", "w4"];
    const codes = await Promise.all(
      prefixes.map((prefix) => runWriter(writerPath, [projectDir, prefix])),
    );
    expect(codes).toEqual([0, 0, 0, 0]);

    const index = readIndex(projectDir);
    for (const prefix of prefixes) {
      for (let i = 0; i < 8; i++) {
        expect(index.active[`${prefix}-${i}`]).toBe(`sid-${prefix}-${i}`);
      }
    }
    expect(existsSync(`${indexPath(projectDir)}.lock`)).toBe(false);
  });

  it("keeps the index file valid JSON after concurrent-style updates", () => {
    setActiveSession(projectDir, "main", "a");
    setActiveSession(projectDir, "tool.recap", "b");
    expect(existsSync(indexPath(projectDir))).toBe(true);
    expect(() =>
      JSON.parse(readFileSync(indexPath(projectDir), "utf-8")),
    ).not.toThrow();
    expect(statSync(indexPath(projectDir)).isFile()).toBe(true);
  });
});

describe("claimActiveSession — active-pointer no-stomp (M12c)", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-claim-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("claims an empty slot", () => {
    const claimed = claimActiveSession(projectDir, "main", "oma-a", () => true);
    expect(claimed).toBe(true);
    expect(readIndex(projectDir).active.main).toBe("oma-a");
  });

  it("does NOT overwrite a live different session's pointer", () => {
    setActiveSession(projectDir, "main", "oma-live");
    const seen: string[] = [];
    const claimed = claimActiveSession(projectDir, "main", "oma-b", (sid) => {
      seen.push(sid);
      return true; // existing session is live
    });
    expect(claimed).toBe(false);
    expect(seen).toEqual(["oma-live"]);
    expect(readIndex(projectDir).active.main).toBe("oma-live");
  });

  it("claims over a stale (ended/crashed) session's pointer", () => {
    setActiveSession(projectDir, "main", "oma-dead");
    const claimed = claimActiveSession(
      projectDir,
      "main",
      "oma-b",
      () => false, // existing session ended or went stale
    );
    expect(claimed).toBe(true);
    expect(readIndex(projectDir).active.main).toBe("oma-b");
  });

  it("is idempotent for the same sid", () => {
    setActiveSession(projectDir, "main", "oma-a");
    const claimed = claimActiveSession(projectDir, "main", "oma-a", () => true);
    expect(claimed).toBe(true);
    expect(readIndex(projectDir).active.main).toBe("oma-a");
  });

  it("claims per category without touching main", () => {
    setActiveSession(projectDir, "main", "oma-main");
    const claimed = claimActiveSession(
      projectDir,
      "tool.recap",
      "oma-recap",
      () => true,
    );
    expect(claimed).toBe(true);
    const index = readIndex(projectDir);
    expect(index.active.main).toBe("oma-main");
    expect(index.active["tool.recap"]).toBe("oma-recap");
  });
});

describe("keyword-detector kw-state locking (M12)", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-kw-lock-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("updateKwState merges sequential records under the lock", async () => {
    const { loadKwState, recordKwTrigger, updateKwState } = await import(
      "../../.agents/hooks/core/keyword-detector.ts"
    );
    updateKwState(projectDir, (s) => recordKwTrigger(s, "work"));
    updateKwState(projectDir, (s) => recordKwTrigger(s, "ralph"));
    const state = loadKwState(projectDir);
    expect(state.triggers.work?.count).toBe(1);
    expect(state.triggers.ralph?.count).toBe(1);
    const kwPath = join(
      projectDir,
      ".agents",
      "state",
      "keyword-detector-state.json",
    );
    expect(existsSync(`${kwPath}.lock`)).toBe(false);
  });

  it("concurrent processes do not lose trigger records", async () => {
    const writerPath = join(projectDir, "kw-writer.mjs");
    writeFileSync(
      writerPath,
      `import { updateKwState, recordKwTrigger } from ${JSON.stringify(KEYWORD_DETECTOR_PATH)};\n` +
        `const [dir, prefix] = process.argv.slice(2);\n` +
        `for (let i = 0; i < 6; i++) updateKwState(dir, (s) => recordKwTrigger(s, prefix + "-" + i));\n`,
    );
    const prefixes = ["k1", "k2", "k3", "k4"];
    const codes = await Promise.all(
      prefixes.map((prefix) => runWriter(writerPath, [projectDir, prefix])),
    );
    expect(codes).toEqual([0, 0, 0, 0]);

    const { loadKwState } = await import(
      "../../.agents/hooks/core/keyword-detector.ts"
    );
    const state = loadKwState(projectDir);
    for (const prefix of prefixes) {
      for (let i = 0; i < 6; i++) {
        expect(state.triggers[`${prefix}-${i}`]?.count).toBe(1);
      }
    }
  });
});
