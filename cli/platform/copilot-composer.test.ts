import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { installVendorAgents } from "./agent-composer.js";
import type { HookVariant } from "./hooks-composer/variant-types.js";
import { installHooksFromVariant } from "./hooks-composer.js";
import { setInstallContext } from "./install-context.js";

const roots: string[] = [];
function root(): string {
  const path = mkdtempSync(join(tmpdir(), "oma-copilot-composer-"));
  roots.push(path);
  return path;
}
afterEach(() => {
  for (const path of roots.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("Copilot native projection", () => {
  it.each([
    { destDir: undefined, expected: ".copilot/agents" },
    { destDir: ".github/agents", expected: ".copilot/agents" },
    { destDir: "custom/agents", expected: "custom/agents" },
  ])("writes global agents into $expected", ({ destDir, expected }) => {
    const source = root();
    const target = root();
    setInstallContext({ installRoot: source, mode: "global" });
    mkdirSync(join(source, ".agents/agents/variants"), { recursive: true });
    writeFileSync(
      join(source, ".agents/agents/backend-engineer.md"),
      "---\nname: backend-engineer\ndescription: Server work\n---\nImplement server work.\n",
    );
    if (destDir) {
      writeFileSync(
        join(source, ".agents/agents/variants/copilot.json"),
        JSON.stringify({
          vendor: "copilot",
          destDir,
          modelDefault: "inherit",
          toolsDefault: [],
          agents: {},
        }),
      );
    }
    expect(installVendorAgents(source, target, "copilot")).toBe(1);
    expect(existsSync(join(target, expected, "backend-engineer.md"))).toBe(
      true,
    );
    expect(existsSync(join(target, ".github/agents"))).toBe(false);
  });

  it.each([
    {
      hookDir: ".github/hooks",
      settingsFile: ".github/hooks/oma.json",
      expectedDir: ".copilot/hooks",
      expectedFile: ".copilot/hooks/oma.json",
    },
    {
      hookDir: "custom/hooks",
      settingsFile: "custom/oma.json",
      expectedDir: "custom/hooks",
      expectedFile: "custom/oma.json",
    },
  ])(
    "writes global hooks into $expectedDir",
    ({ hookDir, settingsFile, expectedDir, expectedFile }) => {
      const source = root();
      const target = root();
      setInstallContext({ installRoot: source, mode: "global" });
      const variant: HookVariant = {
        vendor: "copilot",
        style: "copilot",
        hookDir,
        settingsFile,
        projectDirEnv: null,
        runtime: "bun",
        events: {
          PreToolUse: [{ hook: "scm-guard.ts", matcher: "Bash", timeout: 3 }],
        },
      };
      installHooksFromVariant(source, target, variant);
      const result = JSON.parse(
        readFileSync(join(target, expectedFile), "utf-8"),
      );
      expect(existsSync(join(target, expectedDir, "oma-hook.sh"))).toBe(true);
      expect(existsSync(join(target, ".github"))).toBe(false);
      expect(result.hooks.PreToolUse[0].bash).toContain(
        join(target, expectedDir, "oma-hook.sh"),
      );
      expect(result.hooks.PreToolUse[0].bash).not.toContain(".github/hooks");
      expect(variant.hookDir).toBe(hookDir);
      expect(variant.settingsFile).toBe(settingsFile);
    },
  );

  it("inherits tools and model while enabling repository instructions", () => {
    const source = root();
    const target = root();
    mkdirSync(join(source, ".agents/agents"), { recursive: true });
    writeFileSync(
      join(source, ".agents/agents/backend-engineer.md"),
      "---\nname: backend-engineer\ndescription: Server work\ntools: [Read, Write, Bash]\nskills: [oma-backend]\n---\nImplement server work.\n",
    );
    expect(installVendorAgents(source, target, "copilot")).toBe(1);
    const { frontmatter } = parseFrontmatter(
      readFileSync(join(target, ".github/agents/backend-engineer.md"), "utf-8"),
    );
    expect(frontmatter).toMatchObject({
      name: "backend-engineer",
      "include-custom-instructions": true,
    });
    expect(frontmatter).not.toHaveProperty("tools");
    expect(frontmatter).not.toHaveProperty("skills");
    expect(frontmatter).not.toHaveProperty("model");
  });

  it.each([
    { tools: ["read", "bash"], expected: ["read", "execute"] },
    { tools: [], expected: [] },
  ])(
    "preserves explicit tool and instruction overrides: $tools",
    ({ tools, expected }) => {
      const source = root();
      const target = root();
      mkdirSync(join(source, ".agents/agents/variants"), { recursive: true });
      writeFileSync(
        join(source, ".agents/agents/backend-engineer.md"),
        "---\nname: backend-engineer\ndescription: Server work\n---\nImplement server work.\n",
      );
      writeFileSync(
        join(source, ".agents/agents/variants/copilot.json"),
        JSON.stringify({
          vendor: "copilot",
          destDir: ".github/agents",
          modelDefault: "inherit",
          toolsDefault: [],
          protocolPath: ".agents/protocol.md",
          agents: {
            "backend-engineer": {
              tools,
              extra: { "include-custom-instructions": false },
            },
          },
        }),
      );
      installVendorAgents(source, target, "copilot");
      const { frontmatter } = parseFrontmatter(
        readFileSync(
          join(target, ".github/agents/backend-engineer.md"),
          "utf-8",
        ),
      );
      expect(frontmatter).toMatchObject({
        tools: expected,
        "include-custom-instructions": false,
      });
    },
  );

  it("emits flat commands and preserves user hooks on repeat installation", () => {
    const source = root();
    const target = root();
    const variant: HookVariant = {
      vendor: "copilot",
      style: "copilot",
      hookDir: ".github/hooks",
      settingsFile: ".github/hooks/oma.json",
      projectDirEnv: null,
      runtime: "bun",
      events: {
        PreToolUse: [{ hook: "scm-guard.ts", matcher: "Bash", timeout: 3 }],
      },
    };
    mkdirSync(join(target, ".github/hooks"), { recursive: true });
    const userHook = { type: "command", bash: "echo user-hook" };
    writeFileSync(
      join(target, variant.settingsFile),
      JSON.stringify({
        version: 1,
        custom: true,
        hooks: { PreToolUse: [userHook] },
      }),
    );
    installHooksFromVariant(source, target, variant);
    installHooksFromVariant(source, target, variant);
    const result = JSON.parse(
      readFileSync(join(target, variant.settingsFile), "utf-8"),
    );
    expect(result.custom).toBe(true);
    expect(result.version).toBe(1);
    expect(result.hooks.PreToolUse).toHaveLength(2);
    expect(result.hooks.PreToolUse[0]).toEqual(userHook);
    expect(result.hooks.PreToolUse[1]).toMatchObject({
      type: "command",
      matcher: "Bash",
      bash: expect.stringContaining("--vendor 'copilot'"),
      timeoutSec: expect.any(Number),
    });
    expect(result.hooks.PreToolUse[1]).not.toHaveProperty("hooks");
    expect(result.hooks.subagentStart[0].bash).toContain(
      "--event 'subagentStart'",
    );
    expect(result.hooks.subagentStop[0].bash).toContain(
      "--event 'subagentStop'",
    );
  });
});
