#!/usr/bin/env node
import { Command } from "commander";
import { printDescribe, runAction } from "./cli-kit/cli-framework.js";
import { registerAgentCommands } from "./commands/agent/command.js";
import { registerAuthStatus } from "./commands/auth-status/command.js";
import { registerBridge } from "./commands/bridge/command.js";
import { registerCleanup } from "./commands/cleanup/command.js";
import { registerDoctor } from "./commands/doctor/command.js";
import { registerExport } from "./commands/export/command.js";
import { registerImageCommand } from "./commands/image/index.js";
import {
  registerDefaultInstallAction,
  registerInstall,
} from "./commands/install/command.js";
import { registerLink } from "./commands/link/command.js";
import { registerMemory } from "./commands/memory/command.js";
import { registerRecap } from "./commands/recap/command.js";
import { registerRetro } from "./commands/retro/command.js";
import { registerScholarCommand } from "./commands/scholar/index.js";
import { registerSearchCommand } from "./commands/search/index.js";
import { registerStar } from "./commands/star/command.js";
import { registerStats } from "./commands/stats/command.js";
import { registerUpdate } from "./commands/update/command.js";
import { registerVerify } from "./commands/verify/command.js";
import { registerVisualize } from "./commands/visualize/command.js";
import { startDashboard } from "./dashboard.js";
import pkg from "./package.json";
import { startTerminalDashboard } from "./terminal-dashboard.js";

const VERSION = pkg.version;

const program = new Command();

program
  .name("oh-my-agent")
  .description("Multi-Agent Orchestrator for AI IDEs")
  .version(VERSION)
  .showSuggestionAfterError()
  .showHelpAfterError()
  .addHelpText(
    "after",
    "\nAliases:\n  oma  Alias for oh-my-agent after global installation.\n",
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
      await startTerminalDashboard();
    }),
  );

program
  .command("dashboard:web")
  .description("Start web dashboard on http://localhost:9847")
  .action(
    runAction(() => {
      startDashboard();
    }),
  );

registerAuthStatus(program);
registerUpdate(program);
registerLink(program);
registerDoctor(program);
registerStats(program);
registerRetro(program);
registerRecap(program);
registerCleanup(program);
registerBridge(program);
registerAgentCommands(program);
registerMemory(program);
registerVerify(program);
registerStar(program);
registerExport(program);
registerVisualize(program);
registerSearchCommand(program);
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
