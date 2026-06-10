// v0.9.0 sidecar linter — port of resources/scripts/lint.py.
// See .agents/skills/oma-scholar/resources/sidecar-spec.md for rule sources.

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  path: string;
  message: string;
  fix?: string;
}

export interface LintReport {
  errors: number;
  warnings: number;
  findings: Finding[];
}

export interface LintOptions {
  lenient?: boolean;
  failOnWarning?: boolean;
}

export class Reporter {
  findings: Finding[] = [];
  error(p: string, message: string, fix?: string): void {
    this.findings.push({ severity: "error", path: p, message, fix });
  }
  warn(p: string, message: string, fix?: string): void {
    this.findings.push({ severity: "warning", path: p, message, fix });
  }
}
