import type { Command } from "commander";
import pc from "picocolors";
import type { ModelSpec } from "../../platform/model-registry.js";
import { CORE_REGISTRY } from "../../platform/model-registry.js";
import { runAction } from "../../utils/cli-framework.js";
import { computeDiff, formatHumanReadable, formatJson } from "./check.js";
import { describeProbeStatus, probeSlug } from "./probe.js";
import { proposeMissingSlugs, writeProposalToFile } from "./propose.js";
import { fetchCursorModels } from "./sources/cursor.js";
import { fetchOpenRouterModels } from "./sources/openrouter.js";

const OPENROUTER_OWNERS = ["anthropic", "openai", "google", "qwen"] as const;

function groupRegistryByOwner(
  owners: readonly string[],
): Map<string, Map<string, ModelSpec>> {
  const result = new Map<string, Map<string, ModelSpec>>();
  for (const owner of owners) {
    result.set(owner, new Map());
  }
  for (const [slug, spec] of CORE_REGISTRY) {
    const owner = slug.split("/")[0] ?? "";
    if (result.has(owner)) {
      result.get(owner)?.set(slug, spec);
    }
  }
  return result;
}

export function registerModelCommands(program: Command): void {
  // -------------------------------------------------------------------------
  // model:check
  // -------------------------------------------------------------------------
  program
    .command("model:check")
    .description("Check model registry against live vendor model lists")
    .option("--json", "Output as JSON")
    .option("--fail-on-drift", "Exit with code 1 if any drift is detected")
    .option(
      "--owner <name>",
      "Filter to a single registry owner (anthropic/openai/google/qwen/cursor)",
    )
    .option(
      "--probe",
      "Probe NEW candidates against their vendor CLIs (consumes quota)",
    )
    .action(
      runAction(
        async (options) => {
          const vendorFilter: string | undefined = options.owner;
          const probeMode: boolean = !!options.probe;

          // Fetch all sources in parallel
          const [openRouterResult, cursorResult] = await Promise.allSettled([
            fetchOpenRouterModels(),
            Promise.resolve(fetchCursorModels()),
          ]);

          const openRouterModels =
            openRouterResult.status === "fulfilled" && openRouterResult.value.ok
              ? openRouterResult.value.models
              : [];

          if (
            openRouterResult.status === "fulfilled" &&
            !openRouterResult.value.ok
          ) {
            process.stderr.write(
              pc.yellow(
                `[warn] OpenRouter fetch failed: ${(openRouterResult.value as { ok: false; error: string }).error}\n`,
              ),
            );
          } else if (openRouterResult.status === "rejected") {
            process.stderr.write(
              pc.yellow(
                `[warn] OpenRouter fetch rejected: ${openRouterResult.reason}\n`,
              ),
            );
          }

          const cursorModels =
            cursorResult.status === "fulfilled" && cursorResult.value.ok
              ? cursorResult.value.models
              : [];

          if (cursorResult.status === "fulfilled" && !cursorResult.value.ok) {
            process.stderr.write(
              pc.yellow(
                `[warn] Cursor fetch failed: ${(cursorResult.value as { ok: false; error: string }).error}\n`,
              ),
            );
          } else if (cursorResult.status === "rejected") {
            process.stderr.write(
              pc.yellow(
                `[warn] Cursor fetch rejected: ${cursorResult.reason}\n`,
              ),
            );
          }

          // Group registry by owner
          const allOwners = [...OPENROUTER_OWNERS, "cursor"] as const;
          const registryByOwner = groupRegistryByOwner(allOwners);

          // Compute diffs per vendor
          const vendorDiffs: Array<{
            vendor: string;
            diff: ReturnType<typeof computeDiff>;
          }> = [];

          for (const owner of allOwners) {
            if (vendorFilter && owner !== vendorFilter) continue;

            const registered = registryByOwner.get(owner) ?? new Map();
            const sourceModels =
              owner === "cursor"
                ? cursorModels
                : openRouterModels.filter((m) =>
                    m.slug.startsWith(`${owner}/`),
                  );

            const diff = computeDiff(registered, sourceModels);
            vendorDiffs.push({ vendor: owner, diff });
          }

          // --probe: probe NEW candidates per vendor (same CLI sequential)
          type ProbeMap = Map<string, import("./probe.js").ProbeResult>;
          const probeResultMap: ProbeMap = new Map();

          if (probeMode) {
            const totalNew = vendorDiffs.reduce(
              (sum, vd) => sum + vd.diff.new.length,
              0,
            );
            if (totalNew > 0) {
              process.stderr.write(
                pc.yellow(
                  `Probing ${totalNew} candidates — this consumes vendor quota\n`,
                ),
              );

              // Sequential within same CLI (group by CLI then probe sequentially)
              for (const { diff } of vendorDiffs) {
                for (const model of diff.new) {
                  const result = await probeSlug(model.slug);
                  probeResultMap.set(model.slug, result);
                }
              }
            }
          }

          // Output
          const hasDrift = vendorDiffs.some(
            (vd) =>
              vd.diff.new.length > 0 ||
              vd.diff.removed.length > 0 ||
              vd.diff.drifted.length > 0,
          );

          if (options.json) {
            const jsonOutput = Object.fromEntries(
              vendorDiffs.map((vd) => {
                const parsed = JSON.parse(formatJson(vd.diff));
                if (probeMode) {
                  parsed.new = (parsed.new as Array<{ slug: string }>).map(
                    (entry) => {
                      const probeResult = probeResultMap.get(entry.slug);
                      return probeResult
                        ? { ...entry, probeStatus: probeResult.status }
                        : entry;
                    },
                  );
                }
                return [vd.vendor, parsed];
              }),
            );
            console.log(JSON.stringify(jsonOutput, null, 2));
          } else {
            for (const { vendor, diff } of vendorDiffs) {
              console.log(pc.bold(pc.cyan(`\n=== ${vendor} ===`)));
              if (probeMode) {
                console.log(formatHumanReadableWithProbe(diff, probeResultMap));
              } else {
                console.log(formatHumanReadable(diff));
              }
            }
          }

          if (options.failOnDrift && hasDrift) {
            process.exit(1);
          }
        },
        { supportsJsonOutput: true },
      ),
    );

  // -------------------------------------------------------------------------
  // model:probe
  // -------------------------------------------------------------------------
  program
    .command("model:probe <slug>")
    .description(
      "Probe a model slug against its vendor CLI to verify it is accepted",
    )
    .option("--json", "Output as JSON")
    .option(
      "--timeout <ms>",
      "Probe timeout in milliseconds (default: 30000)",
      Number.parseInt,
    )
    .action(
      runAction(
        async (slug: string, options) => {
          const timeoutMs: number | undefined =
            typeof options.timeout === "number" ? options.timeout : undefined;

          const slashIndex = (slug as string).indexOf("/");
          const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
          const cliModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;
          const cliName =
            {
              anthropic: "claude",
              openai: "codex",
              google: "gemini",
              qwen: "qwen",
              cursor: "cursor",
            }[owner] ?? owner;

          if (!options.json) {
            process.stderr.write(
              `Probing ${slug} via ${cliName} --model ${cliModel}\n`,
            );
          }

          const result = await probeSlug(slug, { timeoutMs });

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          const icon =
            result.status === "accepted" ? pc.green("✓") : pc.red("✗");
          const desc = describeProbeStatus(result);
          console.log(`${icon} ${desc}`);
        },
        { supportsJsonOutput: true },
      ),
    );

  // -------------------------------------------------------------------------
  // model:propose
  // -------------------------------------------------------------------------
  program
    .command("model:propose")
    .description(
      "Run model:check --probe internally and generate a models.yaml patch for accepted candidates",
    )
    .option("--json", "Output as JSON")
    .option(
      "--owner <name>",
      "Filter to a single registry owner (anthropic/openai/google/qwen/cursor)",
    )
    .option(
      "--write",
      "Append accepted entries to .agents/config/models.yaml in place",
    )
    .option(
      "--timeout <ms>",
      "Per-probe timeout in milliseconds (default: 30000)",
      Number.parseInt,
    )
    .action(
      runAction(
        async (options) => {
          const vendorFilter: string | undefined = options.owner;
          const timeoutMs: number | undefined =
            typeof options.timeout === "number" ? options.timeout : undefined;

          // Fetch sources
          const [openRouterResult, cursorResult] = await Promise.allSettled([
            fetchOpenRouterModels(),
            Promise.resolve(fetchCursorModels()),
          ]);

          const openRouterModels =
            openRouterResult.status === "fulfilled" && openRouterResult.value.ok
              ? openRouterResult.value.models
              : [];

          const cursorModels =
            cursorResult.status === "fulfilled" && cursorResult.value.ok
              ? cursorResult.value.models
              : [];

          const allOwners = [...OPENROUTER_OWNERS, "cursor"] as const;
          const registryByOwner = groupRegistryByOwner(allOwners);

          const vendorDiffs: Array<{
            vendor: string;
            diff: ReturnType<typeof computeDiff>;
          }> = [];

          for (const owner of allOwners) {
            if (vendorFilter && owner !== vendorFilter) continue;

            const registered = registryByOwner.get(owner) ?? new Map();
            const sourceModels =
              owner === "cursor"
                ? cursorModels
                : openRouterModels.filter((m) =>
                    m.slug.startsWith(`${owner}/`),
                  );

            const diff = computeDiff(registered, sourceModels);
            vendorDiffs.push({ vendor: owner, diff });
          }

          // Collect all NEW candidates
          const allNew = vendorDiffs.flatMap((vd) => vd.diff.new);

          if (allNew.length === 0) {
            if (!options.json) {
              process.stderr.write(
                "No new models found — nothing to probe or propose.\n",
              );
            }
            if (options.json) {
              console.log(JSON.stringify({ proposed: [] }, null, 2));
            }
            return;
          }

          process.stderr.write(
            pc.yellow(
              `Probing ${allNew.length} candidates — this consumes vendor quota\n`,
            ),
          );

          // Probe sequentially per vendor CLI (same CLI = sequential)
          const probedModels: import("./propose.js").ProbedSourceModel[] = [];
          for (const model of allNew) {
            const probeResult = await probeSlug(model.slug, { timeoutMs });
            probedModels.push({ slug: model.slug, probeResult });
            if (!options.json) {
              const icon =
                probeResult.status === "accepted" ? pc.green("✓") : pc.red("✗");
              process.stderr.write(
                `  ${icon} ${model.slug} — ${probeResult.status}\n`,
              );
            }
          }

          const accepted = probedModels.filter(
            (m) => m.probeResult.status === "accepted",
          );

          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  proposed: accepted.map((m) => ({
                    slug: m.slug,
                    cli: m.probeResult.cli,
                    cliModel: m.probeResult.cliModel,
                  })),
                },
                null,
                2,
              ),
            );
            return;
          }

          if (options.write) {
            const { written, skipped } = writeProposalToFile(probedModels);
            if (written.length > 0) {
              process.stderr.write(
                pc.green(
                  `Written ${written.length} entries to .agents/config/models.yaml\n`,
                ),
              );
            }
            for (const slug of skipped) {
              process.stderr.write(
                pc.yellow(`[warn] Skipped duplicate slug: ${slug}\n`),
              );
            }
            if (written.length === 0 && skipped.length === 0) {
              process.stderr.write("No accepted candidates to write.\n");
            }
          } else {
            const yamlText = proposeMissingSlugs(probedModels);
            process.stdout.write(yamlText);
          }
        },
        { supportsJsonOutput: true },
      ),
    );
}

// ---------------------------------------------------------------------------
// Probe-aware human-readable formatter
// ---------------------------------------------------------------------------

function formatHumanReadableWithProbe(
  diff: ReturnType<typeof computeDiff>,
  probeResults: Map<string, import("./probe.js").ProbeResult>,
): string {
  const lines: string[] = [];

  if (
    diff.new.length === 0 &&
    diff.removed.length === 0 &&
    diff.drifted.length === 0
  ) {
    lines.push(pc.dim("  (no changes)"));
    return lines.join("\n");
  }

  for (const model of diff.new) {
    const probe = probeResults.get(model.slug);
    if (probe) {
      const tag =
        probe.status === "accepted"
          ? pc.green(`[✓ accepted via ${probe.cli}]`)
          : pc.red(`[✗ ${probe.status}]`);
      lines.push(`${pc.green(`  + ${model.slug}`)} ${tag}`);
    } else {
      lines.push(pc.green(`  + ${model.slug}`));
    }
  }

  for (const { slug } of diff.removed) {
    lines.push(pc.red(`  - ${slug}`));
  }

  for (const entry of diff.drifted) {
    lines.push(pc.yellow(`  ~ ${entry.slug}`));
  }

  return lines.join("\n");
}
