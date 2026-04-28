import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const installScript = resolve(process.cwd(), "install.sh");

function runBash(script: string) {
  return spawnSync("bash", ["-lc", script], {
    cwd: resolve(process.cwd()),
    encoding: "utf-8",
  });
}

describe.skipIf(process.platform === "win32")("install.sh", () => {
  it("does not execute main when sourced", () => {
    const result = runBash(`
      source "${installScript}"
      printf "sourced-ok"
    `);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("sourced-ok");
    expect(result.stdout).not.toContain("oh-my-agent installer");
  });

  it("prefers curl as downloader when available", () => {
    const result = runBash(`
      source "${installScript}"
      curl() { :; }
      pick_downloader
      printf "%s" "$DOWNLOADER"
    `);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("curl");
  });

  it("falls back to wget when curl is unavailable", () => {
    const result = runBash(`
      source "${installScript}"
      command_exists() {
        [ "$1" = "wget" ]
      }
      pick_downloader
      printf "%s" "$DOWNLOADER"
    `);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("wget");
  });

  it("fails when neither curl nor wget is available", () => {
    const result = runBash(`
      source "${installScript}"
      command_exists() { return 1; }
      pick_downloader
    `);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Either curl or wget is required");
  });

  it("renders ANSI escapes passed through log helpers", () => {
    const result = runBash(`
      source "${installScript}"
      BOLD="\\\\033[1m"
      RESET="\\\\033[0m"
      info "Launching \${BOLD}oh-my-agent\${RESET} setup..."
    `);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("\\\\033[1m");
    expect(result.stdout).toContain("\u001b[1moh-my-agent\u001b[0m");
  });

  it("does not fail with unbound variable when piped to bash", () => {
    const result = spawnSync("bash", [], {
      input: `set -euo pipefail\nsource "${installScript}"\nif [[ "\${BASH_SOURCE[0]:-\\$0}" == "\\$0" ]]; then printf "guard-ok"; fi`,
      encoding: "utf-8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("unbound variable");
  });

  it("executes main when piped to bash", () => {
    const script = readFileSync(installScript, "utf-8");
    // Replace exec bunx with a printf to avoid actually running the installer
    const testScript = script.replace(
      /exec bunx.*$/m,
      'printf "main-executed"; exit 0',
    );

    const result = spawnSync("bash", [], {
      input: testScript,
      encoding: "utf-8",
    });

    expect(result.stderr).not.toContain("unbound variable");
    expect(result.stdout).toContain("main-executed");
  });

  it("redirects Windows users to the PowerShell installer", () => {
    const result = runBash(`
      source "${installScript}"
      uname() {
        if [ "$1" = "-s" ]; then
          printf "MINGW64_NT-10.0"
        else
          printf "x86_64"
        fi
      }
      detect_platform
    `);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PowerShell installer");
    expect(result.stderr).toContain("install.ps1");
  });
});
