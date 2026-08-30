import { spawnSync } from "node:child_process";
import type { Command } from "commander";
import color from "picocolors";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  ARCHIFY_ENV_NO_UPDATE,
  type DiagramEngineRequest,
  type DiagramResolution,
  resolveDiagramEngine,
} from "./resolve.js";

function printResolution(res: DiagramResolution & { ok: boolean }): void {
  const tag =
    res.engine === "archify" ? color.green("archify") : color.yellow("mermaid");
  console.log(`engine:   ${tag}  (requested: ${res.requested})`);
  console.log(`reason:   ${res.reason}`);
  if (res.archify) {
    console.log(`root:     ${res.archify.root}`);
    console.log(`bin:      ${res.archify.bin}`);
    if (res.archify.version) console.log(`version:  ${res.archify.version}`);
    console.log(`quality:  ${res.quality}`);
  }
  console.log(`sidecar:  ${res.explainSidecar ? "on" : "off"} (explain)`);
}

/**
 * Run the resolved archify binary with the given argv. Exit code propagates so
 * a workflow can never read a non-zero `validate` / `deliver` as success.
 */
export async function runArchify(
  args: string[],
  opts: { cwd?: string; engine?: DiagramEngineRequest } = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const res = await resolveDiagramEngine({
    cwd,
    engine: opts.engine ?? "archify",
  });
  if (!res.archify) {
    console.error(color.red(res.reason));
    return 2;
  }
  const result = spawnSync(process.execPath, [res.archify.bin, ...args], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, [ARCHIFY_ENV_NO_UPDATE]: "1" },
  });
  if (result.error) {
    console.error(color.red(result.error.message));
    return 1;
  }
  return result.status ?? 1;
}

export function registerDiagramCommand(program: Command): void {
  const diagram = program
    .command("diagram")
    .description(
      "Diagram engine helpers (archify interactive HTML or Mermaid fallback)",
    );

  const resolveCmd = diagram
    .command("resolve")
    .description(
      "Report which diagram engine workflows should use, and where archify lives",
    )
    .option(
      "--engine <engine>",
      "Override diagram.engine for this call: auto | archify | mermaid",
    )
    .option("--refresh", "Re-check the latest archify release now")
    .option("--offline", "Do not touch the network; use cached copies only");
  addOutputOptions(resolveCmd);
  resolveCmd.action(
    runAction(
      async (opts: {
        engine?: string;
        json?: boolean;
        refresh?: boolean;
        offline?: boolean;
      }) => {
        const engine = opts.engine as DiagramEngineRequest | undefined;
        if (engine && !["auto", "archify", "mermaid"].includes(engine)) {
          console.error(color.red(`unknown engine: ${engine}`));
          process.exitCode = 1;
          return;
        }
        const res = await resolveDiagramEngine({
          cwd: process.cwd(),
          engine,
          refresh: opts.refresh,
          offline: opts.offline,
        });
        if (resolveJsonMode(opts)) {
          const { ok, ...rest } = res;
          console.log(JSON.stringify({ ok, ...rest }, null, 2));
        } else {
          printResolution(res);
        }
        if (!res.ok) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );

  const updateCmd = diagram
    .command("update")
    .description(
      "Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify)",
    );
  addOutputOptions(updateCmd);
  updateCmd.action(
    runAction(
      async (opts: { json?: boolean }) => {
        const res = await resolveDiagramEngine({
          cwd: process.cwd(),
          engine: "archify",
          refresh: true,
        });
        if (resolveJsonMode(opts)) {
          console.log(JSON.stringify(res, null, 2));
        } else if (res.archify) {
          console.log(
            `${color.green("archify")} ${res.archify.version ?? res.archify.source} ready — ${res.reason}`,
          );
        } else {
          console.error(color.red(res.reason));
        }
        if (!res.ok) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );

  diagram
    .command("archify [args...]")
    .description(
      "Run the installed archify CLI (doctor | guide | validate | deliver | visual-check …) with update checks disabled",
    )
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .helpOption(false)
    .action(async (_args: string[], _opts: unknown, cmd: Command) => {
      // `cmd.args` keeps operands and unknown flags in their original order,
      // so `validate a b.json --quality showcase --json` reaches archify intact.
      process.exitCode = await runArchify(cmd.args);
    });
}
