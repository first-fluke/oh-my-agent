import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../..");
const hooksRoot = join(repoRoot, ".agents", "hooks", "core");

type Vendor = "antigravity" | "claude" | "codex" | "cursor" | "qwen";
type CloseReopenVendor = Extract<
  Vendor,
  "claude" | "codex" | "cursor" | "qwen"
>;

function runHook(
  hook: string,
  input: Record<string, unknown>,
  env: Record<string, string>,
): string {
  return execFileSync("bun", [join(hooksRoot, hook)], {
    cwd: repoRoot,
    input: JSON.stringify(input),
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
}

function expectPromptOutput(vendor: Vendor, raw: string): void {
  expect(raw.trim()).not.toBe("");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  if (vendor === "claude") {
    expect(parsed.additionalContext).toEqual(expect.any(String));
    return;
  }

  if (vendor === "antigravity") {
    // agy injects via PreInvocation injectSteps[].ephemeralMessage (official contract)
    const steps = parsed.injectSteps as
      | Array<Record<string, unknown>>
      | undefined;
    expect(steps?.[0]?.ephemeralMessage).toEqual(expect.any(String));
    return;
  }

  if (vendor === "cursor") {
    expect(parsed.additionalContext).toEqual(expect.any(String));
    expect(parsed.additional_context).toEqual(expect.any(String));
    return;
  }

  const hookSpecificOutput = parsed.hookSpecificOutput as
    | Record<string, unknown>
    | undefined;
  expect(hookSpecificOutput?.additionalContext).toEqual(expect.any(String));
  expect(hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
}

function getAdditionalContext(vendor: Vendor, raw: string): string {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (vendor === "claude") {
    return parsed.additionalContext as string;
  }
  if (vendor === "antigravity") {
    const steps = parsed.injectSteps as Array<Record<string, unknown>>;
    return steps[0]?.ephemeralMessage as string;
  }
  if (vendor === "cursor") {
    return parsed.additionalContext as string;
  }
  const hookSpecificOutput = parsed.hookSpecificOutput as Record<
    string,
    unknown
  >;
  return hookSpecificOutput.additionalContext as string;
}

function readIndex(projectDir: string): { active: Record<string, string> } {
  return JSON.parse(
    readFileSync(
      join(projectDir, ".agents", "state", "sessions", "_index.json"),
      "utf-8",
    ),
  );
}

function readEvents(
  projectDir: string,
  sid: string,
): Record<string, unknown>[] {
  const path = join(
    projectDir,
    ".agents",
    "state",
    "sessions",
    sid,
    "events.jsonl",
  );
  return readFileSync(path, "utf-8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("L1 hook vendor probe", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-l1-vendor-probe-"));
    execFileSync("git", ["init", "--quiet", "-b", "main"], {
      cwd: projectDir,
      stdio: "ignore",
    });
    writeFileSync(join(projectDir, ".gitignore"), ".agents/state/\n", "utf-8");
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function makeCase(vendor: Vendor): {
    input: Record<string, unknown>;
    env: Record<string, string>;
  } {
    const prompt = "work";
    switch (vendor) {
      case "antigravity":
        return {
          input: {
            hook_event_name: "PreInvocation",
            sessionId: "agy-session-1",
            cwd: projectDir,
            prompt,
          },
          env: { ANTIGRAVITY_PROJECT_DIR: projectDir },
        };
      case "claude":
        return {
          input: {
            hook_event_name: "UserPromptSubmit",
            sessionId: "claude-session-1",
            prompt,
          },
          env: { CLAUDE_PROJECT_DIR: projectDir },
        };
      case "codex":
        return {
          input: {
            hook_event_name: "UserPromptSubmit",
            session_id: "codex-session-1",
            cwd: projectDir,
            prompt,
          },
          env: {},
        };
      case "cursor":
        return {
          input: {
            hook_event_name: "beforeSubmitPrompt",
            sessionId: "cursor-session-1",
            cwd: projectDir,
            prompt,
          },
          env: {},
        };
      case "qwen":
        return {
          input: {
            hook_event_name: "UserPromptSubmit",
            sessionId: "qwen-session-1",
            prompt,
          },
          env: { QWEN_PROJECT_DIR: projectDir },
        };
    }
  }

  it.each<Vendor>([
    "antigravity",
    "claude",
    "codex",
    "cursor",
    "qwen",
  ])("%s runs keyword-detector -> state-boundary and records L1 events", (vendor) => {
    const { input, env } = makeCase(vendor);
    const keywordOutput = runHook("keyword-detector.ts", input, env);
    expectPromptOutput(vendor, keywordOutput);

    const boundaryOutput = runHook("state-boundary.ts", input, env);
    expectPromptOutput(vendor, boundaryOutput);

    const skillOutput = runHook("skill-injector.ts", input, env);
    if (skillOutput.trim()) expectPromptOutput(vendor, skillOutput);

    const index = readIndex(projectDir);
    const sid = index.active.main;
    expect(sid).toMatch(/^oma-/);
    if (!sid) throw new Error("expected active main sid");

    const events = readEvents(projectDir, sid);
    expect(events.map((event) => event.kind)).toEqual([
      "session.created",
      "boundary",
    ]);
    expect(events[0]).toMatchObject({
      sid,
      kind: "session.created",
      vendor,
    });
    expect(events[1]).toMatchObject({
      sid,
      kind: "boundary",
      vendor,
    });
    expect(
      existsSync(
        join(projectDir, ".agents", "state", "sessions", sid, "meta.json"),
      ),
    ).toBe(true);
  });

  it.each<CloseReopenVendor>([
    "claude",
    "codex",
    "cursor",
    "qwen",
  ])("%s close-reopen keeps the OMA sid and flushes an L1-only snapshot", (vendor) => {
    const caseByVendor = {
      claude: {
        env: { CLAUDE_PROJECT_DIR: projectDir },
        firstInput: {
          hook_event_name: "UserPromptSubmit",
          sessionId: "claude-session-1",
          prompt: "work",
        },
        reopenedInput: {
          hook_event_name: "UserPromptSubmit",
          sessionId: "claude-session-2",
          prompt: "continue",
        },
        firstVendorSid: "claude-session-1",
        reopenedVendorSid: "claude-session-2",
      },
      codex: {
        env: {},
        firstInput: {
          hook_event_name: "UserPromptSubmit",
          session_id: "codex-session-1",
          cwd: projectDir,
          prompt: "work",
        },
        reopenedInput: {
          hook_event_name: "UserPromptSubmit",
          session_id: "codex-session-2",
          cwd: projectDir,
          prompt: "continue",
        },
        firstVendorSid: "codex-session-1",
        reopenedVendorSid: "codex-session-2",
      },
      cursor: {
        env: {},
        firstInput: {
          hook_event_name: "beforeSubmitPrompt",
          sessionId: "cursor-session-1",
          cwd: projectDir,
          prompt: "work",
        },
        reopenedInput: {
          hook_event_name: "beforeSubmitPrompt",
          sessionId: "cursor-session-2",
          cwd: projectDir,
          prompt: "continue",
        },
        firstVendorSid: "cursor-session-1",
        reopenedVendorSid: "cursor-session-2",
      },
      qwen: {
        env: { QWEN_PROJECT_DIR: projectDir },
        firstInput: {
          hook_event_name: "UserPromptSubmit",
          sessionId: "qwen-session-1",
          prompt: "work",
        },
        reopenedInput: {
          hook_event_name: "UserPromptSubmit",
          sessionId: "qwen-session-2",
          prompt: "continue",
        },
        firstVendorSid: "qwen-session-1",
        reopenedVendorSid: "qwen-session-2",
      },
    } satisfies Record<
      CloseReopenVendor,
      {
        env: Record<string, string>;
        firstInput: Record<string, unknown>;
        reopenedInput: Record<string, unknown>;
        firstVendorSid: string;
        reopenedVendorSid: string;
      }
    >;
    const {
      env,
      firstInput,
      reopenedInput,
      firstVendorSid,
      reopenedVendorSid,
    } = caseByVendor[vendor];

    expectPromptOutput(vendor, runHook("keyword-detector.ts", firstInput, env));
    expectPromptOutput(vendor, runHook("state-boundary.ts", firstInput, env));

    const firstIndex = readIndex(projectDir);
    const sid = firstIndex.active.main;
    expect(sid).toMatch(/^oma-/);
    if (!sid) throw new Error("expected active main sid");

    const reopenedOutput = runHook("state-boundary.ts", reopenedInput, env);
    expectPromptOutput(vendor, reopenedOutput);
    const additionalContext = getAdditionalContext(vendor, reopenedOutput);
    expect(additionalContext).toContain("[OMA STATE SNAPSHOT]");
    expect(additionalContext).toContain(`sid: ${sid}`);
    expect(additionalContext).toContain("boundary");

    const reopenedIndex = readIndex(projectDir);
    expect(reopenedIndex.active.main).toBe(sid);

    const events = readEvents(projectDir, sid);
    expect(events.map((event) => event.kind)).toEqual([
      "session.created",
      "boundary",
      "boundary",
    ]);
    expect(events[2]).toMatchObject({
      sid,
      kind: "boundary",
      vendor,
      vendorSid: reopenedVendorSid,
      payload: {
        reason: "vendor-session-transition",
        fromVendor: vendor,
        fromVendorSid: firstVendorSid,
        toVendor: vendor,
        toVendorSid: reopenedVendorSid,
        previousSid: sid,
      },
    });
  });
});
