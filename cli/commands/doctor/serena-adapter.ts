import {
  ensureSerenaAdapter,
  type SerenaAdapterStatus,
} from "../../io/serena-adapter.js";
import { daemonKey, readRegistry } from "../../io/serena-daemon.js";
import {
  projectUsesDart,
  serenaContextHasDartTool,
  serenaRuntimeRevision,
} from "../../io/serena-managed-runtime.js";

export interface SerenaAdapterDoctorCheck {
  applicable: boolean;
  adapter?: SerenaAdapterStatus;
  pendingRestart: boolean;
  issues: string[];
}

export function collectSerenaAdapterCheck(
  root: string,
): SerenaAdapterDoctorCheck {
  const result: SerenaAdapterDoctorCheck = {
    applicable: false,
    pendingRestart: false,
    issues: [],
  };
  try {
    if (!projectUsesDart(root)) return result;
    result.applicable = true;
    result.adapter = ensureSerenaAdapter(true);
    if (!serenaContextHasDartTool())
      result.issues.push(
        "Dart diagnostics tool is missing from the OMA context; run oma serena setup",
      );
    if (result.adapter.status !== "ready") {
      result.issues.push(
        `Dart adapter ${result.adapter.status}: ${result.adapter.error ?? "run oma serena setup"}`,
      );
    }
    const record = readRegistry()[daemonKey(root, "oma")];
    if (
      record &&
      record.runtimeRevision !== serenaRuntimeRevision(root, result.adapter)
    ) {
      result.pendingRestart = true;
      result.issues.push(
        "Serena runtime changed: close active MCP sessions and run oma serena check to restart it",
      );
    }
  } catch (error) {
    result.applicable = true;
    result.issues.push(error instanceof Error ? error.message : String(error));
  }
  return result;
}
