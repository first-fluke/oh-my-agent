import * as childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { parallelRun } from "./parallel.js";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});

let root: string | undefined;
const originalCwd = process.cwd();
const children: childProcess.ChildProcess[] = [];
afterEach(() => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  }
  process.chdir(originalCwd);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

it.skipIf(process.platform === "win32")(
  "handles cancellation after the first real child spawn before admitting later tasks",
  async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "oma-admission-"));
    const configDir = path.join(
      root,
      ".agents/skills/oma-orchestration/config",
    );
    fs.mkdirSync(configDir, { recursive: true });
    const worker = path.join(root, "worker.cjs");
    fs.writeFileSync(worker, "setInterval(()=>{},1000);\n");
    fs.writeFileSync(
      path.join(configDir, "cli-config.yaml"),
      `vendors:\n  qwen:\n    command: bun\n    subcommand: ${JSON.stringify(worker)}\n    prompt_flag: -p\n`,
    );
    fs.writeFileSync(
      path.join(root, ".agents/oma-config.yaml"),
      "language: en\nmodel_preset: auto\n",
    );
    process.chdir(root);
    vi.stubEnv("OMA_RUNTIME_VENDOR", "codex");
    vi.stubEnv("OMA_EXECUTION_STATE", "");
    vi.stubEnv("OMA_EXECUTION_DEADLINE", "");
    vi.stubEnv("OMA_EXECUTION_ID", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const spawn = vi.mocked(childProcess.spawn).getMockImplementation();
    if (!spawn) throw new Error("Missing real fixture spawn implementation");
    const admission = vi.mocked(childProcess.spawn).mockImplementation(((
      ...args: Parameters<typeof spawn>
    ) => {
      const child = spawn(...args);
      children.push(child);
      if (children.length === 1)
        child.once("spawn", () => process.emit("SIGTERM"));
      return child;
    }) as typeof spawn);
    await parallelRun(
      Array.from({ length: 12 }, (_, index) => `qa-${index}:Review`),
      { inline: true, vendor: "qwen", session: "s1" },
    );
    expect(admission).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(143);
    process.exitCode = 0;
  },
  5000,
);
