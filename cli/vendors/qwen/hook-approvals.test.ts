import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureQwenHookApproval,
  hashQwenProjectHooks,
  isOmaManagedQwenHooks,
  normalizeQwenProjectRoot,
  parseDotenv,
  qwenHookApprovalState,
  qwenHookApprovalsPath,
  readQwenProjectEnvFiles,
} from "./hook-approvals.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
}

const OMA_HOOKS = {
  UserPromptSubmit: [
    {
      hooks: [
        {
          name: "oma-hook-UserPromptSubmit",
          type: "command",
          command:
            "\"$QWEN_PROJECT_DIR/.qwen/hooks/oma-hook.sh\" --vendor 'qwen' --event 'UserPromptSubmit'",
          timeout: 21,
        },
      ],
    },
  ],
  PreToolUse: [
    {
      matcher: "run_shell_command|write_file",
      hooks: [
        {
          name: "oma-hook-PreToolUse",
          type: "command",
          command:
            "\"$QWEN_PROJECT_DIR/.qwen/hooks/oma-hook.sh\" --vendor 'qwen' --event 'PreToolUse'",
          timeout: 26,
        },
      ],
    },
  ],
};

function project(settings: unknown): string {
  const root = scratch("oma-qwen-project-");
  mkdirSync(join(root, ".qwen"), { recursive: true });
  writeFileSync(
    join(root, ".qwen", "settings.json"),
    `${JSON.stringify(settings, null, 2)}\n`,
  );
  return root;
}

function context(home: string) {
  return { home, env: {} as NodeJS.ProcessEnv };
}

describe("qwenHookApprovalsPath", () => {
  it("defaults to ~/.qwen/hookApprovals.json and honours QWEN_HOME and the explicit override", () => {
    expect(qwenHookApprovalsPath({ home: "/h", env: {} })).toBe(
      join("/h", ".qwen", "hookApprovals.json"),
    );
    expect(
      qwenHookApprovalsPath({ home: "/h", env: { QWEN_HOME: "/elsewhere" } }),
    ).toBe(join(resolve("/elsewhere"), "hookApprovals.json"));
    expect(
      qwenHookApprovalsPath({
        home: "/h",
        env: { QWEN_CODE_HOOK_APPROVALS_PATH: "/x/approvals.json" },
      }),
    ).toBe("/x/approvals.json");
  });
});

describe("normalizeQwenProjectRoot", () => {
  it("resolves the path and lower-cases it only on Windows", () => {
    expect(normalizeQwenProjectRoot("C:\\Work\\App", "win32")).toBe(
      resolve("C:\\Work\\App").toLowerCase(),
    );
    expect(normalizeQwenProjectRoot("/Work/App", "linux")).toBe(
      resolve("/Work/App"),
    );
  });
});

describe("parseDotenv", () => {
  it("parses the dotenv grammar Qwen bundles", () => {
    expect(
      parseDotenv(
        "export FOO='quoted value' # comment\nBAR=\"line\\nbreak\"\nBAZ=plain\r\nQUX=`tick`\n# only comment\nEMPTY=\n",
      ),
    ).toEqual({
      FOO: "quoted value",
      BAR: "line\nbreak",
      BAZ: "plain",
      QUX: "tick",
      EMPTY: "",
    });
  });
});

describe("hashQwenProjectHooks", () => {
  // Vector produced by Qwen Code 0.26.9's own hashProjectHooks for this input.
  it("matches Qwen Code's hash for a known configuration", () => {
    expect(
      hashQwenProjectHooks({
        hooks: {
          UserPromptSubmit: [
            { hooks: [{ name: "b", type: "command", command: "x" }] },
          ],
        },
        env: { files: {}, settings: null },
      }),
    ).toBe("c430d8f525d3226294773391f0b3a861cda31e18a6c73356a983ac4419bb437e");
  });

  it("sorts object keys at every depth and keeps array order", () => {
    const a = hashQwenProjectHooks({
      hooks: { Z: [{ hooks: [{ type: "command", command: "x", name: "n" }] }] },
      env: { files: {}, settings: { B: "2", A: "1" } },
    });
    const b = hashQwenProjectHooks({
      hooks: { Z: [{ hooks: [{ name: "n", command: "x", type: "command" }] }] },
      env: { settings: { A: "1", B: "2" }, files: {} },
    });
    expect(a).toBe(b);
    const reordered = hashQwenProjectHooks({
      hooks: {
        Z: [
          { hooks: [{ type: "command", command: "y" }] },
          { hooks: [{ type: "command", command: "x", name: "n" }] },
        ],
      },
      env: { files: {}, settings: null },
    });
    expect(reordered).not.toBe(a);
  });
});

describe("readQwenProjectEnvFiles", () => {
  it("returns nothing without a project env file", () => {
    const root = project({ hooks: OMA_HOOKS });
    expect(
      readQwenProjectEnvFiles(root, context(scratch("oma-home-"))),
    ).toEqual({});
  });

  it("prefers .qwen/.env, then .env, keyed by the real path", () => {
    const root = project({ hooks: OMA_HOOKS });
    const home = scratch("oma-home-");
    writeFileSync(join(root, ".env"), "A=1\n");
    const envFile = Object.keys(readQwenProjectEnvFiles(root, context(home)));
    expect(envFile).toHaveLength(1);
    expect(envFile[0]?.endsWith(".env")).toBe(true);
    writeFileSync(join(root, ".qwen", ".env"), "B=2\n");
    const files = readQwenProjectEnvFiles(root, context(home));
    expect(Object.keys(files)).toHaveLength(1);
    expect(Object.values(files)[0]).toEqual({ B: "2" });
  });

  it("ignores env files outside the workspace (a parent .env stops the walk)", () => {
    const parent = scratch("oma-parent-");
    writeFileSync(join(parent, ".env"), "OUTSIDE=1\n");
    const root = join(parent, "app");
    mkdirSync(join(root, ".qwen"), { recursive: true });
    expect(
      readQwenProjectEnvFiles(root, context(scratch("oma-home-"))),
    ).toEqual({});
  });
});

describe("isOmaManagedQwenHooks", () => {
  it("accepts only configurations whose runnable hooks are all oma hooks", () => {
    expect(isOmaManagedQwenHooks(OMA_HOOKS)).toBe(true);
    expect(
      isOmaManagedQwenHooks({
        ...OMA_HOOKS,
        Stop: [
          { hooks: [{ type: "command", command: "rm -rf /", name: "x" }] },
        ],
      }),
    ).toBe(false);
    expect(
      isOmaManagedQwenHooks({
        ...OMA_HOOKS,
        Stop: [{ hooks: [{ type: "command", command: "unnamed" }] }],
      }),
    ).toBe(false);
    // Entries Qwen would not run (no required field) do not count.
    expect(
      isOmaManagedQwenHooks({
        ...OMA_HOOKS,
        Stop: [{ hooks: [{ type: "command", name: "x" }] }],
      }),
    ).toBe(true);
    expect(isOmaManagedQwenHooks({})).toBe(false);
  });
});

describe("ensureQwenHookApproval", () => {
  it("records an approval bound to the current hooks and keeps other entries", () => {
    const home = scratch("oma-home-");
    const root = project({ hooks: OMA_HOOKS, other: true });
    const path = qwenHookApprovalsPath(context(home));
    mkdirSync(join(home, ".qwen"), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({ "/other/project": { hash: "abc", status: "rejected" } }),
    );

    const result = ensureQwenHookApproval(root, context(home));

    expect(result).toEqual({ changed: true, alreadyApproved: false, path });
    const saved = JSON.parse(readFileSync(path, "utf-8"));
    expect(saved["/other/project"]).toEqual({
      hash: "abc",
      status: "rejected",
    });
    const entry = saved[normalizeQwenProjectRoot(root)];
    expect(entry.status).toBe("approved");
    expect(entry.hash).toBe(
      hashQwenProjectHooks({
        hooks: OMA_HOOKS,
        env: { files: {}, settings: null },
      }),
    );
    expect(qwenHookApprovalState(root, context(home))).toBe("approved");
    if (process.platform !== "win32")
      expect(statSync(path).mode & 0o777).toBe(0o600);

    // Idempotent.
    expect(ensureQwenHookApproval(root, context(home))).toEqual({
      changed: false,
      alreadyApproved: true,
      path,
    });
  });

  it("creates the approvals file when Qwen has not written one yet", () => {
    const home = scratch("oma-home-");
    const root = project({ hooks: OMA_HOOKS });
    const result = ensureQwenHookApproval(root, context(home));
    expect(result.changed).toBe(true);
    expect(existsSync(join(home, ".qwen", "hookApprovals.json"))).toBe(true);
  });

  it("re-approves after the hooks change and binds the hash to the env block and .env file", () => {
    const home = scratch("oma-home-");
    const root = project({ hooks: OMA_HOOKS });
    ensureQwenHookApproval(root, context(home));
    writeFileSync(join(root, ".env"), "TOKEN=1\n");
    expect(qwenHookApprovalState(root, context(home))).toBe("pending");
    expect(ensureQwenHookApproval(root, context(home)).changed).toBe(true);
    expect(qwenHookApprovalState(root, context(home))).toBe("approved");
    writeFileSync(
      join(root, ".qwen", "settings.json"),
      JSON.stringify({ hooks: OMA_HOOKS, env: { OMA_X: "1" } }),
    );
    expect(qwenHookApprovalState(root, context(home))).toBe("pending");
  });

  it("skips projects without hooks and projects with hooks oma did not write", () => {
    const home = scratch("oma-home-");
    const none = project({ mcpServers: {} });
    expect(ensureQwenHookApproval(none, context(home))).toMatchObject({
      changed: false,
      reason: expect.stringContaining("no runnable hooks"),
    });
    expect(qwenHookApprovalState(none, context(home))).toBeUndefined();

    const foreign = project({
      hooks: {
        ...OMA_HOOKS,
        Stop: [
          { hooks: [{ type: "command", command: "curl evil", name: "x" }] },
        ],
      },
    });
    expect(ensureQwenHookApproval(foreign, context(home))).toMatchObject({
      changed: false,
      reason: expect.stringContaining("oma did not write"),
    });
    expect(existsSync(join(home, ".qwen", "hookApprovals.json"))).toBe(false);
  });

  it("never overrides a rejection and never clobbers an unreadable file", () => {
    const home = scratch("oma-home-");
    const root = project({ hooks: OMA_HOOKS });
    const path = qwenHookApprovalsPath(context(home));
    mkdirSync(join(home, ".qwen"), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({
        [normalizeQwenProjectRoot(root)]: { hash: "old", status: "rejected" },
      }),
    );
    expect(ensureQwenHookApproval(root, context(home))).toMatchObject({
      changed: false,
      reason: expect.stringContaining("rejected"),
    });
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual({
      [normalizeQwenProjectRoot(root)]: { hash: "old", status: "rejected" },
    });

    writeFileSync(path, "{ not json");
    expect(ensureQwenHookApproval(root, context(home))).toMatchObject({
      changed: false,
      reason: expect.stringContaining("not valid JSON"),
    });
    expect(readFileSync(path, "utf-8")).toBe("{ not json");
    expect(qwenHookApprovalState(root, context(home))).toBe("pending");
  });
});
