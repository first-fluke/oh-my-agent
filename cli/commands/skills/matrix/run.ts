import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pkg from "../../../package.json";
import { promptConfirm } from "../eval.js";
import {
  type InstalledMatrixBundle,
  installedMatrixSuiteHash,
  loadInstalledMatrixBundle,
  prepareInstalledMatrixCase,
} from "./bundle.js";
import { gradeMatrixCase } from "./grade.js";
import { runMatrixInvocation } from "./runtime.js";
import {
  loadMatrixSuite,
  matrixSuiteHash,
  prepareMatrixCase,
} from "./suite.js";
import {
  MATRIX_PROTOCOL_VERSION,
  MATRIX_VENDORS,
  type MatrixCell,
  type MatrixDelivery,
  type MatrixInvocation,
  type MatrixRun,
  type MatrixVendor,
} from "./types.js";

export interface MatrixOptions {
  suite?: string;
  projectRoot?: string;
  skills?: string;
  delivery?: string;
  vendors?: string;
  cases?: string;
  live?: boolean;
  yes?: boolean;
  timeoutSeconds?: number;
  claudeModel?: string;
  codexModel?: string;
}

export interface MatrixReport {
  schemaVersion: 1;
  kind: "skill-compatibility-matrix";
  mode: "plan" | "live";
  status: "planned" | "completed" | "cancelled" | "interrupted";
  createdAt: string;
  omaVersion: string;
  protocolVersion: typeof MATRIX_PROTOCOL_VERSION;
  sourceKind: "synthetic" | "installed";
  delivery: MatrixDelivery;
  auditScope: "fixture-contract" | "read-reference";
  bundle?: InstalledMatrixBundle["manifest"];
  host: { platform: string; arch: string; node: string };
  suiteHash: string;
  vendors: MatrixVendor[];
  cases: Array<{ id: string; skill: string }>;
  models: Record<MatrixVendor, string | null>;
  plannedCalls: number;
  callUnit: "native-cli-invocation";
  timeoutMs: number;
  cells: MatrixCell[];
  summary: Record<
    "pass" | "fail" | "unverifiable" | "error" | "measured",
    number
  >;
}

export interface MatrixDependencies {
  run?: (input: MatrixInvocation) => Promise<MatrixRun>;
  confirm?: (question: string) => Promise<boolean>;
  signal?: AbortSignal;
}

function selections(value: string, label: string): string[] {
  const items = value.split(",").map((item) => item.trim());
  if (items.some((item) => !item) || new Set(items).size !== items.length)
    throw new Error(
      `${label} must be a nonempty comma-separated list without duplicates`,
    );
  return items;
}

export async function runSkillsMatrix(
  options: MatrixOptions,
  dependencies: MatrixDependencies = {},
): Promise<MatrixReport> {
  if (options.suite !== undefined && !options.suite.trim())
    throw new Error("--suite must name a JSON suite file");
  if (options.projectRoot !== undefined && !options.projectRoot.trim())
    throw new Error("--project-root must name an installed project");
  if (options.projectRoot !== undefined && options.suite !== undefined)
    throw new Error("--project-root cannot be combined with --suite");
  if ((options.projectRoot === undefined) !== (options.skills === undefined))
    throw new Error(
      "Use --project-root and --skills together for installed skill audits",
    );
  const delivery = options.delivery ?? "native";
  if (delivery !== "native" && delivery !== "injected")
    throw new Error("--delivery must be native or injected");
  if (options.projectRoot === undefined && delivery !== "native")
    throw new Error("--delivery injected requires --project-root and --skills");
  const bundle =
    options.projectRoot !== undefined
      ? loadInstalledMatrixBundle(
          options.projectRoot,
          selections(options.skills ?? "", "--skills"),
        )
      : undefined;
  const suite = bundle
    ? { schemaVersion: 1 as const, cases: bundle.cases }
    : loadMatrixSuite(options.suite);
  const selectedVendors = selections(
    options.vendors ?? "claude,codex",
    "--vendors",
  );
  for (const vendor of selectedVendors) {
    if (!(MATRIX_VENDORS as readonly string[]).includes(vendor))
      throw new Error(
        `Unsupported matrix vendor: ${vendor}. Choose claude,codex.`,
      );
  }
  const vendors = selectedVendors as MatrixVendor[];
  const selectedCases =
    options.cases !== undefined
      ? selections(options.cases, "--cases")
      : suite.cases.map((testCase) => testCase.id);
  const cases = selectedCases.map((id) => {
    const testCase = suite.cases.find((candidate) => candidate.id === id);
    if (!testCase) throw new Error(`Unknown matrix case: ${id}`);
    return testCase;
  });
  const seconds = options.timeoutSeconds ?? 120;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 600)
    throw new Error("--timeout-seconds must be an integer between 1 and 600");
  for (const model of [options.claudeModel, options.codexModel]) {
    if (
      model !== undefined &&
      (!model.trim() ||
        model.length > 256 ||
        [...model].some(
          (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
        ))
    )
      throw new Error(
        "Model names must be nonempty printable strings of at most 256 characters",
      );
  }
  if (options.live && process.platform === "win32")
    throw new Error(
      "Live skill matrix requires macOS or Linux process groups. Run the Linux CLIs inside WSL on Windows.",
    );
  const report: MatrixReport = {
    schemaVersion: 1,
    kind: "skill-compatibility-matrix",
    mode: options.live ? "live" : "plan",
    status: options.live ? "completed" : "planned",
    createdAt: new Date().toISOString(),
    omaVersion: pkg.version,
    protocolVersion: MATRIX_PROTOCOL_VERSION,
    sourceKind: bundle ? "installed" : "synthetic",
    delivery,
    auditScope: bundle ? "read-reference" : "fixture-contract",
    ...(bundle ? { bundle: bundle.manifest } : {}),
    host: {
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
    },
    suiteHash: bundle
      ? installedMatrixSuiteHash(bundle, delivery)
      : matrixSuiteHash(suite),
    vendors,
    cases: cases.map(({ id, skill }) => ({ id, skill })),
    models: {
      claude: options.claudeModel ?? null,
      codex: options.codexModel ?? null,
    },
    plannedCalls: vendors.length * cases.length,
    callUnit: "native-cli-invocation",
    timeoutMs: seconds * 1000,
    cells: [],
    summary: { pass: 0, fail: 0, unverifiable: 0, error: 0, measured: 0 },
  };
  if (!options.live) return report;
  if (
    !options.yes &&
    !(await (dependencies.confirm ?? promptConfirm)(
      `Run ${report.plannedCalls} native CLI invocations (provider usage is billed; each run can make multiple model requests)? [y/N] `,
    ))
  ) {
    report.status = "cancelled";
    return report;
  }
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const externalSignal = dependencies.signal;
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  try {
    outer: for (const vendor of vendors) {
      for (const testCase of cases) {
        if (controller.signal.aborted) {
          report.status = "interrupted";
          break outer;
        }
        const workspace = realpathSync(
          mkdtempSync(join(tmpdir(), "oma-skill-matrix-")),
        );
        try {
          const prepared = bundle
            ? prepareInstalledMatrixCase(
                bundle,
                testCase,
                workspace,
                vendor,
                delivery,
              )
            : prepareMatrixCase(testCase, workspace, vendor);
          let run: MatrixRun;
          try {
            run = await (dependencies.run ?? runMatrixInvocation)({
              vendor,
              workspace,
              prompt: prepared.prompt ?? testCase.prompt,
              timeoutMs: report.timeoutMs,
              model: report.models[vendor] ?? undefined,
              signal: controller.signal,
            });
          } catch {
            run = {
              exitCode: null,
              complete: false,
              nativeSuccess: false,
              output: "",
              reads: [],
              activations: [],
              cliVersion: null,
              model: null,
              durationMs: 0,
              error: "Vendor invocation could not be completed",
            };
          }
          const cell = gradeMatrixCase(prepared, run, vendor);
          report.cells.push(cell);
          report.summary[cell.status] += 1;
          report.summary.measured += 1;
        } finally {
          rmSync(workspace, { recursive: true, force: true });
        }
        if (controller.signal.aborted) {
          report.status = "interrupted";
          break outer;
        }
      }
    }
  } finally {
    externalSignal?.removeEventListener("abort", abort);
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
  }
  return report;
}

export function matrixReportFailed(report: MatrixReport): boolean {
  if (report.mode === "plan") return false;
  return (
    report.status !== "completed" ||
    report.summary.measured !== report.plannedCalls ||
    report.summary.pass !== report.plannedCalls
  );
}

export function renderMatrixReport(report: MatrixReport): string {
  const lines = [
    `Skill compatibility matrix: ${report.status}`,
    `Source: ${report.sourceKind}; delivery: ${report.delivery}; scope: ${report.auditScope}`,
    `Vendors: ${report.vendors.join(", ")}`,
    `Cases: ${report.cases.map((testCase) => testCase.id).join(", ")}`,
    `Native CLI runs: ${report.plannedCalls}; timeout: ${report.timeoutMs / 1000}s per run`,
  ];
  if (report.bundle) {
    lines.push(`Installed bundle: ${report.bundle.hash}`);
    for (const skill of report.bundle.skills) {
      if (skill.missingFiles.length || skill.excludedReferences.length)
        lines.push(
          `${skill.name}: incomplete reference coverage (${skill.missingFiles.length} missing, ${skill.excludedReferences.length} excluded)`,
        );
    }
    lines.push(
      "Read-access audit only; skill workflow behavior and the full Actor runtime are not evaluated.",
    );
  }
  if (report.mode === "plan") {
    lines.push(
      "Plan only; compatibility has not been measured. Add --live to run native CLIs.",
    );
  } else {
    for (const cell of report.cells) {
      lines.push(
        `${cell.vendor} / ${cell.caseId}: ${cell.status} (native activation ${cell.nativeActivation})`,
      );
      for (const check of cell.checks)
        lines.push(`  ${check.id}: ${check.status} — ${check.detail}`);
    }
    lines.push(
      `Measured: ${report.summary.measured}/${report.plannedCalls}; pass ${report.summary.pass}, fail ${report.summary.fail}, unverifiable ${report.summary.unverifiable}, error ${report.summary.error}`,
    );
  }
  return lines.join("\n");
}
