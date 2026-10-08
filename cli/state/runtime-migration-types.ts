export interface RuntimeMigrationEntry {
  area: "agent-runs" | "agent-plans" | "agent-resume" | "retry";
  source: string;
  destination?: string;
  status: "copied" | "unchanged" | "conflict" | "deferred" | "quarantined";
  reason?: string;
}

export interface RuntimeMigrationOptions {
  projectDir: string;
  dryRun?: boolean;
}
