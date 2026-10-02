import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { retryObservePath } from "../../state/events.js";
import { readMemoryRetryQueue } from "../../state/memory-retry-queue.js";
import type { MemoryProvider } from "../../types/memory.js";
import { drainMemoryRetryQueue } from "./retry-drain.js";

function eventLine(eventId: string, retryRemember = false): string {
  return `${JSON.stringify({
    eventId,
    ts: "2026-05-27T00:00:00.000Z",
    sid: "oma-retry-test",
    kind: "decision.made",
    writerPid: process.pid,
    payload: {
      subject: "retry",
      decision: eventId,
      rationale: "Keep the original delivery",
    },
    ...(retryRemember
      ? { memoryDelivery: { observe: true, remember: true } }
      : {}),
  })}\n`;
}

function provider(observe: MemoryProvider["observe"]): MemoryProvider {
  return {
    name: "agentmemory",
    async status() {
      return { provider: "agentmemory", reachable: true };
    },
    observe,
  };
}

describe("memory retry drain concurrency", () => {
  let projectDir: string;
  let retryPath: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-retry-drain-"));
    retryPath = retryObservePath(projectDir);
    mkdirSync(dirname(retryPath), { recursive: true });
    writeFileSync(retryPath, eventLine("first"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("preserves an event appended while observe is pending", async () => {
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async () => {
        appendFileSync(retryPath, eventLine("later"));
        return true;
      }),
    });

    const observed: string[] = [];
    const next = await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async (payload) => {
        observed.push(JSON.parse(payload.content).eventId);
        return true;
      }),
    });

    expect(observed).toEqual(["later"]);
    expect(next).toMatchObject({ total: 1, drained: 1, retained: 0 });
  });

  it("keeps writes through an already-open append descriptor", async () => {
    const fd = openSync(retryPath, "a");
    try {
      await drainMemoryRetryQueue({
        projectDir,
        provider: provider(async () => true),
      });
      appendFileSync(fd, eventLine("open-writer"));
    } finally {
      closeSync(fd);
    }

    expect(readFileSync(retryPath, "utf-8")).toContain("open-writer");
    const next = await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async () => true),
    });
    expect(next).toMatchObject({ total: 1, drained: 1 });
  });

  it("serializes simultaneous drains without observing an event twice", async () => {
    let finishFirst: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const observed: string[] = [];
    const memory = provider(async (payload) => {
      observed.push(JSON.parse(payload.content).eventId);
      await pending;
      return true;
    });

    const first = drainMemoryRetryQueue({ projectDir, provider: memory });
    const second = drainMemoryRetryQueue({ projectDir, provider: memory });
    finishFirst();
    const results = await Promise.all([first, second]);

    expect(observed).toEqual(["first"]);
    expect(results.map((result) => result.drained)).toEqual([1, 0]);
  });

  it("remembers completed observations when a later observation throws", async () => {
    appendFileSync(retryPath, eventLine("second"));
    await expect(
      drainMemoryRetryQueue({
        projectDir,
        provider: provider(async (payload) => {
          if (JSON.parse(payload.content).eventId === "second") {
            throw new Error("interrupted provider");
          }
          return true;
        }),
      }),
    ).resolves.toMatchObject({ drained: 1, retained: 1 });

    const observed: string[] = [];
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async (payload) => {
        observed.push(JSON.parse(payload.content).eventId);
        return true;
      }),
    });
    expect(observed).toEqual(["second"]);
    expect(readMemoryRetryQueue(projectDir)).toEqual([]);
  });

  it("does not apply old acknowledgements to a replacement queue", async () => {
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async () => true),
    });
    renameSync(retryPath, `${retryPath}.old`);
    writeFileSync(retryPath, eventLine("first"));

    expect(
      await drainMemoryRetryQueue({
        projectDir,
        provider: provider(async () => true),
      }),
    ).toMatchObject({ total: 1, drained: 1 });
  });

  it("checks content before applying an acknowledgement at a reused offset", async () => {
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async () => true),
    });
    writeFileSync(retryPath, eventLine("other"));

    const observed: string[] = [];
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async (payload) => {
        observed.push(JSON.parse(payload.content).eventId);
        return true;
      }),
    });
    expect(observed).toEqual(["other"]);
  });

  it("recovers subsequent acknowledgements after a truncated checkpoint entry", async () => {
    appendFileSync(retryPath, eventLine("second"));
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(
        async (payload) => JSON.parse(payload.content).eventId === "first",
      ),
    });
    appendFileSync(`${retryPath}.ack.jsonl`, '{"file":');

    const result = await drainMemoryRetryQueue({
      projectDir,
      provider: provider(async () => true),
    });
    expect(result).toMatchObject({ total: 1, drained: 1 });
    expect(readMemoryRetryQueue(projectDir)).toEqual([]);
  });

  it("preserves byte offsets for UTF-8 rows", async () => {
    writeFileSync(retryPath, eventLine("한글") + eventLine("second"));
    await drainMemoryRetryQueue({
      projectDir,
      provider: provider(
        async (payload) => JSON.parse(payload.content).eventId === "second",
      ),
    });
    expect(
      readMemoryRetryQueue(projectDir).map(
        ({ line }) => JSON.parse(line).eventId,
      ),
    ).toEqual(["한글"]);
  });

  it.each(["observe", "remember"])(
    "recovers the drain lock and completed dimensions after a kill during %s",
    async (dimension) => {
      writeFileSync(
        retryPath,
        eventLine("first", dimension === "remember") +
          eventLine("second", dimension === "remember"),
      );
      const modulePath = fileURLToPath(
        new URL("./retry-drain.ts", import.meta.url),
      );
      const child = spawn(
        "bun",
        [
          "--eval",
          `import { drainMemoryRetryQueue } from ${JSON.stringify(modulePath)};
      await drainMemoryRetryQueue({
        projectDir: ${JSON.stringify(projectDir)},
        provider: {
          name: "agentmemory",
          async status() { return { provider: "agentmemory", reachable: true }; },
          async observe(payload) {
            if (JSON.parse(payload.content).eventId === "first" || ${JSON.stringify(dimension === "remember")}) return true;
            process.stdout.write("blocked\\n");
            await new Promise(() => {});
          },
          async remember(payload) {
            if (payload.content.includes(": first ")) return true;
            process.stdout.write("blocked\\n");
            await new Promise(() => {});
          }
        }
      });`,
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      let pendingDrain: ReturnType<typeof drainMemoryRetryQueue> | undefined;
      try {
        await new Promise<void>((resolve, reject) => {
          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (chunk: Buffer) => {
            stdout += chunk.toString();
            if (stdout.includes("blocked\n")) resolve();
          });
          child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
          });
          child.once("error", reject);
          child.once("exit", (code) =>
            reject(new Error(`Drain exited ${code}: ${stderr}`)),
          );
        });

        const observed: string[] = [];
        const remembered: string[] = [];
        pendingDrain = drainMemoryRetryQueue({
          projectDir,
          provider: {
            ...provider(async (payload) => {
              observed.push(JSON.parse(payload.content).eventId);
              return true;
            }),
            async remember(payload) {
              remembered.push(payload.content);
              return true;
            },
          },
        });
        await setTimeout(75);
        expect(observed).toEqual([]);
        child.kill("SIGKILL");
        await once(child, "exit");

        expect(await pendingDrain).toMatchObject({ total: 1, drained: 1 });
        expect(observed).toEqual(dimension === "remember" ? [] : ["second"]);
        expect(remembered).toEqual(
          dimension === "remember"
            ? ["Decision [retry]: second Rationale: Keep the original delivery"]
            : [],
        );
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
          await once(child, "exit");
        }
        await pendingDrain;
      }
    },
  );
});
