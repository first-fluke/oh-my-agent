import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Step {
  name?: string;
  run?: string;
  env?: Record<string, string>;
  "timeout-minutes"?: number;
}

const repoRoot = resolve(import.meta.dirname, "../..");
const workflow = parse(
  readFileSync(
    join(repoRoot, ".github/workflows/stargazers-daily.yml"),
    "utf8",
  ),
) as { jobs: { track: { steps: Step[] } } };
const steps = workflow.jobs.track.steps;
const preflight = steps.find(
  (step) => step.name === "Verify stargazer read access",
);
if (!preflight?.run) throw new Error("Stargazer access preflight is missing");
const preflightShell = preflight.run;
const roots: string[] = [];

function run(token: string, httpStatus = "200") {
  const root = mkdtempSync(join(tmpdir(), "oma-stargazers-preflight-"));
  roots.push(root);
  const bin = join(root, "bin");
  const argsFile = join(root, "gh-args");
  const sentinel = join(root, "branch-write-reached");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh
printf '%s\\n' "$@" > "$STARGAZER_ARGS"
if [ "$STARGAZER_HTTP_STATUS" != 200 ]; then
  printf 'gh: fixture access denied (HTTP %s)\\n' "$STARGAZER_HTTP_STATUS" >&2
  exit 1
fi
printf '[{"user":{"login":"profile-must-not-be-logged"}}]\\n'
`,
    { mode: 0o755 },
  );
  const result = spawnSync(
    "/bin/bash",
    ["-c", `${preflightShell}\nprintf reached > "$STARGAZER_SENTINEL"`],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 5_000,
      env: {
        ...process.env,
        PATH: `${bin}${delimiter}${process.env.PATH ?? "/usr/bin:/bin"}`,
        GH_TOKEN: token,
        REPO: "fixture/repository",
        STARGAZER_HTTP_STATUS: httpStatus,
        STARGAZER_ARGS: argsFile,
        STARGAZER_SENTINEL: sentinel,
      },
    },
  );
  return {
    result,
    called: existsSync(argsFile),
    args: existsSync(argsFile)
      ? readFileSync(argsFile, "utf8").trim().split("\n")
      : [],
    branchWriteReached: existsSync(sentinel),
  };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe.skipIf(process.platform === "win32")(
  "stargazer access preflight",
  () => {
    it("runs before data-branch work and has a bounded host timeout", () => {
      const trackingIndex = steps.findIndex(
        (step) => step.name === "Track stargazers on orphan branch",
      );
      expect(trackingIndex).toBeGreaterThan(steps.indexOf(preflight));
      expect(preflight.env?.GH_TOKEN).toBe(
        `\${{ secrets.STARGAZERS_READ_TOKEN }}`,
      );
      expect(steps[trackingIndex]?.env?.GH_TOKEN).toBe(preflight.env?.GH_TOKEN);
      expect(preflight["timeout-minutes"]).toBeGreaterThan(0);
      expect(preflight["timeout-minutes"]).toBeLessThanOrEqual(2);
    });

    it("rejects a missing token before any API or branch/write work", () => {
      const f = run("");
      expect(f.result.error).toBeUndefined();
      expect(f.result.status).toBe(1);
      expect(f.called).toBe(false);
      expect(f.branchWriteReached).toBe(false);
      expect(f.result.stdout).toContain("STARGAZERS_READ_TOKEN is missing");
    });

    it.each(["401", "403", "404"])(
      "fails HTTP %s without continuing to branch/write work",
      (status) => {
        const f = run("fixture-secret-must-not-be-logged", status);
        expect(f.result.error).toBeUndefined();
        expect(f.result.status).toBe(1);
        expect(f.branchWriteReached).toBe(false);
        expect(f.result.stdout).toContain("STARGAZERS_READ_TOKEN cannot read");
        expect(f.result.stdout).toContain("expired or was revoked");
        expect(f.result.stdout).toContain("repository owner or collaborator");
        expect(f.result.stdout + f.result.stderr).not.toContain(
          "fixture-secret-must-not-be-logged",
        );
      },
    );

    it("checks one page of the same endpoint and suppresses profile output", () => {
      const f = run("fixture-secret-must-not-be-logged");
      expect(f.result.error).toBeUndefined();
      expect(f.result.status).toBe(0);
      expect(f.branchWriteReached).toBe(true);
      expect(f.args).toEqual([
        "api",
        "-H",
        "Accept: application/vnd.github.star+json",
        "/repos/fixture/repository/stargazers?per_page=1",
        "--silent",
      ]);
      expect(f.result.stdout).toBe("");
      expect(f.result.stderr).toBe("");
    });
  },
);
