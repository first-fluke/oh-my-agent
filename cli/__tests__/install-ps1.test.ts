import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const installScript = resolve(process.cwd(), "install.ps1");
const powerShellAvailable =
  spawnSync(
    "pwsh",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$PSVersionTable.PSVersion.ToString()",
    ],
    { timeout: 5_000 },
  ).status === 0;

function runCliSetup(packageSpec: string | undefined, omaPresent = false) {
  const script = readFileSync(installScript, "utf-8");
  const cliSetup = script.match(
    /# ── oma CLI \(global;[\s\S]+?Write-Ok "Core dependencies ready"/,
  )?.[0];
  if (!cliSetup) throw new Error("oma CLI bootstrap block missing");
  return spawnSync(
    "pwsh",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `
    $ErrorActionPreference = 'Stop'
    $script:omaPresent = $${omaPresent ? "true" : "false"}
    $script:packageArgs = @()
    function Test-Command { param([string]$Name) return ($Name -eq 'oma' -and $script:omaPresent) }
    function Write-Info {}
    function Write-Ok {}
    function Write-Warn {}
    function Add-ToPath {}
    function bun {
      $script:packageArgs = @($args)
      $script:omaPresent = $true
      $global:LASTEXITCODE = 0
    }
    ${cliSetup}
    ConvertTo-Json -Compress -InputObject @($script:packageArgs)
  `,
    ],
    {
      encoding: "utf-8",
      env: { ...process.env, OMA_CLI_PACKAGE: packageSpec },
      timeout: 10_000,
    },
  );
}

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
    expect(cliSetup).toContain("[string]::IsNullOrEmpty($env:OMA_CLI_PACKAGE)");
    expect(cliSetup).toContain('"oh-my-agent@latest"');
    expect(cliSetup).toContain('& bun install --global "$omaCliPackage"');
    expect(cliSetup).not.toContain("Write-Fail");
    expect(script).toMatch(
      /if \(\$omaCliReady\) \{\s*& oma\s*\} else \{\s*& bunx oh-my-agent@latest\s*\}/,
    );
  });

  it.skipIf(!powerShellAvailable)(
    "passes an overridden checkout path with spaces as one package argument",
    () => {
      const packagePath = "C:\\oma checkout\\cli";
      const result = runCliSetup(packagePath);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual([
        "install",
        "--global",
        packagePath,
      ]);
    },
  );

  it.skipIf(!powerShellAvailable).each([undefined, ""])(
    "keeps the latest package default for override %s",
    (override) => {
      const result = runCliSetup(override);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual([
        "install",
        "--global",
        "oh-my-agent@latest",
      ]);
    },
  );

  it.skipIf(!powerShellAvailable)(
    "keeps an existing oma even with a package override",
    () => {
      const result = runCliSetup("C:\\oma checkout\\cli", true);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout.trim())).toEqual([]);
    },
  );
});
