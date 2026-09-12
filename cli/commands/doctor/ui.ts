import * as p from "@clack/prompts";
import pc from "picocolors";
import type { DoctorReport } from "./types.js";
import { renderFooter } from "./ui/footer.js";
import {
  renderAgentMemory,
  renderHookWrappers,
  renderSelfHealing,
  renderStateHealth,
} from "./ui/health-sections.js";
import { promptRepair } from "./ui/repair-prompt.js";
import { renderSkillBoundaries } from "./ui/skill-boundaries.js";
import {
  renderCliTable,
  renderDualInstall,
  renderMcpTable,
  renderSkillsTable,
} from "./ui/tables.js";

export { renderProfileReport } from "./ui/profile-report.js";

export async function renderDoctorReport(report: DoctorReport): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🩺 oh-my-agent doctor ")));

  try {
    renderDualInstall(report);
    renderCliTable(report);
    renderMcpTable(report);
    renderSkillsTable(report);
    renderSkillBoundaries(report);
    if (
      !report.providers ||
      report.providers.semanticMemory.provider === "agentmemory"
    )
      renderAgentMemory(report);
    if (report.providers) {
      const providers = report.providers;
      p.note(
        [
          `Documentation: ${providers.docs.provider} (${providers.docs.authentication}; reachability ${providers.docs.reachability})`,
          ...(providers.web
            ? [
                `Web search: ${providers.web.provider} (${providers.web.status}; reachability ${providers.web.reachability}${providers.web.credentialConfigured === undefined ? "" : `; credential ${providers.web.credentialConfigured ? "configured" : "missing"}`})`,
              ]
            : []),
          `Code intelligence: ${providers.codeIntelligence.provider}${providers.codeIntelligence.experimental ? " (experimental)" : ""}${providers.codeIntelligence.tracked === undefined ? "" : `; project ${providers.codeIntelligence.tracked ? "tracked" : "not tracked"}`}`,
          `Semantic memory: ${providers.semanticMemory.provider} (${providers.semanticMemory.reachable ? "reachable" : (providers.semanticMemory.reason ?? "offline")})`,
          ...providers.issues,
        ].join("\n"),
        "Capability providers",
      );
    }
    renderStateHealth(report);
    renderHookWrappers(report);
    renderSelfHealing(report);
    await promptRepair(report);
    await renderFooter(report);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
