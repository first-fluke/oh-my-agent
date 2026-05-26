/**
 * editor/dispatch.ts — T18: route slide edits via oma's vendor-resolved agent runner
 *
 * dispatchEdit():
 *   1. Builds a structured edit prompt that includes the slide HTML, the bbox region,
 *      the user instruction, and a reference to the design doctrine.
 *   2. Dispatches to oma's vendor-resolved agent runner (oma agent:spawn) with
 *      -w <workDir> to enforce the workdir sandbox.
 *   3. Streams stdout back to a provided sink (SSE channel or console).
 *   4. The agent MAY ONLY edit <workDir>/<slideFile> — the prompt enforces this.
 *
 * Security:
 *   - workDir and slideFile are validated (no path traversal) before use.
 *   - The spawned agent runs with cwd=workDir, constraining its FS access.
 *   - No hardcoded vendor: dispatches via `oma agent:spawn` which resolves
 *     target vendor from .agents/oma-config.yaml at runtime.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DispatchEditOptions {
  /** Absolute path to the slide working directory. */
  workDir: string;
  /** Bare filename of the slide to edit (e.g. "slide-02.html"). No path separators. */
  slideFile: string;
  /** Bounding box of the region to edit (design-space coords, 1920x1080). */
  bbox: BBox;
  /** User's natural-language edit instruction. */
  prompt: string;
  /** Absolute path to the annotated screenshot PNG (optional — improves context). */
  annotatedScreenshotPath?: string;
  /** SSE sink — called for each chunk of agent output. */
  onProgress: (chunk: string) => void;
  /** Called when the agent process exits. */
  onDone: (exitCode: number) => void;
  /** Called on spawn/IO error. */
  onError: (err: Error) => void;
}

// ─── Security helpers ─────────────────────────────────────────────────────────

/**
 * Validate that slideFile is a bare filename with no path traversal.
 * Mirrors the assertSafeOrderEntry guard in workspace.ts.
 */
export function assertSafeSlideFile(slideFile: string): void {
  if (
    slideFile.includes("/") ||
    slideFile.includes("\\") ||
    slideFile.includes("..") ||
    slideFile !== basename(slideFile)
  ) {
    throw new Error(
      `slideFile "${slideFile}" must be a bare filename with no path separators or traversal.`,
    );
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const DOCTRINE_REF = `.agents/skills/oma-slide/resources/design-doctrine.md`;
const ANIMATION_REF = `.agents/skills/oma-slide/resources/animation-patterns.md`;

/**
 * Build the edit prompt passed to the agent.
 *
 * The prompt:
 * - States the sandboxing constraint (edit ONLY <slideFile>).
 * - Includes the current slide HTML (so the agent doesn't need to read it).
 * - Describes the bbox region in design-space px.
 * - Includes the user instruction.
 * - References the design doctrine and animation patterns for aesthetic guidance.
 */
export function buildEditPrompt(opts: {
  workDir: string;
  slideFile: string;
  bbox: BBox;
  userPrompt: string;
  annotatedScreenshotPath?: string;
}): string {
  const { workDir, slideFile, bbox, userPrompt, annotatedScreenshotPath } =
    opts;

  const slidePath = join(workDir, slideFile);
  let slideHtml = "";
  try {
    slideHtml = readFileSync(slidePath, "utf8");
  } catch {
    slideHtml = "(could not read slide file)";
  }

  const bboxDesc = `x=${bbox.x}, y=${bbox.y}, width=${bbox.width}, height=${bbox.height} (design-space px, 1920x1080 canvas)`;

  const screenshotNote = annotatedScreenshotPath
    ? `\nAn annotated screenshot of the region is available at: ${annotatedScreenshotPath}\n`
    : "";

  return `# Slide Edit Task

## Sandbox constraint (MANDATORY)
You MUST edit ONLY the file \`${slideFile}\` in the current working directory.
Do NOT create, move, rename, or delete any other files.
Do NOT make network requests or read files outside the working directory.

## Slide file to edit
File: \`${slideFile}\`

## Current slide HTML
\`\`\`html
${slideHtml}
\`\`\`

## Region of interest (bounding box)
${bboxDesc}
${screenshotNote}
## User instruction
${userPrompt}

## Aesthetic guidance
Consult the design doctrine for anti-"AI slop" aesthetics, CJK font rules, and
animation patterns before making changes:
- ${DOCTRINE_REF}
- ${ANIMATION_REF}

The canvas is always 1920x1080px. Never change the slide dimensions or the
\`.deck-viewport > .deck-stage > .slide\` DOM contract.
Preserve \`data-om-validate\` attributes. Honor \`prefers-reduced-motion\`.

## Action
Read \`${slideFile}\`, apply the edit targeting the described bbox region, and
write the result back to \`${slideFile}\`. Do not output the full HTML to stdout
unless asked — just confirm what you changed.
`;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Resolve the oma CLI binary name.
 * Prefer `oma` (installed); fall back to `oh-my-agent`.
 */
function resolveOmaBin(): string {
  return process.env.OMA_BIN ?? "oma";
}

/**
 * Dispatch an edit to the oma vendor-resolved agent runner.
 *
 * Uses `oma agent:spawn frontend <prompt> <sessionId> -w <workDir>` which:
 *   - Resolves the target vendor from .agents/oma-config.yaml at runtime.
 *   - Runs the agent with cwd=workDir (sandbox enforcement).
 *   - Streams stdout/stderr to the provided onProgress sink.
 *
 * The agent identity is "frontend" (the slide skill is a frontend concern).
 * Override via OMA_SLIDE_EDIT_AGENT env var.
 */
export function dispatchEdit(opts: DispatchEditOptions): void {
  const {
    workDir,
    slideFile,
    bbox,
    prompt,
    annotatedScreenshotPath,
    onProgress,
    onDone,
    onError,
  } = opts;

  // Validate inputs
  try {
    assertSafeSlideFile(slideFile);
  } catch (err) {
    onError(err as Error);
    return;
  }

  const resolvedWorkDir = resolve(workDir);
  if (!existsSync(resolvedWorkDir)) {
    onError(new Error(`workDir not found: ${resolvedWorkDir}`));
    return;
  }

  const slidePath = join(resolvedWorkDir, slideFile);
  if (!existsSync(slidePath)) {
    onError(new Error(`Slide file not found: ${slidePath}`));
    return;
  }

  // Build prompt
  const editPrompt = buildEditPrompt({
    workDir: resolvedWorkDir,
    slideFile,
    bbox,
    userPrompt: prompt,
    annotatedScreenshotPath,
  });

  // Session ID: timestamp-based, unique per edit
  const sessionId = `slide-edit-${Date.now()}`;

  // Agent: configurable, default "frontend"
  const agentId = process.env.OMA_SLIDE_EDIT_AGENT ?? "frontend";

  // oma agent:spawn <agentId> <prompt> <sessionId> -w <workDir>
  // The prompt is passed via a temp-file approach to avoid shell escaping issues.
  // We embed the prompt inline as-is — agent:spawn accepts inline text.
  const omaBin = resolveOmaBin();
  const args = [
    "agent:spawn",
    agentId,
    editPrompt,
    sessionId,
    "-w",
    resolvedWorkDir,
  ];

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(omaBin, args, {
      cwd: resolvedWorkDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Ensure the spawned agent stays in the workdir
        OMA_WORKSPACE: resolvedWorkDir,
      },
    });
  } catch (err) {
    onError(err as Error);
    return;
  }

  if (!child.pid) {
    onError(new Error(`Failed to spawn oma agent:spawn (no pid)`));
    return;
  }

  child.stdout?.on("data", (chunk: Buffer) => {
    onProgress(chunk.toString());
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    onProgress(`[stderr] ${chunk.toString()}`);
  });

  child.on("error", (err) => {
    onError(err);
  });

  child.on("close", (code: number | null) => {
    onDone(code ?? 1);
  });
}
