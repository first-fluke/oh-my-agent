/** Resolve the currently running OMA entrypoint for internal deterministic jobs.
 * Source mode needs `node|bun cli/cli.ts …`; packaged CLIs can use `oma` on PATH. */
export function resolveOmaInvocation(): {
  command: string;
  prefixArgs: string[];
} {
  const entry = process.argv[1];
  if (
    entry &&
    /(?:^|[\\/])(?:cli\.ts|cli\.js|oma)(?:\.[cm]?[jt]s)?$/.test(entry)
  ) {
    return { command: process.execPath, prefixArgs: [entry] };
  }
  return { command: "oma", prefixArgs: [] };
}
