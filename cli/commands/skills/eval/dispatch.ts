import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";
import {
  CLI_SKILLS_DIR,
  INSTALLED_SKILLS_DIR,
  type SkillTargetSpec,
} from "../../../constants/vendors.js";
import { planDispatch } from "../../../io/runtime-dispatch.js";
import {
  resolvePromptFlag,
  resolveVendor,
} from "../../../platform/agent-config.js";
import type {
  IsolationStatus,
  JudgeDispatchFn,
  LiveDispatchFn,
} from "./types.js";

/**
 * Run a built dispatch invocation and capture stdout.
 *
 * Dash-leading prompts (plan 013): the claude/gemini/qwen CLIs receive the prompt as
 * a trailing `<promptFlag> <prompt>` arg (e.g. `-p <prompt>`). When the prompt STARTS
 * with `-` — as an injected `SKILL.md` does (`---` YAML frontmatter) — the vendor's
 * arg parser misreads it as an unknown CLI option and exits non-zero with empty
 * stdout (silently scoring the arm 0). For that case we pass the prompt via STDIN
 * (keeping the bare flag) so it is never parsed as an option. Non-dash prompts keep
 * the existing arg path unchanged.
 *
 * On non-zero exit we return any captured stdout (possibly "") AND warn once, so a
 * failed dispatch is no longer silently indistinguishable from a real empty answer.
 */
export function runEvalDispatch(
  invocation: { command: string; args: string[]; env: NodeJS.ProcessEnv },
  cwd: string,
  prompt: string,
  promptFlag: string | null,
): string {
  const { command, args, env } = invocation;
  // Locate the prompt VALUE: the arg immediately after `promptFlag` (e.g. `-p`).
  // It is NOT always the trailing arg — plan-derived flags (e.g. `--model sonnet`)
  // can be appended after it, so search by the flag→value pair, not by position.
  let promptIdx = -1;
  if (promptFlag !== null) {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === promptFlag && args[i + 1] === prompt) {
        promptIdx = i + 1;
        break;
      }
    }
  }
  const viaStdin = promptIdx >= 0 && prompt.startsWith("-");
  // Drop only the prompt VALUE, keeping the bare flag (claude `-p` then reads stdin).
  const execArgs = viaStdin ? args.filter((_, idx) => idx !== promptIdx) : args;
  try {
    const output = execFileSync(command, execArgs, {
      cwd,
      env,
      encoding: "utf-8",
      input: viaStdin ? prompt : undefined,
      // stdin: pipe the prompt when via-stdin; otherwise ignore. stdout captured;
      // stderr inherited to the parent.
      stdio: viaStdin ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
      // Generous buffer: agent JSON transcripts can be large; default 1 MB can
      // overflow (ENOBUFS) and look like an empty answer.
      maxBuffer: 64 * 1024 * 1024,
      // No timeout here — caller controls task-level time budgets.
    });
    return typeof output === "string" ? output : "";
  } catch (err) {
    const e = err as { status?: number; stderr?: unknown; stdout?: unknown };
    const stderrSnippet =
      typeof e.stderr === "string"
        ? e.stderr.replace(/\s+/g, " ").trim().slice(0, 200)
        : "";
    console.warn(
      `[oma skills eval] dispatch failed (exit ${e.status ?? "?"})${
        stderrSnippet ? `: ${stderrSnippet}` : ""
      }`,
    );
    // Return captured stdout so checkers can still score it (likely 0).
    return typeof e.stdout === "string" ? e.stdout : "";
  }
}

/**
 * Determine the isolation status for a live eval run of `skillId` via `vendor`
 * (plan 013). Isolation works by running the dispatch in a clean tmpBase cwd whose
 * skills dir excludes the target skill — but that only hides skills the vendor CLI
 * discovers cwd-relative.
 *
 * - `enforced`    — cwd-relative vendor and the target skill is NOT present in the
 *                   vendor's HOME skills path; a clean tmpBase cwd fully hides it.
 * - `best-effort` — cwd-relative vendor but a HOME copy of the skill also exists
 *                   (tmpBase hides the project copy; the HOME copy stays visible),
 *                   or the vendor is unknown so isolation cannot be proven.
 * - `unavailable` — HOME-based vendor (`requiresHomeConsent`, e.g. antigravity)
 *                   where cwd cannot isolate; baseline may be contaminated.
 */
export function resolveSkillIsolation(
  vendor: string,
  skillId: string,
): IsolationStatus {
  const spec = CLI_SKILLS_DIR[vendor as keyof typeof CLI_SKILLS_DIR] as
    | SkillTargetSpec
    | undefined;
  if (!spec) return "best-effort"; // unknown vendor — cannot prove isolation
  if (spec.requiresHomeConsent) return "unavailable"; // HOME-based discovery
  // Defense-in-depth: never build a filesystem probe path from an unsanitized id.
  // A non-simple id (path separators / "..") cannot name a real installed skill,
  // so we cannot claim enforced isolation — report best-effort without probing.
  if (
    skillId.includes("..") ||
    skillId.includes("/") ||
    skillId.includes(sep)
  ) {
    return "best-effort";
  }
  const homeSkill = join(homedir(), spec.homePath, skillId);
  return existsSync(homeSkill) ? "best-effort" : "enforced";
}

/**
 * Seed `tmpBase` with a filtered skills directory containing every installed skill
 * for `vendor` EXCEPT `excludeSkillId`, so a dispatch run with `cwd = tmpBase`
 * cannot auto-load the target skill from runtime discovery. Other skills remain
 * available, so the agent keeps its normal capability — only the target is withheld.
 *
 * Per-entry symlinks (cheap; recursive copy fallback on error). Idempotent per
 * tmpBase. Never mutates the real install — only reads the source dir and writes
 * into tmpBase.
 */
export function setupIsolatedSkillsDir(
  tmpBase: string,
  vendor: string,
  workspace: string,
  excludeSkillId: string,
): void {
  const spec = CLI_SKILLS_DIR[vendor as keyof typeof CLI_SKILLS_DIR] as
    | SkillTargetSpec
    | undefined;
  const subPath = spec?.projectPath ?? INSTALLED_SKILLS_DIR;
  const vendorSrc = join(workspace, subPath);
  // Prefer the vendor's own skills dir (what that CLI discovers); fall back to the
  // SSOT .agents/skills if the vendor dir is absent.
  const sourceDir = existsSync(vendorSrc)
    ? vendorSrc
    : join(workspace, INSTALLED_SKILLS_DIR);
  if (!existsSync(sourceDir)) return; // nothing to mirror
  const destDir = join(tmpBase, subPath);
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(sourceDir)) {
    if (entry === excludeSkillId) continue; // exclude the target skill
    const from = join(sourceDir, entry);
    const to = join(destDir, entry);
    if (existsSync(to)) continue;
    try {
      symlinkSync(from, to);
    } catch {
      try {
        cpSync(from, to, { recursive: true, dereference: true });
      } catch {
        // best-effort: skip this entry
      }
    }
  }
}

/**
 * Build the real live-dispatch function that spawns a subprocess via planDispatch
 * and captures its stdout. Uses execFileSync so the call blocks until the agent
 * exits and stdout is fully captured.
 *
 * Skill isolation (plan 013): when `excludeSkillId` is set and the caller passes a
 * per-call workspace (the throwaway tmpBase from collectLiveRollouts), BOTH arms run
 * with `cwd = tmpBase` seeded with every skill EXCEPT the target — so the baseline
 * arm cannot auto-load the installed target skill. The treatment arm re-adds the
 * skill ONLY via the injected SKILL.md (prompt), making that injection the single
 * controlled variable. Without a per-call workspace (legacy/tests), cwd falls back
 * to `workspace` (repo root) and no isolation is applied.
 *
 * Both arms: readOnly: true (constrained profile), temp workspace per run.
 */
export function buildLiveDispatchFn(
  workspace: string,
  excludeSkillId?: string,
): LiveDispatchFn {
  const { vendor, config } = resolveVendor("eval-agent");
  const vendorConfig = config?.vendors?.[vendor] ?? {};
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  // Memoize isolation setup per tmpBase: one run reuses a single tmpBase across all
  // tasks/arms, so the filtered skills dir is built exactly once.
  const isolatedBases = new Set<string>();

  return (_arm, prompt, perCallWorkspace) => {
    let cwd = workspace;
    if (perCallWorkspace) {
      cwd = perCallWorkspace;
      if (excludeSkillId && !isolatedBases.has(perCallWorkspace)) {
        setupIsolatedSkillsDir(
          perCallWorkspace,
          vendor,
          workspace,
          excludeSkillId,
        );
        isolatedBases.add(perCallWorkspace);
      }
    }

    const dispatch = planDispatch(
      "eval-agent",
      vendor,
      vendorConfig,
      promptFlag,
      prompt,
      process.env,
      { readOnly: true },
    );

    return runEvalDispatch(dispatch.invocation, cwd, prompt, promptFlag);
  };
}

/**
 * Build the real judge dispatch function.
 * Sends a grading prompt to the same vendor as live eval arms, with
 * readOnly: true (deterministic grading, temp=0 is a model-level concern).
 *
 * DATA-EGRESS: the candidate arm output is sent to the judge vendor for
 * grading. Design 016 Tier-2 flagged this for an opt-in warning; a one-line
 * console.warn is emitted on the FIRST judge dispatch within a --live run.
 */
export function buildJudgeDispatchFn(): JudgeDispatchFn {
  // Warned flag is scoped to this invocation so each runSkillsEval call warns
  // independently. A module-level flag would suppress the warning in subsequent
  // calls within the same process (e.g. tests, long-running shells).
  let judgeEgressWarned = false;
  return (gradingPrompt: string) => {
    if (!judgeEgressWarned) {
      console.warn(
        "[oma skills eval] DATA-EGRESS: candidate output is sent to the judge vendor for grading.",
      );
      judgeEgressWarned = true;
    }

    const { vendor, config } = resolveVendor("eval-agent");
    const vendorConfig = config?.vendors?.[vendor] ?? {};
    const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

    const dispatch = planDispatch(
      "eval-agent",
      vendor,
      vendorConfig,
      promptFlag,
      gradingPrompt,
      process.env,
      { readOnly: true },
    );

    return runEvalDispatch(
      dispatch.invocation,
      process.cwd(),
      gradingPrompt,
      promptFlag,
    );
  };
}
