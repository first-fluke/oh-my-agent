import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOOK_DEDUP_TTL_MS,
  type HookDelivery,
  hookDeliveryKey,
  resolveHookDedupDir,
  shouldDispatchHookDelivery,
} from "./dedup.js";

let root: string;
let dir: string;
const PROJECT_WRAPPER = "/project/.claude/hooks/oma-hook.sh";
const GLOBAL_WRAPPER = "/home/user/.claude/hooks/oma-hook.sh";

function preTool(command: string, toolUseId: string, wrapper?: string) {
  return {
    vendor: "claude",
    nativeEvent: "PreToolUse",
    wrapper,
    rawStdin: JSON.stringify({
      session_id: "s1",
      tool_name: "Bash",
      tool_use_id: toolUseId,
      tool_input: { command },
    }),
  } satisfies HookDelivery;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-hook-dedup-test-"));
  dir = join(root, "claims");
  mkdirSync(dir);
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("shouldDispatchHookDelivery", () => {
  it("keeps the winning claim when an earlier clock sample resumes after another wrapper publishes", () => {
    const winner = preTool("git add .env", "toolu_race", PROJECT_WRAPPER);
    const delayed = { ...winner, wrapper: GLOBAL_WRAPPER };
    let winnerDispatched = false;
    vi.spyOn(Date, "now")
      .mockImplementationOnce(() => {
        // B sampled 100, paused, and A sampled 101 and published first.
        const captured = 100;
        winnerDispatched = shouldDispatchHookDelivery(winner, {
          dir,
          now: 101,
        });
        return captured;
      })
      .mockReturnValue(102);

    expect(shouldDispatchHookDelivery(delayed, { dir })).toBe(false);
    expect(winnerDispatched).toBe(true);
    expect(
      JSON.parse(readFileSync(join(dir, hookDeliveryKey(winner)), "utf8")),
    ).toEqual({ wrapper: PROJECT_WRAPPER, at: 101 });
  });

  it("keeps a fresh claim across a small clock rollback with an injected clock", () => {
    const delivery = preTool("git add .env", "toolu_rollback", PROJECT_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 101 })).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: 100 },
      ),
    ).toBe(false);
  });

  it("checks expiry after reading the winning claim and refreshes the retry timestamp", () => {
    const winner = preTool(
      "git add .env",
      "toolu_delayed_expiry",
      PROJECT_WRAPPER,
    );
    expect(shouldDispatchHookDelivery(winner, { dir, now: 101 })).toBe(true);
    vi.spyOn(Date, "now").mockReturnValueOnce(100).mockReturnValue(10_000);

    expect(
      shouldDispatchHookDelivery(
        { ...winner, wrapper: GLOBAL_WRAPPER },
        { dir },
      ),
    ).toBe(true);
    expect(
      JSON.parse(readFileSync(join(dir, hookDeliveryKey(winner)), "utf8")),
    ).toEqual({ wrapper: GLOBAL_WRAPPER, at: 10_000 });
  });

  it("does not trust a future timestamp outside the configured TTL", () => {
    const delivery = preTool("git add .env", "toolu_future", PROJECT_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 101 })).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: 100, ttlMs: 1 },
      ),
    ).toBe(true);
  });
  it("dispatches distinct tool calls fired together, even from different wrappers", () => {
    const now = 1_000_000;
    expect(
      shouldDispatchHookDelivery(
        preTool("git add README.md", "toolu_1", PROJECT_WRAPPER),
        { dir, now },
      ),
    ).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        preTool("git add .env", "toolu_2", PROJECT_WRAPPER),
        { dir, now },
      ),
    ).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        preTool("git add .env", "toolu_2b", GLOBAL_WRAPPER),
        { dir, now },
      ),
    ).toBe(true);
  });

  it("drops the second registration's identical delivery within the TTL", () => {
    const delivery = preTool("git add .env", "toolu_1", PROJECT_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 5_000 })).toBe(
      true,
    );
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: 5_100 },
      ),
    ).toBe(false);
  });

  it("dedups regardless of which registration claims first or its matcher", () => {
    const delivery = preTool("ls", "toolu_1", GLOBAL_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 0 })).toBe(true);
    // The key ignores the registration matcher, so mixed oma versions with
    // different matcher unions still recognize one tool call.
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: PROJECT_WRAPPER },
        { dir, now: 10 },
      ),
    ).toBe(false);
  });

  it("never drops a repeat from the same wrapper (e.g. a second Stop)", () => {
    const stop = {
      vendor: "claude",
      nativeEvent: "Stop",
      wrapper: PROJECT_WRAPPER,
      rawStdin: JSON.stringify({ session_id: "s1", stop_hook_active: true }),
    } satisfies HookDelivery;
    expect(shouldDispatchHookDelivery(stop, { dir, now: 0 })).toBe(true);
    expect(shouldDispatchHookDelivery(stop, { dir, now: 200 })).toBe(true);
    expect(shouldDispatchHookDelivery(stop, { dir, now: 400 })).toBe(true);
  });

  it("restarts the window on a same-wrapper repeat so its duplicate is still caught", () => {
    const delivery = preTool("git status", "toolu_1", PROJECT_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 0 })).toBe(true);
    expect(
      shouldDispatchHookDelivery(delivery, {
        dir,
        now: HOOK_DEDUP_TTL_MS - 100,
      }),
    ).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: HOOK_DEDUP_TTL_MS + 500 },
      ),
    ).toBe(false);
  });

  it("dispatches an identical payload again once the claim has expired", () => {
    const delivery = preTool("git status", "toolu_1", PROJECT_WRAPPER);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 0 })).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: HOOK_DEDUP_TTL_MS + 1 },
      ),
    ).toBe(true);
  });

  it("never dedups without a wrapper identity or without a payload", () => {
    const anonymous = preTool("git add .env", "toolu_1");
    expect(shouldDispatchHookDelivery(anonymous, { dir, now: 0 })).toBe(true);
    expect(shouldDispatchHookDelivery(anonymous, { dir, now: 1 })).toBe(true);

    const empty = { ...anonymous, rawStdin: "  ", wrapper: PROJECT_WRAPPER };
    expect(shouldDispatchHookDelivery(empty, { dir, now: 0 })).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...empty, wrapper: GLOBAL_WRAPPER },
        { dir, now: 1 },
      ),
    ).toBe(true);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("fails open when the claim store cannot be used", () => {
    const blocker = join(root, "not-a-dir");
    writeFileSync(blocker, "x");
    const delivery = preTool("git add .env", "toolu_1", PROJECT_WRAPPER);
    const unusable = { dir: join(blocker, "claims"), now: 0 };
    expect(shouldDispatchHookDelivery(delivery, unusable)).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        unusable,
      ),
    ).toBe(true);
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir: null, now: 0 },
      ),
    ).toBe(true);
  });

  it("replaces an unreadable claim instead of trusting it", () => {
    const delivery = preTool("git status", "toolu_1", PROJECT_WRAPPER);
    writeFileSync(join(dir, hookDeliveryKey(delivery)), "{corrupt");
    expect(
      shouldDispatchHookDelivery(
        { ...delivery, wrapper: GLOBAL_WRAPPER },
        { dir, now: 0 },
      ),
    ).toBe(true);
    expect(shouldDispatchHookDelivery(delivery, { dir, now: 10 })).toBe(false);
  });

  it("sweeps claims older than a minute", () => {
    const stale = join(dir, "f".repeat(64));
    writeFileSync(stale, "{}");
    const old = new Date(Date.now() - 120_000);
    utimesSync(stale, old, old);
    expect(
      shouldDispatchHookDelivery(preTool("ls", "toolu_1", PROJECT_WRAPPER), {
        dir,
      }),
    ).toBe(true);
    expect(existsSync(stale)).toBe(false);
    expect(readdirSync(dir)).toHaveLength(1);
  });
});

describe("resolveHookDedupDir", () => {
  it("creates a private directory at OMA_HOOK_DEDUP_DIR", () => {
    const target = join(root, "fresh");
    expect(resolveHookDedupDir({ OMA_HOOK_DEDUP_DIR: target })).toBe(target);
    if (process.platform !== "win32") {
      expect(statSync(target).mode & 0o777).toBe(0o700);
    }
  });

  it("is disabled by OMA_HOOK_DEDUP=0", () => {
    expect(
      resolveHookDedupDir({
        OMA_HOOK_DEDUP: "0",
        OMA_HOOK_DEDUP_DIR: join(root, "off"),
      }),
    ).toBeNull();
    expect(existsSync(join(root, "off"))).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "refuses a symlinked claim directory",
    () => {
      const real = join(root, "real");
      mkdirSync(real, { mode: 0o700 });
      const link = join(root, "link");
      symlinkSync(real, link);
      expect(resolveHookDedupDir({ OMA_HOOK_DEDUP_DIR: link })).toBeNull();
    },
  );
});
