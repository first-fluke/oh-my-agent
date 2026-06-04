import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  stat,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildOutputFilename, shortId } from "../naming.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  ImageMime,
  ReferenceImage,
  VendorError,
  VendorProvider,
} from "../types.js";
import { runCapture } from "./codex.js";

export class AntigravityProvider implements VendorProvider {
  readonly name = "antigravity";

  async health(): Promise<HealthResult> {
    const versionCheck = await runCapture("agy", ["--version"]);
    if (versionCheck.code !== 0) {
      return {
        ok: false,
        reason: "not-installed",
        hint: "Install Antigravity CLI (agy)",
        setup: {
          url: "https://antigravity.google",
          steps: [
            "Install Antigravity from https://antigravity.google",
            "Run: agy install",
            "Sign in to Antigravity (Gemini Code Assist account).",
            "Verify with: agy --version",
          ],
        },
      };
    }
    return {
      ok: true,
      supportedModels: [],
      estimatedCostPerImage: { auto: 0 },
      detail: `Antigravity CLI ${versionCheck.stdout.trim() || "unknown"} (model selected by agy)`,
    };
  }

  async generate(input: GenerateInput): Promise<GenerateResult[]> {
    const runShortid = input.runShortid ?? shortId();

    await mkdir(input.outDir, { recursive: true });

    // Pre-compute target paths. The placeholder ".img" extension is rewritten
    // to .png/.jpg/.webp/.gif after sniffing magic bytes — agy's image tool
    // currently returns JPEG regardless of the requested extension.
    const targets = Array.from({ length: input.n }, (_, i) =>
      path.join(
        input.outDir,
        buildOutputFilename({
          vendor: this.name,
          runShortid,
          index: i,
          total: input.n,
          ext: "img",
        }),
      ),
    );

    const refs = await prepareReferenceDir(input.referenceImages ?? []);
    const instruction = buildInstruction({
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      n: input.n,
      targets,
      refPaths: refs?.refPaths ?? [],
    });

    const timeoutMs = (input.timeoutSec ?? 180) * 1000;
    const args = [
      "--dangerously-skip-permissions",
      "--add-dir",
      input.outDir,
      "--print-timeout",
      `${Math.ceil(timeoutMs / 1000)}s`,
    ];
    if (refs) args.push("--add-dir", refs.dir);
    args.push("-p", instruction);

    const start = Date.now();
    // Force cwd to outDir so agy doesn't pick up a "recently active workspace"
    // (e.g., the project we ran `oma image` from) and confuse its agent loop
    // with that workspace's CLAUDE.md / docs / test commands.
    const res = await runCapture("agy", args, input.signal, timeoutMs, {
      cwd: input.outDir,
    });
    const durationMs = Date.now() - start;

    if (res.timedOut)
      throw { kind: "timeout", after_ms: timeoutMs } as VendorError;
    if (res.code !== 0) throw classifyAgyError(res);

    const replyKind = classifyReplyKeyword(res.stdout);
    if (replyKind) throw replyKind;

    const results: GenerateResult[] = [];
    for (let i = 0; i < targets.length; i += 1) {
      const src = targets[i] as string;
      const st = await stat(src).catch(() => null);
      if (!st || st.size === 0) {
        throw {
          kind: "other",
          cause: new Error(
            `agy did not produce image[${i}] at ${src}. stdout: ${res.stdout.slice(0, 400)}`,
          ),
        } as VendorError;
      }
      const { ext, mime } = await detectImageFormat(src);
      const finalPath = src.replace(/\.img$/, `.${ext}`);
      if (finalPath !== src) await rename(src, finalPath);
      results.push({
        vendor: this.name,
        model: "agy-internal",
        strategy: "agy-print",
        strategyAttempts: [
          {
            strategy: "agy-print",
            status: "ok",
            duration_ms: Math.round(durationMs / targets.length),
          },
        ],
        filePath: finalPath,
        mime,
        durationMs,
      });
    }
    return results;
  }
}

export async function detectImageFormat(
  filePath: string,
): Promise<{ ext: "png" | "jpg" | "webp" | "gif"; mime: ImageMime }> {
  const buf = await readFile(filePath);
  return sniffImageFormat(buf);
}

export function sniffImageFormat(buf: Buffer): {
  ext: "png" | "jpg" | "webp" | "gif";
  mime: ImageMime;
} {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return { ext: "gif", mime: "image/gif" };
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  // Default: Gemini image surfaces typically emit JPEG. Fall back rather than
  // misclassify, but keep the JPEG bias documented for forensics.
  return { ext: "jpg", mime: "image/jpeg" };
}

async function prepareReferenceDir(
  refs: readonly ReferenceImage[],
): Promise<{ dir: string; refPaths: string[] } | null> {
  if (refs.length === 0) return null;
  const dir = await mkdtemp(path.join(os.tmpdir(), "oma-agy-refs-"));
  const refPaths: string[] = [];
  for (let i = 0; i < refs.length; i += 1) {
    const r = refs[i] as ReferenceImage;
    const ext = path.extname(r.path) || extFromMime(r.mime);
    const dst = path.join(dir, `ref-${i}${ext}`);
    await copyFile(r.path, dst);
    refPaths.push(dst);
  }
  return { dir, refPaths };
}

function extFromMime(mime: ReferenceImage["mime"]): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
  }
}

export function buildInstruction(args: {
  prompt: string;
  size: string;
  quality: string;
  n: number;
  targets: string[];
  refPaths: string[];
}): string {
  const sizeHint = args.size === "auto" ? "" : ` Size: ${args.size}.`;
  const qualityHint =
    args.quality === "auto" ? "" : ` Quality: ${args.quality}.`;
  const refLines =
    args.refPaths.length > 0
      ? [
          "Reference images (match style, subject identity, or composition):",
          ...args.refPaths.map((p, i) => `  ref[${i}]: ${p}`),
        ]
      : [];
  const targetLines = args.targets.map((p, i) => `  image[${i}] -> ${p}`);
  const replyLines = args.targets.map((p) => `SAVED:${p}`);
  return [
    `Call the \`generate_image\` tool ${args.n === 1 ? "once" : `${args.n} times`} to produce ${args.n === 1 ? "one image" : `${args.n} distinct images`}.${sizeHint}${qualityHint} Do not answer in prose, do not explain flags, do not read CLAUDE.md or any source file — just invoke \`generate_image\`.`,
    `Image prompt: ${args.prompt}`,
    ...refLines,
    "Save each result to the EXACT absolute path below — do not change directory, name, or extension. Overwrite any existing file.",
    ...targetLines,
    "Once every file is saved, reply with these lines and nothing else (no prose, no markdown, no code fences):",
    ...replyLines,
    "If `generate_image` is unavailable or refuses, reply with exactly ONE of these tokens on its own line and nothing else:",
    "  NO_IMAGE_TOOL",
    "  CONTENT_POLICY_REFUSAL",
    "  RATE_LIMITED",
    "  AUTH_REQUIRED",
  ].join("\n");
}

export function classifyReplyKeyword(stdout: string): VendorError | null {
  const text = stdout.trim();
  if (/^NO_IMAGE_TOOL\b/m.test(text)) {
    return {
      kind: "not-installed",
      hint: "Antigravity has no image generation tool available in this session",
    };
  }
  if (/^CONTENT_POLICY_REFUSAL\b/m.test(text)) {
    return { kind: "safety-refused", message: text.slice(0, 400) };
  }
  if (/^RATE_LIMITED\b/m.test(text)) {
    return { kind: "rate-limit" };
  }
  if (/^AUTH_REQUIRED\b/m.test(text)) {
    return {
      kind: "auth-required",
      hint: "Sign in to Antigravity (Gemini Code Assist account)",
    };
  }
  return null;
}

export function classifyAgyError(res: {
  code: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}): VendorError {
  if (res.timedOut) return { kind: "timeout", after_ms: 0 };
  const blob = `${res.stdout}\n${res.stderr}`.toLowerCase();
  if (/auth.?required|not.?logged.?in|sign.?in|login required/.test(blob)) {
    return {
      kind: "auth-required",
      hint: "Sign in to Antigravity (Gemini Code Assist account)",
    };
  }
  if (/content.?policy|policy.?refus|safety|prohibited/.test(blob)) {
    return { kind: "safety-refused", message: blob.slice(0, 400) };
  }
  if (/rate[- ]?limit|429|quota.?exceed/.test(blob)) {
    return { kind: "rate-limit" };
  }
  if (/command not found|enoent/.test(blob)) {
    return { kind: "not-installed", hint: "Install Antigravity CLI (agy)" };
  }
  return { kind: "other", cause: new Error(blob.slice(0, 400)) };
}
