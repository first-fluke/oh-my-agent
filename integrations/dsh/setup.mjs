import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { OMA_VERSION } from "./runtime.mjs";

const MARKERS = ["oma-config.yaml", "oma-config.cue"];
const DIRECTORIES = new Set([
  "skills",
  "rules",
  "workflows",
  "agents",
  "config",
  "hooks",
]);
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 128 * 1024 * 1024;
const INITIAL_CONFIG = [
  "language: en",
  "model_preset: auto",
  "vendors: []",
  "auto_update_cli: false",
  "providers:",
  "  semantic_memory: none",
  "  code_intelligence_guard: off",
  "",
].join("\n");

async function info(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return undefined;
    throw error;
  }
}

async function initialized(root) {
  for (const marker of MARKERS) {
    // Existing projects can use a symlinked config; resolve it without changing it.
    try {
      if ((await lstat(await realpath(join(root, ".agents", marker)))).isFile())
        return true;
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
  }
  return false;
}

export async function findWorkspace(agent) {
  const session = agent?.session?.header;
  const id = agent?.id ?? session?.id;
  if (
    typeof session?.cwd !== "string" ||
    !isAbsolute(session.cwd) ||
    typeof id !== "string" ||
    !id
  )
    return undefined;
  const cwd = await realpath(session.cwd);
  if (!(await lstat(cwd)).isDirectory())
    throw new Error("OMA workspace must be a directory");
  let current = cwd;
  while (true) {
    if (await initialized(current)) return { root: current, initialized: true };
    if (await info(join(current, ".git")))
      return { root: current, initialized: false };
    const parent = dirname(current);
    if (parent === current) return { root: cwd, initialized: false };
    current = parent;
  }
}

// Release archives contain .agents/ directly. Reject links and unsafe paths
// before stripping that prefix, and extract only project assets into staging.
export function projectArchiveFilter() {
  let total = 0;
  return (path, entry) => {
    const parts = path.replace(/\/$/, "").split("/");
    if (parts[0] !== ".agents" || !DIRECTORIES.has(parts[1])) return false;
    if (
      parts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          part.includes("\\") ||
          part.includes(":"),
      )
    )
      throw new Error("Unsafe path in OMA project archive");
    if (entry.type !== "File" && entry.type !== "Directory")
      throw new Error(
        "Links and special files are not allowed in OMA project assets",
      );
    total += entry.size ?? 0;
    if (total > MAX_EXTRACTED_BYTES || entry.size > 16 * 1024 * 1024)
      throw new Error("OMA project assets exceed the extraction limit");
    return true;
  };
}

async function responseBytes(response, limit, signal) {
  if (!response.ok)
    throw new Error(
      `OMA project asset download failed (HTTP ${response.status})`,
    );
  if (!response.body)
    throw new Error("OMA project asset download returned an empty body");
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    signal.throwIfAborted();
    total += chunk.length;
    if (total > limit)
      throw new Error("OMA project asset download exceeds the size limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function downloadProjectAssets(
  directory,
  signal,
  dependencies = {},
) {
  const request = dependencies.fetch ?? globalThis.fetch;
  const base = `https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${OMA_VERSION}/agent-skills.tar.gz`;
  const checksum = (
    await responseBytes(
      await request(`${base}.sha256`, { signal }),
      4096,
      signal,
    )
  )
    .toString("utf8")
    .trim()
    .match(/^([a-fA-F0-9]{64})(?:\s|$)/)?.[1]
    ?.toLowerCase();
  if (!checksum)
    throw new Error("OMA project asset checksum is missing or invalid");
  const archive = await responseBytes(
    await request(base, { signal }),
    MAX_ARCHIVE_BYTES,
    signal,
  );
  if (createHash("sha256").update(archive).digest("hex") !== checksum)
    throw new Error(
      "OMA project asset checksum mismatch; refusing to initialize the project",
    );
  const archivePath = join(dirname(directory), "agent-skills.tar.gz");
  await writeFile(archivePath, archive, { flag: "wx" });
  const extract = dependencies.extract ?? (await import("tar")).x;
  signal.throwIfAborted();
  await extract({
    file: archivePath,
    cwd: directory,
    strip: 1,
    strict: true,
    preservePaths: false,
    filter: projectArchiveFilter(),
    signal,
  });
  signal.throwIfAborted();
  const version = JSON.parse(
    await readFile(join(directory, "skills", "_version.json"), "utf8"),
  );
  if (version.version !== OMA_VERSION)
    throw new Error(
      "OMA project asset version does not match the installed CLI",
    );
  if (!(await info(join(directory, "skills", "oma-qa", "SKILL.md")))?.isFile())
    throw new Error("OMA project assets do not contain the OMA skills");
}

async function mergeMissing(source, destination, signal) {
  signal.throwIfAborted();
  const existing = await info(destination);
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
    throw new Error(`OMA setup will not write through ${destination}`);
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    signal.throwIfAborted();
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) await mergeMissing(from, to, signal);
    else if (entry.isFile()) {
      try {
        await copyFile(from, to, constants.COPYFILE_EXCL);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
    } else
      throw new Error(
        "OMA setup assets must contain only files and directories",
      );
  }
}

async function acquireLock(root, signal) {
  const path = join(root, ".oma-dsh-setup.lock");
  const token = randomUUID();
  while (true) {
    signal.throwIfAborted();
    let acquired = false;
    try {
      await mkdir(path);
      acquired = true;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    if (acquired) {
      try {
        await writeFile(
          join(path, "owner.tmp"),
          JSON.stringify({ pid: process.pid, token }),
          { flag: "wx" },
        );
        await rename(join(path, "owner.tmp"), join(path, "owner.json"));
      } catch (error) {
        await rm(path, { recursive: true, force: true });
        throw error;
      }
      return async () => {
        const owner = JSON.parse(
          await readFile(join(path, "owner.json"), "utf8"),
        );
        if (owner.token === token) await rm(path, { recursive: true });
      };
    }
    const held = await info(path);
    if (!held) continue;
    if (!held.isDirectory() || held.isSymbolicLink())
      throw new Error(`OMA setup lock is not a directory: ${path}`);
    try {
      const owner = JSON.parse(
        await readFile(join(path, "owner.json"), "utf8"),
      );
      if (
        Number.isSafeInteger(owner.pid) &&
        owner.pid > 0 &&
        typeof owner.token === "string"
      ) {
        try {
          process.kill(owner.pid, 0);
        } catch (error) {
          if (error.code === "ESRCH") {
            throw new Error(
              `Remove the stale OMA setup lock at ${path} and reload the plugin`,
            );
          }
          if (error.code !== "EPERM") throw error;
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await delay(50, undefined, { signal });
  }
}

async function prepareWorkspace(root, signal, prepareProject) {
  if (root === parse(root).root || root === (await realpath(homedir())))
    throw new Error(
      "Choose a project directory for OMA setup, rather than your home or filesystem root",
    );
  const release = await acquireLock(root, signal);
  let staging;
  try {
    if (await initialized(root)) return;
    // Do not follow an uninitialized .agents symlink into another project.
    const existing = await info(join(root, ".agents"));
    if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
      throw new Error("OMA setup needs a project-local .agents directory");
    for (const marker of MARKERS) {
      if (await info(join(root, ".agents", marker)))
        throw new Error(
          `Existing OMA config ${marker} is not a usable file; it was preserved`,
        );
    }
    staging = await mkdtemp(join(tmpdir(), "oma-dsh-setup-"));
    const assets = join(staging, "assets");
    await mkdir(assets);
    await prepareProject(assets, signal);
    signal.throwIfAborted();
    if (await initialized(root)) return;
    await mergeMissing(assets, join(root, ".agents"), signal);
    signal.throwIfAborted();
    // The marker is committed last; partial copies never activate OMA guards.
    if (!(await initialized(root))) {
      const marker = join(root, ".agents", `.oma-config-${randomUUID()}.tmp`);
      try {
        await writeFile(marker, INITIAL_CONFIG, { flag: "wx" });
        signal.throwIfAborted();
        try {
          await link(marker, join(root, ".agents", "oma-config.yaml"));
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      } finally {
        await rm(marker, { force: true });
      }
      if (!(await initialized(root)))
        throw new Error(
          "Existing OMA config is not a usable file; it was preserved",
        );
    }
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await release();
  }
}

function waitForSetup(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(signal.reason ?? new Error("OMA setup was cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export function createWorkspaceSetup(config = {}, dependencies = {}) {
  const autoSetup = config.autoSetup ?? true;
  const timeoutMs = config.setupTimeoutMs ?? 120000;
  if (typeof autoSetup !== "boolean")
    throw new TypeError("autoSetup must be a boolean");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
    throw new TypeError("setupTimeoutMs must be a positive integer");
  const controller = new AbortController();
  const pending = new Map();
  const failures = new Map();
  const prepareProject = dependencies.prepareProject ?? downloadProjectAssets;
  return {
    async ensure(agent, signal) {
      controller.signal.throwIfAborted();
      signal?.throwIfAborted();
      const workspace = await findWorkspace(agent);
      controller.signal.throwIfAborted();
      signal?.throwIfAborted();
      if (!workspace) return false;
      if (workspace.initialized) return true;
      if (!autoSetup) return false;
      if (failures.has(workspace.root)) throw failures.get(workspace.root);
      let setup = pending.get(workspace.root);
      if (!setup) {
        const timer = AbortSignal.timeout(timeoutMs);
        const setupSignal = AbortSignal.any([controller.signal, timer]);
        setup = prepareWorkspace(workspace.root, setupSignal, prepareProject)
          .catch((error) => {
            const failure =
              timer.aborted && !controller.signal.aborted
                ? new Error(
                    `OMA project setup timed out after ${timeoutMs} ms`,
                    { cause: error },
                  )
                : error;
            failures.set(workspace.root, failure);
            throw failure;
          })
          .finally(() => pending.delete(workspace.root));
        pending.set(workspace.root, setup);
      }
      await waitForSetup(setup, signal);
      controller.signal.throwIfAborted();
      signal?.throwIfAborted();
      return true;
    },
    async dispose() {
      controller.abort(new Error("OMA setup was cancelled"));
      await Promise.allSettled([...pending.values()]);
    },
  };
}
