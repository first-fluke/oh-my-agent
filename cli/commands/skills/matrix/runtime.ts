import { type ChildProcess, spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, open, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { MATRIX_STREAM_LIMIT, parseMatrixStream } from "./stream.js";
import type { MatrixInvocation, MatrixRun } from "./types.js";

const ENVIRONMENT_KEYS = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "USER",
  "LOGNAME",
  "USERNAME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "ANTHROPIC_API_KEY",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_ORGANIZATION",
  "OPENAI_PROJECT_ID",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "no_proxy",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "NODE_EXTRA_CA_CERTS",
  "REQUESTS_CA_BUNDLE",
  "CURL_CA_BUNDLE",
] as const;

interface ProcessResult {
  output: string;
  exitCode: number | null;
  error?: string;
}

async function nativeExecutable(
  command: string,
  searchPath: string,
  cwd: string,
): Promise<string> {
  for (const entry of searchPath.split(delimiter)) {
    const candidate = resolve(cwd, entry || ".", command);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      /* Continue through the original executable search path. */
    }
  }
  throw new Error("Native CLI executable unavailable.");
}

function terminateGroup(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    if (process.platform !== "win32") process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* The process already exited. */
    }
  }
}

function execute(
  command: string,
  args: string[],
  input: MatrixInvocation,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  prompt: string,
  stdoutLimit = MATRIX_STREAM_LIMIT,
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    if (input.signal?.aborted) {
      resolve({
        output: "",
        exitCode: null,
        error: "Native CLI invocation interrupted.",
      });
      return;
    }
    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        cwd: input.workspace,
        env,
        shell: false,
        detached: process.platform !== "win32",
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch {
      resolve({
        output: "",
        exitCode: null,
        error: "Could not start native CLI.",
      });
      return;
    }
    const chunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let exitCode: number | null = null;
    let reason: string | undefined;
    let finished = false;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      clearTimeout(cleanupTimer);
      input.signal?.removeEventListener("abort", interrupt);
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
      terminateGroup(child, "SIGKILL");
      child.stdin?.destroy();
      child.stdout?.destroy();
      child.stderr?.destroy();
      let output = "";
      if (!reason) {
        try {
          output = new TextDecoder("utf-8", { fatal: true }).decode(
            Buffer.concat(chunks),
          );
        } catch {
          reason = "Native event stream contains invalid text.";
        }
      }
      resolve({ output, exitCode, ...(reason ? { error: reason } : {}) });
    };
    const stop = (error: string) => {
      if (finished || reason) return;
      reason = error;
      terminateGroup(child, "SIGTERM");
      cleanupTimer = setTimeout(finish, 200);
    };
    function interrupt() {
      stop("Native CLI invocation interrupted.");
    }
    const deadline = setTimeout(
      () => stop("Native CLI invocation timed out."),
      timeoutMs,
    );
    input.signal?.addEventListener("abort", interrupt, { once: true });
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > stdoutLimit)
        stop("Native CLI output exceeded its limit.");
      else if (!reason) chunks.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > Math.min(stdoutLimit, 1024 * 1024)) {
        stop("Native CLI output exceeded its limit.");
      }
    });
    child.once("error", () => {
      reason = "Could not start native CLI.";
      finish();
    });
    child.once("exit", (code, signal) => {
      exitCode = code;
      if (signal && !reason) reason = "Native CLI exited after a signal.";
      // Descendants can hold stdout open after the main process exits.
      terminateGroup(child, "SIGKILL");
      cleanupTimer ??= setTimeout(finish, 200);
    });
    child.once("close", finish);
    child.stdin?.on("error", () => {
      /* Early exits may close stdin first. */
    });
    child.stdin?.end(prompt);
    if (input.signal?.aborted) interrupt();
  });
}

async function copyCredential(source: string, target: string): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(
      source,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 1024 * 1024) return;
    const buffer = Buffer.alloc(1024 * 1024 + 1);
    let bytes = 0;
    while (bytes < buffer.length) {
      const read = await handle.read(
        buffer,
        bytes,
        buffer.length - bytes,
        null,
      );
      if (!read.bytesRead) break;
      bytes += read.bytesRead;
    }
    const after = await handle.stat();
    if (
      bytes > 1024 * 1024 ||
      bytes !== stat.size ||
      stat.size !== after.size ||
      stat.mtimeMs !== after.mtimeMs ||
      stat.ctimeMs !== after.ctimeMs
    ) {
      throw new Error("Credential changed while reading.");
    }
    const content = buffer.subarray(0, bytes);
    const destination = await open(target, "wx", 0o600);
    try {
      await destination.writeFile(content);
    } finally {
      await destination.close();
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ELOOP" && code !== "EISDIR") throw error;
  } finally {
    await handle?.close();
  }
}

function invocationArgs(input: MatrixInvocation): string[] {
  const args =
    input.vendor === "claude"
      ? [
          "--print",
          "--output-format",
          "stream-json",
          "--verbose",
          "--restricted",
          "--tools",
          "Read,Glob,Grep,Skill",
          "--allowedTools",
          "Read,Glob,Grep,Skill",
          "--permission-mode",
          "dontAsk",
          "--strict-mcp-config",
          "--mcp-config",
          '{"mcpServers":{}}',
          "--setting-sources",
          "",
          "--no-session-persistence",
        ]
      : [
          "--ask-for-approval",
          "never",
          "exec",
          "--json",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--ephemeral",
          "--ignore-user-config",
          "--ignore-rules",
          "--color",
          "never",
        ];
  if (input.model) args.push("--model", input.model);
  if (input.vendor === "codex") args.push("-");
  return args;
}

/** Each live invocation gets a separate credential-only home, removed in finally. */
export async function runMatrixInvocation(
  input: MatrixInvocation,
): Promise<MatrixRun> {
  const started = Date.now();
  let root: string | undefined;
  let run: MatrixRun = {
    exitCode: null,
    complete: false,
    nativeSuccess: false,
    output: "",
    reads: [],
    activations: [],
    cliVersion: null,
    model: null,
    durationMs: 0,
  };
  try {
    if (process.platform === "win32") {
      run.error =
        "Native matrix process isolation requires POSIX; use WSL on Windows.";
      return run;
    }
    if (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) {
      return { ...run, error: "Native CLI timeout is invalid." };
    }
    if (input.signal?.aborted) {
      return { ...run, error: "Native CLI invocation interrupted." };
    }
    root = await mkdtemp(join(tmpdir(), "oma-matrix-runtime-"));
    const home = join(root, "home");
    const codex = join(root, "codex");
    const claude = join(root, "claude");
    const temporary = join(root, "tmp");
    const xdg = {
      XDG_CONFIG_HOME: join(root, "config"),
      XDG_CACHE_HOME: join(root, "cache"),
      XDG_DATA_HOME: join(root, "data"),
      XDG_STATE_HOME: join(root, "state"),
      XDG_RUNTIME_DIR: join(root, "runtime"),
    };
    for (const directory of [
      home,
      codex,
      claude,
      temporary,
      ...Object.values(xdg),
    ]) {
      await mkdir(directory, { mode: 0o700 });
    }
    const source = { ...process.env, ...input.env };
    const executable = await nativeExecutable(
      input.vendor,
      source.PATH ?? "",
      input.workspace,
    );
    const originalHome = source.HOME || source.USERPROFILE || homedir();
    if (input.vendor === "codex") {
      await copyCredential(
        join(source.CODEX_HOME || join(originalHome, ".codex"), "auth.json"),
        join(codex, "auth.json"),
      );
    } else {
      await copyCredential(
        join(
          source.CLAUDE_CONFIG_DIR || join(originalHome, ".claude"),
          ".credentials.json",
        ),
        join(claude, ".credentials.json"),
      );
    }
    const env: NodeJS.ProcessEnv = {};
    for (const key of ENVIRONMENT_KEYS)
      if (source[key] !== undefined) env[key] = source[key];
    if (/^node(?:\.exe)?$/.test(basename(process.execPath))) {
      // Keep env-node launchers working when PATH includes a version-manager
      // shim whose configuration disappears with the original HOME.
      env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ""}`;
    }
    Object.assign(env, xdg, {
      HOME: home,
      USERPROFILE: home,
      CODEX_HOME: codex,
      CLAUDE_CONFIG_DIR: claude,
      APPDATA: join(root, "config"),
      LOCALAPPDATA: join(root, "data"),
      TMPDIR: temporary,
      TMP: temporary,
      TEMP: temporary,
      OMA_NO_AGENTMEMORY: "1",
      OMA_SKIP_VERSION_CHECK: "1",
      DISABLE_TELEMETRY: "1",
    });
    const remaining = () =>
      Math.max(1, input.timeoutMs - (Date.now() - started));
    const version = await execute(
      executable,
      ["--version"],
      input,
      env,
      Math.min(10_000, remaining()),
      "",
      16 * 1024,
    );
    if (version.error || version.exitCode !== 0) {
      run.error = version.error ?? "Native CLI version probe failed.";
      return run;
    }
    const versionText = version.output.trim();
    run.cliVersion = /^[\w .()+/-]{1,160}$/.test(versionText)
      ? versionText
      : null;
    if (Date.now() - started >= input.timeoutMs) {
      run.error = "Native CLI invocation timed out.";
      return run;
    }
    const result = await execute(
      executable,
      invocationArgs(input),
      input,
      env,
      remaining(),
      input.prompt,
    );
    if (result.error) {
      run.error = result.error;
      run.exitCode = result.exitCode;
      return run;
    }
    const parsed = parseMatrixStream(
      input.vendor,
      result.output,
      input.workspace,
    );
    run = {
      ...parsed,
      exitCode: result.exitCode,
      cliVersion: run.cliVersion,
      model: parsed.model,
    };
    if (result.exitCode !== 0) {
      run.nativeSuccess = false;
      run.error = "Native CLI exited unsuccessfully.";
    }
  } catch {
    run.error = "Native CLI isolation or invocation failed.";
    run.nativeSuccess = false;
  } finally {
    if (root) {
      try {
        await rm(root, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 30,
        });
      } catch {
        run.error = "Native CLI isolation cleanup failed.";
        run.nativeSuccess = false;
      }
    }
    run.durationMs = Date.now() - started;
  }
  return run;
}
