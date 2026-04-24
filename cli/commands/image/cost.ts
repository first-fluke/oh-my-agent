import readline from "node:readline";
import type { ImageConfig } from "./config.js";
import type { VendorProvider } from "./types.js";

export interface EstimateArgs {
  config: ImageConfig;
  providers: VendorProvider[];
  modelByVendor: Record<string, string | undefined>;
  quality: string;
  count: number;
  referenceCount?: number;
}

// Gemini 2.5 Flash Image charges ~1,290 input tokens per reference image.
// At $30/1M output tokens (1,290 tokens ≈ $0.04), we approximate the input
// surcharge conservatively as $0.01 per reference per generated image.
const GEMINI_REFERENCE_SURCHARGE_USD = 0.01;

export function estimateCost({
  config,
  providers,
  modelByVendor,
  quality,
  count,
  referenceCount = 0,
}: EstimateArgs): number {
  let total = 0;
  for (const p of providers) {
    const model = modelByVendor[p.name] ?? config.vendors[p.name]?.model;
    if (!model) continue;
    const perImage =
      config.costGuardrail.perImageUsd[p.name]?.[model]?.[quality] ??
      config.costGuardrail.perImageUsd[p.name]?.[model]?.auto ??
      0;
    total += perImage * count;
    if (referenceCount > 0 && p.name === "gemini") {
      total += GEMINI_REFERENCE_SURCHARGE_USD * referenceCount * count;
    }
  }
  return total;
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export async function promptConfirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    const answer: string = await new Promise((resolve) => {
      rl.question(question, (a) => resolve(a));
    });
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
