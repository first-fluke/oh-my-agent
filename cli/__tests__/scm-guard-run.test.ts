/**
 * Pure in-process tests for the scm-guard handler's `run()` — no subprocess
 * spawn. scm-guard blocks `git add` of files matching oma-scm's
 * `forbidden_patterns` (minus `allowed_exceptions`), fail-open everywhere else.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  // No project config on disk → handler uses its embedded default patterns.
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
}));

const guard = await import("../../.agents/hooks/core/scm-guard.ts");

function runWith(command: string, toolName = "Bash") {
  return guard.run(
    {
      kind: "pre_tool",
      toolName,
      toolInput: { command },
      cwd: "/tmp/project",
    },
    { vendor: "claude", cwd: "/tmp/project" },
  );
}

describe("scm-guard run() — blocks secret staging", () => {
  it("blocks `git add .env`", async () => {
    const result = await runWith("git add .env");
    expect(result?.type).toBe("block");
    expect((result as { reason: string }).reason).toContain(".env");
  });

  it("blocks secret files mixed into a multi-path add", async () => {
    const result = await runWith("git add src/app.ts config/secrets.yaml");
    expect(result?.type).toBe("block");
    expect((result as { reason: string }).reason).toContain(
      "config/secrets.yaml",
    );
  });

  it("blocks key material in compound commands", async () => {
    const result = await runWith("cd repo && git add deploy/id_rsa && ls");
    expect(result?.type).toBe("block");
  });

  it("blocks quoted paths", async () => {
    const result = await runWith(`git add "certs/server.pem"`);
    expect(result?.type).toBe("block");
  });

  it("blocks terraform state/vars files", async () => {
    for (const f of ["prod.tfvars", "terraform.tfstate", "a.tfstate.backup"]) {
      const result = await runWith(`git add ${f}`);
      expect(result?.type).toBe("block");
    }
  });
});

describe("scm-guard run() — allows safe operations (fail-open)", () => {
  it("allows ordinary source files", async () => {
    expect(await runWith("git add src/app.ts README.md")).toBeNull();
  });

  it("allows template/example files (allowed_exceptions)", async () => {
    expect(await runWith("git add .env.example")).toBeNull();
    expect(await runWith("git add config/secrets.yaml.template")).toBeNull();
  });

  it("allows non-add git commands even when they mention secret names", async () => {
    expect(await runWith("git diff .env")).toBeNull();
    expect(await runWith("git checkout -- .env")).toBeNull();
    expect(await runWith("git status")).toBeNull();
  });

  it("allows non-git commands entirely", async () => {
    expect(await runWith("cat .env")).toBeNull();
  });

  it("does not flag secret names outside the git add segment", async () => {
    expect(await runWith("git add src/app.ts && cat .env")).toBeNull();
  });

  it("skips option tokens (broad staging stays an agent-level rule)", async () => {
    expect(await runWith("git add -A")).toBeNull();
    expect(await runWith("git add --all")).toBeNull();
  });

  it("honours the OMA_SCM_ALLOW_SECRETS=1 bypass", async () => {
    expect(await runWith("OMA_SCM_ALLOW_SECRETS=1 git add .env")).toBeNull();
  });

  it("ignores non-shell tools and non-pre_tool events", async () => {
    expect(await runWith("git add .env", "Read")).toBeNull();
    expect(
      await guard.run(
        { kind: "prompt", prompt: "git add .env", cwd: "/tmp/project" },
        { vendor: "claude", cwd: "/tmp/project" },
      ),
    ).toBeNull();
  });
});

describe("scm-guard config parsing", () => {
  it("extractYamlList parses quoted list items and stops at the next key", () => {
    const yaml = [
      "forbidden_patterns:",
      '  - "*.env"',
      "  # comment inside the list",
      '  - "id_rsa*"',
      "",
      "allowed_exceptions:",
      '  - "*.example"',
    ].join("\n");
    expect(guard.extractYamlList(yaml, "forbidden_patterns")).toEqual([
      "*.env",
      "id_rsa*",
    ]);
    expect(guard.extractYamlList(yaml, "allowed_exceptions")).toEqual([
      "*.example",
    ]);
    expect(guard.extractYamlList(yaml, "missing_key")).toBeNull();
  });
});
