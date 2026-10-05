import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixtureProgram = `
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const argv = process.argv.slice(2);
const stateEmit = argv[0] === 'state' && argv[1] === 'emit';
if (!stateEmit && JSON.stringify(argv.slice(-6)) !== JSON.stringify(['hook','run','--vendor','claude','--event',argv.at(-1)])) process.exit(9);
if (stateEmit) {
  const settings = JSON.parse(readFileSync(new URL('./settings.json', import.meta.url), 'utf8'));
  appendFileSync(new URL('./announcements.jsonl', import.meta.url), JSON.stringify({ argv, cwd: process.cwd() }) + '\\n');
  process.exit(settings.noSession ? 1 : 0);
}
let text = '';
for await (const chunk of process.stdin) text += chunk;
const payload = JSON.parse(text);
const settings = JSON.parse(readFileSync(new URL('./settings.json', import.meta.url), 'utf8'));
appendFileSync(new URL('./calls.jsonl', import.meta.url), JSON.stringify({ argv, payload }) + '\\n');
if (settings.hang) {
  if (settings.descendant) {
    const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], { stdio: 'ignore' });
    writeFileSync(new URL('./descendant-pid', import.meta.url), String(child.pid));
    process.on('SIGTERM', () => process.exit(0));
  } else {
    process.on('SIGTERM', () => {});
  }
  writeFileSync(new URL('./pid', import.meta.url), String(process.pid));
  setInterval(() => {}, 1000);
} else if (settings.flood) {
  process.stdout.write('x'.repeat(settings.flood));
} else if (settings.invalid) {
  process.stdout.write('invalid json');
} else {
  const output = settings[payload.hook_event_name] ?? {};
  process.stdout.write(JSON.stringify(output));
  if (settings.exitCode) process.exitCode = settings.exitCode;
}
`;

export async function fixture(t, settings = {}, initialized = true) {
  const cwd = await mkdtemp(join(tmpdir(), "oma-dsh-test-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  if (initialized) {
    await mkdir(join(cwd, ".agents"));
    await writeFile(join(cwd, ".agents", "oma-config.yaml"), "language: en\n");
  }
  const executable = join(cwd, "hook-fixture.mjs");
  await writeFile(executable, fixtureProgram);
  await writeFile(join(cwd, "settings.json"), JSON.stringify(settings));
  return {
    cwd,
    config: {
      command: process.execPath,
      commandArgs: [executable],
      timeoutMs: 3000,
    },
    async set(next) {
      await writeFile(join(cwd, "settings.json"), JSON.stringify(next));
    },
    async calls() {
      try {
        return (await readFile(join(cwd, "calls.jsonl"), "utf8"))
          .trim()
          .split("\n")
          .map(JSON.parse);
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    },
    async announcements() {
      try {
        return (await readFile(join(cwd, "announcements.jsonl"), "utf8"))
          .trim()
          .split("\n")
          .map(JSON.parse);
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    },
    async waitStarted() {
      for (let i = 0; i < 100; i += 1) {
        try {
          return Number(await readFile(join(cwd, "pid"), "utf8"));
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error("fixture process did not start");
    },
  };
}

export function fakeAgent(cwd, id = randomUUID()) {
  const contexts = [];
  const steering = [];
  return {
    id,
    session: { header: { id, cwd } },
    contexts,
    steering,
    inject(value) {
      contexts.push(value);
    },
    steer(value) {
      steering.push(value);
    },
  };
}

export function fakeContext() {
  const handlers = new Map();
  const cleanups = [];
  const warnings = [];
  return {
    handlers,
    warnings,
    logger: {
      warn(value) {
        warnings.push(value);
      },
    },
    on(event, callback) {
      handlers.set(event, callback);
    },
    effect(callback) {
      cleanups.push(callback());
    },
    async dispose() {
      for (const cleanup of cleanups) await cleanup();
    },
  };
}

export function createUserMessage(input) {
  return Object.freeze({ id: randomUUID(), role: "user", ...input });
}

export function execution(
  agent,
  name = "bash",
  argumentsValue = { command: "pwd" },
  signal = new AbortController().signal,
) {
  return {
    agent,
    name,
    arguments: argumentsValue,
    callId: randomUUID(),
    token: Symbol(),
    signal,
  };
}
