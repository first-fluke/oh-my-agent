import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ensureSerenaAdapter,
  SERENA_ASSETS,
  serenaPython,
} from "./serena-adapter.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "oma-adapter-"));
  vi.stubEnv("PATH", directory);
  writeFileSync(join(directory, "python"), "");
  writeFileSync(join(directory, "serena"), `#!${join(directory, "python")}\n`);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

it("uses Serena's owning Python for repair and read-only checks", () => {
  vi.mocked(execFileSync).mockReturnValue('{"status":"ready","revision":"v1"}');
  expect(ensureSerenaAdapter(true).status).toBe("ready");
  expect(execFileSync).toHaveBeenCalledWith(
    join(directory, "python"),
    [join(SERENA_ASSETS, "install.py"), "--check"],
    expect.objectContaining({ timeout: 15000 }),
  );
  expect(ensureSerenaAdapter().python).toBe(join(directory, "python"));
});
it("does not patch an unrelated uv environment when PATH Serena is a wrapper", () => {
  writeFileSync(join(directory, "serena"), "#!/usr/bin/env python3\n");
  expect(serenaPython()).toBeUndefined();
  expect(ensureSerenaAdapter().status).toBe("unavailable");
  expect(execFileSync).not.toHaveBeenCalled();
});
it("ships the installer, checker and adapter with the npm CLI", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  expect(manifest.files).toContain("assets/serena");
  for (const file of [
    "install.py",
    "oma_dart.py",
    "oma_symbol_cache.py",
    "dart_check.py",
  ])
    expect(readFileSync(join(SERENA_ASSETS, file), "utf8")).not.toBe("");
});
