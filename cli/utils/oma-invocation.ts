/** Resolve the currently running OMA entrypoint for internal deterministic jobs.
 * Source mode needs `node|bun cli/cli.ts …`; packaged CLIs can use `oma` on PATH. */
export function resolveOmaInvocation(
  execPath: string = process.execPath,
  entry: string | undefined = process.argv[1],
): {
  command: string;
  prefixArgs: string[];
} {
  if (
    entry &&
    /(?:^|[\\/])(?:cli\.ts|cli\.js|oma)(?:\.[cm]?[jt]s)?$/.test(entry)
  ) {
    return { command: execPath, prefixArgs: [entry] };
  }
  return { command: "oma", prefixArgs: [] };
}
