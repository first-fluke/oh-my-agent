import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acquireOwnedDirectoryLock } from "../utils/owned-directory-lock.js";
import { migrateGlobalServices } from "./global-home-service-migration.js";

let home: string;
let destination: string;
function file(path: string, content: string) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}
function migrate(
  extra: Partial<Parameters<typeof migrateGlobalServices>[0]> = {},
) {
  return migrateGlobalServices({
    homeDir: home,
    destinationHome: destination,
    isProcessAlive: () => false,
    listProcesses: () => "",
    ...extra,
  });
}
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "oma-service-migrate-"));
  destination = join(home, ".oma");
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("global service migration", () => {
  it("defers a vault merge held by a normal writer and retries without dropping existing keys", async () => {
    file(
      join(home, ".config/oma/vault-index.json"),
      JSON.stringify({
        version: 1,
        entries: [{ name: "old", createdAt: "old" }],
      }),
    );
    const target = join(destination, "state/vault-index.json");
    file(
      target,
      JSON.stringify({
        version: 1,
        entries: [{ name: "current", createdAt: "new" }],
      }),
    );
    const lock = acquireOwnedDirectoryLock(`${target}.lock`);
    expect(lock.ok).toBe(true);
    if (!lock.ok) return;
    try {
      expect((await migrate()).deferred.join(" ")).toContain(
        "Vault index is being updated",
      );
      expect(
        JSON.parse(readFileSync(target, "utf8")).entries.map(
          (entry: { name: string }) => entry.name,
        ),
      ).toEqual(["current"]);
    } finally {
      lock.release();
    }
    expect((await migrate()).conflicts).toEqual([]);
    expect(
      JSON.parse(readFileSync(target, "utf8")).entries.map(
        (entry: { name: string }) => entry.name,
      ),
    ).toEqual(["current", "old"]);
  });

  it("does not trust a symlink receipt or copy from a symlink legacy config root", async () => {
    file(join(home, ".agents/backup/a"), "old");
    const outside = join(home, "receipt.json");
    file(
      outside,
      JSON.stringify({
        version: 1,
        sourceHome: home,
        destinationHome: destination,
        area: "backup",
      }),
    );
    const hash = createHash("sha256").update(home).digest("hex").slice(0, 16);
    const receipt = join(
      destination,
      "state/migrations",
      `services-${hash}-backup.json`,
    );
    mkdirSync(join(receipt, ".."), { recursive: true });
    symlinkSync(outside, receipt);
    expect((await migrate()).copied).toContain(join(destination, "backup/a"));
    expect(readFileSync(outside, "utf8")).not.toContain("completedAt");
    file(join(home, "external/vault-index.json"), '{"version":1,"entries":[]}');
    mkdirSync(join(home, ".config"), { recursive: true });
    symlinkSync(join(home, "external"), join(home, ".config/oma"));
    expect((await migrate()).conflicts.join(" ")).toContain(
      "Unsafe legacy source root",
    );
    expect(existsSync(join(destination, "state/vault-index.json"))).toBe(false);
  });

  it.each([".agents/schedule", ".config/oma", ".agents/backup/nested"])(
    "rejects a destination overlapping legacy %s before writing",
    async (relative) => {
      file(join(home, ".agents/backup/original"), "keep");
      const target = join(home, relative);
      const result = await migrate({ destinationHome: target });
      expect(result.conflicts.join(" ")).toContain("overlap");
      expect(existsSync(join(target, "state/migrations"))).toBe(false);
      expect(readFileSync(join(home, ".agents/backup/original"), "utf8")).toBe(
        "keep",
      );
    },
  );

  it("defers unregistered HTTP daemons and all Serena log files", async () => {
    file(join(home, ".config/oma/serena-daemon-18500.log"), "running");
    const result = await migrate({
      listProcesses: () =>
        "12345 python serena start-mcp-server --transport streamable-http --port 18500",
    });
    expect(result.deferred.join(" ")).toContain("Legacy Serena");
    expect(
      existsSync(join(destination, "state/serena/serena-daemon-18500.log")),
    ).toBe(false);
  });
  it("copies service state and secret env with private permissions, preserving originals", async () => {
    const registry = join(home, ".config/oma/serena-daemons.json");
    const env = join(home, ".agents/schedule/env/sch_one");
    const backup = join(home, ".agents/backup/safe-write/settings.original");
    file(registry, JSON.stringify({ root: { pid: 100, clients: [] } }));
    file(join(home, ".config/oma/serena-daemon-18500.log"), "log");
    file(
      join(home, ".config/oma/vault-index.json"),
      JSON.stringify({
        version: 1,
        entries: [{ name: "openai", createdAt: "old" }],
      }),
    );
    file(
      join(home, ".agents/schedule/schedules.json"),
      '{"version":1,"jobs":[]}',
    );
    file(env, '{"TOKEN":"secret"}');
    file(backup, "original");
    const result = await migrate();
    expect(result.conflicts).toEqual([]);
    expect(result.deferred).toEqual([]);
    expect(result.copied).toHaveLength(6);
    expect(readFileSync(registry, "utf8")).toContain('"pid":100');
    expect(readFileSync(backup, "utf8")).toBe("original");
    expect(
      readFileSync(join(destination, "schedule/env/sch_one"), "utf8"),
    ).toBe(readFileSync(env, "utf8"));
    if (process.platform !== "win32") {
      expect(
        statSync(join(destination, "schedule/env/sch_one")).mode & 0o777,
      ).toBe(0o600);
      expect(statSync(join(destination, "schedule/env")).mode & 0o777).toBe(
        0o700,
      );
      expect(
        statSync(join(destination, "state/vault-index.json")).mode & 0o777,
      ).toBe(0o600);
    }
  });

  it("does not overwrite conflicts and can retry after destination reconciliation", async () => {
    file(join(home, ".agents/backup/a"), "old");
    file(join(destination, "backup/a"), "new");
    expect((await migrate()).conflicts).toHaveLength(1);
    expect(readFileSync(join(destination, "backup/a"), "utf8")).toBe("new");
    file(join(destination, "backup/a"), "old");
    expect((await migrate()).conflicts).toEqual([]);
    file(join(destination, "backup/a"), "edited after migration");
    expect(await migrate()).toEqual({
      copied: [],
      conflicts: [],
      deferred: [],
    });
    expect(readFileSync(join(destination, "backup/a"), "utf8")).toBe(
      "edited after migration",
    );
  });

  it("merges vault keys without replacing existing key metadata", async () => {
    file(
      join(home, ".config/oma/vault-index.json"),
      JSON.stringify({
        version: 1,
        entries: [
          { name: "same", createdAt: "old" },
          { name: "added", createdAt: "old" },
        ],
      }),
    );
    const target = join(destination, "state/vault-index.json");
    file(
      target,
      JSON.stringify({
        version: 1,
        entries: [{ name: "same", createdAt: "new" }],
      }),
    );
    expect((await migrate()).conflicts).toEqual([]);
    expect(JSON.parse(readFileSync(target, "utf8")).entries).toEqual([
      { name: "same", createdAt: "new" },
      { name: "added", createdAt: "old" },
    ]);
    expect((await migrate()).copied).toEqual([]);
  });

  it.each(["daemon", "client"])(
    "defers every Serena file while an old %s is live",
    async (kind) => {
      file(
        join(home, ".config/oma/serena-daemons.json"),
        JSON.stringify({
          root: {
            pid: kind === "daemon" ? 101 : 100,
            clients: kind === "client" ? [101] : [],
          },
        }),
      );
      file(join(home, ".config/oma/serena-daemon-18500.log"), "live log");
      file(
        join(home, ".config/oma/vault-index.json"),
        '{"version":1,"entries":[]}',
      );
      const result = await migrate({ isProcessAlive: (pid) => pid === 101 });
      expect(result.deferred.join(" ")).toContain("Serena");
      expect(
        existsSync(join(destination, "state/serena/serena-daemons.json")),
      ).toBe(false);
      expect(
        existsSync(join(destination, "state/serena/serena-daemon-18500.log")),
      ).toBe(false);
      expect(existsSync(join(destination, "state/vault-index.json"))).toBe(
        true,
      );
      expect((await migrate()).deferred).toEqual([]);
      expect(
        existsSync(join(destination, "state/serena/serena-daemons.json")),
      ).toBe(true);
    },
  );

  it("defers schedule files for legacy runners and active manifest owners", async () => {
    file(
      join(home, ".agents/schedule/schedules.json"),
      '{"version":1,"jobs":[]}',
    );
    let result = await migrate({
      listProcesses: () => "112 /usr/bin/bun /app/cli.ts schedule run sch_old",
    });
    expect(result.deferred.join(" ")).toContain("schedule runner");
    expect(existsSync(join(destination, "schedule/schedules.json"))).toBe(
      false,
    );
    file(
      join(home, ".agents/schedule/manifest.lock/owner-112"),
      JSON.stringify({ pid: 112, hostname: hostname() }),
    );
    result = await migrate({ isProcessAlive: (pid) => pid === 112 });
    expect(result.deferred.join(" ")).toContain("manifest lock");
    expect((await migrate()).deferred).toEqual([]);
    expect(existsSync(join(destination, "schedule/manifest.lock"))).toBe(false);
  });

  it("excludes source symlinks escaping the legacy root and unsafe destination symlinks", async () => {
    file(join(home, "outside.txt"), "private");
    mkdirSync(join(home, ".agents/backup"), { recursive: true });
    symlinkSync(join(home, "outside.txt"), join(home, ".agents/backup/escape"));
    file(join(home, ".agents/backup/safe"), "copy");
    let result = await migrate();
    expect(result.conflicts.join(" ")).toContain("Escaping source symlink");
    expect(existsSync(join(destination, "backup/escape"))).toBe(false);
    expect(readFileSync(join(destination, "backup/safe"), "utf8")).toBe("copy");
    rmSync(join(home, ".agents/backup/escape"));
    file(join(home, ".agents/backup/another"), "copy");
    symlinkSync(join(home, "outside.txt"), join(destination, "backup/another"));
    result = await migrate();
    expect(result.conflicts.join(" ")).toContain("Unsafe destination");
    expect(readFileSync(join(home, "outside.txt"), "utf8")).toBe("private");
  });

  it("dry run reports copies without creating the destination or receipts", async () => {
    file(join(home, ".agents/schedule/env/sch_one"), "secret");
    expect((await migrate({ dryRun: true })).copied).toEqual([
      join(destination, "schedule/env/sch_one"),
    ]);
    expect(existsSync(destination)).toBe(false);
  });
});
