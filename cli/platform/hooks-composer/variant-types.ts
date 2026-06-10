// --- Variant-driven hook installation ---

export interface HookEvent {
  hook: string;
  matcher?: string;
  timeout: number;
}

export interface HookVariant {
  vendor: string;
  hookDir: string;
  settingsFile: string;
  projectDirEnv: string | null;
  runtime: string;
  /**
   * When true, settings hook entries are written as flat
   * `{command, timeout[, matcher]}` objects under each event key (Cursor's
   * hooks.json format — nested `{matcher, hooks: [...]}` groups do not fire
   * in Cursor CLI). Defaults to the Claude Code nested-group format.
   */
  flatHookEntries?: boolean;
  events: Record<string, HookEvent | HookEvent[]>;
  statusLine?: { hook: string };
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
