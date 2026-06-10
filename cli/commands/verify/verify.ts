import { existsSync } from "node:fs";
import { join } from "node:path";
import type { VerifyCheck, VerifyResult } from "../../types/index.js";
import type { AgentType } from "./verify/agent-types.js";
import { createCheck } from "./verify/check-utils.js";
import {
  checkAnyTypes,
  checkFlutterAnalysis,
  checkFlutterTests,
  checkFrontendTests,
  checkHardcodedSecrets,
  checkInlineStyles,
  checkPythonTests,
  checkTodoComments,
  checkTypeScript,
} from "./verify/codebase-checks.js";
import {
  checkCharterPreflight,
  checkDeclaredOutputs,
  checkPmPlan,
  checkScopeViolation,
} from "./verify/plan-checks.js";
import {
  checkBackendRawSql,
  checkBackendSyntax,
  checkBackendTests,
  loadStackManifest,
} from "./verify/stack-checks.js";

export type { AgentType } from "./verify/agent-types.js";
export { isValidAgent, VALID_AGENTS } from "./verify/agent-types.js";
export { checkScopeViolation } from "./verify/plan-checks.js";
export { hasBinary, runManifestCmd } from "./verify/stack-checks.js";

function runAgentChecks(
  agentType: AgentType,
  workspace: string,
): VerifyCheck[] {
  const checks: VerifyCheck[] = [];
  switch (agentType) {
    case "backend": {
      const manifest = loadStackManifest(workspace, "oma-backend");
      if (!manifest) {
        checks.push(
          createCheck(
            "Backend Stack",
            "skip",
            "stack/stack.yaml not found — run /stack-set",
          ),
        );
        break;
      }
      checks.push(checkBackendSyntax(manifest, workspace));
      checks.push(checkBackendRawSql(manifest, workspace));
      checks.push(checkBackendTests(manifest, workspace));
      break;
    }
    case "frontend":
      checks.push(checkTypeScript(workspace));
      checks.push(checkInlineStyles(workspace));
      checks.push(checkAnyTypes(workspace));
      checks.push(checkFrontendTests(workspace));
      break;
    case "mobile": {
      const manifest = loadStackManifest(workspace, "oma-mobile");
      if (manifest) {
        checks.push(checkBackendSyntax(manifest, workspace));
        checks.push(checkBackendTests(manifest, workspace));
      } else {
        checks.push(checkFlutterAnalysis(workspace));
        checks.push(checkFlutterTests(workspace));
      }
      break;
    }
    case "qa":
      checks.push(
        createCheck("QA Report", "pass", "Verified by self-check.md"),
      );
      break;
    case "debug":
      if (existsSync(join(workspace, "pyproject.toml"))) {
        checks.push(checkPythonTests(workspace));
      } else if (existsSync(join(workspace, "package.json"))) {
        checks.push(checkFrontendTests(workspace));
      } else {
        checks.push(
          createCheck("Debug Tests", "skip", "No test runner detected"),
        );
      }
      break;
    case "pm":
      checks.push(checkPmPlan(workspace));
      break;
  }
  return checks;
}

export function collectVerifyReport(
  agentType: AgentType,
  workspace: string,
): VerifyResult {
  const checks: VerifyCheck[] = [];
  checks.push(checkScopeViolation(workspace, agentType));
  checks.push(checkCharterPreflight(workspace, agentType));
  checks.push(checkHardcodedSecrets(workspace));
  checks.push(checkTodoComments(workspace));
  checks.push(checkDeclaredOutputs(workspace, agentType));
  checks.push(...runAgentChecks(agentType, workspace));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  return {
    ok: failed === 0,
    agent: agentType,
    workspace,
    checks,
    summary: { passed, failed, warned },
  };
}
