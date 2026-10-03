import { EventEmitter } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateInput } from "../types.js";
import {
  buildCodexExecArgs,
  buildInstruction,
  CodexProvider,
  codexGeneratedImagesDir,
  parseCodexExecOutput,
} from "./codex.js";

const state = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: state.spawn }));

function baseInput(): Parameters<typeof buildInstruction>[0] {
  return {
    prompt: "a red apple",
    size: "1024x1024",
    quality: "high",
    n: 1,
    model: "gpt-image-2",
    outDir: "/tmp",
    signal: new AbortController().signal,
  };
}

function bareInput(outDir = "/tmp"): GenerateInput {
  return {
    prompt: "a red apple",
    size: "1024x1024",
    quality: "high",
    n: 1,
    outDir,
    signal: new AbortController().signal,
  };
}

describe("buildInstruction", () => {
  it("does not mention references when none provided", () => {
    const out = buildInstruction(baseInput());
    expect(out).not.toContain("Reference image");
    expect(out).toContain("a red apple");
    expect(out).toContain("gpt-image-2");
  });

  it("adds a reference hint when referenceImages present", () => {
    const out = buildInstruction({
      ...baseInput(),
      referenceImages: [
        { path: "/tmp/a.png", mime: "image/png" },
        { path: "/tmp/b.jpg", mime: "image/jpeg" },
      ],
    });
    expect(out).toContain("Reference images are attached (2)");
    expect(out).toContain(
      "match their style, subject identity, or composition",
    );
  });

  it("singular reference count also rendered correctly", () => {
    const out = buildInstruction({
      ...baseInput(),
      referenceImages: [{ path: "/tmp/solo.png", mime: "image/png" }],
    });
    expect(out).toContain("Reference images are attached (1)");
  });
});

describe("buildCodexExecArgs", () => {
  it("always emits -- separator before instruction (no references)", () => {
    const args = buildCodexExecArgs(bareInput(), "some instruction");
    expect(args).toEqual([
      "exec",
      "--json",
      "--skip-git-repo-check",
      "--",
      "some instruction",
    ]);
    const dashIdx = args.indexOf("--");
    const instrIdx = args.indexOf("some instruction");
    expect(dashIdx).toBeGreaterThanOrEqual(0);
    expect(dashIdx).toBe(instrIdx - 1);
  });

  it("emits -i per reference and still terminates with -- before instruction", () => {
    const args = buildCodexExecArgs(
      {
        ...bareInput(),
        referenceImages: [
          { path: "/tmp/a.png", mime: "image/png" },
          { path: "/tmp/b.jpg", mime: "image/jpeg" },
        ],
      },
      "prompt text",
    );
    expect(args).toEqual([
      "exec",
      "--json",
      "--skip-git-repo-check",
      "-i",
      "/tmp/a.png",
      "-i",
      "/tmp/b.jpg",
      "--",
      "prompt text",
    ]);
  });

  it("-- is always the arg immediately before the instruction", () => {
    // Regression guard: variadic -i would otherwise consume the prompt.
    for (const refs of [
      [],
      [{ path: "/a.png", mime: "image/png" as const }],
      [
        { path: "/a.png", mime: "image/png" as const },
        { path: "/b.png", mime: "image/png" as const },
        { path: "/c.png", mime: "image/png" as const },
      ],
    ]) {
      const args = buildCodexExecArgs(
        { ...bareInput(), referenceImages: refs },
        "PROMPT",
      );
      expect(args[args.length - 2]).toBe("--");
      expect(args[args.length - 1]).toBe("PROMPT");
    }
  });
});

describe("codexGeneratedImagesDir", () => {
  it("follows CODEX_HOME and falls back to ~/.codex", () => {
    const fallback = path.join(os.homedir(), ".codex", "generated_images");
    expect(codexGeneratedImagesDir({ CODEX_HOME: "/orca/home" })).toBe(
      path.join("/orca/home", "generated_images"),
    );
    expect(codexGeneratedImagesDir({ CODEX_HOME: "  " })).toBe(fallback);
    expect(codexGeneratedImagesDir({})).toBe(fallback);
  });
});

describe("parseCodexExecOutput", () => {
  it("skips non-JSON lines and path-unsafe thread ids", () => {
    expect(
      parseCodexExecOutput(
        'Reading prompt...\n{"type":"thread.started","thread_id":"../escape"}\n',
      ).threadId,
    ).toBeUndefined();
  });
});

const THREAD = "01a0ff07-040d-7c21-bde4-43c736961b13";
const OTHER_THREAD = "01a0ff07-9994-7fa2-b667-11bd74d83c58";

function jsonl(...events: object[]): string {
  return events.map((e) => `${JSON.stringify(e)}\n`).join("");
}

describe("CodexProvider.generate", () => {
  let tmp: string;
  let codexHome: string;
  let outDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-codex-image-"));
    codexHome = path.join(tmp, "codex-home");
    outDir = path.join(tmp, "out");
    mkdirSync(outDir);
    vi.stubEnv("CODEX_HOME", codexHome);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    state.spawn.mockReset();
    rmSync(tmp, { recursive: true, force: true });
  });

  function saveImage(threadId: string, name: string, bytes: string): void {
    const dir = path.join(codexHome, "generated_images", threadId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, name), bytes);
  }

  // Stands in for `codex exec`: `act` saves images the way Codex does, then
  // the run prints `stdout` and exits with `code`.
  function fakeCodexRun(stdout: string, act = () => {}, code = 0): void {
    state.spawn.mockImplementation(() => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: vi.fn(),
      });
      queueMicrotask(() => {
        act();
        child.stdout.emit("data", Buffer.from(stdout));
        child.emit("close", code, null);
      });
      return child;
    });
  }

  async function failure(input: GenerateInput): Promise<string> {
    const err = await new CodexProvider().generate(input).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toMatchObject({ kind: "other" });
    return (err as { cause: Error }).cause.message;
  }

  function contents(files: { filePath: string }[]): string[] {
    return files.map((f) => readFileSync(f.filePath, "utf8"));
  }

  it("copies the run's image from CODEX_HOME instead of ~/.codex", async () => {
    fakeCodexRun(jsonl({ type: "thread.started", thread_id: THREAD }), () =>
      saveImage(THREAD, "exec-own.png", "own"),
    );

    const results = await new CodexProvider().generate(bareInput(outDir));

    expect(contents(results)).toEqual(["own"]);
    expect(results.every((r) => path.dirname(r.filePath) === outDir)).toBe(
      true,
    );
  });

  it("ignores images that concurrent codex runs save meanwhile", async () => {
    fakeCodexRun(jsonl({ type: "thread.started", thread_id: THREAD }), () => {
      saveImage(THREAD, "exec-own.png", "own");
      saveImage(OTHER_THREAD, "exec-other.png", "other");
    });

    // n: 2 leaves room for the other run's image, so a folder-wide diff
    // would return it.
    const results = await new CodexProvider().generate({
      ...bareInput(outDir),
      n: 2,
    });

    expect(contents(results)).toEqual(["own"]);
  });

  it("falls back to the folder diff when codex reports no thread id", async () => {
    saveImage(OTHER_THREAD, "exec-old.png", "old");
    fakeCodexRun("plain text reply\n", () =>
      saveImage(THREAD, "exec-new.png", "new"),
    );

    const results = await new CodexProvider().generate(bareInput(outDir));

    expect(contents(results)).toEqual(["new"]);
  });

  it("names the searched folder and the codex reply when no image is saved", async () => {
    fakeCodexRun(
      jsonl(
        { type: "thread.started", thread_id: THREAD },
        {
          type: "item.completed",
          item: { id: "item_1", type: "agent_message", text: "No tool." },
        },
      ),
    );

    const message = await failure(bareInput(outDir));

    expect(message).toContain(path.join(codexHome, "generated_images", THREAD));
    expect(message).toContain("No tool.");
  });

  it("reports the turn failure rather than the config warnings before it", async () => {
    const warning = `Codex is ignoring 2 unrecognized configuration settings. ${"x".repeat(400)}`;
    fakeCodexRun(
      jsonl(
        { type: "thread.started", thread_id: THREAD },
        { type: "item.completed", item: { type: "error", message: warning } },
        {
          type: "turn.failed",
          error: { message: "The 'gpt-x' model is not supported." },
        },
      ),
      undefined,
      1,
    );

    expect(await failure(bareInput(outDir))).toBe(
      "The 'gpt-x' model is not supported.",
    );
  });
});
