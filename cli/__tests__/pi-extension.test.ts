import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  makeBlockOutput,
  makePreToolOutput,
  makePromptOutput,
} from "../../.agents/hooks/core/hook-output.ts";
import {
  installPiExtension,
  PI_EXTENSION_DIR,
} from "../platform/pi-extension-composer.js";
import { installPiPromptTemplates } from "../platform/pi-prompts.js";

const REPO_ROOT = join(__dirname, "../..");

describe("pi hook-output dialect", () => {
  it("makePromptOutput lifts context into additionalContext", () => {
    expect(makePromptOutput("pi", "CTX")).toBe(
      JSON.stringify({ additionalContext: "CTX" }),
    );
  });

  it("makePreToolOutput returns a bare updatedInput for in-place rewrite", () => {
    expect(makePreToolOutput("pi", { command: "x" })).toBe(
      JSON.stringify({ updatedInput: { command: "x" } }),
    );
  });

  it("makeBlockOutput mirrors pi's native tool_call block shape", () => {
    expect(makeBlockOutput("pi", "R")).toBe(
      JSON.stringify({ block: true, reason: "R" }),
    );
  });
});

describe("installPiExtension", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-pi-"));
  });

  afterAll(() => {
    // mkdtemp dirs are individually cleaned in each test body below.
  });

  it("materializes the bridge entry point and core scripts", () => {
    installPiExtension(REPO_ROOT, target);
    const extDir = join(target, PI_EXTENSION_DIR);

    for (const f of [
      "index.ts",
      "keyword-detector.ts",
      "skill-injector.ts",
      "test-filter.ts",
      "filter-test-output.sh",
      "triggers.json",
    ]) {
      expect(existsSync(join(extDir, f)), `missing ${f}`).toBe(true);
    }
    rmSync(target, { recursive: true, force: true });
  });

  it("is idempotent across repeated installs", () => {
    installPiExtension(REPO_ROOT, target);
    expect(() => installPiExtension(REPO_ROOT, target)).not.toThrow();
    expect(existsSync(join(target, PI_EXTENSION_DIR, "index.ts"))).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });
});

/**
 * End-to-end bridge wiring, isolated from `.agents/` by replacing the spawned
 * core scripts with deterministic fakes. This exercises the real bridge glue
 * (subprocess spawn → JSON parse → systemPrompt assembly / in-place command
 * rewrite) without depending on keyword config or mutating the repo.
 */
describe("installPiPromptTemplates", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-pi-prompts-"));
  });

  it("materializes workflow slash-command wrappers", () => {
    const written = installPiPromptTemplates(REPO_ROOT, target);
    const workPrompt = join(target, ".pi", "prompts", "work.md");
    expect(written).toContain(join(".pi", "prompts", "work.md"));
    expect(existsSync(workPrompt)).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });

  it("does not overwrite user-authored pi prompts", () => {
    const promptDir = join(target, ".pi", "prompts");
    const workPrompt = join(promptDir, "work.md");
    mkdirSync(promptDir, { recursive: true });
    writeFileSync(workPrompt, "custom user prompt");

    installPiPromptTemplates(REPO_ROOT, target);

    expect(readFileSync(workPrompt, "utf-8")).toBe("custom user prompt");
    rmSync(target, { recursive: true, force: true });
  });
});

describe("pi bridge handlers", () => {
  let target: string;
  let extDir: string;
  // biome-ignore lint/suspicious/noExplicitAny: test captures pi handlers
  let handlers: Record<string, any>;

  function fakeScript(json: object): string {
    return `console.log(${JSON.stringify(JSON.stringify(json))});\n`;
  }

  beforeEach(async () => {
    target = mkdtempSync(join(tmpdir(), "oma-pi-bridge-"));
    installPiExtension(REPO_ROOT, target);
    extDir = join(target, PI_EXTENSION_DIR);

    writeFileSync(
      join(extDir, "keyword-detector.ts"),
      fakeScript({ additionalContext: "[FAKE KD]" }),
    );
    writeFileSync(
      join(extDir, "skill-injector.ts"),
      fakeScript({ additionalContext: "[FAKE SI]" }),
    );
    writeFileSync(
      join(extDir, "test-filter.ts"),
      fakeScript({ updatedInput: { command: "FILTERED" } }),
    );

    // Reset the once-guard so the freshly imported module registers handlers.
    (globalThis as Record<string, unknown>).__OMA_PI_EXT_REGISTERED = undefined;

    handlers = {};
    const mod = await import(
      `${pathToFileURL(join(extDir, "index.ts")).href}?t=${target}`
    );
    mod.default({
      on: (event: string, handler: unknown) => {
        handlers[event] = handler;
      },
    });
  });

  it("before_agent_start appends keyword + skill context to the system prompt", async () => {
    const out = await handlers.before_agent_start({
      prompt: "anything",
      systemPrompt: "BASE",
    });
    expect(out).toEqual({ systemPrompt: "BASE\n\n[FAKE KD]\n\n[FAKE SI]" });
    rmSync(target, { recursive: true, force: true });
  });

  it("tool_call rewrites a bash command in place", async () => {
    const event = { toolName: "bash", input: { command: "bun run test" } };
    const out = await handlers.tool_call(event);
    expect(out).toBeUndefined();
    expect(event.input.command).toBe("FILTERED");
    rmSync(target, { recursive: true, force: true });
  });

  it("tool_call ignores non-bash tools", async () => {
    const event = { toolName: "edit", input: { command: "noop" } };
    await handlers.tool_call(event);
    expect(event.input.command).toBe("noop");
    rmSync(target, { recursive: true, force: true });
  });
});
