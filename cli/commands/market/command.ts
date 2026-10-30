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
  updateMarketEngine,
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
  for (const w of res.warnings) console.log(color.yellow(`warning:  ${w}`));
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
      "Community-signal market research via the installed last30days skill",
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
      "Report the installed last30days engine oma will run (pin or skills-CLI install) and the Python it uses",
    )
    .option("--refresh", "Deprecated no-op; use `oma market update`")
    .option(
      "--offline",
      "Deprecated no-op; resolution never touches the network",
    );
  addOutputOptions(resolveCmd);
  resolveCmd.action(
    runAction(
      async (opts: { json?: boolean }) => {
        const res = await resolveMarketEngine({ cwd: process.cwd() });
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
      "Install last30days with the skills CLI when missing, otherwise update it (bunx skills add|update -g -y)",
    );
  addOutputOptions(updateCmd);
  updateCmd.action(
    runAction(
      async (opts: { json?: boolean }) => {
        const res = await updateMarketEngine({ cwd: process.cwd() });
        if (resolveJsonMode(opts)) {
          console.log(
            JSON.stringify(
              { ok: res.resolution.engine !== undefined, ...res },
              null,
              2,
            ),
          );
        } else if (res.action === "failed") {
          console.error(color.red(`last30days ${res.action}: ${res.detail}`));
        } else {
          const engine = res.resolution.engine;
          console.log(
            `${color.green("last30days")} ${res.action}${res.detail ? ` — ${res.detail}` : ""}${engine ? ` (${engine.version ?? "unknown version"} via ${engine.source})` : ""}`,
          );
        }
        if (res.action === "failed" || !res.resolution.engine)
          process.exitCode = 1;
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
