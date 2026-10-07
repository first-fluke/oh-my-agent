import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runMatrixInvocation } from "./runtime.js";
import type { MatrixVendor } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(vendor: MatrixVendor, body: string) {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "matrix-runtime-test-")),
  );
  roots.push(root);
  const bin = join(root, "bin");
  const home = join(root, "source-home");
  const workspace = join(root, "workspace");
  const codex = join(home, ".codex");
  const claude = join(home, ".claude");
  for (const directory of [bin, workspace, codex, claude])
    mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(codex, "auth.json"),
    '{"tokens":{"access_token":"fixture-credential"}}',
  );
  writeFileSync(join(codex, "config.toml"), 'model="must-not-copy"');
  writeFileSync(
    join(claude, ".credentials.json"),
    '{"claudeAiOauth":{"accessToken":"fixture-credential"}}',
  );
  writeFileSync(join(claude, "settings.json"), '{"hooks":{"mustNotRun":true}}');
  writeFileSync(join(home, "AGENTS.md"), "must-not-copy");
  const script = `#!${process.execPath}\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { spawn } from 'node:child_process';\nif (process.argv.includes('--version')) { console.log('${vendor}-fixture 1.0.0'); process.exit(0); }\nconst prompt=fs.readFileSync(0,'utf8');\n${body}\n`;
  const sourceFile = join(root, "fixture.mjs");
  writeFileSync(sourceFile, script);
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  writeFileSync(
    join(bin, vendor),
    `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s\\n' '${vendor}-fixture 1.0.0'; exit 0; fi\nexec ${quote(process.execPath)} ${quote(sourceFile)} "$@"\n`,
    { mode: 0o755 },
  );
  return {
    root,
    sourceFile,
    workspace,
    home,
    codex,
    claude,
    input: {
      vendor,
      workspace,
      prompt: "--literal task prompt",
      timeoutMs: 10_000,
      env: {
        PATH: `${bin}${delimiter}${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
        HOME: home,
        CODEX_HOME: codex,
        CLAUDE_CONFIG_DIR: claude,
        NODE_OPTIONS: "--invalid-inherited-option",
        BASH_ENV: "/do/not/source",
        CLAUDE_CODE_SAFE_MODE: "1",
        ANTHROPIC_BASE_URL: "https://do-not-inherit.invalid",
        OPENAI_BASE_URL: "https://do-not-inherit.invalid",
        OMA_NO_AGENTMEMORY: "0",
        ANTHROPIC_API_KEY: "fixture-key",
      },
    },
  };
}

function finalEvent(vendor: MatrixVendor, expression: string): string {
  return vendor === "claude"
    ? `console.log(JSON.stringify({type:'result',subtype:'success',is_error:false,result:JSON.stringify(${expression})}));`
    : `console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify(${expression})}}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}));`;
}

describe.skipIf(process.platform === "win32")(
  "isolated native matrix invocation",
  () => {
    it.each(["claude", "codex"] as const)(
      "uses %s native skills, stdin, and credential-only configuration",
      async (vendor) => {
        const test = fixture(
          vendor,
          `
const snapshot={
  prompt,args:process.argv.slice(2),home:process.env.HOME,codex:process.env.CODEX_HOME,claude:process.env.CLAUDE_CONFIG_DIR,
  configFiles:fs.readdirSync(process.env.${vendor === "codex" ? "CODEX_HOME" : "CLAUDE_CONFIG_DIR"}),
  authExists:fs.existsSync(path.join(process.env.${vendor === "codex" ? "CODEX_HOME" : "CLAUDE_CONFIG_DIR"},'${vendor === "codex" ? "auth.json" : ".credentials.json"}')),
  controlKeys:Object.keys(process.env).filter(k=>['NODE_OPTIONS','BASH_ENV','CLAUDE_CODE_SAFE_MODE','ANTHROPIC_BASE_URL','OPENAI_BASE_URL'].includes(k)),
  memory:process.env.OMA_NO_AGENTMEMORY,keyPresent:process.env.ANTHROPIC_API_KEY==='fixture-key'
};
${finalEvent(vendor, "snapshot")}`,
        );
        const run = await runMatrixInvocation({
          ...test.input,
          model: "fixture-model",
        });
        expect(run).toMatchObject({
          exitCode: 0,
          complete: true,
          nativeSuccess: true,
          model: null,
          cliVersion: `${vendor}-fixture 1.0.0`,
        });
        const snapshot = JSON.parse(run.output);
        expect(snapshot.prompt).toBe("--literal task prompt");
        expect(snapshot.controlKeys).toEqual([]);
        expect(snapshot.memory).toBe("1");
        expect(snapshot.keyPresent).toBe(true);
        expect(snapshot.authExists).toBe(true);
        expect(snapshot.configFiles).toEqual([
          vendor === "codex" ? "auth.json" : ".credentials.json",
        ]);
        for (const directory of [
          snapshot.home,
          snapshot.codex,
          snapshot.claude,
        ])
          expect(existsSync(directory)).toBe(false);
        expect(snapshot.args).toContain("--model");
        expect(snapshot.args).not.toContain("--agent");
        expect(snapshot.args).not.toContain(test.input.prompt);
        if (vendor === "claude") {
          expect(snapshot.args).toEqual(
            expect.arrayContaining([
              "--restricted",
              "--strict-mcp-config",
              "--no-session-persistence",
              "--tools",
              "Read,Glob,Grep,Skill",
              "--setting-sources",
              "",
            ]),
          );
          expect(snapshot.args).not.toContain("--disable-slash-commands");
          expect(snapshot.args).not.toContain("--safe-mode");
          expect(snapshot.args).not.toContain("--bare");
        } else {
          expect(snapshot.args).toEqual(
            expect.arrayContaining([
              "--ask-for-approval",
              "never",
              "exec",
              "--json",
              "--sandbox",
              "read-only",
              "--ephemeral",
              "--ignore-user-config",
              "--ignore-rules",
              "-",
            ]),
          );
        }
        expect(readFileSync(join(test.codex, "config.toml"), "utf8")).toContain(
          "must-not-copy",
        );
      },
    );

    it("does not follow symlinked credential files", async () => {
      const test = fixture(
        "codex",
        finalEvent(
          "codex",
          "{authExists:fs.existsSync(path.join(process.env.CODEX_HOME,'auth.json'))}",
        ),
      );
      rmSync(join(test.codex, "auth.json"));
      const target = join(test.root, "credential-target.json");
      writeFileSync(target, '{"tokens":{"access_token":"fixture"}}');
      symlinkSync(target, join(test.codex, "auth.json"));
      const run = await runMatrixInvocation(test.input);
      expect(run.nativeSuccess).toBe(true);
      expect(JSON.parse(run.output).authExists).toBe(false);
    });

    it("launches an env-node CLI without using a HOME-dependent PATH shim", async () => {
      const test = fixture("codex", finalEvent("codex", "{ok:true}"));
      const launcher = join(test.root, "bin", "codex");
      writeFileSync(
        launcher,
        readFileSync(test.sourceFile, "utf8").replace(
          /^#![^\n]+/,
          "#!/usr/bin/env node",
        ),
        { mode: 0o755 },
      );
      writeFileSync(join(test.root, "bin", "node"), "#!/bin/sh\nexit 99\n", {
        mode: 0o755,
      });
      const run = await runMatrixInvocation(test.input);
      expect(run.nativeSuccess).toBe(true);
      expect(JSON.parse(run.output)).toEqual({ ok: true });
    });

    it.skipIf(process.platform === "win32")(
      "does not block on a credential FIFO",
      async () => {
        const test = fixture(
          "codex",
          finalEvent(
            "codex",
            "{authExists:fs.existsSync(path.join(process.env.CODEX_HOME,'auth.json'))}",
          ),
        );
        rmSync(join(test.codex, "auth.json"));
        execFileSync("mkfifo", [join(test.codex, "auth.json")]);
        const run = await runMatrixInvocation(test.input);
        expect(run.nativeSuccess).toBe(true);
        expect(JSON.parse(run.output).authExists).toBe(false);
        expect(run.durationMs).toBeLessThan(10_000);
      },
    );

    it("rejects process failure despite a successful terminal event and keeps stderr private", async () => {
      const test = fixture(
        "claude",
        `${finalEvent("claude", "{ok:true}")}process.stderr.write('PRIVATE-TRANSCRIPT');process.exitCode=7;`,
      );
      const run = await runMatrixInvocation(test.input);
      expect(run.exitCode).toBe(7);
      expect(run.nativeSuccess).toBe(false);
      expect(run.error).toBe("Native CLI exited unsuccessfully.");
      expect(JSON.stringify(run)).not.toContain("PRIVATE-TRANSCRIPT");
    });

    it("rejects malformed output and missing terminal events", async () => {
      const malformed = fixture(
        "codex",
        "console.log('PRIVATE-TRANSCRIPT invalid event');",
      );
      const run = await runMatrixInvocation(malformed.input);
      expect(run.complete).toBe(false);
      expect(run.error).toBe("Native event stream is malformed or truncated.");
      expect(JSON.stringify(run)).not.toContain("PRIVATE-TRANSCRIPT");
    });

    it("rejects invalid UTF-8 rather than replacing native evidence bytes", async () => {
      const test = fixture(
        "codex",
        "process.stdout.write(Buffer.from([0xff,0x0a]));",
      );
      const run = await runMatrixInvocation(test.input);
      expect(run.error).toBe("Native event stream contains invalid text.");
      expect(run.output).toBe("");
    });

    it.each(["stdout", "stderr"] as const)(
      "bounds %s without returning captured text",
      async (streamName) => {
        const test = fixture(
          "codex",
          `process.${streamName}.write('PRIVATE-TRANSCRIPT'.repeat(300000));setInterval(()=>{},1000);`,
        );
        const run = await runMatrixInvocation(test.input);
        expect(run.nativeSuccess).toBe(false);
        expect(run.error).toBe("Native CLI output exceeded its limit.");
        expect(run.output).toBe("");
        expect(JSON.stringify(run)).not.toContain("PRIVATE-TRANSCRIPT");
      },
    );

    it("times out, kills descendants, and removes isolated state", async () => {
      const test = fixture(
        "codex",
        `
fs.writeFileSync('runtime-home',process.env.HOME);
const descendant=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});
fs.writeFileSync('descendant-pid',String(descendant.pid));
setInterval(()=>{},1000);`,
      );
      writeFileSync(
        join(test.root, "bin", "codex"),
        '#!/bin/sh\nif [ "$1" = "--version" ]; then printf \'codex-fixture 1.0.0\\n\'; exit 0; fi\nprintf \'%s\' "$HOME" > runtime-home\n/bin/sleep 60 &\nprintf \'%s\' "$!" > descendant-pid\nwait\n',
        { mode: 0o755 },
      );
      const run = await runMatrixInvocation({ ...test.input, timeoutMs: 1000 });
      expect(run.error).toBe("Native CLI invocation timed out.");
      expect(run.durationMs).toBeLessThan(3000);
      expect(
        existsSync(readFileSync(join(test.workspace, "runtime-home"), "utf8")),
      ).toBe(false);
      const pid = Number(
        readFileSync(join(test.workspace, "descendant-pid"), "utf8"),
      );
      await new Promise((done) => setTimeout(done, 50));
      expect(() => process.kill(pid, 0)).toThrow();
    });

    it("aborts an active process and restores signal listeners", async () => {
      const test = fixture(
        "claude",
        "fs.writeFileSync('runtime-home',process.env.HOME);setInterval(()=>{},1000);",
      );
      writeFileSync(
        join(test.root, "bin", "claude"),
        '#!/bin/sh\nif [ "$1" = "--version" ]; then printf \'claude-fixture 1.0.0\\n\'; exit 0; fi\nprintf \'%s\' "$HOME" > runtime-home\n/bin/sleep 60\n',
        { mode: 0o755 },
      );
      const signal = new AbortController();
      const before = process.listenerCount("SIGINT");
      const running = runMatrixInvocation({
        ...test.input,
        signal: signal.signal,
      });
      const readyDeadline = Date.now() + 5000;
      while (
        !existsSync(join(test.workspace, "runtime-home")) &&
        Date.now() < readyDeadline
      ) {
        await new Promise((done) => setTimeout(done, 20));
      }
      signal.abort();
      const run = await running;
      expect(run.error).toBe("Native CLI invocation interrupted.");
      expect(process.listenerCount("SIGINT")).toBe(before);
      expect(
        existsSync(readFileSync(join(test.workspace, "runtime-home"), "utf8")),
      ).toBe(false);
    });

    it("includes a stalled version probe in the cell deadline and cleans its home", async () => {
      const test = fixture("codex", finalEvent("codex", "{ok:true}"));
      writeFileSync(
        join(test.root, "bin", "codex"),
        "#!/bin/sh\nprintf '%s' \"$HOME\" > runtime-home\n/bin/sleep 60\n",
        { mode: 0o755 },
      );
      const run = await runMatrixInvocation({ ...test.input, timeoutMs: 1000 });
      expect(run.error).toBe("Native CLI invocation timed out.");
      expect(run.cliVersion).toBeNull();
      expect(run.complete).toBe(false);
      expect(
        existsSync(readFileSync(join(test.workspace, "runtime-home"), "utf8")),
      ).toBe(false);
    });

    it("does not launch a vendor when already aborted", async () => {
      const signal = new AbortController();
      signal.abort();
      const run = await runMatrixInvocation({
        vendor: "codex",
        workspace: "/unavailable",
        prompt: "task",
        timeoutMs: 1000,
        signal: signal.signal,
      });
      expect(run.error).toBe("Native CLI invocation interrupted.");
      expect(run.cliVersion).toBeNull();
    });
  },
);

import { execFileSync } from "node:child_process";
