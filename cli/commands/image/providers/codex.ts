import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ImageConfig } from "../config.js";
import { buildOutputFilename, shortId } from "../naming.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  VendorError,
  VendorProvider,
} from "../types.js";

const GENERATED_DIR = path.join(os.homedir(), ".codex", "generated_images");

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
    const existingBefore = await listGenerated(GENERATED_DIR);
    const instruction = buildInstruction({ ...input, model });

    const imageArgs = (input.referenceImages ?? []).flatMap((r) => [
      "-i",
      r.path,
    ]);
    const start = Date.now();
    const res = await runCapture(
      "codex",
      ["exec", "--skip-git-repo-check", ...imageArgs, instruction],
      input.signal,
      (input.timeoutSec ?? 180) * 1000,
    );
    const durationMs = Date.now() - start;

    if (res.code !== 0) throw classifyCodexError(res);

    const afterFiles = await listGenerated(GENERATED_DIR);
    const newFiles = afterFiles.filter((f) => !existingBefore.includes(f));
    if (newFiles.length === 0) {
      const err: VendorError = {
        kind: "other",
        cause: new Error(
          `No image produced. stdout: ${res.stdout.slice(0, 400)}`,
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
    const entries = await readdir(sdir).catch(() => []);
    for (const e of entries) {
      if (/\.(png|webp|jpe?g)$/i.test(e)) files.push(path.join(sdir, e));
    }
  }
  return files;
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

export function runCapture(
  bin: string,
  args: string[],
  signal?: AbortSignal,
  timeoutMs?: number,
): Promise<Captured> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      signal,
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
  if (res.timedOut) return { kind: "timeout", after_ms: 0 };
  if (/not.?logged.?in|login/.test(blob)) {
    return { kind: "auth-required", hint: "Run: codex login" };
  }
  if (/content.?policy|safety|refus/.test(blob)) {
    return { kind: "safety-refused", message: blob.slice(0, 400) };
  }
  if (/rate[- ]?limit|429/.test(blob)) {
    return { kind: "rate-limit" };
  }
  return { kind: "other", cause: new Error(blob.slice(0, 400)) };
}
