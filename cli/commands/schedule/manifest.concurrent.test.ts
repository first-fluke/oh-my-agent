import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("preserves both a newly registered job and a concurrent last-run update", async () => {
  const home = mkdtempSync(join(tmpdir(), "oma-schedule-concurrent-"));
  const directory = join(home, ".agents", "schedule");
  mkdirSync(directory, { recursive: true });
  const target = join(directory, "schedules.json");
  writeFileSync(
    target,
    JSON.stringify({
      version: 1,
      jobs: [{ id: "existing-job", prompt: "original" }],
    }),
  );
  const worker = fileURLToPath(
    new URL("./__fixtures__/manifest-worker.mjs", import.meta.url),
  );
  const children: ReturnType<typeof spawn>[] = [];
  const launch = (role: string) => {
    const child = spawn(process.execPath, [worker, home, role], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    children.push(child);
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    return new Promise<void>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Worker exited ${code}: ${stderr}`)),
      );
    });
  };
  const waitFor = async (name: string) => {
    const deadline = Date.now() + 10_000;
    while (!existsSync(join(home, name))) {
      if (Date.now() > deadline)
        throw new Error(`Worker did not reach ${name}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const pending: Promise<void>[] = [];
  try {
    pending.push(launch("add"));
    await waitFor("add.read");
    pending.push(launch("update"));
    await waitFor("update.started");
    await new Promise((resolve) => setTimeout(resolve, 100));
    writeFileSync(join(home, "release"), "go");
    await Promise.all(pending);
    const result = JSON.parse(readFileSync(target, "utf-8"));
    expect(result.jobs).toEqual([
      { id: "existing-job", prompt: "updated" },
      { id: "new-job", prompt: "new" },
    ]);
  } finally {
    for (const child of children)
      if (child.exitCode === null) child.kill("SIGKILL");
    await Promise.allSettled(pending);
    rmSync(home, { recursive: true, force: true });
  }
});
