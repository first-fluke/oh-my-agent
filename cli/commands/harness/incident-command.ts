import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Command } from "commander";
import { emitEvent } from "../../state/events.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import {
  assertIncidentFixtureDependencies,
  captureHarnessIncident,
  exportHarnessIncident,
  type HarnessIncident,
  readHarnessIncident,
} from "./incident.js";
import { assertExistingPathInside } from "./paths.js";
import { loadHarnessFixtureTranscripts } from "./replay.js";
import { type HarnessEvalOptions, runHarnessEval } from "./run.js";

function summary(incident: HarnessIncident) {
  return {
    id: incident.id,
    summary: incident.summary,
    source: incident.source,
    manifestHash: incident.manifestHash,
    cause: incident.cause,
    initialSnapshot: incident.initial
      ? {
          digest: incident.initial.snapshot.digest,
          complete: incident.initial.snapshot.complete,
          provenance: incident.initial.provenance,
        }
      : null,
    limitations: incident.limitations,
  };
}
function print(value: Record<string, unknown>, json: boolean): void {
  if (json) console.log(JSON.stringify(value, null, 2));
  else
    for (const [key, item] of Object.entries(value))
      console.log(
        `${key}: ${typeof item === "string" ? item : JSON.stringify(item)}`,
      );
}
export async function reproduceHarnessIncident(
  root: string,
  id: string,
  json: boolean,
  options: Omit<HarnessEvalOptions, "suite" | "_projectRoot">,
) {
  const { suitePath, incident } = exportHarnessIncident(root, id);
  if (options.action === "fixture-replay") {
    assertIncidentFixtureDependencies(root, incident);
    if (!options.transcriptFile)
      throw new Error("Incident fixture replay requires --transcript");
    const transcriptPath = resolve(root, options.transcriptFile);
    assertExistingPathInside(root, transcriptPath, "Incident transcript");
    const transcripts = loadHarnessFixtureTranscripts(transcriptPath);
    const transcript = transcripts.find((item) => item.taskId === id);
    for (const dependency of incident.dependencies) {
      const supplied = transcript?.steps.filter(
        (step) => step.tool === dependency.name,
      );
      if (!supplied?.length)
        throw new Error(
          `Incident dependency response missing from transcript: ${dependency.name}`,
        );
      const pinned = loadHarnessFixtureTranscripts(
        resolve(root, dependency.fixture as string),
      )
        .find((item) => item.taskId === id)
        ?.steps.filter((step) => step.tool === dependency.name);
      if (!pinned?.length || !isDeepStrictEqual(pinned, supplied))
        throw new Error(
          `Incident dependency transcript differs from pinned responses: ${dependency.name}`,
        );
    }
  }
  const result = await runHarnessEval(json, {
    ...options,
    suite: suitePath,
    _projectRoot: root,
    _sourceLimitations: incident.limitations,
    ...(options.action || options.mock || options.live
      ? {}
      : { live: true, record: true }),
  });
  if (result)
    emitEvent(root, `oma-incident-${id}`, {
      kind: "harness.incident.evaluated",
      payload: {
        incidentId: id,
        manifestHash: incident.manifestHash,
        sourceRunId: incident.source.runId,
        suiteHash: result.suiteHash,
        candidateHash: result.candidateHash,
        baselineHash: result.baselineHash,
        evaluatorHash: result.evaluatorHash,
        executionMode: result.executionMode,
        correctedTaskIds: result.score.correctedTaskIds,
        regressedTaskIds: result.score.regressedTaskIds,
        promotionReady: result.promotionReady,
      },
    });
  return result;
}

export function registerHarnessIncidentCommands(harness: Command): void {
  const incident = harness
    .command("incident")
    .description("Capture a failure and connect it to a regression fixture");
  addOutputOptions(
    incident
      .command("capture")
      .requiredOption("--spec <path>", "Incident specification JSON")
      .option(
        "--run <id>",
        "Import observable metadata from an existing agent run",
      ),
    "Output incident provenance as JSON",
  ).action(
    runAction(
      async (raw) => {
        const options = raw as {
          spec: string;
          run?: string;
          json?: boolean;
          output?: string;
        };
        const captured = captureHarnessIncident(
          process.cwd(),
          options.spec,
          options.run,
        );
        print(
          { ...summary(captured.incident), path: captured.path },
          resolveJsonMode(options),
        );
      },
      { supportsJsonOutput: true },
    ),
  );
  addOutputOptions(
    incident.command("show").argument("<id>", "Captured incident ID"),
    "Output incident provenance as JSON",
  ).action(
    runAction(
      async (id: string, raw: Record<string, unknown>) => {
        print(
          summary(readHarnessIncident(process.cwd(), id)),
          resolveJsonMode(raw),
        );
      },
      { supportsJsonOutput: true },
    ),
  );
  addOutputOptions(
    incident.command("export").argument("<id>", "Captured incident ID"),
    "Output exported fixture path as JSON",
  ).action(
    runAction(
      async (id: string, raw: Record<string, unknown>) => {
        const { suitePath, incident: captured } = exportHarnessIncident(
          process.cwd(),
          id,
        );
        print({ ...summary(captured), suitePath }, resolveJsonMode(raw));
      },
      { supportsJsonOutput: true },
    ),
  );
  addOutputOptions(
    incident
      .command("reproduce")
      .argument("<id>", "Captured incident ID")
      .requiredOption(
        "--candidate <path>",
        "Candidate root containing .agents/",
      )
      .option(
        "--action <mode>",
        "inspect, rescore, fixture-replay, or rerun; omitted starts a new live run",
      )
      .option(
        "--record-file <path>",
        "Pinned recording for inspection/replay/rerun",
      )
      .option(
        "--transcript <path>",
        "Tool fixture transcript for fixture-replay",
      )
      .option("--record", "Record the new live execution")
      .option("--yes", "Skip live model-cost confirmation")
      .option(
        "--timeout-minutes <n>",
        "Timeout per live arm",
        Number.parseFloat,
        15,
      ),
    "Output the incident evaluation as JSON",
  ).action(
    runAction(
      async (id: string, raw: Record<string, unknown>) => {
        const options = raw as unknown as Omit<
          HarnessEvalOptions,
          "suite" | "_projectRoot"
        > & { transcript?: string };
        await reproduceHarnessIncident(
          process.cwd(),
          id,
          resolveJsonMode(raw),
          { ...options, transcriptFile: options.transcript },
        );
      },
      { supportsJsonOutput: true },
    ),
  );
}
