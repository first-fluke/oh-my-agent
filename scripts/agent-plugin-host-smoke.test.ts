import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  AGENT_PLUGIN_HOST_VERSIONS,
  type AgentPluginHost,
  assertInstalledCopy,
  expectedPackageFiles,
  runAgentPluginHostSmoke,
} from "./agent-plugin-host-smoke.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

type Call = { command: string; args: string[] };

/** A fake host that copies the package the way the real CLIs do. */
function fixture(
  host: AgentPluginHost,
  options: { copyFaithfully?: boolean } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "oma-agent-plugin-smoke-"));
  roots.push(root);
  const pkg = join(root, "package");
  cpSync(join(repository, "codex-plugin"), pkg, { recursive: true });
  const home = join(root, "home");
  const output = join(root, "out");
  const manifest = JSON.parse(readFileSync(join(pkg, "plugin.json"), "utf8"));
  const skills = expectedPackageFiles(pkg).filter((f) =>
    f.startsWith("skills/"),
  );
  const installed =
    host === "copilot"
      ? join(home, ".copilot/installed-plugins/_direct/package-0000")
      : join(home, ".qwen/extensions", manifest.name);
  const calls: Call[] = [];
  const copyPackage = () => {
    cpSync(pkg, installed, { recursive: true });
    if (options.copyFaithfully === false)
      writeFileSync(join(installed, "plugin.json"), "{}");
  };
  const run = (command: string, args: string[]) => {
    calls.push({ command, args });
    const ok = (stdout: string) => ({ stdout, stderr: "", status: 0 });
    if (args[0] === "--version")
      return ok(`${command} ${AGENT_PLUGIN_HOST_VERSIONS[host]}\n`);
    if (host === "copilot" && args[0] === "plugin" && args[1] === "install") {
      copyPackage();
      mkdirSync(join(home, ".copilot"), { recursive: true });
      writeFileSync(
        join(home, ".copilot/config.json"),
        `// managed\n${JSON.stringify({
          installedPlugins: [
            { name: manifest.name, cache_path: installed, enabled: true },
          ],
        })}`,
      );
      return ok(
        `Plugin "${manifest.name}" installed successfully. Installed ${skills.length} skills.\n`,
      );
    }
    if (host === "copilot" && args[0] === "plugin" && args[1] === "list")
      return ok(
        JSON.stringify([
          { name: manifest.name, version: manifest.version, enabled: true },
        ]),
      );
    if (host === "qwen" && args[0] === "extensions" && args[1] === "install") {
      copyPackage();
      writeFileSync(
        join(installed, ".qwen-extension-install.json"),
        JSON.stringify({ type: "local", originSource: "AgentPlugins" }),
      );
      return ok(
        `Extension "${manifest.name}" installed successfully and enabled.\n`,
      );
    }
    if (host === "qwen" && args[0] === "extensions" && args[1] === "list")
      return ok(
        `✓ ${manifest.name} (${manifest.version})\n Origin: AgentPlugins\n Skills:\n${skills
          .map((f) => `  ${f.split("/")[1]}`)
          .join("\n")}\n MCP servers:\n  context7\n`,
      );
    return {
      stdout: "",
      stderr: `unexpected ${command} ${args.join(" ")}`,
      status: 1,
    };
  };
  return { pkg, home, output, installed, calls, run, manifest };
}

describe("expectedPackageFiles", () => {
  it("lists the manifest, mcp.json, and every skill manifest", () => {
    const files = expectedPackageFiles(join(repository, "codex-plugin"));
    expect(files).toContain("plugin.json");
    expect(files).toContain("mcp.json");
    expect(
      files.filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f)).length,
    ).toBeGreaterThan(0);
    expect(files).not.toContain("skills/_shared/SKILL.md");
  });
});

describe.each(["copilot", "qwen"] as AgentPluginHost[])(
  "runAgentPluginHostSmoke (%s)",
  (host) => {
    it("installs the package from a local path under the scratch home and writes a receipt", () => {
      const f = fixture(host);
      const receipt = runAgentPluginHostSmoke({
        host,
        pkg: f.pkg,
        home: f.home,
        output: f.output,
        run: f.run,
      });
      expect(receipt.status).toBe("passed");
      expect(receipt.installedPath).toBe(f.installed);
      expect(f.calls[0]).toEqual({ command: host, args: ["--version"] });
      expect(f.calls[1]?.args.slice(0, 2)).toEqual(
        host === "copilot" ? ["plugin", "install"] : ["extensions", "install"],
      );
      expect(f.calls[1]?.args).toContain(f.pkg);
      const saved = JSON.parse(
        readFileSync(join(f.output, "report.json"), "utf8"),
      );
      expect(saved.status).toBe("passed");
      expect(saved.pinnedVersion).toBe(AGENT_PLUGIN_HOST_VERSIONS[host]);
      expect(existsSync(join(f.output, "command-1.log"))).toBe(true);
    });

    it("fails when the host's copy of the package is not faithful", () => {
      const f = fixture(host, { copyFaithfully: false });
      expect(() =>
        runAgentPluginHostSmoke({
          host,
          pkg: f.pkg,
          home: f.home,
          output: f.output,
          run: f.run,
        }),
      ).toThrow(/plugin\.json differs/);
      expect(
        JSON.parse(readFileSync(join(f.output, "report.json"), "utf8")).status,
      ).toBe("failed");
    });

    it("fails when the host reports another version than the pinned one", () => {
      const f = fixture(host);
      expect(() =>
        runAgentPluginHostSmoke({
          host,
          pkg: f.pkg,
          home: f.home,
          output: f.output,
          run: (command, args) =>
            args[0] === "--version"
              ? { stdout: "0.0.1\n", stderr: "", status: 0 }
              : f.run(command, args),
        }),
      ).toThrow(/expected pinned/);
    });
  },
);

describe("assertInstalledCopy", () => {
  it("accepts an exact copy and rejects a missing skill", () => {
    const root = mkdtempSync(join(tmpdir(), "oma-agent-plugin-copy-"));
    roots.push(root);
    const pkg = join(repository, "codex-plugin");
    const copy = join(root, "copy");
    cpSync(pkg, copy, { recursive: true });
    expect(() => assertInstalledCopy(pkg, copy)).not.toThrow();
    const skill = expectedPackageFiles(pkg).find((f) =>
      f.startsWith("skills/"),
    );
    rmSync(join(copy, skill as string));
    expect(() => assertInstalledCopy(pkg, copy)).toThrow(/missing skills\//);
  });
});
