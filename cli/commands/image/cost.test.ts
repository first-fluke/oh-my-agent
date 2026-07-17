import { describe, expect, it } from "vitest";
import type { ImageConfig } from "./config.js";
import { costGateDecision, estimateCost, formatCost } from "./cost.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  VendorProvider,
} from "./types.js";

const stubConfig: ImageConfig = {
  defaultOutputDir: "x",
  defaultVendor: "auto",
  defaultSize: "1024x1024",
  defaultQuality: "auto",
  defaultCount: 1,
  defaultTimeoutSec: 180,
  vendors: {
    codex: { enabled: true, model: "gpt-image-2" },
    antigravity: { enabled: true, model: "gemini-2.5-flash-image" },
  },
  costGuardrail: {
    estimateThresholdUsd: 0.2,
    perImageUsd: {
      codex: {
        "gpt-image-2": { low: 0.02, medium: 0.03, high: 0.04, auto: 0.03 },
      },
      antigravity: {
        "gemini-2.5-flash-image": {
          low: 0,
          medium: 0,
          high: 0,
          auto: 0,
        },
      },
    },
  },
  compare: { folderPattern: "x", manifest: true },
  naming: { singleFolderPattern: "x" },
  language: "en",
};

class StubProvider implements VendorProvider {
  constructor(public readonly name: string) {}
  async health(): Promise<HealthResult> {
    return { ok: true, supportedModels: [] };
  }
  async generate(_: GenerateInput): Promise<GenerateResult[]> {
    return [];
  }
}

describe("estimateCost", () => {
  it("sums per-image cost across providers and counts", () => {
    const providers = [
      new StubProvider("codex"),
      new StubProvider("antigravity"),
    ];
    const modelByVendor = {
      codex: "gpt-image-2",
      antigravity: "gemini-2.5-flash-image",
    };
    const total = estimateCost({
      config: stubConfig,
      providers,
      modelByVendor,
      quality: "high",
      count: 3,
    });
    // codex high $0.04 * 3 + antigravity (free) * 3 = $0.12
    expect(total).toBeCloseTo(0.12, 5);
  });

  it("ignores reference count for free vendors", () => {
    const providers = [
      new StubProvider("codex"),
      new StubProvider("antigravity"),
    ];
    const modelByVendor = {
      codex: "gpt-image-2",
      antigravity: "gemini-2.5-flash-image",
    };
    const totalNoRef = estimateCost({
      config: stubConfig,
      providers,
      modelByVendor,
      quality: "high",
      count: 1,
      referenceCount: 0,
    });
    const totalWithRef = estimateCost({
      config: stubConfig,
      providers,
      modelByVendor,
      quality: "high",
      count: 1,
      referenceCount: 2,
    });
    // antigravity has zero per-image and no per-reference surcharge.
    expect(totalNoRef).toBeCloseTo(0.04, 5);
    expect(totalWithRef).toBeCloseTo(0.04, 5);
  });

  it("falls back to auto when quality key missing", () => {
    const providers = [new StubProvider("codex")];
    const total = estimateCost({
      config: stubConfig,
      providers,
      modelByVendor: { codex: "gpt-image-2" },
      quality: "experimental",
      count: 1,
    });
    expect(total).toBe(0.03);
  });
});

describe("formatCost", () => {
  it("formats USD to two decimals", () => {
    expect(formatCost(0.2)).toBe("$0.20");
    expect(formatCost(1)).toBe("$1.00");
  });
});

describe("costGateDecision", () => {
  it("proceeds when estimate is below threshold", () => {
    expect(
      costGateDecision({
        estimate: 0.1,
        thresholdUsd: 0.2,
        skipConfirm: false,
        isTTY: false,
      }),
    ).toBe("proceed");
  });

  it("proceeds when confirmation is skipped via --yes", () => {
    expect(
      costGateDecision({
        estimate: 1,
        thresholdUsd: 0.2,
        skipConfirm: true,
        isTTY: false,
      }),
    ).toBe("proceed");
  });

  it("prompts when at/above threshold on an interactive terminal", () => {
    expect(
      costGateDecision({
        estimate: 0.2,
        thresholdUsd: 0.2,
        skipConfirm: false,
        isTTY: true,
      }),
    ).toBe("prompt");
  });

  it("blocks with guidance instead of silently declining when non-interactive", () => {
    // Regression: agents invoking via non-TTY shells used to get exit 1 with
    // a misleading "Cancelled by user." and no cost prompt at all.
    expect(
      costGateDecision({
        estimate: 0.2,
        thresholdUsd: 0.2,
        skipConfirm: false,
        isTTY: false,
      }),
    ).toBe("block-non-interactive");
  });
});
