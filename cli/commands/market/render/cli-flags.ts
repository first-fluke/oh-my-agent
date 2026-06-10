/**
 * CLI flag parsing helpers for `oma market render`.
 */

// ---------------------------------------------------------------------------
// CLI flag parser
// ---------------------------------------------------------------------------

export function parseFlag(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < argv.length) return argv[idx + 1];
  return undefined;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function packArgv(opts: Record<string, unknown>): string[] {
  const argv: string[] = [];
  if (opts.topic) argv.push("--topic", String(opts.topic));
  if (opts.intent) argv.push("--intent", String(opts.intent));
  if (opts.format) argv.push("--format", String(opts.format));
  if (opts.frameworks) argv.push("--frameworks", String(opts.frameworks));
  if (opts.vs) argv.push("--vs", String(opts.vs));
  if (opts.minTrust) argv.push("--min-trust", String(opts.minTrust));
  if (opts.selfCheck === false) argv.push("--no-self-check");
  if (opts.outputDir) argv.push("--output-dir", String(opts.outputDir));
  if (opts.nowMs) argv.push("--now-ms", String(opts.nowMs));
  if (opts.versionOverride)
    argv.push("--version-override", String(opts.versionOverride));
  return argv;
}
