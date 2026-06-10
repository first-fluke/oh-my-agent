// ---------------------------------------------------------------------------
// Profile Health rendering (--profile flag)
// ---------------------------------------------------------------------------

import * as p from "@clack/prompts";
import pc from "picocolors";
import { printMigrationGuide } from "../../../vendors/qwen/auth.js";
import type { ProfileReport } from "../profile.js";

/**
 * Renders the auth-status matrix for every role-model pairing in the
 * active profile, Qwen OAuth migration warning, and Antigravity fallback
 * warning.
 */
export async function renderProfileReport(
  report: ProfileReport,
): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(` Profile Health (${report.profileName}) `)));

  if (report.missingPreset) {
    p.log.error(
      [
        pc.red("model_preset not found or unknown in .agents/oma-config.yaml"),
        pc.dim("Run `oma install` to set a model preset."),
        pc.dim("Example: model_preset: claude"),
      ].join("\n"),
    );
    // NOTE: Do not exit — matrix still renders with ❌ NO PRESET rows for guidance.
  }

  // ── Summary line when all rows from preset (no overrides) ───────────────
  if (report.allFromPreset && !report.missingPreset) {
    p.note(
      pc.dim(`All agents configured from preset (${report.profileName})`),
      "Preset",
    );
  }

  // ── Auth-status matrix ──────────────────────────────────────────────────
  const COL_ROLE = 14;
  const COL_MODEL = 36;
  const COL_CLI = 14;
  const COL_AUTH = 16;

  function pad(s: string, n: number): string {
    return s.slice(0, n).padEnd(n);
  }

  const borderTop =
    "┌" +
    "─".repeat(COL_ROLE) +
    "┬" +
    "─".repeat(COL_MODEL) +
    "┬" +
    "─".repeat(COL_CLI) +
    "┬" +
    "─".repeat(COL_AUTH) +
    "┐";
  const borderMid =
    "├" +
    "─".repeat(COL_ROLE) +
    "┼" +
    "─".repeat(COL_MODEL) +
    "┼" +
    "─".repeat(COL_CLI) +
    "┼" +
    "─".repeat(COL_AUTH) +
    "┤";
  const borderBot =
    "└" +
    "─".repeat(COL_ROLE) +
    "┴" +
    "─".repeat(COL_MODEL) +
    "┴" +
    "─".repeat(COL_CLI) +
    "┴" +
    "─".repeat(COL_AUTH) +
    "┘";

  function headerRow(): string {
    return (
      "│" +
      pad(" Role", COL_ROLE) +
      "│" +
      pad(" Model", COL_MODEL) +
      "│" +
      pad(" CLI", COL_CLI) +
      "│" +
      pad(" Auth Status", COL_AUTH) +
      "│"
    );
  }

  function dataRow(
    role: string,
    model: string,
    cli: string,
    authStatus: string,
  ): string {
    return (
      "│" +
      pad(` ${role}`, COL_ROLE) +
      "│" +
      pad(` ${model}`, COL_MODEL) +
      "│" +
      pad(` ${cli}`, COL_CLI) +
      "│" +
      pad(` ${authStatus}`, COL_AUTH) +
      "│"
    );
  }

  const matrixLines: string[] = [borderTop, headerRow(), borderMid];

  for (const row of report.rows) {
    let authLabel: string;
    if (row.authStatus === "logged_in") {
      authLabel = pc.green("✓ logged in");
    } else if (row.authStatus === "not_logged_in") {
      const hint = row.authHint ? ` (${row.authHint})` : "";
      authLabel = pc.red(`✗ not logged in${hint}`);
    } else {
      authLabel = pc.yellow("? unknown");
    }
    // Append source annotation to role label
    const sourceTag =
      "source" in row && row.source === "override"
        ? pc.cyan(" (override)")
        : pc.dim(" (preset)");
    matrixLines.push(
      dataRow(`${row.role}${sourceTag}`, row.model, row.cli, authLabel),
    );
  }

  matrixLines.push(borderBot);

  p.note(matrixLines.join("\n"), "Auth Status Matrix");

  // ── Qwen OAuth migration warning (T9) ──────────────────────────────────
  if (report.qwenOAuth.migrationNeeded) {
    p.log.warn(
      [
        pc.yellow("Qwen OAuth sessions were deprecated on 2026-04-15."),
        pc.dim("Run `qwen /auth` to re-authenticate with an API key."),
        report.qwenOAuth.tokenPath
          ? pc.dim(`Legacy token: ${report.qwenOAuth.tokenPath}`)
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    printMigrationGuide(report.qwenOAuth);
  }

  // ── Antigravity runtime fallback warning ────────────────────────────────
  if (report.isAntigravity && report.antigravityFallbackRoles.length > 0) {
    const fallbackList = report.antigravityFallbackRoles.join(", ");
    p.log.warn(
      [
        pc.yellow(
          `${report.profileName} impl agents (${fallbackList}) will fall back to external subprocess.`,
        ),
        pc.dim(
          "These roles resolve to a non-agy CLI; switch to the `antigravity` preset for native dispatch.",
        ),
      ].join("\n"),
    );
  }

  p.outro(pc.green(`Profile health check complete (${report.profileName})`));
}
