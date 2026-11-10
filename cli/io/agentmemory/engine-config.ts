import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isMap, parseDocument, stringify } from "yaml";
import { agentMemoryConfigDir } from "./endpoint-config.js";

/**
 * Engine log level OMA seeds for the AgentMemory iii engine.
 *
 * AgentMemory registers its worker with OpenTelemetry enabled, so iii-sdk
 * attaches a `traceparent` to every invocation, while the engine it configures
 * runs with OTel disabled. The engine then logs
 * `[WARN] iii::telemetry with_parent_headers: … OpenTelemetry layer not found`
 * for each message: ~87% of engine.log, filling the 10 MiB file in about four
 * hours. Rotating that file fails on Windows (os error 5), which keeps the
 * engine from starting. `warn` still keeps that warning, so the seed is
 * `error`.
 */
export const AGENTMEMORY_ENGINE_LOG_LEVEL = "error";

const OBSERVABILITY_ID = "iii-observability";

interface EngineConfigContext {
  homeDir: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
}

function platformDefaultDataDir(
  { homeDir, env, platform }: EngineConfigContext,
  useXdg = true,
): string {
  if (platform === "darwin")
    return join(homeDir, "Library", "Application Support", "agentmemory");
  if (platform === "win32")
    return env.APPDATA
      ? join(env.APPDATA, "agentmemory")
      : join(homeDir, ".agentmemory");
  const xdg = env.XDG_DATA_HOME;
  if (useXdg && xdg && isAbsolute(xdg)) return join(xdg, "agentmemory");
  return join(homeDir, ".local", "share", "agentmemory");
}

function nearestGitParent(path: string): string | undefined {
  let current = path;
  for (;;) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isWithin(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

/**
 * AgentMemory's data directory for the OMA-managed instance, mirroring
 * AgentMemory's own resolution (AGENTMEMORY_DATA_DIR, a legacy `./data` store,
 * then the platform default, moved off XDG when it would land inside a git
 * work tree). OMA starts the service and the daemon in ~/.agentmemory, which is
 * the cwd that resolution sees.
 */
export function agentMemoryDataDir(context: EngineConfigContext): string {
  const cwd = agentMemoryConfigDir(context.homeDir);
  const fromEnv = context.env.AGENTMEMORY_DATA_DIR?.trim();
  if (fromEnv)
    return resolve(
      cwd,
      fromEnv.startsWith("~")
        ? join(context.homeDir, fromEnv.slice(1))
        : fromEnv,
    );
  const legacy = resolve(cwd, "data");
  if (
    existsSync(join(legacy, "state_store.db")) ||
    existsSync(join(legacy, "iii-config.yaml"))
  )
    return legacy;
  const fallback = platformDefaultDataDir(context);
  const gitParent = nearestGitParent(cwd);
  if (gitParent && isWithin(gitParent, fallback))
    return platformDefaultDataDir(context, false);
  return fallback;
}

export function agentMemoryObservabilityConfigPath(
  context: EngineConfigContext,
): string {
  return join(
    agentMemoryDataDir(context),
    "compose",
    "config",
    "iii-observability.yaml",
  );
}

export type EngineLogLevelSeed =
  | { status: "seeded"; path: string }
  | { status: "kept"; path: string; level: unknown }
  | { status: "skipped"; path: string; reason: string };

/**
 * Seed `value.level` in AgentMemory's persisted iii-observability entry when
 * it is unset. AgentMemory fills only missing keys of this file on start and
 * keeps the rest, so the seed persists and a level the user chose is never
 * replaced. A file that is not an iii-observability entry is left alone.
 */
export function seedAgentMemoryEngineLogLevel(
  context: EngineConfigContext,
): EngineLogLevelSeed {
  const path = agentMemoryObservabilityConfigPath(context);
  try {
    if (!existsSync(path)) {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      writeFileSync(
        path,
        stringify({
          id: OBSERVABILITY_ID,
          name: "Observability",
          description: "",
          schema: {},
          value: { level: AGENTMEMORY_ENGINE_LOG_LEVEL },
        }),
        { encoding: "utf8", mode: 0o600 },
      );
      return { status: "seeded", path };
    }
    const document = parseDocument(readFileSync(path, "utf8"));
    if (document.errors.length > 0 || !isMap(document.contents))
      return { status: "skipped", path, reason: "unparseable" };
    if (document.get("id") !== OBSERVABILITY_ID)
      return { status: "skipped", path, reason: "unexpected id" };
    const value = document.get("value");
    if (value !== undefined && value !== null && !isMap(value))
      return { status: "skipped", path, reason: "value is not a map" };
    const level = isMap(value) ? value.get("level") : undefined;
    if (level !== undefined && level !== null && level !== "")
      return { status: "kept", path, level };
    document.setIn(["value", "level"], AGENTMEMORY_ENGINE_LOG_LEVEL);
    // lineWidth 0: keep existing long lines (AgentMemory's description) as is.
    writeFileSync(path, document.toString({ lineWidth: 0 }), "utf8");
    return { status: "seeded", path };
  } catch (error) {
    return {
      status: "skipped",
      path,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
