import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireHarnessEvolutionLock } from "../../state/harness-evolution.js";

const lockModule = resolve(
  import.meta.dirname,
  "../../state/harness-evolution.ts",
);
const roots: string[] = [];
const children: ReturnType<typeof spawn>[] = [];

afterEach(async () => {
  await Promise.all(
    children.splice(0).map(
      (child) =>
        new Promise<void>((done) => {
          if (child.exitCode !== null || child.signalCode !== null)
            return done();
          child.once("exit", () => done());
          child.kill("SIGKILL");
        }),
    ),
  );
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

async function waitFor(path: string): Promise<void> {
  await expect.poll(() => existsSync(path), { timeout: 10_000 }).toBe(true);
}

describe("scheduled harness evolution SQLite lock", () => {
  it("releases a killed process lock so a later tick can acquire it", async () => {
    const root = mkdtempSync(join(tmpdir(), "oma-evolution-lock-"));
    roots.push(root);
    const entered = join(root, "entered");
    const child = spawn(
      "bun",
      [
        "-e",
        `
          import { acquireHarnessEvolutionLock } from ${JSON.stringify(lockModule)};
          import { writeFileSync } from "node:fs";
          const lock = acquireHarnessEvolutionLock(${JSON.stringify(root)});
          if (!lock) process.exit(2);
          writeFileSync(${JSON.stringify(entered)}, "");
          await new Promise(() => {});
        `,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const done = new Promise<void>((accept, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0 || signal === "SIGKILL") accept();
        else reject(new Error(`${code ?? signal}: ${stderr}`));
      });
    });

    await waitFor(entered);
    expect(acquireHarnessEvolutionLock(root)).toBeUndefined();
    child.kill("SIGKILL");
    await done;

    const recovered = acquireHarnessEvolutionLock(root);
    expect(recovered).toBeDefined();
    recovered?.release();
    writeFileSync(join(root, "verified"), "");
  });
});
