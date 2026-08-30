import { spawnSync } from "node:child_process";
import fs from "node:fs";
import type { Command } from "commander";
import color from "picocolors";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  LAST30DAYS_ENV_PYTHON,
  type MarketResolution,
  resolveMarketEngine,
} from "./resolve.js";

function printResolution(res: MarketResolution): void {
  console.log(
    `engine:   ${res.engine ? color.green("last30days") : color.red("unavailable")}`,
  );
  console.log(`reason:   ${res.reason}`);
  if (res.engine) {
    console.log(`root:     ${res.engine.root}`);
    console.log(`skill:    ${res.engine.skillMd}`);
    if (res.engine.version) console.log(`version:  ${res.engine.version}`);
  }
  console.log(
    `python:   ${res.python.path ? `${res.python.path} (${res.python.version}, ${res.python.source})` : color.yellow("not found")}`,
  );
  console.log(`save_dir: ${res.saveDir}`);
}

/**
 * Run `scripts/last30days.py` from the resolved engine with the given argv.
 * stdio is inherited and the exit code propagates, so the agent reads the
 * engine's compact brief exactly as the upstream SKILL.md expects.
 */
export async function runLast30days(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const res = await resolveMarketEngine({ cwd });
  if (!res.ok || !res.engine || !res.python.path) {
    console.error(color.red(res.reason));
    return 2;
  }
  const hasSaveDir = args.some(
    (a) => a === "--save-dir" || a.startsWith("--save-dir="),
  );
  const finalArgs = [res.engine.script, ...args];
  const first = args[0];
  if (!hasSaveDir && first !== undefined && !first.startsWith("-")) {
    fs.mkdirSync(res.saveDir, { recursive: true });
    finalArgs.push(`--save-dir=${res.saveDir}`);
  }
  const result = spawnSync(res.python.path, finalArgs, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, [LAST30DAYS_ENV_PYTHON]: res.python.path },
  });
  if (result.error) {
    console.error(color.red(result.error.message));
    return 1;
  }
  return result.status ?? 1;
}

export function registerMarketCommand(program: Command): void {
  const market = program
    .command("market")
    .description(
      "Community-signal market research via the always-latest last30days engine",
    );

  market
    .command("detect-trap <topic>")
    .description("Preflight check that refuses keyword-trap queries")
    .option("--force", "bypass refusal even if a trap is detected")
    .action(async (topic: string, opts: { force?: boolean }) => {
      const { runDetectTrap } = await import("./detect-trap.js");
      const argv = [topic];
      if (opts.force) argv.push("--force");
      const code = await runDetectTrap(argv);
      process.exit(code);
    });

  const resolveCmd = market
    .command("resolve")
    .description(
      "Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses",
    )
    .option("--refresh", "Re-check the latest last30days release now")
    .option("--offline", "Do not touch the network; use cached copies only");
  addOutputOptions(resolveCmd);
  resolveCmd.action(
    runAction(
      async (opts: {
        json?: boolean;
        refresh?: boolean;
        offline?: boolean;
      }) => {
        const res = await resolveMarketEngine({
          cwd: process.cwd(),
          refresh: opts.refresh,
          offline: opts.offline,
        });
        if (resolveJsonMode(opts)) console.log(JSON.stringify(res, null, 2));
        else printResolution(res);
        if (!res.ok) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );

  const updateCmd = market
    .command("update")
    .description(
      "Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days)",
    );
  addOutputOptions(updateCmd);
  updateCmd.action(
    runAction(
      async (opts: { json?: boolean }) => {
        const res = await resolveMarketEngine({
          cwd: process.cwd(),
          refresh: true,
          skipPython: true,
        });
        if (resolveJsonMode(opts)) console.log(JSON.stringify(res, null, 2));
        else if (res.engine)
          console.log(
            `${color.green("last30days")} ${res.engine.version ?? res.engine.source} ready — ${res.reason}`,
          );
        else console.error(color.red(res.reason));
        if (!res.ok) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );

  market
    .command("run [args...]")
    .description(
      "Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir",
    )
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .helpOption(false)
    .action(async (_args: string[], _opts: unknown, cmd: Command) => {
      process.exitCode = await runLast30days(cmd.args);
    });
}
