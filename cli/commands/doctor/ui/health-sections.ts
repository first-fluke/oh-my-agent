import * as p from "@clack/prompts";
import pc from "picocolors";
import { renderSelfHealingGateResult } from "../../../state/self-healing.js";
import type { DoctorReport } from "../types.js";

export function renderAgentMemory(report: DoctorReport): void {
  const memory = report.agentMemory;
  const status = memory.status.reachable
    ? pc.green("✅ reachable")
    : memory.status.endpoint
      ? pc.red("❌ unreachable")
      : pc.yellow("⚠️  not configured");
  const service = memory.service.supported
    ? memory.service.installed
      ? pc.green("installed")
      : pc.dim("not installed")
    : pc.dim(`unsupported on ${memory.service.platform}`);
  const binary = memory.binary.available
    ? pc.green(memory.binary.path ?? memory.binary.command)
    : pc.yellow(`not found (${memory.binary.command})`);
  const daemon = memory.daemon.ownedProcessRunning
    ? pc.green(`running (${memory.daemon.ownedPid})`)
    : pc.dim("not running");
  const retry =
    memory.retryQueue.total > 0
      ? pc.yellow(
          `${memory.retryQueue.total} queued (${memory.retryQueue.invalid} invalid)`,
        )
      : pc.green("empty");

  const lines = [
    `Status: ${status}`,
    `Endpoint: ${pc.cyan(memory.status.endpoint ?? memory.daemon.endpoint ?? "not configured")}`,
    `Version: ${memory.status.version ?? "-"}`,
    memory.status.reason ? `Reason: ${pc.yellow(memory.status.reason)}` : null,
    `Binary: ${binary}`,
    `Retry queue: ${retry}`,
    `Service: ${service}`,
    memory.service.servicePath
      ? `Service path: ${pc.dim(memory.service.servicePath)}`
      : null,
    `OMA daemon pid: ${daemon}`,
    `PID path: ${pc.dim(memory.daemon.pidPath)}`,
    memory.issues.length > 0 ? "" : null,
    ...memory.issues.map((issue) => `${pc.yellow("⚠️")} ${issue}`),
  ].filter((line): line is string => line !== null);

  p.note(lines.join("\n"), "AgentMemory");
}

export function renderStateHealth(report: DoctorReport): void {
  const state = report.state;
  const gitignore = state.gitignoreSkipped
    ? pc.dim("skipped outside git")
    : state.gitignored
      ? pc.green("ignored")
      : pc.yellow("not ignored");
  const index = !state.index.exists
    ? pc.dim("missing")
    : state.index.parseOk
      ? pc.green("ok")
      : pc.red("corrupt");
  const invalidEvents = state.sessions.reduce(
    (sum, session) => sum + session.invalidEventLines,
    0,
  );
  const corruptMeta = state.sessions.filter(
    (session) => !session.metaOk,
  ).length;
  const configuredHooks = state.hookOrder.filter((check) => check.configured);
  const invalidHooks = configuredHooks.filter((check) => !check.ok).length;
  const hookSummary =
    configuredHooks.length === 0
      ? pc.dim("none configured")
      : invalidHooks === 0
        ? pc.green(`${configuredHooks.length} configured`)
        : pc.yellow(`${invalidHooks}/${configuredHooks.length} invalid`);

  const lines = [
    `Root: ${state.rootExists ? pc.green("exists") : pc.dim("missing")} ${pc.dim(state.rootPath)}`,
    `Gitignore: ${gitignore}`,
    `Index: ${index}`,
    `Active pointers: ${Object.keys(state.index.active).length} (${state.index.missingActive.length} missing)`,
    `Sessions: ${state.sessions.length} live, ${state.archiveSessions} archived`,
    `Corruption: ${corruptMeta} corrupt meta, ${invalidEvents} invalid event line(s)`,
    `Hook order: ${hookSummary}`,
    state.issues.length > 0 ? "" : null,
    ...state.issues.map((issue) => `${pc.yellow("⚠️")} ${issue}`),
    state.issues.length > 0 ? pc.dim("Run: oma state:repair --dry-run") : null,
  ].filter((line): line is string => line !== null);

  p.note(lines.join("\n"), "State & Hooks");
}

export function renderHookWrappers(report: DoctorReport): void {
  const checks = report.hookWrappers;
  const active = checks.filter((c) => c.status !== "skip");
  if (active.length === 0) return;

  const lines: string[] = [];
  for (const check of active) {
    if (check.status === "pass") {
      lines.push(`${pc.green("✅")} ${check.vendor}`);
    } else {
      lines.push(
        `${pc.yellow("⚠️")} ${check.vendor}: oma binary not resolvable`,
      );
      if (check.remediation) {
        lines.push(pc.dim(`   → ${check.remediation}`));
      }
    }
  }

  p.note(lines.join("\n"), "Hook Wrapper Checks");
}

export function renderSelfHealing(report: DoctorReport): void {
  if (!report.selfHealing) return;
  p.note(renderSelfHealingGateResult(report.selfHealing), "Self-Healing Gate");
}
