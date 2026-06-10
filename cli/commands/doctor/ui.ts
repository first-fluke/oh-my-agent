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
    renderAgentMemory(report);
    renderStateHealth(report);
    renderHookWrappers(report);
    renderSelfHealing(report);
    await promptRepair(report);
    renderFooter(report);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
