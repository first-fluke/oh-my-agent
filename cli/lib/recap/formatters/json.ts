import type { RecapOutput } from "../schema.js";

export function formatJson(output: RecapOutput): string {
  return JSON.stringify(output, null, 2);
}
