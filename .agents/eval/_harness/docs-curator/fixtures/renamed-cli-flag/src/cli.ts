export interface Options { quick: boolean; verbose: boolean }
export function parseArgs(argv: string[]): Options {
  return { quick: argv.includes("--quick"), verbose: argv.includes("--verbose") };
}
