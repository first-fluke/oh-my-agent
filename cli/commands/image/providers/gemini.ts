import type { ImageConfig } from "../config.js";
import { geminiApiStrategy } from "../strategies/gemini-api.js";
import { geminiMcpStrategy } from "../strategies/gemini-mcp.js";
import type { GeminiStrategy } from "../strategies/gemini-stream.js";
import { geminiStreamStrategy } from "../strategies/gemini-stream.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  StrategyAttempt,
  VendorError,
  VendorProvider,
} from "../types.js";

const STRATEGY_REGISTRY: Record<string, GeminiStrategy> = {
  mcp: geminiMcpStrategy,
  stream: geminiStreamStrategy,
  api: geminiApiStrategy,
};

export class GeminiProvider implements VendorProvider {
  readonly name = "gemini";

  constructor(private config?: ImageConfig) {}

  private strategies(): GeminiStrategy[] {
    const order = this.config?.vendors.gemini?.strategies ?? [
      "mcp",
      "stream",
      "api",
    ];
    return order
      .map((n) => STRATEGY_REGISTRY[n])
      .filter((s): s is GeminiStrategy => Boolean(s));
  }

  async health(): Promise<HealthResult> {
    const strategies = this.strategies();
    for (const s of strategies) {
      const ok = await s.precheck();
      if (ok.ok) {
        return {
          ok: true,
          supportedModels: [
            "gemini-2.5-flash-image",
            "gemini-3-pro-image-preview",
            "nano-banana-pro-preview",
          ],
          estimatedCostPerImage: { auto: 0.04 },
          detail: `strategy=${s.name}`,
        };
      }
    }
    return {
      ok: false,
      reason: "not-authenticated",
      hint: "Set GEMINI_API_KEY + enable billing on AI Studio",
      setup: {
        url: "https://aistudio.google.com/apikey",
        envVar: "GEMINI_API_KEY",
        steps: [
          "Create API key at the URL above (Google sign-in).",
          'export GEMINI_API_KEY="AIza..."',
          "Enable billing on the AI Studio account — free tier has limit=0 for image models.",
          "Gemini is disabled by default; set vendors.gemini.enabled=true in config after billing is active.",
        ],
      },
    };
  }

  async generate(input: GenerateInput): Promise<GenerateResult[]> {
    const model =
      input.model ??
      this.config?.vendors.gemini?.model ??
      "gemini-2.5-flash-image";
    const timeoutMs = (input.timeoutSec ?? 180) * 1000;
    const attempts: StrategyAttempt[] = [];
    let lastError: VendorError | null = null;

    for (const s of this.strategies()) {
      const started = Date.now();
      const pre = await s.precheck();
      if (!pre.ok) {
        attempts.push({
          strategy: s.name,
          status: "skipped",
          reason: pre.reason,
          duration_ms: Date.now() - started,
        });
        continue;
      }
      try {
        const results = await s.run(input, {
          vendorName: this.name,
          model,
          timeoutMs,
        });
        attempts.push({
          strategy: s.name,
          status: "ok",
          duration_ms: Date.now() - started,
        });
        return results.map((r) => ({ ...r, strategyAttempts: attempts }));
      } catch (err) {
        const ve = toVendorError(err);
        attempts.push({
          strategy: s.name,
          status: "failed",
          reason: errorReason(ve),
          duration_ms: Date.now() - started,
        });
        lastError = ve;
        if (isNonRetryable(ve)) throw ve;
      }
    }
    throw (
      lastError ?? {
        kind: "other",
        cause: new Error("All Gemini strategies failed"),
      }
    );
  }
}

function toVendorError(err: unknown): VendorError {
  if (err && typeof err === "object" && "kind" in err)
    return err as VendorError;
  return { kind: "other", cause: err };
}

function errorReason(err: VendorError): string {
  switch (err.kind) {
    case "not-installed":
    case "auth-required":
      return err.hint;
    case "rate-limit":
      return "rate-limit";
    case "timeout":
      return "timeout";
    case "safety-refused":
      return "safety-refused";
    case "network":
      return "network";
    default:
      return "other";
  }
}

function isNonRetryable(err: VendorError): boolean {
  return err.kind === "safety-refused" || err.kind === "invalid-input";
}
