import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import {
  emitEvent as appendEvent,
  readEvents,
} from "../../.agents/hooks/core/state-core.ts";
import {
  STANDALONE_HOOK_SCRIPTS,
  type StandaloneHookVendor,
} from "../constants/standalone-hooks.js";
import {
  installOpencodePlugin,
  OPENCODE_PLUGIN_DIR,
} from "../platform/opencode-plugin-composer.js";
import {
  installPiExtension,
  PI_EXTENSION_DIR,
} from "../platform/pi-extension-composer.js";
import { retryObservePath } from "../state/memory-retry-queue.js";
import { installAntigravityHud } from "../vendors/antigravity/hud.js";

const REPO_ROOT = resolve(__dirname, "../..");
const CORE = join(REPO_ROOT, ".agents/hooks/core");
const sid = "2026-10-08_standalone-memory";
const vendorSid = "vendor-original-session";

function coreFingerprint(): string {
  const hash = createHash("sha256");
  for (const name of readdirSync(CORE).sort()) {
    hash.update(name).update(readFileSync(join(CORE, name)));
  }
  return hash.digest("hex");
}

describe("installed standalone semantic delivery", () => {
  let root: string;
  let cliLauncher: string;
  let initialCore: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-standalone-memory-"));
    mkdirSync(join(root, ".git"));
    mkdirSync(join(root, ".agents"));
    vi.stubEnv("HOME", join(root, "home"));
    vi.stubEnv("OMA_PROFILE", "7");
    vi.stubEnv("AGENTMEMORY_URL", "http://127.0.0.1:1");
    vi.stubEnv("OMA_NO_AGENTMEMORY", "0");
    cliLauncher = join(root, "oma cli launcher");
    writeFileSync(
      cliLauncher,
      `#!/usr/bin/env bun\nimport ${JSON.stringify(join(REPO_ROOT, "cli/cli.ts"))};\n`,
      { mode: 0o700 },
    );
    vi.stubEnv("OMA_BIN", cliLauncher);
    initialCore = coreFingerprint();
  });

  afterEach(() => {
    expect(coreFingerprint()).toBe(initialCore);
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  function configure(provider: "agentmemory" | "none" | "honcho") {
    writeFileSync(
      join(root, ".agents/oma-config.yaml"),
      `providers:\n  semantic_memory: ${provider}\n${provider === "honcho" ? "honcho:\n  base_url: not-a-url\n" : ""}`,
    );
  }

  function install(vendor: StandaloneHookVendor): string {
    if (vendor === "pi") {
      installPiExtension(REPO_ROOT, root);
      return join(root, PI_EXTENSION_DIR);
    }
    if (vendor === "opencode") {
      installOpencodePlugin(REPO_ROOT, root);
      return join(root, OPENCODE_PLUGIN_DIR);
    }
    cpSync(CORE, join(root, ".agents/hooks/core"), { recursive: true });
    mkdirSync(join(root, ".agents/hooks/variants"), { recursive: true });
    cpSync(
      join(REPO_ROOT, ".agents/hooks/variants/antigravity.json"),
      join(root, ".agents/hooks/variants/antigravity.json"),
    );
    const agy = join(root, "home/.gemini/antigravity-cli");
    mkdirSync(agy, { recursive: true });
    const result = installAntigravityHud(root);
    expect(result.installed).toBe(true);
    const hooks = join(agy, "hooks");
    const doc = JSON.parse(
      readFileSync(join(root, ".agents/hooks.json"), "utf8"),
    );
    expect(doc["oma-persistent-mode"].Stop[0].command).toBe(
      `bun "${join(hooks, "persistent-mode.ts")}"`,
    );
    expect(
      Object.keys(doc).filter((key) => key === "oma-persistent-mode"),
    ).toHaveLength(1);
    return hooks;
  }

  function seedEnding() {
    appendEvent(root, sid, {
      kind: "session.created",
      payload: { workflow: "work" },
    });
    mkdirSync(join(root, ".agents/state"), { recursive: true });
    writeFileSync(
      join(root, `.agents/state/work-state-${vendorSid}.json`),
      JSON.stringify({
        workflow: "work",
        sessionId: vendorSid,
        omaSid: sid,
        activatedAt: new Date().toISOString(),
        reinforcementCount: 0,
        pendingEnding: { status: "completed", reason: "fixture_complete" },
      }),
    );
  }

  function invoke(
    hooks: string,
    script = "persistent-mode.ts",
    cwd = root,
    payload: Record<string, unknown> = {
      cwd: root,
      sessionId: vendorSid,
      hook_event_name: "Stop",
    },
  ) {
    const result = spawnSync("bun", [join(hooks, script)], {
      cwd,
      env: process.env,
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 15_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    return result;
  }

  for (const vendor of ["pi", "opencode", "antigravity"] as const) {
    it(`${vendor} writes one L1 event and a destination-bound HOME retry`, () => {
      configure("agentmemory");
      const hooks = install(vendor);
      seedEnding();
      invoke(hooks);

      const ended = readEvents(root, sid).filter(
        (event) => event.kind === "session.ended",
      );
      expect(ended).toHaveLength(1);
      const path = retryObservePath(root);
      const { projectId, projectDir } = projectIdentity(root);
      expect(path).toBe(
        join(
          process.env.OMA_STATE_HOME as string,
          "u/7/projects",
          projectId,
          "retry/observe.jsonl",
        ),
      );
      const queue = readFileSync(path, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      expect(queue).toHaveLength(1);
      expect(queue[0].eventId).toBe(ended[0]?.eventId);
      expect(queue[0].memoryTarget).toMatchObject({
        provider: "agentmemory",
        profile: "7",
        projectId,
        projectDir,
        destination: { endpoint: "http://127.0.0.1:1" },
      });
      expect(existsSync(join(root, ".agents/state/retry/observe.jsonl"))).toBe(
        false,
      );
      invoke(hooks);
      expect(
        readEvents(root, sid).filter((event) => event.kind === "session.ended"),
      ).toHaveLength(1);
    });
  }

  it("honors explicit none while still recording L1", () => {
    configure("none");
    const hooks = install("pi");
    seedEnding();
    invoke(hooks);
    expect(
      readEvents(root, sid).filter((event) => event.kind === "session.ended"),
    ).toHaveLength(1);
    expect(existsSync(retryObservePath(root))).toBe(false);
    expect(existsSync(join(root, ".agents/state/retry/observe.jsonl"))).toBe(
      false,
    );
  });

  it("invalid provider config cannot fall back to the core legacy writer", () => {
    configure("honcho");
    const hooks = install("opencode");
    seedEnding();
    invoke(hooks);
    expect(
      readEvents(root, sid).filter((event) => event.kind === "session.ended"),
    ).toHaveLength(1);
    expect(existsSync(join(root, ".agents/state/retry/observe.jsonl"))).toBe(
      false,
    );
  });

  it("uses the payload project when the wrapper starts in another directory", () => {
    configure("agentmemory");
    const hooks = install("opencode");
    const elsewhere = join(root, "elsewhere");
    mkdirSync(elsewhere);
    seedEnding();
    invoke(hooks, "persistent-mode.ts", elsewhere);
    expect(
      readEvents(root, sid).filter((event) => event.kind === "session.ended"),
    ).toHaveLength(1);
    const queue = readFileSync(retryObservePath(root), "utf8").trim();
    expect(JSON.parse(queue).memoryTarget.projectDir).toBe(
      projectIdentity(root).projectDir,
    );
  });

  it("keeps Antigravity post-tool recording and Stop enforcement distinct without event fields", () => {
    configure("none");
    writeFileSync(
      join(root, ".agents/oma-config.yaml"),
      "providers:\n  semantic_memory: none\nrefactor_guard:\n  enabled: true\n  max_lines: 500\n",
    );
    const hooks = install("antigravity");
    mkdirSync(join(root, "src"));
    const edited = join(root, "src/big.ts");
    writeFileSync(edited, Array(600).fill("const x = 1;").join("\n"));
    const payload = { conversationId: vendorSid, workspacePaths: [root] };
    const recorded = invoke(hooks, "refactor-guard.ts", root, {
      ...payload,
      toolCall: { name: "write_to_file", args: { TargetFile: edited } },
    });
    expect(JSON.parse(recorded.stdout)).toEqual({});
    const stopped = invoke(hooks, "refactor-guard.ts", root, payload);
    expect(JSON.parse(stopped.stdout)).toMatchObject({
      decision: "continue",
      reason: expect.stringContaining("big.ts"),
    });
  });

  it("rejects arbitrary script paths without executing them", () => {
    configure("none");
    const marker = join(root, "executed");
    const arbitrary = join(root, "arbitrary.ts");
    writeFileSync(
      arbitrary,
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "executed");`,
    );
    const result = spawnSync(
      cliLauncher,
      ["hook", "script", "--vendor", "pi", "--script", arbitrary],
      {
        cwd: root,
        env: process.env,
        input: JSON.stringify({ cwd: root, hook_event_name: "Stop" }),
        encoding: "utf8",
        timeout: 10_000,
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(existsSync(marker)).toBe(false);
    expect(existsSync(retryObservePath(root))).toBe(false);
  });

  it("missing CLI fails open without executing the old copied handler", () => {
    configure("agentmemory");
    const hooks = install("pi");
    seedEnding();
    vi.stubEnv("OMA_BIN", join(root, "missing-cli"));
    const result = invoke(hooks);
    expect(result.stderr).toContain("standalone dispatch unavailable");
    expect(
      readEvents(root, sid).filter((event) => event.kind === "session.ended"),
    ).toHaveLength(0);
    expect(existsSync(retryObservePath(root))).toBe(false);
    expect(existsSync(join(root, ".agents/state/retry/observe.jsonl"))).toBe(
      false,
    );
  });

  it("installs wrappers idempotently and preserves user-modified entries", () => {
    configure("none");
    const hooks = install("pi");
    const path = join(hooks, "persistent-mode.ts");
    const wrapper = readFileSync(path, "utf8");
    install("pi");
    expect(readFileSync(path, "utf8")).toBe(wrapper);
    writeFileSync(path, "// user customization\n");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    install("pi");
    expect(readFileSync(path, "utf8")).toBe("// user customization\n");
    expect(warning).toHaveBeenCalled();
    warning.mockRestore();
    expect(
      Object.keys(STANDALONE_HOOK_SCRIPTS).every((script) =>
        existsSync(join(hooks, script)),
      ),
    ).toBe(true);
  });
});
