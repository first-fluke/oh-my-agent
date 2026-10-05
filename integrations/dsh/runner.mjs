import { spawn } from "node:child_process";

function positiveInteger(value, fallback, label) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return resolved;
}

export function createHookRunner(config = {}) {
  const command = config.command ?? "oma";
  const commandArgs = config.commandArgs ?? [];
  if (typeof command !== "string" || !command.trim()) {
    throw new TypeError("command must name an executable");
  }
  if (
    !Array.isArray(commandArgs) ||
    commandArgs.some((x) => typeof x !== "string")
  ) {
    throw new TypeError("commandArgs must be an array of strings");
  }
  const timeoutMs = positiveInteger(config.timeoutMs, 10000, "timeoutMs");
  const maxOutputBytes = positiveInteger(
    config.maxOutputBytes,
    262144,
    "maxOutputBytes",
  );
  const maxInputBytes = positiveInteger(
    config.maxInputBytes,
    4194304,
    "maxInputBytes",
  );
  const active = new Set();
  let disposed = false;

  function run(event, payload, { signal, owner } = {}) {
    if (disposed || signal?.aborted) {
      return Promise.reject(new Error("OMA hook was cancelled"));
    }
    const stdin = `${JSON.stringify(payload)}\n`;
    if (Buffer.byteLength(stdin) > maxInputBytes) {
      return Promise.reject(new Error("OMA hook input exceeds maxInputBytes"));
    }
    const record = { owner, cancel: undefined, done: undefined };
    record.done = new Promise((resolve, reject) => {
      let child;
      let failure;
      let outputBytes = 0;
      let stdout = "";
      let stderr = "";
      let terminationTimer;
      let drainTimer;
      let finished = false;
      let closed = false;
      let escalated = false;
      const group = process.platform !== "win32";
      function kill(signalName) {
        if (!child?.pid) return;
        try {
          if (group) process.kill(-child.pid, signalName);
          else child.kill(signalName);
        } catch (error) {
          if (error.code !== "ESRCH") child.kill(signalName);
        }
      }
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        clearTimeout(terminationTimer);
        clearTimeout(drainTimer);
        signal?.removeEventListener("abort", abort);
        active.delete(record);
        if (error) reject(error);
        else resolve(stdout);
      }
      function terminate(error) {
        if (failure || finished) return;
        failure = error;
        kill("SIGTERM");
        terminationTimer = setTimeout(() => {
          kill("SIGKILL");
          escalated = true;
          if (closed) finish(failure);
        }, 250);
        drainTimer = setTimeout(() => {
          child?.stdin.destroy();
          child?.stdout.destroy();
          child?.stderr.destroy();
          finish(failure);
        }, 1000);
      }
      const abort = () => terminate(new Error("OMA hook was cancelled"));
      const timeout = setTimeout(() => {
        terminate(
          new Error(`OMA ${event} hook timed out after ${timeoutMs} ms`),
        );
      }, timeoutMs);
      record.cancel = abort;
      active.add(record);
      try {
        child = spawn(
          command,
          [
            ...commandArgs,
            "hook",
            "run",
            "--vendor",
            "claude",
            "--event",
            event,
          ],
          {
            cwd: payload.cwd,
            shell: false,
            detached: group,
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
          },
        );
      } catch (error) {
        finish(error);
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      child.on("error", (error) => finish(error));
      child.on("close", (code) => {
        closed = true;
        if (failure) {
          if (escalated) finish(failure);
          return;
        }
        if (code !== 0) {
          return finish(
            new Error(`OMA ${event} hook exited ${code}: ${stderr.trim()}`),
          );
        }
        finish();
      });
      for (const [stream, channel] of [
        [child.stdout, "stdout"],
        [child.stderr, "stderr"],
      ]) {
        stream.setEncoding("utf8");
        stream.on("data", (chunk) => {
          outputBytes += Buffer.byteLength(chunk);
          if (outputBytes > maxOutputBytes) {
            terminate(new Error("OMA hook output exceeds maxOutputBytes"));
            return;
          }
          if (channel === "stdout") stdout += chunk;
          else stderr += chunk;
        });
      }
      child.stdin.on("error", (error) => {
        if (error.code !== "EPIPE") terminate(error);
      });
      child.stdin.end(stdin);
    });
    return record.done;
  }

  async function cancelOwner(owner) {
    const records = [...active].filter((record) => record.owner === owner);
    for (const record of records) record.cancel();
    await Promise.allSettled(records.map((record) => record.done));
  }

  async function dispose() {
    disposed = true;
    const records = [...active];
    for (const record of records) record.cancel();
    await Promise.allSettled(records.map((record) => record.done));
  }

  return { run, cancelOwner, dispose };
}
