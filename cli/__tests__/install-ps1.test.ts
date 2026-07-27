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
});
