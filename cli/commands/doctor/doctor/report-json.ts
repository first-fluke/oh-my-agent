import type { DoctorReport } from "../types.js";
import { AUTH_CHECKERS } from "./environment-checks.js";

export function serializeReportAsJson(report: DoctorReport): string {
  const payload = {
    ok: report.totalIssues === 0,
    issues: report.totalIssues,
    clis: report.clis.map((c) => ({
      name: c.name,
      installed: c.installed,
      version: c.version || null,
      authenticated: c.installed ? (AUTH_CHECKERS[c.name]?.() ?? false) : false,
    })),
    mcp: report.mcpChecks.map((c) => ({
      name: c.name,
      configured: c.mcp.configured,
      path: c.mcp.path || null,
    })),
    skills:
      report.skillChecks.length > 0
        ? report.skillChecks.map((s) => ({
            name: s.name,
            installed: s.installed,
            complete: s.hasSkillMd,
          }))
        : [],
    missingSkills: report.missingSkills.map((s) => s.name),
    serena: { exists: report.hasSerena, fileCount: report.serenaFileCount },
    agentMemory: {
      status: report.agentMemory.status,
      binary: report.agentMemory.binary,
      retryQueue: report.agentMemory.retryQueue,
      service: report.agentMemory.service,
      daemon: report.agentMemory.daemon,
      issues: report.agentMemory.issues,
    },
    state: {
      rootPath: report.state.rootPath,
      rootExists: report.state.rootExists,
      gitignored: report.state.gitignored,
      gitignoreSkipped: report.state.gitignoreSkipped,
      index: report.state.index,
      sessions: report.state.sessions,
      archiveSessions: report.state.archiveSessions,
      issues: report.state.issues,
      hookOrder: report.state.hookOrder,
    },
    selfHealing: report.selfHealing ?? null,
    vendorDocs: report.vendorDocs.map((d) => ({
      file: d.fileName,
      required: d.required,
      hasOmaBlock: d.hasOmaBlock,
    })),
    claudeMd: {
      hasOmaBlock:
        report.vendorDocs.find((d) => d.fileName === "CLAUDE.md")
          ?.hasOmaBlock ?? false,
    },
    skillAudit: {
      skillCount: report.skillAudit.skillCount,
      worstPair: report.skillAudit.worstPair ?? null,
      findings: report.skillAudit.findings.map((f) => ({
        a: f.pair.a,
        b: f.pair.b,
        similarity: Number(f.pair.similarity.toFixed(4)),
        severity: f.severity,
      })),
      blackHoles: report.skillAudit.blackHoles.map((b) => ({
        id: b.id,
        breadth: Number(b.breadth.toFixed(4)),
        cutoff: Number(b.cutoff.toFixed(4)),
        severity: b.severity,
      })),
      sizeFinding: report.skillAudit.sizeFinding ?? null,
    },
    skillEval: {
      skillsWithEval: report.skillEval.skillsWithEval,
      totalSkills: report.skillEval.totalSkills,
    },
    dualInstall: {
      project: report.dualInstall.project.installed
        ? {
            version: report.dualInstall.project.version,
            mode: report.dualInstall.project.mode,
            schemaVersion: report.dualInstall.project.schemaVersion,
          }
        : null,
      global: report.dualInstall.global.installed
        ? {
            version: report.dualInstall.global.version,
            mode: report.dualInstall.global.mode,
            schemaVersion: report.dualInstall.global.schemaVersion,
          }
        : null,
      warnings: report.dualInstall.warnings,
    },
    hookWrappers: report.hookWrappers.map((w) => ({
      vendor: w.vendor,
      wrapperPath: w.wrapperPath,
      status: w.status,
      remediation: w.remediation ?? null,
    })),
  };
  return JSON.stringify(payload, null, 2);
}
