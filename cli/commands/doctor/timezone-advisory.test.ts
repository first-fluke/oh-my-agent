import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateCueFile } from "../../utils/cue.js";
import { collectTimezoneAdvisory } from "./timezone-advisory.js";

// CUE evaluation needs the `cue` binary; the loader only needs its result.
vi.mock("../../utils/cue.js", () => ({ evaluateCueFile: vi.fn() }));

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** A project plus an isolated OMA home so the developer's global config never leaks in. */
function setup(
  files: Record<string, string>,
  globalFiles: Record<string, string> = {},
): { root: string; env: NodeJS.ProcessEnv } {
  const base = mkdtempSync(join(tmpdir(), "oma-tz-advisory-"));
  roots.push(base);
  const root = join(base, "project");
  const home = join(base, "oma-home");
  mkdirSync(join(root, ".agents"), { recursive: true });
  mkdirSync(join(home, ".agents"), { recursive: true });
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(root, ".agents", name), content);
  for (const [name, content] of Object.entries(globalFiles))
    writeFileSync(join(home, ".agents", name), content);
  return { root, env: { OMA_HOME: home } };
}

describe("collectTimezoneAdvisory", () => {
  it("warns when the shared YAML pins Asia/Seoul and the system differs", () => {
    const { root, env } = setup({
      "oma-config.yaml": "language: en\ntimezone: Asia/Seoul\n",
    });

    const advisory = collectTimezoneAdvisory(root, {
      env,
      system: "Australia/Sydney",
    });

    expect(advisory).toMatchObject({
      file: join(root, ".agents", "oma-config.yaml"),
      configured: "Asia/Seoul",
      system: "Australia/Sydney",
    });
    expect(advisory?.message).toContain("Older oh-my-agent templates");
    expect(advisory?.message).toContain("oma-config.yaml");
  });

  it("stays quiet when the system timezone is Asia/Seoul", () => {
    const { root, env } = setup({
      "oma-config.yaml": "timezone: Asia/Seoul\n",
    });

    expect(
      collectTimezoneAdvisory(root, { env, system: "Asia/Seoul" }),
    ).toBeNull();
  });

  it("stays quiet for any other configured timezone", () => {
    const { root, env } = setup({
      "oma-config.yaml": "timezone: Europe/Berlin\n",
    });

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" }),
    ).toBeNull();
  });

  it("stays quiet when the local config sets the timezone", () => {
    const { root, env } = setup({
      "oma-config.yaml": "timezone: Asia/Seoul\n",
      "oma-config.local.yaml": "timezone: Asia/Seoul\n",
    });

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" }),
    ).toBeNull();
  });

  it("stays quiet when only the global config sets it", () => {
    const { root, env } = setup(
      { "oma-config.yaml": "language: en\n" },
      { "oma-config.yaml": "timezone: Asia/Seoul\n" },
    );

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" }),
    ).toBeNull();
  });

  it("stays quiet when no timezone is configured", () => {
    const { root, env } = setup({ "oma-config.yaml": "language: en\n" });

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" }),
    ).toBeNull();
  });

  it("warns for a concrete Asia/Seoul in the shared CUE", () => {
    const { root, env } = setup({
      "oma-config.cue":
        'package config\n\n#G: { timezone?: string }\ntimezone: "Asia/Seoul"\n',
    });
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: { timezone: "Asia/Seoul" },
    } as ReturnType<typeof evaluateCueFile>);

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" })?.file,
    ).toBe(join(root, ".agents", "oma-config.cue"));
  });

  it("points at the YAML when the CUE cannot be evaluated", () => {
    // Without the cue CLI the loader falls back to oma-config.yaml alone, so
    // the CUE text's timezone is not what resolves.
    const { root, env } = setup({
      "oma-config.cue": 'package config\n\ntimezone: "Europe/Berlin"\n',
      "oma-config.yaml": "timezone: Asia/Seoul\n",
    });
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      error: "cue: command not found",
      missingCli: true,
    } as ReturnType<typeof evaluateCueFile>);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" })?.file,
    ).toBe(join(root, ".agents", "oma-config.yaml"));
    warn.mockRestore();
  });

  it("points at the YAML when it fills the timezone a CUE omits", () => {
    const { root, env } = setup({
      "oma-config.cue": 'package config\n\nlanguage: "ko"\n',
      "oma-config.yaml": "timezone: Asia/Seoul\n",
    });
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: { language: "ko" },
    } as ReturnType<typeof evaluateCueFile>);

    expect(
      collectTimezoneAdvisory(root, { env, system: "Australia/Sydney" })?.file,
    ).toBe(join(root, ".agents", "oma-config.yaml"));
  });
});
