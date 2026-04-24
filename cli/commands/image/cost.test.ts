import { describe, expect, it } from "vitest";
import type { ImageConfig } from "./config.js";
import { estimateCost, formatCost } from "./cost.js";
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
    gemini: { enabled: true, model: "gemini-2.5-flash-image" },
  },
  costGuardrail: {
    estimateThresholdUsd: 0.2,
    perImageUsd: {
      codex: {
        "gpt-image-2": { low: 0.02, medium: 0.03, high: 0.04, auto: 0.03 },
      },
      gemini: {
        "gemini-2.5-flash-image": {
          low: 0.04,
          medium: 0.04,
          high: 0.04,
          auto: 0.04,
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
    const providers = [new StubProvider("codex"), new StubProvider("gemini")];
    const modelByVendor = {
      codex: "gpt-image-2",
      gemini: "gemini-2.5-flash-image",
    };
    const total = estimateCost({
      config: stubConfig,
      providers,
      modelByVendor,
      quality: "high",
      count: 3,
    });
    // codex high $0.04 * 3 + gemini high $0.04 * 3 = $0.24
    expect(total).toBeCloseTo(0.24, 5);
  });

  it("applies per-reference surcharge for gemini only", () => {
    const providers = [new StubProvider("codex"), new StubProvider("gemini")];
    const modelByVendor = {
      codex: "gpt-image-2",
      gemini: "gemini-2.5-flash-image",
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
    // codex $0.04 + gemini $0.04 = $0.08 base; gemini surcharge $0.01 * 2 = $0.02
    expect(totalNoRef).toBeCloseTo(0.08, 5);
    expect(totalWithRef).toBeCloseTo(0.1, 5);
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
