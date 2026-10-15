import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const installScript = resolve(process.cwd(), "install.ps1");

describe("install.ps1", () => {
  it("keeps optional Serena setup failures non-fatal", () => {
    const script = readFileSync(installScript, "utf-8");
    const optionalSetup = script.match(
      /# ── uv \(optional;[\s\S]+?Write-Ok "Core dependencies ready"/,
    )?.[0];

    expect(optionalSetup).toBeDefined();
    expect(optionalSetup).not.toContain("Write-Fail");
    expect(optionalSetup).toContain("Continuing without Serena");
  });

  it("installs oma globally unless it exists, and launches it with a bunx fallback", () => {
    const script = readFileSync(installScript, "utf-8");
    const cliSetup = script.match(
      /# ── oma CLI \(global;[\s\S]+?Write-Ok "Core dependencies ready"/,
    )?.[0];

    expect(cliSetup).toBeDefined();
    expect(cliSetup).toContain("if (Test-Command oma)");
    expect(cliSetup).toContain("bun install --global oh-my-agent@latest");
    expect(cliSetup).not.toContain("Write-Fail");
    expect(script).toMatch(
      /if \(\$omaCliReady\) \{\s*& oma\s*\} else \{\s*& bunx oh-my-agent@latest\s*\}/,
    );
  });
});
