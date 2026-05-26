#!/usr/bin/env node
import { Command } from "commander";
import { registerAgentCommands } from "./commands/agent/command.js";
import { registerAuthStatus } from "./commands/auth-status/command.js";
import { registerBridge } from "./commands/bridge/command.js";
import { registerCleanup } from "./commands/cleanup/command.js";
import { registerDocsCommands } from "./commands/docs/command.js";
import { registerDoctor } from "./commands/doctor/command.js";
import { registerImageCommand } from "./commands/image/index.js";
import {
  registerDefaultInstallAction,
  registerInstall,
} from "./commands/install/command.js";
import { registerLink } from "./commands/link/command.js";
import { registerMarketCommand } from "./commands/market/index.js";
import { registerMemory } from "./commands/memory/command.js";
import { registerModelCommands } from "./commands/model/command.js";
import { registerRecap } from "./commands/recap/command.js";
import { registerRetro } from "./commands/retro/command.js";
import { registerScholarCommand } from "./commands/scholar/index.js";
import { registerSearchCommand } from "./commands/search/index.js";
import { registerSkillsCommand } from "./commands/skills/command.js";
import { registerSlideCommand } from "./commands/slide/index.js";
import { registerStar } from "./commands/star/command.js";
import { registerState } from "./commands/state/command.js";
import { registerEmit } from "./commands/state/emit.js";
import { registerStats } from "./commands/stats/command.js";
import { registerUninstall } from "./commands/uninstall/command.js";
import { registerUpdate } from "./commands/update/command.js";
import { registerVault } from "./commands/vault/command.js";
import { registerVerify } from "./commands/verify/command.js";
import { registerVisualize } from "./commands/visualize/command.js";
import { startDashboard } from "./dashboard.js";
import pkg from "./package.json";
import {
  resolveInstallContext,
  setInstallContext,
} from "./platform/install-context.js";
import { startTerminalDashboard } from "./terminal-dashboard.js";
import { printDescribe, runAction } from "./utils/cli-framework.js";

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
      await startTerminalDashboard();
    }),
  );

program
  .command("dashboard:web")
  .description("Start web dashboard on http://127.0.0.1:9847")
  .action(
    runAction(() => {
      startDashboard();
    }),
  );

registerAuthStatus(program);
registerUninstall(program);
registerUpdate(program);
registerLink(program);
registerMarketCommand(program);
registerDoctor(program);
registerEmit(program);
registerState(program);
registerStats(program);
registerRetro(program);
registerRecap(program);
registerDocsCommands(program);
registerCleanup(program);
registerBridge(program);
registerAgentCommands(program);
registerModelCommands(program);
registerMemory(program);
registerVerify(program);
registerVault(program);
registerStar(program);
registerVisualize(program);
registerSearchCommand(program);
registerSkillsCommand(program);
registerSlideCommand(program);
registerScholarCommand(program);
registerImageCommand(program);

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

program.parse();
