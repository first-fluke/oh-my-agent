import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  profileSlot,
  projectIdentity,
  projectStateDir,
} from "../../.agents/hooks/core/session-storage.ts";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import { profileStateHome } from "../utils/oma-home.js";
import { AgentClaimSchema, type AgentRun, RunSchema } from "./agent-results.js";
import { atomicWriteJson } from "./events.js";
import { runtimeStateDir } from "./project-runtime.js";
import type {
  RuntimeMigrationEntry,
  RuntimeMigrationOptions,
} from "./runtime-migration-types.js";

const areas = ["agent-runs", "agent-plans", "agent-resume"] as const;
type Area = (typeof areas)[number];
interface Item {
  area: Area;
  source: string;
  destination: string;
  name: string;
  bytes: Buffer;
  originalBytes?: Buffer;
  sourceStamp?: string;
  json?: unknown;
  runId?: string;
  kind?:
    | "run"
    | "claim"
    | "output"
    | "pin"
    | "checkpoint"
    | "lease"
    | "counter";
  result?: RuntimeMigrationEntry;
}
const identity = /^[\w-]+$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function entry(
  item: Item,
  status: RuntimeMigrationEntry["status"],
  reason?: string,
): RuntimeMigrationEntry {
  return {
    area: item.area,
    source: item.source,
    destination: item.destination,
    status,
    ...(reason ? { reason } : {}),
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a JSON object");
  return value as Record<string, unknown>;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, part]) => `${JSON.stringify(key)}:${canonical(part)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function safeChain(base: string, target: string): void {
  const suffix = relative(base, target);
  if (
    isAbsolute(suffix) ||
    suffix === ".." ||
    suffix.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  )
    throw new Error("Runtime path escapes its storage root");
  let current = base;
  for (const component of ["", ...suffix.split(/[\\/]/).filter(Boolean)]) {
    if (component) current = join(current, component);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error(`Symbolic links are not migrated: ${current}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      break;
    }
  }
}
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
function stamp(path: string): string {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("Runtime source is no longer a regular file");
  return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
}
function sourceCurrent(root: string, item: Item): boolean {
  if (!item.originalBytes) return true;
  try {
    safeChain(root, item.source);
    return (
      stamp(item.source) === item.sourceStamp &&
      readFileSync(item.source).equals(item.originalBytes)
    );
  } catch {
    return false;
  }
}
function scan(root: string): {
  items: Item[];
  reports: RuntimeMigrationEntry[];
  unsafeLeaseSessions: Set<string>;
  unknownResumeOwnership: boolean;
} {
  const items: Item[] = [];
  const reports: RuntimeMigrationEntry[] = [];
  const unsafeLeaseSessions = new Set<string>();
  let unknownResumeOwnership = false;
  for (const area of areas) {
    const sourceRoot = join(root, ".agents/state", area);
    const destinationRoot = runtimeStateDir(root, area);
    try {
      safeChain(root, sourceRoot);
    } catch (error) {
      if (area === "agent-resume") unknownResumeOwnership = true;
      reports.push({
        area,
        source: sourceRoot,
        destination: destinationRoot,
        status: "conflict",
        reason: String(error),
      });
      continue;
    }
    if (!existsSync(sourceRoot)) continue;
    const visit = (source: string): void => {
      const name = relative(sourceRoot, source).replaceAll("\\", "/");
      const destination = join(destinationRoot, name);
      try {
        safeChain(sourceRoot, source);
        const stat = lstatSync(source);
        if (source === sourceRoot && !stat.isDirectory())
          throw new Error("Expected a runtime directory");
        if (stat.isDirectory()) {
          for (const child of readdirSync(source).sort())
            visit(join(source, child));
          return;
        }
        if (!stat.isFile() || stat.size > 5 * 1024 * 1024)
          throw new Error("Expected a regular runtime file of at most 5 MiB");
        const sourceStamp = stamp(source);
        const bytes = readFileSync(source);
        items.push({
          area,
          source,
          destination,
          name,
          bytes,
          originalBytes: bytes,
          sourceStamp,
        });
      } catch (error) {
        if (area === "agent-resume") {
          const lease = /^([\w-]+)\.lease\.json$/.exec(name);
          if (lease?.[1]) unsafeLeaseSessions.add(lease[1]);
          else if (source === sourceRoot) unknownResumeOwnership = true;
        }
        reports.push({
          area,
          source,
          destination,
          status: "conflict",
          reason: String(error),
        });
      }
    };
    visit(sourceRoot);
  }
  return { items, reports, unsafeLeaseSessions, unknownResumeOwnership };
}
function json(item: Item): unknown {
  item.json = JSON.parse(item.bytes.toString("utf8"));
  return item.json;
}
function sameContent(item: Item, content: Buffer): boolean {
  if (item.kind === "output") return item.bytes.equals(content);
  try {
    return (
      canonical(item.json) === canonical(JSON.parse(content.toString("utf8")))
    );
  } catch {
    return false;
  }
}
function existing(
  item: Item,
  stateRoot: string,
): RuntimeMigrationEntry | undefined {
  try {
    safeChain(stateRoot, item.destination);
    if (!existsSync(item.destination)) return undefined;
    if (!lstatSync(item.destination).isFile())
      throw new Error("Destination is not a regular file");
    return entry(
      item,
      sameContent(item, readFileSync(item.destination))
        ? "unchanged"
        : "conflict",
      "Existing destination is preserved",
    );
  } catch (error) {
    return entry(item, "conflict", String(error));
  }
}
function publish(item: Item): void {
  mkdirSync(dirname(item.destination), { recursive: true, mode: 0o700 });
  const temporary = `${item.destination}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, item.bytes, { flag: "wx", mode: 0o600 });
    const fd = openSync(temporary, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    linkSync(temporary, item.destination);
    try {
      const directory = openSync(dirname(item.destination), "r");
      try {
        fsyncSync(directory);
      } finally {
        closeSync(directory);
      }
    } catch {
      /* Directory fsync is unavailable on some filesystems. */
    }
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function migrate(root: string, dryRun: boolean): RuntimeMigrationEntry[] {
  const { items, reports, unsafeLeaseSessions, unknownResumeOwnership } =
    scan(root);
  if (profileSlot() !== "0")
    return [
      ...reports,
      ...items.map((item) =>
        entry(
          item,
          "deferred",
          "Old project runtime belongs to profile 0; select OMA_PROFILE=0",
        ),
      ),
    ];
  if (unknownResumeOwnership)
    return [
      ...reports,
      ...items.map((item) =>
        entry(
          item,
          "deferred",
          "Resume ownership cannot be inspected; all old runtime paths are preserved",
        ),
      ),
    ];
  const stateRoot = profileStateHome();
  const runs = new Map<string, AgentRun>();
  const deferredRuns = new Set<string>();
  const deferredSessions = new Set(unsafeLeaseSessions);
  const deferredLineages = new Set<string>();
  const leasedSessions = new Set(unsafeLeaseSessions);
  const sourceProject = projectIdentity(root).projectId;

  for (const item of items) {
    try {
      if (item.area === "agent-runs") {
        if (item.name === "_sequence.json") {
          item.kind = "counter";
          continue;
        }
        const match = /^([^/]+?)(\.claim\.json|\.output\.txt|\.json)$/.exec(
          item.name,
        );
        if (!match?.[1] || !uuid.test(match[1]))
          throw new Error("Unrecognized agent run filename");
        item.runId = match[1];
        item.kind =
          match[2] === ".json"
            ? "run"
            : match[2] === ".claim.json"
              ? "claim"
              : "output";
        if (item.kind !== "run") continue;
        const raw = object(json(item));
        const run = RunSchema.parse(raw);
        if (
          run.runId !== item.runId ||
          !isAbsolute(run.artifactRoot) ||
          projectIdentity(run.artifactRoot).projectId !== sourceProject
        )
          throw new Error(
            "Run identity or project ownership does not match the source",
          );
        runs.set(run.runId, run);
        if (run.status === "running") {
          deferredRuns.add(run.runId);
          deferredSessions.add(run.sessionId);
          deferredLineages.add(run.lineageId ?? run.sessionId);
          item.result = entry(
            item,
            "deferred",
            run.runnerPid && !alive(run.runnerPid)
              ? "Running receipt has a dead PID but its old claim path needs explicit resolution"
              : "Running receipt has a live or unknown owner; old claim path is preserved",
          );
        }
      } else if (item.area === "agent-resume") {
        const match = /^([\w-]+)(\.lease)?\.json$/.exec(item.name);
        if (!match?.[1]) throw new Error("Unrecognized resume filename");
        const sid = match[1];
        const raw = object(json(item));
        item.kind = match[2] ? "lease" : "checkpoint";
        if (item.kind === "lease") {
          const localDead =
            raw.host === hostname() &&
            typeof raw.pid === "number" &&
            Number.isSafeInteger(raw.pid) &&
            raw.pid > 0 &&
            !alive(raw.pid);
          if (!localDead) {
            leasedSessions.add(sid);
            deferredSessions.add(sid);
            item.result = entry(
              item,
              "deferred",
              "Resume lease has a live, remote, or unknown coordinator",
            );
          }
          if (typeof raw.token !== "string" || !raw.token)
            throw new Error("Invalid resume lease token");
        } else if (
          raw.sessionId !== sid ||
          !Array.isArray(raw.tasks) ||
          typeof raw.ok !== "boolean"
        )
          throw new Error("Invalid resume checkpoint");
      } else {
        const match = /^(sessions|lineages)\/([\w-]+)\.json$/.exec(item.name);
        if (!match?.[2]) throw new Error("Unrecognized plan pin filename");
        const raw = object(json(item));
        if (
          typeof raw.lineageId !== "string" ||
          !identity.test(raw.lineageId) ||
          typeof raw.hash !== "string" ||
          !/^[a-f0-9]{64}$/.test(raw.hash)
        )
          throw new Error("Invalid plan pin identity/hash");
        if (match[1] === "lineages" && raw.lineageId !== match[2])
          throw new Error("Plan lineage filename does not match its identity");
        item.kind = "pin";
      }
    } catch (error) {
      if (item.area === "agent-resume" && item.name.endsWith(".lease.json")) {
        const sid = item.name.slice(0, -11);
        deferredSessions.add(sid);
        leasedSessions.add(sid);
      }
      item.result = entry(item, "conflict", String(error));
    }
  }
  const conflictRun = (run: AgentRun, reason: string): void => {
    deferredSessions.add(run.sessionId);
    deferredLineages.add(run.lineageId ?? run.sessionId);
    for (const item of items)
      if (item.runId === run.runId && !item.result)
        item.result = entry(item, "conflict", reason);
  };
  try {
    const canonicalRuns: AgentRun[] = [];
    const destinationRuns = runtimeStateDir(root, "agent-runs");
    safeChain(stateRoot, destinationRuns);
    if (existsSync(destinationRuns))
      for (const file of readdirSync(destinationRuns)) {
        if (!file.endsWith(".json") || !uuid.test(file.slice(0, -5))) continue;
        const path = join(destinationRuns, file);
        safeChain(stateRoot, path);
        const run = RunSchema.parse(JSON.parse(readFileSync(path, "utf8")));
        if (run.runId !== file.slice(0, -5))
          throw new Error(`Canonical run identity does not match ${path}`);
        canonicalRuns.push(run);
      }
    for (const run of runs.values()) {
      // A receipt already present under the same ID keeps its immutable,
      // idempotent comparison below; only newly published history can reorder it.
      if (
        canonicalRuns.some((current) => current.runId === run.runId) ||
        items.some(
          (item) =>
            item.kind === "run" && item.runId === run.runId && item.result,
        )
      )
        continue;
      if (
        [...canonicalRuns, ...runs.values()].some(
          (other) =>
            other.runId !== run.runId && other.sequence === run.sequence,
        )
      )
        conflictRun(run, "Sequence is already owned by a different run");
      else if (
        canonicalRuns.some(
          (current) =>
            !runs.has(current.runId) &&
            current.sequence < run.sequence &&
            Date.parse(current.startedAt) > Date.parse(run.startedAt),
        )
      )
        conflictRun(run, "Older legacy run would sort after a newer HOME run");
    }
  } catch (error) {
    for (const run of runs.values())
      conflictRun(
        run,
        `Canonical run ordering cannot be validated: ${String(error)}`,
      );
  }
  for (const run of runs.values())
    if (leasedSessions.has(run.sessionId)) {
      deferredRuns.add(run.runId);
      deferredLineages.add(run.lineageId ?? run.sessionId);
    }
  for (const item of items)
    if (
      item.kind === "pin" &&
      item.name.startsWith("sessions/") &&
      deferredSessions.has(item.name.slice(9, -5))
    )
      deferredLineages.add(String(object(item.json).lineageId));

  for (const item of items) {
    if (item.result || item.kind === "counter") continue;
    try {
      if (item.runId) {
        const run = runs.get(item.runId);
        if (!run)
          throw new Error("Orphan run companion has no valid source receipt");
        if (deferredRuns.has(item.runId)) {
          item.result = entry(
            item,
            "deferred",
            "Source run or its session coordinator still owns the old runtime paths",
          );
          continue;
        }
        const output = items.find(
          (candidate) =>
            candidate.area === "agent-runs" &&
            candidate.name === `${item.runId}.output.txt` &&
            !candidate.result,
        );
        if (run.output) {
          const expected = join(
            root,
            ".agents/state/agent-runs",
            `${item.runId}.output.txt`,
          );
          if (
            isAbsolute(run.output.path) ||
            run.output.path.split(/[\\/]/).includes("..") ||
            resolve(root, run.output.path) !== expected ||
            !output
          )
            throw new Error(
              "Run output escapes its source area or its referenced file is missing",
            );
          if (item.kind === "run") {
            const raw = object(item.json);
            raw.output = {
              ...object(raw.output),
              path: relative(root, output.destination),
            };
            item.bytes = Buffer.from(`${JSON.stringify(raw, null, 2)}\n`);
          }
        } else if (item.kind === "output")
          throw new Error("Orphan output is not referenced by its run");
        if (item.kind === "claim") AgentClaimSchema.parse(json(item));
      } else if (item.kind === "pin") {
        const [kind, file] = item.name.split("/");
        const id = file?.slice(0, -5) ?? "";
        if (
          (kind === "sessions" &&
            (deferredSessions.has(id) ||
              deferredLineages.has(String(object(item.json).lineageId)))) ||
          (kind === "lineages" && deferredLineages.has(id))
        ) {
          if (kind === "sessions") deferredSessions.add(id);
          item.result = entry(
            item,
            "deferred",
            "Plan pin is referenced by a deferred runtime owner",
          );
          continue;
        }
      } else if (
        item.kind === "checkpoint" &&
        deferredSessions.has(item.name.slice(0, -5))
      ) {
        item.result = entry(
          item,
          "deferred",
          "Checkpoint is referenced by a deferred runtime owner",
        );
        continue;
      }
      item.result = existing(item, stateRoot);
    } catch (error) {
      item.result = entry(item, "conflict", String(error));
    }
  }
  for (const item of items) {
    if (
      (!item.result || item.result.status === "unchanged") &&
      !sourceCurrent(root, item)
    ) {
      item.result = entry(
        item,
        "deferred",
        "Source changed after scan; retry after its writer stops",
      );
      for (const companion of items)
        if (item.runId && companion.runId === item.runId)
          companion.result = entry(
            companion,
            "deferred",
            "Run bundle changed after scan; old claim/output ownership is preserved",
          );
    }
  }
  // A companion conflict must not publish a receipt pointing at different bytes.
  const blockedBundles = new Map(
    items
      .filter((item) => item.runId && item.result?.status === "conflict")
      .map((item) => [item.runId, item.result]),
  );
  for (const item of items)
    if (
      item.runId &&
      blockedBundles.has(item.runId) &&
      (!item.result || item.result.status === "unchanged")
    )
      item.result = entry(
        item,
        blockedBundles.get(item.runId)?.status ?? "conflict",
        "Run bundle contains an incompatible or unsafe companion; both stores are preserved",
      );

  const counter =
    items.find((item) => item.kind === "counter") ??
    (runs.size
      ? {
          area: "agent-runs" as const,
          source: join(root, ".agents/state/agent-runs/_sequence.json"),
          destination: join(
            runtimeStateDir(root, "agent-runs"),
            "_sequence.json",
          ),
          name: "_sequence.json",
          bytes: Buffer.from("0"),
          kind: "counter" as const,
        }
      : undefined);
  if (counter) {
    if (!items.includes(counter)) items.push(counter);
    try {
      if (counter.result?.status === "deferred")
        throw new Error("Source sequence changed after scan");
      safeChain(stateRoot, counter.destination);
      const source = JSON.parse(counter.bytes.toString("utf8"));
      if (!Number.isSafeInteger(source) || source < 0)
        throw new Error("Invalid source sequence counter");
      const saved = existsSync(counter.destination)
        ? JSON.parse(readFileSync(counter.destination, "utf8"))
        : 0;
      if (!Number.isSafeInteger(saved) || saved < 0)
        throw new Error("Invalid destination sequence counter");
      let maximum = Math.max(
        source,
        saved,
        ...[...runs.values()].map((run) => run.sequence),
      );
      const destinationRuns = runtimeStateDir(root, "agent-runs");
      if (existsSync(destinationRuns))
        for (const file of readdirSync(destinationRuns)) {
          if (!uuid.test(file.slice(0, -5)) || !file.endsWith(".json"))
            continue;
          const path = join(destinationRuns, file);
          safeChain(stateRoot, path);
          const sequence = object(
            JSON.parse(readFileSync(path, "utf8")),
          ).sequence;
          if (
            typeof sequence !== "number" ||
            !Number.isSafeInteger(sequence) ||
            sequence < 1
          )
            throw new Error("Invalid canonical run sequence");
          maximum = Math.max(maximum, sequence);
        }
      if (maximum >= Number.MAX_SAFE_INTEGER)
        throw new Error("Sequence counter has no safe successor");
      const changed = !existsSync(counter.destination) || maximum > saved;
      if (changed && !dryRun) {
        mkdirSync(dirname(counter.destination), {
          recursive: true,
          mode: 0o700,
        });
        atomicWriteJson(counter.destination, maximum);
      }
      counter.result = entry(
        counter,
        changed ? "copied" : "unchanged",
        `${dryRun ? "Dry run: " : ""}sequence reconciled monotonically to ${maximum}`,
      );
    } catch (error) {
      counter.result = entry(counter, "conflict", String(error));
      for (const item of items)
        if (item.area === "agent-runs" && !item.result)
          item.result = entry(
            item,
            "deferred",
            "Sequence reconciliation needs resolution before run publication",
          );
    }
  }

  for (const item of [...items].sort(
    (a, b) => Number(a.kind === "run") - Number(b.kind === "run"),
  )) {
    if (item.result) continue;
    if (
      !sourceCurrent(root, item) ||
      (item.kind === "run" &&
        items.some(
          (companion) =>
            companion.runId === item.runId && !sourceCurrent(root, companion),
        ))
    ) {
      item.result = entry(
        item,
        "deferred",
        "Runtime source or companion changed before publication",
      );
      continue;
    }
    if (
      item.kind === "run" &&
      items.some(
        (companion) =>
          companion.runId === item.runId &&
          companion.result &&
          ["conflict", "deferred"].includes(companion.result.status),
      )
    ) {
      item.result = entry(
        item,
        "deferred",
        "A companion could not be published; the run receipt is preserved at source",
      );
      continue;
    }
    if (dryRun) {
      item.result = entry(
        item,
        "copied",
        "Dry run: would publish immutable runtime file",
      );
      continue;
    }
    try {
      publish(item);
      item.result = entry(item, "copied");
    } catch (error) {
      item.result =
        existing(item, stateRoot) ?? entry(item, "conflict", String(error));
    }
  }
  return [
    ...reports,
    ...items.map(
      (item) =>
        item.result ??
        entry(item, "conflict", "Runtime file was not classified"),
    ),
  ];
}

/** Copy old project-owned runtime into profile 0 without changing its sources. */
export async function migrateProjectRuntime(
  options: RuntimeMigrationOptions,
): Promise<RuntimeMigrationEntry[]> {
  const root = resolve(options.projectDir);
  const stateRoot = profileStateHome();
  // Validate before acquiring the lock, whose own directory is in this tree.
  try {
    safeChain(stateRoot, projectStateDir(root));
  } catch (error) {
    return areas.map((area) => ({
      area,
      source: join(root, ".agents/state", area),
      destination: runtimeStateDir(root, area),
      status: "conflict",
      reason: String(error),
    }));
  }
  return options.dryRun || profileSlot() !== "0"
    ? migrate(root, Boolean(options.dryRun))
    : withStateIndexLock(root, () => migrate(root, false));
}
