import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generateHookShellWrapper,
  generateOmaHookWrapper,
  HOOK_DEDUP_PREAMBLE,
  type HookVariant,
  installHooksFromVariant,
  isOmaManagedHookGroup,
  mergeHookGroups,
  requiredVariantScripts,
  withDedup,
} from "./hooks-composer.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("hook self-dedup preamble (EC-6 / T2.1)", () => {
  it("generated hook script begins with the dedup preamble", () => {
    const wrapper = generateHookShellWrapper(
      'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"',
    );
    // Strip the shebang line; the preamble must immediately follow
    const withoutShebang = wrapper.replace(/^#!.*\n/, "");
    expect(withoutShebang.startsWith(HOOK_DEDUP_PREAMBLE)).toBe(true);
  });

  it("dedup preamble references an event-scoped /tmp/oma-hook lock", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Bash variables
      '"/tmp/oma-hook-${UID:-${EUID:-0}}-${OMA_SESSION_ID:-default}-${__oma_evt}.lock"',
    );
  });

  it("dedup lock key includes the event args so different events don't collide", () => {
    // __oma_evt is derived from "$*" — different --event values yield different
    // lock keys, so a PreToolUse right after UserPromptSubmit is NOT suppressed.
    expect(HOOK_DEDUP_PREAMBLE).toContain('__oma_evt="$(printf');
  });

  it("dedup preamble has the 2-second window", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain('"$__oma_age" -lt 2');
  });

  it("withDedup prepends preamble before the provided script body", () => {
    const body = 'exec bun .codex/hooks/persistent-mode.ts "$@"';
    const result = withDedup(body);
    expect(result).toMatch(
      new RegExp(
        `^${HOOK_DEDUP_PREAMBLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );
    expect(result).toContain(body);
  });

  it("generateHookShellWrapper produces a valid bash script with shebang and delegating exec", () => {
    const cmd = "bun .gemini/hooks/keyword-detector.ts";
    const script = generateHookShellWrapper(cmd);
    expect(script.startsWith("#!/usr/bin/env bash\n")).toBe(true);
    expect(script).toContain(`exec ${cmd} "$@"`);
    expect(script.endsWith("\n")).toBe(true);
  });

  it("stat fallback covers both macOS (-f %m) and Linux (-c %Y) in the preamble", () => {
    expect(HOOK_DEDUP_PREAMBLE).toContain('stat -f %m "$__oma_dedup_lock"');
    expect(HOOK_DEDUP_PREAMBLE).toContain('stat -c %Y "$__oma_dedup_lock"');
  });
});

describe("Codex hook variant contract", () => {
  it("installs one oma-hook.sh entry per event, wrapper, and hooks feature flag", () => {
    // Design 019: each event now emits ONE oma-hook.sh entry (the whole handler
    // chain runs in-process via `oma hook`). Per-handler bun script entries are gone.
    const targetDir = mkdtempSync(join(tmpdir(), "oma-codex-hooks-"));
    try {
      const variant = JSON.parse(
        readFileSync(
          join(repoRoot, ".agents", "hooks", "variants", "codex.json"),
          "utf-8",
        ),
      ) as HookVariant;

      installHooksFromVariant(repoRoot, targetDir, variant);

      const hooksJson = JSON.parse(
        readFileSync(join(targetDir, ".codex", "hooks.json"), "utf-8"),
      );

      // UserPromptSubmit — one entry, not three.
      const promptEntry = hooksJson.hooks.UserPromptSubmit[0];
      expect(promptEntry.hooks).toHaveLength(1);
      expect(promptEntry.hooks[0].name).toBe("oma-hook-UserPromptSubmit");
      // basePath is shell-quoted now (hookDir is variant-controlled, so the
      // wrapper path is single-quoted to neutralise injection).
      expect(promptEntry.hooks[0].command).toBe(
        "'.codex/hooks/oma-hook.sh' --vendor 'codex' --event 'UserPromptSubmit'",
      );
      // Timeout = sum of handler timeouts (5+5+3+3=16) + 5 margin = 21.
      expect(promptEntry.hooks[0].timeout).toBe(21);

      // PreToolUse — one entry with matcher, command includes --matcher Bash.
      expect(hooksJson.hooks.PreToolUse[0]).toMatchObject({
        matcher: "Bash",
        hooks: [{ name: "oma-hook-PreToolUse" }],
      });
      expect(hooksJson.hooks.PreToolUse[0].hooks[0].command).toContain(
        "--vendor 'codex' --event 'PreToolUse' --matcher 'Bash'",
      );

      // Stop — one entry.
      const stopEntry = hooksJson.hooks.Stop[0];
      expect(stopEntry.hooks).toHaveLength(1);
      expect(stopEntry.hooks[0].name).toBe("oma-hook-Stop");
      expect(stopEntry.hooks[0].command).toContain(
        "--vendor 'codex' --event 'Stop'",
      );

      // featureFlags: Codex config.toml must have hooks = true.
      const codexConfig = readFileSync(
        join(targetDir, ".codex", "config.toml"),
        "utf-8",
      );
      expect(codexConfig).toContain("[features]");
      expect(codexConfig).toContain("hooks = true");

      // oma-hook.sh wrapper must be present with dedup preamble and oma resolution.
      const wrapperPath = join(targetDir, ".codex", "hooks", "oma-hook.sh");
      expect(existsSync(wrapperPath)).toBe(true);
      const wrapperContent = readFileSync(wrapperPath, "utf-8");
      expect(wrapperContent).toContain("__oma_dedup_lock");
      expect(wrapperContent).toContain("command -v oma");
      expect(wrapperContent).toContain('"$__oma_bin" hook "$@" || true');
      // Always fail-open: the wrapper must force exit 0 even if oma errors.
      expect(wrapperContent).toContain("exit 0");
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// isOmaManagedHookGroup — unit tests (Task 7 migration marker)
// ---------------------------------------------------------------------------

describe("isOmaManagedHookGroup", () => {
  it("detects new-style oma-hook.sh entry by command", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "oma-hook-UserPromptSubmit",
            type: "command",
            command:
              '"$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh" --vendor claude --event UserPromptSubmit',
            timeout: 18,
          },
        ],
      }),
    ).toBe(true);
  });

  it("detects new-style entry by name prefix oma-hook-", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "oma-hook-Stop",
            type: "command",
            command: ".codex/hooks/oma-hook.sh --vendor codex --event Stop",
            timeout: 10,
          },
        ],
      }),
    ).toBe(true);
  });

  it("detects legacy bun keyword-detector.ts entry (quoted path)", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "keyword-detector",
            type: "command",
            command:
              'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"',
            timeout: 5,
          },
        ],
      }),
    ).toBe(true);
  });

  it("detects legacy bun persistent-mode.ts entry (unquoted path)", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "persistent-mode",
            type: "command",
            command: "bun .codex/hooks/persistent-mode.ts",
            timeout: 5,
          },
        ],
      }),
    ).toBe(true);
  });

  it("detects legacy bun hud.ts entry", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "hud",
            type: "command",
            command: 'bun "$GEMINI_PROJECT_DIR/.gemini/hooks/hud.ts"',
            timeout: 3000,
          },
        ],
      }),
    ).toBe(true);
  });

  it("does NOT flag a user-added hook with an unrelated command", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "my-custom-hook",
            type: "command",
            command: "/usr/local/bin/my-custom-tool --arg",
            timeout: 5,
          },
        ],
      }),
    ).toBe(false);
  });

  it("does NOT flag a user bun hook that runs a non-OMA script", () => {
    expect(
      isOmaManagedHookGroup({
        hooks: [
          {
            name: "user-formatter",
            type: "command",
            command: "bun /home/user/.config/my-formatter.ts",
            timeout: 5,
          },
        ],
      }),
    ).toBe(false);
  });

  it("returns false for non-plain-object input", () => {
    expect(isOmaManagedHookGroup(null)).toBe(false);
    expect(isOmaManagedHookGroup([])).toBe(false);
    expect(isOmaManagedHookGroup("string")).toBe(false);
  });

  it("returns false for group with no hooks array", () => {
    expect(isOmaManagedHookGroup({ matcher: "Bash" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mergeHookGroups — unit tests (Task 7 merge algorithm)
// ---------------------------------------------------------------------------

describe("mergeHookGroups", () => {
  const newOmaGroup = {
    hooks: [
      {
        name: "oma-hook-UserPromptSubmit",
        type: "command",
        command:
          ".claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
        timeout: 18,
      },
    ],
  };

  const legacyOmaGroup = {
    hooks: [
      {
        name: "keyword-detector",
        type: "command",
        command: 'bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"',
        timeout: 5,
      },
    ],
  };

  const userGroup = {
    hooks: [
      {
        name: "my-custom-hook",
        type: "command",
        command: "my-tool --flag",
        timeout: 10,
      },
    ],
  };

  it("strips legacy OMA group and appends new OMA group", () => {
    const result = mergeHookGroups([legacyOmaGroup], [newOmaGroup]);
    expect(result).toHaveLength(1);
    expect(result[0].hooks[0].name).toBe("oma-hook-UserPromptSubmit");
  });

  it("preserves user group when stripping legacy OMA group", () => {
    const result = mergeHookGroups([legacyOmaGroup, userGroup], [newOmaGroup]);
    expect(result).toHaveLength(2);
    // user group first (original order), then new OMA group
    expect(result[0].hooks[0].name).toBe("my-custom-hook");
    expect(result[1].hooks[0].name).toBe("oma-hook-UserPromptSubmit");
  });

  it("strips existing new-style OMA group on second install (idempotent)", () => {
    // Simulate second install: existing group is the new-style OMA group.
    const result = mergeHookGroups([userGroup, newOmaGroup], [newOmaGroup]);
    expect(result).toHaveLength(2);
    expect(result[0].hooks[0].name).toBe("my-custom-hook");
    expect(result[1].hooks[0].name).toBe("oma-hook-UserPromptSubmit");
  });

  it("handles undefined/null existing gracefully (clean install)", () => {
    const result = mergeHookGroups(undefined, [newOmaGroup]);
    expect(result).toHaveLength(1);
    expect(result[0].hooks[0].name).toBe("oma-hook-UserPromptSubmit");
  });

  it("handles non-array existing gracefully", () => {
    const result = mergeHookGroups("invalid", [newOmaGroup]);
    expect(result).toHaveLength(1);
  });
});

describe("generateOmaHookWrapper path escaping", () => {
  it("escapes shell metacharacters in the recorded oma path", () => {
    const wrapper = generateOmaHookWrapper(
      '/tmp/$(touch /tmp/pwned)/weird"path`/oma',
    );
    expect(wrapper).toContain(
      '"/tmp/\\$(touch /tmp/pwned)/weird\\"path\\`/oma"',
    );
    // The raw, unescaped interpolation must not appear anywhere.
    expect(wrapper).not.toContain("/tmp/$(touch");
  });

  it("leaves a plain path unchanged", () => {
    const wrapper = generateOmaHookWrapper("/usr/local/bin/oma");
    expect(wrapper).toContain('if [ -x "/usr/local/bin/oma" ]; then');
  });
});

// ---------------------------------------------------------------------------
// requiredVariantScripts — per-variant hook materialization whitelist
// ---------------------------------------------------------------------------

describe("requiredVariantScripts", () => {
  const variantsDir = join(repoRoot, ".agents", "hooks", "variants");
  const coreDir = join(repoRoot, ".agents", "hooks", "core");

  const loadVariant = (name: string): HookVariant =>
    JSON.parse(
      readFileSync(join(variantsDir, `${name}.json`), "utf-8"),
    ) as HookVariant;

  const allVendorVariants = (): HookVariant[] =>
    readdirSync(variantsDir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith(".json") &&
          e.name !== "hook-variant.schema.json",
      )
      .map((e) => loadVariant(e.name.replace(/\.json$/, "")));

  it("claude requires only hud.ts (statusLine) and filter-test-output.sh (test-filter)", () => {
    expect(requiredVariantScripts(loadVariant("claude"))).toEqual(
      new Set(["hud.ts", "filter-test-output.sh"]),
    );
  });

  it("gemini requires hud.ts via hud-only events (no statusLine entry)", () => {
    const required = requiredVariantScripts(loadVariant("gemini"));
    expect(required).toEqual(new Set(["hud.ts", "filter-test-output.sh"]));
  });

  it("cursor requires nothing (no statusLine, no test-filter, no hud-only events)", () => {
    expect(requiredVariantScripts(loadVariant("cursor"))).toEqual(new Set());
  });

  it("codex requires only filter-test-output.sh (test-filter, no statusLine)", () => {
    expect(requiredVariantScripts(loadVariant("codex"))).toEqual(
      new Set(["filter-test-output.sh"]),
    );
  });

  it("every required script exists in .agents/hooks/core for every variant", () => {
    for (const variant of allVendorVariants()) {
      for (const script of requiredVariantScripts(variant)) {
        expect(
          existsSync(join(coreDir, script)),
          `${variant.vendor}: ${script} missing from core`,
        ).toBe(true);
      }
    }
  });

  it("required .ts scripts have no runtime sibling imports outside the required set", () => {
    // The whitelist copies only the required scripts, so any RUNTIME (non
    // type-only) relative import of a sibling that is not also required would
    // break at `bun <hookDir>/<script>` execution. `import type` is erased by
    // bun at transpile time and is therefore safe.
    const runtimeSiblingImport = /^import\s+(?!type\b)[^;]*?from\s+["']\.\//m;
    for (const variant of allVendorVariants()) {
      for (const script of requiredVariantScripts(variant)) {
        if (!script.endsWith(".ts")) continue;
        const source = readFileSync(join(coreDir, script), "utf-8");
        expect(
          runtimeSiblingImport.test(source),
          `${script} has a runtime sibling import — add it to requiredVariantScripts or the copy whitelist`,
        ).toBe(false);
      }
    }
  });

  it("installHooksFromVariant materializes only oma-hook.sh + required scripts and sweeps stale copies", () => {
    const targetDir = mkdtempSync(join(tmpdir(), "oma-hooks-whitelist-"));
    try {
      // Simulate an older full-copy install: stale handler scripts on disk.
      const hooksDir = join(targetDir, ".claude", "hooks");
      mkdirSync(hooksDir, { recursive: true });
      writeFileSync(join(hooksDir, "keyword-detector.ts"), "// stale\n");
      writeFileSync(join(hooksDir, "persistent-mode.ts"), "// stale\n");
      writeFileSync(join(hooksDir, "triggers.json"), "{}\n");

      installHooksFromVariant(repoRoot, targetDir, loadVariant("claude"));

      const materialized = readdirSync(hooksDir).sort();
      expect(materialized).toEqual([
        "filter-test-output.sh",
        "hud.ts",
        "oma-hook.sh",
      ]);
    } finally {
      rmSync(targetDir, { recursive: true, force: true });
    }
  });
});

describe("isOmaManagedHookGroup — flat entries (flatHookEntries vendors)", () => {
  it("detects a flat oma-hook.sh entry (Cursor format)", () => {
    expect(
      isOmaManagedHookGroup({
        command:
          "'.cursor/hooks/oma-hook.sh' --vendor 'cursor' --event 'beforeSubmitPrompt'",
        timeout: 21,
      }),
    ).toBe(true);
  });

  it("detects a flat legacy bun core-script entry", () => {
    expect(
      isOmaManagedHookGroup({
        command: "bun .cursor/hooks/serena-primer.ts",
        timeout: 3,
      }),
    ).toBe(true);
  });

  it("preserves a user-added flat entry", () => {
    expect(
      isOmaManagedHookGroup({
        command: "./scripts/my-own-hook.sh",
        timeout: 5,
      }),
    ).toBe(false);
  });
});
