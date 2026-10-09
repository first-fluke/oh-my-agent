import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { shellQuote } from "./hook-command.js";

describe.skipIf(process.platform === "win32")("shellQuote", () => {
  it.each([
    "/custom OMA's $root",
    "/tmp/$(printf expanded); echo suffix",
    "line\nbreak",
  ])("preserves a custom home through the shell: %s", (value) => {
    const result = spawnSync(
      "/bin/sh",
      ["-c", `printf '%s' ${shellQuote(value)}`],
      {
        encoding: "utf8",
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(value);
  });
});
