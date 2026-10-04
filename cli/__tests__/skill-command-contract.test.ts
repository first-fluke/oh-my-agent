import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerEmitCommand } from "../commands/emit/command.js";
import { registerImageCommand } from "../commands/image/index.js";
import { registerSlideCommand } from "../commands/slide/index.js";
import { registerVerify } from "../commands/verify/command.js";
import { registerVideoCommand } from "../commands/video/index.js";
import { createCommandSurface } from "../utils/command-surface.js";

const skillsRoot = fileURLToPath(new URL("../../skills/", import.meta.url));

function fixture() {
  const program = new Command("oma").exitOverride();
  for (const register of [
    registerEmitCommand,
    registerImageCommand,
    registerSlideCommand,
    registerVerify,
    registerVideoCommand,
  ]) {
    register(program);
  }
  return createCommandSurface(program);
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? markdownFiles(path)
      : entry.name.endsWith(".md")
        ? [path]
        : [];
  });
}

function commandsFromMarkdown(path: string): string[] {
  const commands: string[] = [];
  const lines = readFileSync(path, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = (lines[i] ?? "").trim();
    if (!/^oma (image|video|slide|verify|emit)\b/.test(line)) continue;
    while (line.endsWith("\\") && i + 1 < lines.length) {
      line = `${line.slice(0, -1)} ${(lines[++i] ?? "").trim()}`;
    }
    // Usage notation marks an optional flag; check the included variant.
    commands.push(line.replace(/\[(--[^\]]+)\]/g, "$1"));
  }
  return commands;
}

// Tokenize examples as data. No shell, CLI action, generation, or scan runs.
function tokenize(commands: string[]): string[][] {
  const result = spawnSync(
    "python3",
    [
      "-c",
      "import json, shlex, sys; print(json.dumps([shlex.split(s, comments=True) for s in json.load(sys.stdin)]))",
    ],
    { input: JSON.stringify(commands), encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

function validatePublicFlags(help: Command, tokens: string[]) {
  let leaf = help;
  let offset = 0;
  for (; offset < tokens.length; offset++) {
    const child = leaf.commands.find((c) => c.name() === tokens[offset]);
    if (!child) break;
    leaf = child;
  }
  const options = [];
  for (let node: Command | null = leaf; node; node = node.parent) {
    options.push(...node.options);
  }
  for (let i = offset; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined) continue;
    if (token === "--") break;
    if (!token.startsWith("-")) continue;
    const name = token.split("=")[0];
    const option = options.find((o) => o.long === name || o.short === name);
    expect(
      option,
      `Unknown public option ${name} for ${tokens.join(" ")}`,
    ).toBeDefined();
    if (option?.required && !token.includes("=")) i++;
  }
}

describe("published skill CLI examples", () => {
  const surface = fixture();

  it("uses the public command paths and option spellings without running actions", () => {
    const files = [
      "oma-image",
      "oma-video",
      "oma-slide",
      "oma-orchestration",
    ].flatMap((skill) => markdownFiles(join(skillsRoot, skill)));
    const examples = files.flatMap((file) =>
      commandsFromMarkdown(file).map((command) => ({ file, command })),
    );
    expect(examples.length).toBeGreaterThan(0);
    const tokens = tokenize(examples.map((e) => e.command));
    expect(tokens).toHaveLength(examples.length);
    for (const [i, command] of tokens.entries()) {
      const example = examples[i];
      if (!example) throw new Error("Missing example for tokenized command");
      const end = command.findIndex((word) => /^[>|;&]/.test(word));
      const args = command.slice(1, end === -1 ? undefined : end);
      expect(
        () => surface.normalize(args),
        `${example.file}: ${example.command}`,
      ).not.toThrow();
      validatePublicFlags(surface.help, args);
    }
  });

  it("rejects internal registration names that the public surface removed", () => {
    for (const args of [
      ["image", "generate", "example", "--format", "json"],
      ["image", "list-vendors"],
      ["slide", "new", "--dir", "example"],
      ["verify", "qa"],
      ["emit", "--out", "example"],
    ]) {
      expect(() => surface.normalize(args)).toThrow();
    }
  });

  it("dispatches the verification wrapper through the public agent action", () => {
    const wrapper = readFileSync(
      join(skillsRoot, "oma-orchestration/scripts/verify.sh"),
      "utf8",
    );
    const line = wrapper
      .split("\n")
      .find((text) => text.startsWith("exec oma "));
    expect(line).toBeDefined();
    const [command] = tokenize([line?.replace(/^exec /, "") ?? ""]);
    if (!command) throw new Error("Missing tokenized wrapper command");
    const args = command.slice(1);
    const populated = args.map((arg) =>
      arg === "$AGENT_TYPE" ? "qa" : arg === "$WORKSPACE" ? "example" : arg,
    );
    expect(() => surface.normalize(populated)).not.toThrow();
    validatePublicFlags(surface.help, populated);
  });
});
