import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  AGENTMEMORY_ENGINE_LOG_LEVEL,
  agentMemoryDataDir,
  agentMemoryObservabilityConfigPath,
  seedAgentMemoryEngineLogLevel,
} from "./engine-config.js";

const LONG_DESCRIPTION =
  "OpenTelemetry settings — trace/metric/log exporters, sampling (ratio, per-operation rules, rate limits), and the engine log level/format.";

describe("AgentMemory engine log level seed", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-am-engine-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  const context = (
    env: NodeJS.ProcessEnv = {},
    platform: NodeJS.Platform = "linux",
  ) => ({ homeDir, env, platform });

  function writeConfig(content: string) {
    const path = agentMemoryObservabilityConfigPath(context());
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return path;
  }

  it("seeds error, not warn: the dominant engine noise is itself a WARN", () => {
    expect(AGENTMEMORY_ENGINE_LOG_LEVEL).toBe("error");
  });

  it("resolves the data dir the way AgentMemory does", () => {
    expect(agentMemoryDataDir(context({}, "darwin"))).toBe(
      join(homeDir, "Library", "Application Support", "agentmemory"),
    );
    expect(
      agentMemoryDataDir(context({ APPDATA: "C:\\Roaming" }, "win32")),
    ).toBe(join("C:\\Roaming", "agentmemory"));
    expect(agentMemoryDataDir(context({}, "win32"))).toBe(
      join(homeDir, ".agentmemory"),
    );
    expect(agentMemoryDataDir(context({ XDG_DATA_HOME: "/xdg" }))).toBe(
      join("/xdg", "agentmemory"),
    );
    expect(agentMemoryDataDir(context())).toBe(
      join(homeDir, ".local", "share", "agentmemory"),
    );
    expect(
      agentMemoryDataDir(
        context({ AGENTMEMORY_DATA_DIR: join(homeDir, "am") }),
      ),
    ).toBe(join(homeDir, "am"));
  });

  it("prefers a legacy ./data store under the service working directory", () => {
    const legacy = join(homeDir, ".agentmemory", "data");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "state_store.db"), "");
    expect(agentMemoryDataDir(context())).toBe(legacy);
  });

  it("creates a valid iii-observability entry when none exists", () => {
    const result = seedAgentMemoryEngineLogLevel(context());
    expect(result.status).toBe("seeded");
    expect(parse(readFileSync(result.path, "utf8"))).toEqual({
      id: "iii-observability",
      name: "Observability",
      description: "",
      schema: {},
      value: { level: "error" },
    });
  });

  it("adds level to AgentMemory's entry and keeps every other key and comment", () => {
    const path = writeConfig(
      [
        "id: iii-observability",
        "name: Observability",
        `description: ${LONG_DESCRIPTION}`,
        "# kept comment",
        "value:",
        "  logs_console_output: false",
        "  sampling_ratio: 0.1",
        "  trace_storage:",
        "    directory: /data/observability/traces",
        "",
      ].join("\n"),
    );
    expect(seedAgentMemoryEngineLogLevel(context()).status).toBe("seeded");
    const content = readFileSync(path, "utf8");
    expect(content).toContain("# kept comment");
    // Long lines are not re-wrapped.
    expect(content).toContain(`description: ${LONG_DESCRIPTION}\n`);
    expect(parse(content).value).toEqual({
      logs_console_output: false,
      sampling_ratio: 0.1,
      trace_storage: { directory: "/data/observability/traces" },
      level: "error",
    });
  });

  it("never replaces a level the user chose", () => {
    const original = "id: iii-observability\nvalue:\n  level: info\n";
    const path = writeConfig(original);
    expect(seedAgentMemoryEngineLogLevel(context())).toMatchObject({
      status: "kept",
      level: "info",
    });
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("leaves files that are not an iii-observability entry untouched", () => {
    for (const original of [
      "id: something-else\nvalue: {}\n",
      "id: iii-observability\nvalue: [1, 2]\n",
      "id: [unterminated\n",
    ]) {
      const path = writeConfig(original);
      expect(seedAgentMemoryEngineLogLevel(context()).status).toBe("skipped");
      expect(readFileSync(path, "utf8")).toBe(original);
    }
  });

  it("does not throw when the config path cannot be written", () => {
    const blocker = join(homeDir, ".local");
    writeFileSync(blocker, "not a directory");
    const result = seedAgentMemoryEngineLogLevel(context());
    expect(result.status).toBe("skipped");
    expect(existsSync(result.path)).toBe(false);
  });
});
