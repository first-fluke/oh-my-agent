import color from "picocolors";
import { loadConfig } from "./config.js";
import { estimateCost, formatCost, promptConfirm } from "./cost.js";
import { startHeartbeat } from "./heartbeat.js";
import { writeManifest } from "./manifest.js";
import { getMessages } from "./messages.js";
import { makeRunId } from "./naming.js";
import { resolveOutDir } from "./path-guard.js";
import {
  type ValidatedReference,
  validateReferenceImages,
} from "./reference-guard.js";
import { defaultRegistry } from "./registry.js";
import {
  exitForError,
  type GenerateInput,
  type ManifestRun,
  type VendorError,
  type VendorProvider,
} from "./types.js";

export interface RunGenerateOptions {
  prompt: string;
  opts: Record<string, unknown>;
}

export async function runGenerate({
  prompt,
  opts,
}: RunGenerateOptions): Promise<number> {
  const config = await loadConfig();
  const msgs = getMessages(config.language);

  if (!prompt || prompt.trim().length === 0) {
    console.error(color.red(msgs.promptRequired));
    return 4;
  }

  const vendorFlag = (opts.vendor as string) ?? config.defaultVendor;
  const size = (opts.size as string) ?? config.defaultSize;
  const quality = (opts.quality as string) ?? config.defaultQuality;
  const count = opts.count
    ? Number.parseInt(opts.count as string, 10)
    : config.defaultCount;
  const timeoutSec = opts.timeout
    ? Number.parseInt(opts.timeout as string, 10)
    : config.defaultTimeoutSec;
  const dryRun = Boolean(opts.dryRun);
  const formatMode = (opts.format as string) ?? "text";
  const skipConfirm = Boolean(opts.yes) || process.env.OMA_IMAGE_YES === "1";
  const includePromptInManifest =
    (opts.promptInManifest as boolean | undefined) ?? true;

  if (!Number.isFinite(count) || count < 1 || count > 5) {
    console.error(color.red(msgs.countOutOfRange));
    return 4;
  }

  const referenceInput = normalizeReferenceOption(opts.reference);
  let references: ValidatedReference[] = [];
  if (referenceInput.length > 0) {
    try {
      references = await validateReferenceImages(referenceInput);
    } catch (err) {
      if (err && typeof err === "object" && (err as VendorError).kind) {
        const ve = err as VendorError;
        console.error(
          color.red(
            `invalid --reference: ${ve.kind === "invalid-input" ? ve.reason : String(ve.kind)}`,
          ),
        );
      } else {
        console.error(color.red((err as Error).message));
      }
      return 4;
    }
  }

  const providers = defaultRegistry().list();
  const requested = resolveRequestedProviders(vendorFlag, providers);
  if (requested.length === 0) {
    console.error(color.red(msgs.unknownVendor(vendorFlag)));
    return 4;
  }

  if (references.length > 0) {
    const unsupported = requested.filter((p) => !supportsReference(p.name));
    if (unsupported.length > 0) {
      console.error(
        color.red(
          `--reference is not supported by vendor(s): ${unsupported
            .map((p) => p.name)
            .join(", ")}. Use --vendor codex or --vendor gemini.`,
        ),
      );
      return 4;
    }
  }

  const healthResults = await Promise.all(
    requested.map(async (p) => ({
      provider: p,
      health: await p.health().catch((err) => ({
        ok: false as const,
        reason: "other" as const,
        hint: (err as Error).message,
      })),
    })),
  );

  const healthy = healthResults.filter((r) => r.health.ok);
  const unhealthy = healthResults.filter((r) => !r.health.ok);

  if (vendorFlag === "all") {
    if (unhealthy.length > 0) {
      printAuthFailure(unhealthy, msgs);
      return 5;
    }
  } else if (vendorFlag === "auto") {
    if (healthy.length === 0) {
      printAuthFailure(healthResults, msgs);
      return 5;
    }
  } else {
    if (healthy.length === 0) {
      printAuthFailure(healthResults, msgs);
      return 5;
    }
  }

  const runProviders = healthy.map((h) => h.provider);
  const runId = makeRunId();
  const compare = runProviders.length > 1;
  const outDir = resolveOutDir({
    outFlag: opts.out as string | undefined,
    allowExternal: Boolean(opts.allowExternalOut),
    defaultBase: config.defaultOutputDir,
    runId,
    compare,
    singleFolderPattern: config.naming.singleFolderPattern,
    compareFolderPattern: config.compare.folderPattern,
  });

  const modelByVendor: Record<string, string | undefined> = {};
  for (const p of runProviders) {
    modelByVendor[p.name] =
      (opts.model as string | undefined) ??
      (config.vendors[p.name]?.model as string | undefined);
  }

  const costEstimate = estimateCost({
    config,
    providers: runProviders,
    modelByVendor,
    quality,
    count,
    referenceCount: references.length,
  });

  const plan = {
    prompt,
    vendors: runProviders.map((p) => p.name),
    compare,
    size,
    quality,
    count,
    outDir,
    costEstimate,
    timeoutSec,
    referenceImages: references.map((r) => r.absolutePath),
  };

  if (dryRun) {
    console.log(color.cyan(msgs.dryRunHeader));
    console.log(JSON.stringify(plan, null, 2));
    return 0;
  }

  if (
    costEstimate >= config.costGuardrail.estimateThresholdUsd &&
    !skipConfirm
  ) {
    const proceed = await promptConfirm(
      msgs.costConfirm(formatCost(costEstimate)),
    );
    if (!proceed) {
      console.error(color.yellow(msgs.costDeclined));
      return 1;
    }
  }

  console.error(
    color.cyan(msgs.using(runProviders.map((p) => p.name).join(", "))),
  );

  const controller = new AbortController();
  const onSig = () => controller.abort();
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  const startedAt = Date.now();
  const hb = startHeartbeat({
    message: (elapsed) =>
      msgs.heartbeat(runProviders.map((p) => p.name).join("+"), elapsed),
  });

  const referenceImages =
    references.length > 0
      ? references.map((r) => ({ path: r.absolutePath, mime: r.mime }))
      : undefined;
  const referenceImagePaths = referenceImages?.map((r) => r.path);

  const outcomes = await Promise.allSettled(
    runProviders.map((p) =>
      runSingleProvider({
        provider: p,
        input: {
          prompt,
          size: size as GenerateInput["size"],
          quality: quality as GenerateInput["quality"],
          n: count,
          model: modelByVendor[p.name],
          outDir,
          signal: controller.signal,
          timeoutSec,
          referenceImages,
          runShortid: runId.shortid,
        },
      }),
    ),
  );

  hb.stop();
  process.off("SIGINT", onSig);
  process.off("SIGTERM", onSig);

  const runs: ManifestRun[] = outcomes.map((o) => {
    if (o.status === "fulfilled") return o.value;
    return {
      vendor: "unknown",
      model: "unknown",
      strategy: "unknown",
      strategy_attempts: [],
      files: [],
      duration_ms: 0,
      status: "failed",
      error: { kind: "other", message: (o.reason as Error).message },
    };
  });

  const manifestPath = await writeManifest({
    outDir,
    runId,
    prompt,
    includePrompt: includePromptInManifest,
    options: { size, quality, count },
    costEstimate,
    runs,
    startedAt,
    referenceImages: referenceImagePaths,
  });

  const successes = runs.filter((r) => r.status === "ok");
  const failures = runs.filter((r) => r.status !== "ok");

  if (formatMode === "json") {
    console.log(
      JSON.stringify({
        exitCode: successes.length > 0 ? 0 : aggregateExitCode(failures),
        manifestPath,
        runs,
      }),
    );
  } else {
    for (const r of runs) {
      if (r.status === "ok") {
        console.error(
          color.green(msgs.runOk(r.vendor, r.duration_ms, r.files[0] ?? "")),
        );
      } else {
        console.error(
          color.yellow(
            msgs.runFailed(
              r.vendor,
              r.error?.kind ?? "other",
              r.error?.message ?? "",
            ),
          ),
        );
      }
    }
    console.error(color.cyan(msgs.manifestWritten(manifestPath)));
  }

  if (successes.length > 0) return 0;
  return aggregateExitCode(failures);
}

async function runSingleProvider({
  provider,
  input,
}: {
  provider: VendorProvider;
  input: GenerateInput & { timeoutSec: number };
}): Promise<ManifestRun> {
  const started = Date.now();
  try {
    const results = await provider.generate(input);
    const files = results.map((r) => r.filePath);
    const firstStrategy = results[0]?.strategy ?? provider.name;
    // Every GenerateResult from one provider call shares the same attempts chain.
    const attempts = results[0]?.strategyAttempts ?? [];
    return {
      vendor: provider.name,
      model: results[0]?.model ?? "unknown",
      strategy: firstStrategy,
      strategy_attempts: attempts,
      files,
      duration_ms: Date.now() - started,
      cost_usd:
        results.reduce((acc, r) => acc + (r.costUsd ?? 0), 0) || undefined,
      status: "ok",
    };
  } catch (err) {
    const ve = classifyError(err);
    return {
      vendor: provider.name,
      model: "unknown",
      strategy: "unknown",
      strategy_attempts: [],
      files: [],
      duration_ms: Date.now() - started,
      status: statusFromError(ve),
      error: { kind: ve.kind, message: errorMessage(ve) },
    };
  }
}

function classifyError(err: unknown): VendorError {
  if (err && typeof err === "object" && "kind" in err) {
    return err as VendorError;
  }
  if (err instanceof Error && err.name === "AbortError") {
    return { kind: "timeout", after_ms: 0 };
  }
  return { kind: "other", cause: err };
}

function errorMessage(err: VendorError): string {
  switch (err.kind) {
    case "not-installed":
    case "auth-required":
      return err.hint;
    case "invalid-input":
      return `${err.field}: ${err.reason}`;
    case "safety-refused":
      return err.message;
    case "rate-limit":
      return `rate-limited${err.retry_after_sec ? ` (retry after ${err.retry_after_sec}s)` : ""}`;
    case "timeout":
      return `timed out after ${err.after_ms}ms`;
    case "network":
      return `network error${err.retryable ? " (retryable)" : ""}`;
    default:
      return (err.cause as Error | undefined)?.message ?? "unknown error";
  }
}

function statusFromError(err: VendorError): ManifestRun["status"] {
  switch (err.kind) {
    case "safety-refused":
      return "safety-refused";
    case "auth-required":
      return "auth-required";
    case "timeout":
      return "timeout";
    default:
      return "failed";
  }
}

function aggregateExitCode(failures: ManifestRun[]): number {
  if (failures.length === 0) return 1;
  for (const f of failures) {
    const code = exitForError(f.error?.kind);
    if (code !== 1) return code;
  }
  return 1;
}

function resolveRequestedProviders(
  vendorFlag: string,
  providers: VendorProvider[],
): VendorProvider[] {
  if (vendorFlag === "auto" || vendorFlag === "all") return providers;
  return providers.filter((p) => p.name === vendorFlag);
}

function normalizeReferenceOption(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((r) => String(r).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const REFERENCE_SUPPORTED_VENDORS = new Set(["codex", "gemini"]);

function supportsReference(vendor: string): boolean {
  return REFERENCE_SUPPORTED_VENDORS.has(vendor);
}

function printAuthFailure(
  results: Array<{
    provider: VendorProvider;
    health: { ok: boolean; hint?: string };
  }>,
  msgs: ReturnType<typeof getMessages>,
): void {
  console.error(color.red(msgs.authFailureHeader));
  for (const r of results) {
    if (!r.health.ok) {
      console.error(
        `  ${r.provider.name}: ${r.health.hint ?? "not available"}`,
      );
    }
  }
  console.error(color.cyan(msgs.runDoctor));
}
