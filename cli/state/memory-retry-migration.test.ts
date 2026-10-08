import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectIdentity } from "../../.agents/hooks/core/session-storage.ts";
import type { MemoryProvider } from "../types/memory.js";
import { createMemoryDeliveryTarget } from "./memory-delivery-target.js";
import { migrateMemoryRetry } from "./memory-retry-migration.js";
import {
  parseMemoryRetryLine,
  readMemoryRetryEntries,
  readMemoryRetryQueue,
  retryObservePath,
} from "./memory-retry-queue.js";

const intercept = vi.hoisted(() => ({
  archive: undefined as (() => void) | undefined,
  publish: undefined as (() => void) | undefined,
}));
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  return {
    ...fs,
    linkSync: (...args: Parameters<typeof fs.linkSync>) => {
      fs.linkSync(...args);
      if (String(args[1]).includes("migration-unbound")) {
        const callback = intercept.archive;
        intercept.archive = undefined;
        callback?.();
      }
    },
    writeFileSync: (...args: Parameters<typeof fs.writeFileSync>) => {
      fs.writeFileSync(...args);
      if (
        typeof args[0] === "number" &&
        typeof args[1] === "string" &&
        args[1].includes('"memoryTarget"')
      ) {
        const callback = intercept.publish;
        intercept.publish = undefined;
        callback?.();
      }
    },
  };
});

const memory: MemoryProvider = {
  name: "agentmemory",
  deliveryIdentity: { endpoint: "http://127.0.0.1:3111" },
  status: async () => ({ provider: "agentmemory", reachable: true }),
  observe: vi.fn(async () => true),
};

function event(eventId = "migration-event") {
  return {
    eventId,
    sid: "migration-session",
    kind: "decision.made",
    ts: "2026-10-08T00:00:00.000Z",
    writerPid: process.pid,
    payload: {
      subject: "migration",
      decision: "Preserve the original fact",
      rationale: "Preserve delivery ownership",
    },
  };
}

describe("explicit retry migration", () => {
  let root: string;
  let source: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-retry-migration-"));
    source = join(
      projectIdentity(root).projectDir,
      ".agents/state/retry/observe.jsonl",
    );
    mkdirSync(dirname(source), { recursive: true });
  });
  afterEach(() => {
    intercept.archive = undefined;
    intercept.publish = undefined;
    vi.clearAllMocks();
    rmSync(root, { recursive: true, force: true });
  });
  function targeted(eventId = "migration-event") {
    return {
      ...event(eventId),
      memoryDelivery: { observe: true, remember: true },
      memoryTarget: createMemoryDeliveryTarget(root, memory),
    };
  }
  function physicalAck(
    offset: number,
    line: string,
    dimension?: "observe" | "remember",
  ) {
    const stat = statSync(source);
    return JSON.stringify({
      file: `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`,
      offset,
      hash: createHash("sha256").update(line).digest("hex"),
      ...(dimension ? { dimension } : {}),
    });
  }

  it("archives targetless rows and raw ACKs without activating or deleting them", async () => {
    const raw = `${JSON.stringify(event())}\n`;
    writeFileSync(source, raw);
    const ack = `${physicalAck(0, raw.trim(), "observe")}\n`;
    writeFileSync(`${source}.ack.jsonl`, ack);
    const result = await migrateMemoryRetry({ projectDir: root });
    expect(result[0]?.status).toBe("quarantined");
    const archive = result[0]?.destination;
    if (!archive) throw new Error("Expected the raw snapshot destination");
    expect(readFileSync(join(archive, "observe.jsonl"), "utf-8")).toBe(raw);
    expect(
      readFileSync(join(archive, "observe.jsonl.ack.jsonl"), "utf-8"),
    ).toBe(ack);
    expect(readFileSync(source, "utf-8")).toBe(raw);
    const manifest = JSON.parse(
      readFileSync(join(archive, "snapshot.json"), "utf-8"),
    );
    const stat = statSync(source);
    expect(manifest.files[0]).toMatchObject({
      name: "observe.jsonl",
      identity: `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`,
      sha256: createHash("sha256").update(raw).digest("hex"),
    });
    expect(readMemoryRetryQueue(root)).toEqual([]);
    expect(existsSync(retryObservePath(root))).toBe(false);
    expect(memory.observe).not.toHaveBeenCalled();
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "unchanged", destination: archive },
    ]);
  });

  it("converts physical partial and all ACKs without re-sending completed operations", async () => {
    const partial = JSON.stringify(targeted("부분"));
    const complete = JSON.stringify(targeted("complete"));
    writeFileSync(source, `${partial}\n${complete}\n`);
    writeFileSync(
      `${source}.ack.jsonl`,
      `${physicalAck(0, partial, "observe")}\n${physicalAck(Buffer.byteLength(`${partial}\n`), complete)}\n`,
    );
    const result = await migrateMemoryRetry({ projectDir: root });
    expect(result[0]?.status).toBe("copied");
    const pending = readMemoryRetryQueue(root);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.delivered).toEqual(["observe"]);
    expect(parseMemoryRetryLine(pending[0]?.line ?? "")?.event.eventId).toBe(
      "부분",
    );
    expect(readMemoryRetryEntries(root)).toHaveLength(2);
    const before = readFileSync(retryObservePath(root));
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "unchanged" },
    ]);
    expect(readFileSync(retryObservePath(root))).toEqual(before);
    const receipts = readFileSync(
      `${retryObservePath(root)}.ack.jsonl`,
      "utf-8",
    )
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(receipts).toHaveLength(3);
    expect(
      receipts.every(
        (receipt) =>
          Object.keys(receipt).sort().join() === "deliveryId,dimension",
      ),
    ).toBe(true);
  });

  it("preserves original targets rather than assigning the currently selected endpoint", async () => {
    const row = targeted();
    row.memoryTarget.destination.endpoint = "http://127.0.0.1:4555";
    writeFileSync(source, `${JSON.stringify(row)}\n`);
    await migrateMemoryRetry({ projectDir: root });
    expect(readMemoryRetryQueue(root)[0]?.target).toEqual(row.memoryTarget);
    expect(memory.observe).not.toHaveBeenCalled();
  });

  it("leaves all storage untouched during dry-run and defers non-default profiles", async () => {
    writeFileSync(source, `${JSON.stringify(event())}\n`);
    const before = readdirSync(dirname(source));
    const homeRetry = dirname(retryObservePath(root));
    expect(
      await migrateMemoryRetry({ projectDir: root, dryRun: true }),
    ).toMatchObject([{ status: "quarantined" }]);
    expect(readdirSync(dirname(source))).toEqual(before);
    expect(existsSync(homeRetry)).toBe(false);
    process.env.OMA_PROFILE = "1";
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "deferred" },
    ]);
    expect(readdirSync(dirname(source))).toEqual(before);
  });

  it("returns no migration entries for an empty source in a non-default profile", async () => {
    process.env.OMA_PROFILE = "1";
    expect(await migrateMemoryRetry({ projectDir: root })).toEqual([]);
    expect(readdirSync(dirname(source))).toEqual([]);
    expect(existsSync(dirname(retryObservePath(root)))).toBe(false);
  });

  it("quarantines malformed rows, partial tails and malformed ACKs", async () => {
    const raw = `broken-json\n${JSON.stringify(targeted())}`;
    writeFileSync(source, raw);
    writeFileSync(`${source}.ack.jsonl`, '{"file":');
    const result = await migrateMemoryRetry({ projectDir: root });
    expect(result[0]?.status).toBe("quarantined");
    expect(result[0]?.reason).toContain("3 malformed/tail");
    expect(readMemoryRetryQueue(root)).toEqual([]);
    const destination = result[0]?.destination;
    if (!destination) throw new Error("Expected quarantine destination");
    expect(readFileSync(join(destination, "observe.jsonl"), "utf-8")).toBe(raw);
  });

  it("does not overwrite a conflicting immutable snapshot or active event", async () => {
    writeFileSync(source, `${JSON.stringify(event())}\n`);
    const [archived] = await migrateMemoryRetry({ projectDir: root });
    if (!archived?.destination) throw new Error("Expected snapshot");
    writeFileSync(join(archived.destination, "observe.jsonl"), "tampered");
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "conflict" },
    ]);
    expect(
      readFileSync(join(archived.destination, "observe.jsonl"), "utf-8"),
    ).toBe("tampered");
    const row = targeted();
    writeFileSync(source, `${JSON.stringify(row)}\n`);
    const destination = retryObservePath(root);
    const changed = {
      ...row,
      payload: { ...row.payload, decision: "Conflicting event" },
    };
    writeFileSync(destination, `${JSON.stringify(changed)}\n`);
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "conflict" },
    ]);
    expect(readFileSync(destination, "utf-8")).toBe(
      `${JSON.stringify(changed)}\n`,
    );
  });

  it("rejects source and destination symlink escapes", async () => {
    const outside = join(root, "outside");
    mkdirSync(outside);
    writeFileSync(
      join(outside, "observe.jsonl"),
      `${JSON.stringify(event())}\n`,
    );
    rmSync(dirname(source), { recursive: true });
    symlinkSync(outside, dirname(source));
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "conflict" },
    ]);
    rmSync(dirname(source));
    mkdirSync(dirname(source));
    writeFileSync(source, `${JSON.stringify(event())}\n`);
    const homeRetry = dirname(retryObservePath(root));
    mkdirSync(homeRetry, { recursive: true });
    symlinkSync(outside, join(homeRetry, "migration-unbound"));
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "conflict" },
    ]);
    expect(readdirSync(outside)).toEqual(["observe.jsonl"]);
  });

  it("defers while the legacy drain lease is held", async () => {
    writeFileSync(source, `${JSON.stringify(targeted())}\n`);
    const require = createRequire(import.meta.url);
    const Database = require("better-sqlite3") as new (
      path: string,
    ) => { exec(sql: string): void; close(): void };
    const lock = new Database(`${source}.drain-lock.sqlite`);
    lock.exec("BEGIN IMMEDIATE");
    try {
      expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
        { status: "deferred" },
      ]);
      expect(readMemoryRetryQueue(root)).toEqual([]);
    } finally {
      lock.exec("ROLLBACK");
      lock.close();
    }
  });

  it("defers source writes during archiving and rolls back only its own publication", async () => {
    writeFileSync(source, `${JSON.stringify(targeted())}\n`);
    intercept.archive = () =>
      appendFileSync(source, `${JSON.stringify(event("later"))}\n`);
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "deferred" },
    ]);
    expect(readMemoryRetryQueue(root)).toEqual([]);
    intercept.publish = () =>
      appendFileSync(source, `${JSON.stringify(event("later-again"))}\n`);
    expect(await migrateMemoryRetry({ projectDir: root })).toMatchObject([
      { status: "deferred" },
    ]);
    expect(readMemoryRetryQueue(root)).toEqual([]);
    expect(existsSync(retryObservePath(root))).toBe(false);
  });

  it("never truncates an unexpected HOME writer append during rollback", async () => {
    writeFileSync(source, `${JSON.stringify(targeted())}\n`);
    const foreignAppend = `${JSON.stringify(targeted("concurrent-home"))}\n`;
    intercept.publish = () => {
      appendFileSync(retryObservePath(root), foreignAppend);
      appendFileSync(source, `${JSON.stringify(event("concurrent-source"))}\n`);
    };
    const result = await migrateMemoryRetry({ projectDir: root });
    expect(result[0]?.status).toBe("conflict");
    expect(result[0]?.reason).toContain("will not remove another writer");
    expect(readFileSync(retryObservePath(root), "utf-8")).toContain(
      foreignAppend,
    );
  });
});
