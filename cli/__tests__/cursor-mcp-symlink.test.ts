import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCursorMcpSymlink } from "../lib/skills.js";

describe("ensureCursorMcpSymlink", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) {
      rmSync(root, { recursive: true, force: true });
    }
    roots.length = 0;
  });

  function projectRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-cursor-mcp-"));
    roots.push(root);
    return root;
  }

  it("creates .cursor/mcp.json -> ../.agents/mcp.json when SSOT exists", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(join(root, ".agents", "mcp.json"), "{}\n", "utf-8");

    ensureCursorMcpSymlink(root);

    const link = join(root, ".cursor", "mcp.json");
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe(join("..", ".agents", "mcp.json"));
    expect(readFileSync(link, "utf-8")).toBe("{}\n");
  });

  it("no-ops when .agents/mcp.json is missing", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".cursor"), { recursive: true });

    ensureCursorMcpSymlink(root);

    expect(() => lstatSync(join(root, ".cursor", "mcp.json"))).toThrow();
  });

  it("skips when .cursor/mcp.json is a regular file", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(join(root, ".agents", "mcp.json"), "{}\n", "utf-8");
    mkdirSync(join(root, ".cursor"), { recursive: true });
    writeFileSync(
      join(root, ".cursor", "mcp.json"),
      '{"local":true}\n',
      "utf-8",
    );

    ensureCursorMcpSymlink(root);

    expect(lstatSync(join(root, ".cursor", "mcp.json")).isSymbolicLink()).toBe(
      false,
    );
    expect(readFileSync(join(root, ".cursor", "mcp.json"), "utf-8")).toBe(
      '{"local":true}\n',
    );
  });

  it("replaces a symlink that points elsewhere", () => {
    const root = projectRoot();
    mkdirSync(join(root, ".agents"), { recursive: true });
    writeFileSync(join(root, ".agents", "mcp.json"), "{}\n", "utf-8");
    mkdirSync(join(root, ".cursor"), { recursive: true });
    symlinkSync("../other.json", join(root, ".cursor", "mcp.json"), "file");

    ensureCursorMcpSymlink(root);

    expect(readlinkSync(join(root, ".cursor", "mcp.json"))).toBe(
      join("..", ".agents", "mcp.json"),
    );
  });
});
