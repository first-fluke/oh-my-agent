import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { safeParseJson } from "../../../utils/safe-json.js";
import type { ImageConfig } from "../config.js";
import { buildOutputFilename, shortId } from "../naming.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  VendorError,
  VendorProvider,
} from "../types.js";

// Codex saves image_gen output under $CODEX_HOME/generated_images/<thread id>/.
// Launchers such as Orca point CODEX_HOME at a per-account home, so ~/.codex
// is only the fallback.
export function codexGeneratedImagesDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const home = env.CODEX_HOME?.trim() || path.join(os.homedir(), ".codex");
  return path.join(home, "generated_images");
}

export class CodexProvider implements VendorProvider {
  readonly name = "codex";

  constructor(private config?: ImageConfig) {}

  async health(): Promise<HealthResult> {
    const hasBinary = await checkBinary("codex", ["--version"]);
    if (!hasBinary.ok) {
      return {
        ok: false,
        reason: "not-installed",
        hint: "Install Codex CLI",
        setup: {
          steps: [
            "bun install --global @openai/codex",
            "codex login",
            "No API key needed — ChatGPT subscription covers image generation.",
          ],
        },
      };
    }
    const loginCheck = await runCapture("codex", ["login", "status"]);
    if (
      loginCheck.code !== 0 ||
      !/Logged in/i.test(loginCheck.stdout + loginCheck.stderr)
    ) {
      return {
        ok: false,
        reason: "not-authenticated",
        hint: "Not logged in",
        setup: {
          steps: [
            "codex login",
            "Opens browser for ChatGPT OAuth.",
            "Verify with: codex login status",
          ],
        },
      };
    }
    return {
      ok: true,
      supportedModels: ["gpt-image-2"],
      estimatedCostPerImage: { low: 0.02, medium: 0.03, high: 0.04 },
      detail: "Codex CLI OAuth",
    };
  }

  async generate(input: GenerateInput): Promise<GenerateResult[]> {
    const model =
      input.model ?? this.config?.vendors.codex?.model ?? "gpt-image-2";
    const generatedDir = codexGeneratedImagesDir();
    const existingBefore = await listGenerated(generatedDir);
    const instruction = buildInstruction({ ...input, model });

    const start = Date.now();
    const res = await runCapture(
      "codex",
      buildCodexExecArgs(input, instruction),
      input.signal,
      (input.timeoutSec ?? 180) * 1000,
    );
    const durationMs = Date.now() - start;

    if (res.code !== 0) throw classifyCodexError(res);

    // Each run saves into a folder named after its thread, so concurrent runs
    // never claim each other's images. The folder-wide diff covers a Codex
    // that does not report its thread id.
    const output = parseCodexExecOutput(res.stdout);
    const searchedDir = output.threadId
      ? path.join(generatedDir, output.threadId)
      : generatedDir;
    const newFiles = output.threadId
      ? await listImages(searchedDir)
      : (await listGenerated(generatedDir)).filter(
          (f) => !existingBefore.includes(f),
        );
    if (newFiles.length === 0) {
      const reply = output.reply ?? res.stdout;
      const err: VendorError = {
        kind: "other",
        cause: new Error(
          `No image produced in ${searchedDir}. Codex reply: ${reply.slice(0, 400)}`,
        ),
      };
      throw err;
    }
    const files = newFiles.slice(0, input.n);
    const results: GenerateResult[] = [];
    const runShortid = input.runShortid ?? shortId();
    for (let i = 0; i < files.length; i += 1) {
      const src = files[i];
      if (!src) continue;
      const dstName = buildOutputFilename({
        vendor: this.name,
        model,
        runShortid,
        index: i,
        total: files.length,
        ext: "png",
      });
      const dst = path.join(input.outDir, dstName);
      await copyFile(src, dst);
      results.push({
        vendor: this.name,
        model,
        strategy: "codex-exec-oauth",
        strategyAttempts: [
          {
            strategy: "codex-exec-oauth",
            status: "ok",
            duration_ms: Math.round(durationMs / files.length),
          },
        ],
        filePath: dst,
        mime: "image/png",
        durationMs,
        costUsd:
          this.config?.costGuardrail.perImageUsd.codex?.[model]?.[
            input.quality
          ] ?? undefined,
      });
    }
    return results;
  }
}

// Assemble the full `codex exec` argv. `--json` makes Codex print its thread
// id, which names the folder its images land in. `codex exec` declares
// `-i/--image <FILE>...` as variadic, so its parser would greedily consume
// the following positional [PROMPT] as an additional image path. We always
// emit `--` before the instruction so the prompt is delimited
// unambiguously, even when no references are attached.
export function buildCodexExecArgs(
  input: GenerateInput,
  instruction: string,
): string[] {
  const imageArgs = (input.referenceImages ?? []).flatMap((r) => [
    "-i",
    r.path,
  ]);
  return [
    "exec",
    "--json",
    "--skip-git-repo-check",
    ...imageArgs,
    "--",
    instruction,
  ];
}

interface CodexExecEvent {
  type?: unknown;
  thread_id?: unknown;
  message?: unknown;
  item?: { type?: unknown; text?: unknown } | null;
  error?: { message?: unknown } | null;
}

export interface CodexExecOutput {
  threadId?: string;
  reply?: string;
  failure?: string;
}

// Reads the JSONL events of `codex exec --json`. Lines that are not JSON
// events are skipped, so plain-text output parses as an empty result.
export function parseCodexExecOutput(stdout: string): CodexExecOutput {
  const output: CodexExecOutput = {};
  for (const line of stdout.split("\n")) {
    const event = safeParseJson(line) as CodexExecEvent | null;
    switch (event?.type) {
      case "thread.started":
        // The id names a folder, so reject anything that could escape it.
        if (
          typeof event.thread_id === "string" &&
          /^[\w-]+$/.test(event.thread_id)
        ) {
          output.threadId ??= event.thread_id;
        }
        break;
      case "item.completed":
        if (
          event.item?.type === "agent_message" &&
          typeof event.item.text === "string"
        ) {
          output.reply = event.item.text;
        }
        break;
      case "error":
        if (typeof event.message === "string") output.failure = event.message;
        break;
      case "turn.failed":
        if (typeof event.error?.message === "string") {
          output.failure = event.error.message;
        }
        break;
    }
  }
  return output;
}

export function buildInstruction(
  input: GenerateInput & { model: string },
): string {
  const sizeHint = input.size === "auto" ? "" : ` Size: ${input.size}.`;
  const qualityHint =
    input.quality === "auto" ? "" : ` Quality: ${input.quality}.`;
  const n = input.n === 1 ? "one image" : `${input.n} images`;
  const refs = input.referenceImages ?? [];
  const refHint =
    refs.length > 0
      ? `\nReference images are attached (${refs.length}). Use them as visual references — match their style, subject identity, or composition as described in the prompt.`
      : "";
  return (
    `Generate ${n} with the image_gen tool using model ${input.model}.${sizeHint}${qualityHint}${refHint}\n` +
    `Prompt: ${input.prompt}\n` +
    "Do not create, modify, or save any files in the working directory. Do not attempt to write text files, scripts, or notes. Only invoke the image_gen tool and return."
  );
}

async function listGenerated(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const sessions = await readdir(dir).catch(() => []);
  const files: string[] = [];
  for (const s of sessions) {
    const sdir = path.join(dir, s);
    const st = await stat(sdir).catch(() => null);
    if (!st?.isDirectory()) continue;
    files.push(...(await listImages(sdir)));
  }
  return files;
}

async function listImages(dir: string): Promise<string[]> {
  const entries: string[] = await readdir(dir).catch(() => []);
  return entries
    .filter((e) => /\.(png|webp|jpe?g)$/i.test(e))
    .map((e) => path.join(dir, e));
}

function checkBinary(
  bin: string,
  args: string[],
): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout?.on("data", (c: Buffer) => {
      out += c.toString();
    });
    child.on("error", () => resolve({ ok: false, detail: "not found" }));
    child.on("close", (code: number | null) =>
      resolve(
        code === 0
          ? { ok: true, detail: out.trim() }
          : { ok: false, detail: `exit ${code}` },
      ),
    );
  });
}

interface Captured {
  code: number;
  stdout: string;
  stderr: string;
  signal?: NodeJS.Signals | null;
  timedOut?: boolean;
}

export interface RunCaptureOptions {
  cwd?: string;
}

export function runCapture(
  bin: string,
  args: string[],
  signal?: AbortSignal,
  timeoutMs?: number,
  options?: RunCaptureOptions,
): Promise<Captured> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal,
      cwd: options?.cwd,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    const timer = timeoutMs
      ? setTimeout(() => {
          child.stdout?.destroy();
          child.stderr?.destroy();
          child.kill("SIGTERM");
          resolve({ code: 124, stdout, stderr, timedOut: true });
        }, timeoutMs)
      : null;
    timer?.unref?.();
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({
        code: 1,
        stdout,
        stderr: stderr || (err as Error).message,
      });
    });
    child.on("close", (code, sig) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, signal: sig });
    });
  });
}

function classifyCodexError(res: Captured): VendorError {
  const blob = `${res.stdout}\n${res.stderr}`.toLowerCase();
  // `codex exec --json` prints config warnings before the turn failure, so a
  // prefix of the raw output can miss the cause.
  const detail = (parseCodexExecOutput(res.stdout).failure ?? blob).slice(
    0,
    400,
  );
  if (res.timedOut) return { kind: "timeout", after_ms: 0 };
  if (/not.?logged.?in|login/.test(blob)) {
    return { kind: "auth-required", hint: "Run: codex login" };
  }
  if (/content.?policy|safety|refus/.test(blob)) {
    return { kind: "safety-refused", message: detail };
  }
  if (/rate[- ]?limit|429/.test(blob)) {
    return { kind: "rate-limit" };
  }
  return { kind: "other", cause: new Error(detail) };
}
