import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { isMap, parseDocument } from "yaml";
import { ensureOmaSerenaContexts } from "./serena.js";
import {
  DART_PROJECT_TOOL,
  ensureSerenaAdapter,
  type SerenaAdapterStatus,
} from "./serena-adapter.js";

const projectConfig = (root: string) => join(root, ".serena/project.yml");
const contextConfig = () =>
  join(
    process.env.SERENA_HOME?.trim() || join(homedir(), ".serena"),
    "contexts/oma.yml",
  );

export function serenaContextHasDartTool(): boolean {
  const path = contextConfig();
  if (!existsSync(path)) return false;
  const tools = parseDocument(readFileSync(path, "utf8")).toJS()?.fixed_tools;
  return Array.isArray(tools) && tools.includes(DART_PROJECT_TOOL);
}

function capture(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 8192,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function projectUsesDart(root: string): boolean {
  if (!existsSync(projectConfig(root))) return false;
  const doc = parseDocument(readFileSync(projectConfig(root), "utf8"));
  if (doc.errors.length) throw new Error("Invalid .serena/project.yml");
  const languages = doc.toJS()?.language_servers ?? doc.toJS()?.languages;
  return Array.isArray(languages) && languages.includes("dart");
}

/** Resolve the installed SDK without running Flutter or downloading tools. */
export function resolveDartExecutable(
  root: string,
  configured?: string,
): string {
  if (configured && configured !== "mise") {
    if (!isAbsolute(configured))
      throw new Error("dart_executable must be an absolute path or 'mise'");
    return realpathSync(configured);
  }
  try {
    const flutter = capture("mise", ["which", "flutter"], root);
    return realpathSync(join(dirname(flutter), "cache/dart-sdk/bin/dart"));
  } catch {}
  const dart = capture("mise", ["which", "dart"], root);
  return realpathSync(dart);
}

function configuredDart(root: string): string | undefined {
  const doc = parseDocument(readFileSync(projectConfig(root), "utf8"));
  const value = doc.getIn(["ls_specific_settings", "dart", "dart_executable"]);
  if (value !== undefined && typeof value !== "string")
    throw new Error("Invalid dart_executable");
  return value as string | undefined;
}

function availableProjectDart(root: string): string | undefined {
  const configured = configuredDart(root);
  try {
    return resolveDartExecutable(root, configured);
  } catch (error) {
    if (configured) throw error;
    // Code discovery can use Serena's bundled Dart. A package check requires
    // a project SDK, but unrelated MCP sessions must still be able to start.
    return undefined;
  }
}

/** Hash what a running Python process has loaded, including the installed SDK. */
export function serenaRuntimeRevision(
  root: string,
  adapter: SerenaAdapterStatus,
): string {
  const hash = createHash("sha256").update(adapter.revision ?? adapter.status);
  for (const path of [projectConfig(root), contextConfig()]) {
    hash.update(existsSync(path) ? readFileSync(path) : "missing");
  }
  if (projectUsesDart(root)) {
    const sdk = availableProjectDart(root);
    hash.update(
      sdk
        ? `${sdk}\n${capture(sdk, ["--version"], root)}`
        : "serena-bundled-dart",
    );
  }
  return hash.digest("hex");
}

export function prepareSerenaRuntime(root: string, requireDart = false) {
  const adapter = ensureSerenaAdapter();
  const contexts = ensureOmaSerenaContexts(adapter);
  const dart = projectUsesDart(root);
  if (requireDart && !dart)
    throw new Error(
      "Enable dart in .serena/project.yml language_servers first",
    );
  if (dart && adapter.status !== "ready")
    throw new Error(adapter.error ?? `Dart adapter: ${adapter.status}`);
  const failures = contexts.failed.filter(
    (failure) => dart || !failure.startsWith("Dart adapter:"),
  );
  if (failures.length) throw new Error(failures.join("; "));
  let sdk: string | undefined;
  if (dart) {
    const configured = configuredDart(root);
    sdk = availableProjectDart(root);
    if (requireDart && !sdk)
      throw new Error(
        "A project Dart SDK is required for package checks; configure mise or dart_executable",
      );
    if (!configured && sdk) {
      const path = projectConfig(root);
      const doc = parseDocument(readFileSync(path, "utf8"));
      for (const keys of [
        ["ls_specific_settings"],
        ["ls_specific_settings", "dart"],
      ]) {
        const node = doc.getIn(keys, true);
        if (node !== undefined && !isMap(node))
          throw new Error("Invalid Dart settings in .serena/project.yml");
        if (!node) doc.setIn(keys, doc.createNode({}));
      }
      doc.setIn(["ls_specific_settings", "dart", "dart_executable"], "mise");
      writeFileSync(path, doc.toString());
    }
  }
  return {
    adapter,
    sdk,
    runtimeRevision: serenaRuntimeRevision(root, adapter),
  };
}
