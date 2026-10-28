// CI transport seam: keep the actual CLI installer and wiring, but use this
// checkout's payload rather than a previously published release download.

import { mock } from "bun:test";
import { resolve } from "node:path";

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  !process.env.OMA_SMOKE_CHECKOUT
)
  throw new Error("Plugin payload preload is restricted to fresh hosted CI");

const checkout = resolve(process.env.OMA_SMOKE_CHECKOUT);
const source = resolve(checkout, "cli/io/tarball.ts");
const original = await import(source);
mock.module(source, () => ({
  ...original,
  downloadAndExtract: async () => ({
    dir: checkout,
    cleanup: () => {},
    source: "ci-checkout-transport",
    version: null,
    warnings: [
      "CI smoke: download transport replaced with the checked-out payload",
    ],
  }),
}));
