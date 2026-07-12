#!/usr/bin/env node
import { Command } from "commander";
import pkg from "./package.json";
import {
  resolveInstallContext,
  setInstallContext,
} from "./platform/install-context.js";

const VERSION = pkg.version;

const program = new Command();

program
  .name("oh-my-agent")
  .description("Multi-Agent Orchestrator for AI IDEs")
  .version(VERSION)
  .option("-g, --global", "operate on the user's HOME install (~/.agents/)")
  .showSuggestionAfterError()
  .showHelpAfterError()
  .addHelpText(
    "after",
    "\nAliases:\n  oma  Alias for oh-my-agent after global installation.\n",
  );

program.hook("preAction", () => {
  const opts = program.opts<{ global?: boolean }>();
  const ctx = resolveInstallContext({ global: opts.global === true });
  setInstallContext(ctx);
});

/**
 * Register the full command tree. Every command module is imported lazily so
 * the `oma hook` fast path below never pays their module-evaluation cost.
 * `Promise.all` order determines `--help` listing order.
 */
async function registerFullCli(): Promise<void> {
  const { printDescribe, runAction } = await import("./utils/cli-framework.js");
  const { registerDefaultInstallAction, registerInstall } = await import(
    "./commands/install/command.js"
  );

  registerDefaultInstallAction(program);
  registerInstall(program);

  program
    .command("describe [command-path]")
    .description("Describe CLI commands as JSON for runtime introspection")
    .action(
      runAction(
        (commandPath) => {
          printDescribe(program, commandPath);
        },
        { supportsJsonOutput: true },
      ),
    );

  program
    .command("dashboard")
    .description("Start terminal dashboard (real-time agent monitoring)")
    .action(
      runAction(async () => {
        const { startTerminalDashboard } = await import(
          "./terminal-dashboard.js"
        );
        await startTerminalDashboard();
      }),
    );

  program
    .command("dashboard:web")
    .description("Start web dashboard on http://127.0.0.1:9847")
    .action(
      runAction(async () => {
        const { startDashboard } = await import("./dashboard.js");
        startDashboard();
      }),
    );

  const registrars = await Promise.all([
    import("./commands/auth-status/command.js").then(
      (m) => m.registerAuthStatus,
    ),
    import("./commands/uninstall/command.js").then((m) => m.registerUninstall),
    import("./commands/update/command.js").then((m) => m.registerUpdate),
    import("./commands/link/command.js").then((m) => m.registerLink),
    import("./commands/intel/command.js").then((m) => m.registerIntelCommand),
    import("./commands/market/index.js").then((m) => m.registerMarketCommand),
    import("./commands/doctor/command.js").then((m) => m.registerDoctor),
    import("./commands/hook/command.js").then((m) => m.registerHook),
    import("./commands/state/emit.js").then((m) => m.registerEmit),
    import("./commands/state/command.js").then((m) => m.registerState),
    import("./commands/ralph/command.js").then((m) => m.registerRalph),
    import("./commands/stats/command.js").then((m) => m.registerStats),
    import("./commands/retro/command.js").then((m) => m.registerRetro),
    import("./commands/recap/command.js").then((m) => m.registerRecap),
    import("./commands/docs/command.js").then((m) => m.registerDocsCommands),
    import("./commands/emit/command.js").then((m) => m.registerEmitCommand),
    import("./commands/cleanup/command.js").then((m) => m.registerCleanup),
    import("./commands/bridge/command.js").then((m) => m.registerBridge),
    import("./commands/agent/command.js").then((m) => m.registerAgentCommands),
    import("./commands/model/command.js").then((m) => m.registerModelCommands),
    import("./commands/memory/command.js").then((m) => m.registerMemory),
    import("./commands/verify/command.js").then((m) => m.registerVerify),
    import("./commands/vault/command.js").then((m) => m.registerVault),
    import("./commands/star/command.js").then((m) => m.registerStar),
    import("./commands/visualize/command.js").then((m) => m.registerVisualize),
    import("./commands/search/index.js").then((m) => m.registerSearchCommand),
    import("./commands/skills/command.js").then((m) => m.registerSkillsCommand),
    import("./commands/slide/index.js").then((m) => m.registerSlideCommand),
    import("./commands/scholar/index.js").then((m) => m.registerScholarCommand),
    import("./commands/image/index.js").then((m) => m.registerImageCommand),
    import("./commands/video/index.js").then((m) => m.registerVideoCommand),
    import("./commands/serena/command.js").then(
      (m) => m.registerSerenaCommands,
    ),
    import("./commands/schedule/command.js").then((m) => m.registerSchedule),
  ]);
  for (const register of registrars) {
    register(program);
  }

  program
    .command("help")
    .description("Show help information")
    .action(
      runAction(() => {
        program.help();
      }),
    );

  program
    .command("version")
    .description("Show version number")
    .action(
      runAction(() => {
        console.log(VERSION);
      }),
    );
}

// Fast path: `oma hook …` runs on every user prompt via the vendor hook
// wrappers (oma-hook.sh), so it must not pay the full command tree's
// module-evaluation cost (~0.4s). Register only the hook slice; any other
// argv shape (including `oma -g hook`) falls through to the full CLI.
if (process.argv[2] === "hook") {
  const { registerHook } = await import("./commands/hook/command.js");
  registerHook(program);
} else {
  await registerFullCli();
}

program.parse();
