import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectCompatHost,
  hostHasOmaHooks,
  shouldYieldToHostRegistration,
} from "./foreign-host.js";

let project: string;
let home: string;

function write(root: string, rel: string, content: string): void {
  const path = join(root, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

const GROK_ENV = { GROK_HOOK_EVENT: "user_prompt_submit" };
const grokHooks = `{"hooks":{"UserPromptSubmit":[{"hooks":[{"command":"bash .grok/hooks/oma-hook.sh --vendor 'grok' --event 'UserPromptSubmit'"}]}]}}`;
const cursorHooks = `{"version":1,"hooks":{"beforeSubmitPrompt":[{"command":"bash .cursor/hooks/oma-hook.sh --vendor 'cursor' --event 'beforeSubmitPrompt'"}]}}`;

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "oma-foreign-project-"));
  home = mkdtempSync(join(tmpdir(), "oma-foreign-home-"));
  mkdirSync(join(project, ".git"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
  rmSync(home, { recursive: true, force: true });
});

describe("detectCompatHost", () => {
  it("identifies Grok by its runner-injected env and Cursor by its payload", () => {
    expect(detectCompatHost({}, GROK_ENV)).toBe("grok");
    expect(detectCompatHost({ cursor_version: "2026.10.22" }, {})).toBe(
      "cursor",
    );
    expect(detectCompatHost({ session_id: "s" }, {})).toBeNull();
  });
});

describe("hostHasOmaHooks", () => {
  it("finds the host's own oma registration in the project or home", () => {
    expect(hostHasOmaHooks("grok", project, home)).toBe(false);
    write(home, ".grok/hooks/oma-hooks.json", grokHooks);
    expect(hostHasOmaHooks("grok", project, home)).toBe(true);
    write(project, ".cursor/hooks.json", cursorHooks);
    expect(hostHasOmaHooks("cursor", project, home)).toBe(true);
  });

  it("ignores a hook file without an oma registration for that host", () => {
    write(project, ".cursor/hooks.json", `{"version":1,"hooks":{}}`);
    expect(hostHasOmaHooks("cursor", project, home)).toBe(false);
  });
});

describe("shouldYieldToHostRegistration", () => {
  const claudePrompt = (cwd: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ hook_event_name: "UserPromptSubmit", cwd, ...extra });

  it("drops a Claude hook Grok loaded when Grok has its own oma hooks", () => {
    write(project, ".grok/hooks/oma-hooks.json", grokHooks);
    expect(
      shouldYieldToHostRegistration({
        vendor: "claude",
        rawStdin: claudePrompt(project),
        cwd: project,
        env: GROK_ENV,
        home,
      }),
    ).toBe(true);
  });

  it("drops a Cursor hook Grok loaded, and a Claude hook Cursor loaded", () => {
    write(project, ".grok/hooks/oma-hooks.json", grokHooks);
    write(project, ".cursor/hooks.json", cursorHooks);
    expect(
      shouldYieldToHostRegistration({
        vendor: "cursor",
        rawStdin: claudePrompt(project),
        cwd: project,
        env: GROK_ENV,
        home,
      }),
    ).toBe(true);
    expect(
      shouldYieldToHostRegistration({
        vendor: "claude",
        rawStdin: claudePrompt(project, {
          cursor_version: "2026.10.22",
          workspace_roots: [project],
        }),
        cwd: project,
        env: {},
        home,
      }),
    ).toBe(true);
  });

  it("keeps the foreign registration when the host has no oma hooks of its own", () => {
    expect(
      shouldYieldToHostRegistration({
        vendor: "claude",
        rawStdin: claudePrompt(project),
        cwd: project,
        env: GROK_ENV,
        home,
      }),
    ).toBe(false);
  });

  it("never drops the host's own registration or a non-compat host", () => {
    write(project, ".grok/hooks/oma-hooks.json", grokHooks);
    expect(
      shouldYieldToHostRegistration({
        vendor: "grok",
        rawStdin: claudePrompt(project),
        cwd: project,
        env: GROK_ENV,
        home,
      }),
    ).toBe(false);
    expect(
      shouldYieldToHostRegistration({
        vendor: "claude",
        rawStdin: claudePrompt(project),
        cwd: project,
        env: {},
        home,
      }),
    ).toBe(false);
  });

  it("fails open on a malformed payload", () => {
    expect(
      shouldYieldToHostRegistration({
        vendor: "claude",
        rawStdin: "{not json",
        cwd: project,
        env: GROK_ENV,
        home,
      }),
    ).toBe(false);
  });
});
