/**
 * Commander passes (value, previous) to option parsers. A bare `parseInt`
 * therefore receives the previous value as its radix, so `--repeats 3` with
 * a default of 3 parses "3" in base 3 and yields NaN. Always parse base 10.
 */
export function integerOption(value: string): number {
  return Number.parseInt(value, 10);
}
