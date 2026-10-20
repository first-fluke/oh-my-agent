// --- Variant-driven hook installation ---

export interface HookEvent {
  hook: string;
  matcher?: string;
  timeout: number;
  /**
   * Cursor `stop` hook only: emitted as `loop_limit` on the flat settings
   * entry. Caps how many times the hook may auto-resubmit its followup_message.
   * `null` = uncapped; `undefined` (omitted) = Cursor's default (5). Ignored by
   * vendors other than Cursor.
   */
  loopLimit?: number | null;
}

export interface HookVariant {
  vendor: string;
  hookDir: string;
  settingsFile: string;
  projectDirEnv: string | null;
  runtime: string;
  /**
   * When true, the vendor's runtime config lives outside the project and the
   * generic project install (installHooksFromVariant) must be skipped.
   * Antigravity (agy) reads settings/statusLine only from
   * `~/.gemini/antigravity-cli/settings.json` and workspace hooks only from
   * `<workspace>/.agents/hooks.json` (written by installAntigravityHud) — a
   * project-scoped copy of hookDir/settingsFile is dead config it never loads.
   */
  homeOnly?: boolean;
  /**
   * When true, settings hook entries are written as flat
   * `{command, timeout[, matcher]}` objects under each event key (Cursor's
   * hooks.json format — nested `{matcher, hooks: [...]}` groups do not fire
   * in Cursor CLI). Defaults to the Claude Code nested-group format.
   *
   * NOTE (Cursor limitation): Cursor's `beforeSubmitPrompt` event supports only
   * `{continue, user_message}` output — it does NOT deliver additionalContext /
   * additional_context, so the prompt-injection chain's stdout is silently
   * dropped there. Its file side-effects (workflow state, skill-session dedup,
   * L1 boundary events) still run and still matter. Per-session context
   * injection for Cursor happens on `sessionStart` (additional_context) instead.
   */
  flatHookEntries?: boolean;
  /**
   * When true, skip merging hook entries into `settingsFile` (still copy hook
   * scripts + write the oma-hook.sh wrapper, and still apply `extra`). Kiro's
   * CLI reads hooks from a dedicated agent config (.kiro/agents/oma-hooks.json);
   * a `.kiro/settings/cli.json` merge would be dead config it never loads.
   */
  skipSettingsMerge?: boolean;
  events: Record<string, HookEvent | HookEvent[]>;
  statusLine?: {
    hook: string;
    /**
     * Extra vendor statusLine fields written alongside `type` and `command`
     * (e.g. Qwen's `respectUserColors` and `hideContextIndicator`).
     */
    options?: Record<string, unknown>;
  };
  /**
   * Parent settings key to nest the statusLine under. Omit for top-level
   * (Claude / agy use root `statusLine`). Qwen requires `ui.statusLine` — a
   * root-level statusLine is silently ignored by the Qwen Code renderer.
   */
  statusLineKey?: string;
  // biome-ignore lint/suspicious/noExplicitAny: extra settings vary by vendor
  extra?: Record<string, any>;
  featureFlags?: {
    file: string;
    section: string;
    flags: Record<string, boolean>;
  };
}
