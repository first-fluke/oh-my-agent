import type { Mock } from "vitest";

export function assertDefined<T>(
  value: T,
  label: string,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`${label} expected to be defined`);
  }
}

export function getCall<T extends unknown[]>(
  mock: Mock<(...args: T) => unknown>,
  index: number,
): T {
  const call = mock.mock.calls[index];
  if (!call) {
    throw new Error(`expected mock call at index ${index}`);
  }
  return call;
}

export function firstCall<T extends unknown[]>(
  mock: Mock<(...args: T) => unknown>,
): T {
  return getCall(mock, 0);
}

export function lastCall<T extends unknown[]>(
  mock: Mock<(...args: T) => unknown>,
): T {
  const calls = mock.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("expected at least one mock call");
  return call;
}

/**
 * Assert that an MCP entry is the serena entry oma writes, carrying `context`.
 *
 * Tests must not hardcode `command: "serena"`: the default transport is the
 * `oma bridge` proxy onto a shared per-project daemon, whose command is the
 * absolute path of whichever oma is running. Both shapes stamp `--context`.
 */
export function expectOmaSerenaEntry(
  entry: { command?: string; args?: string[] } | undefined,
  context: string,
): void {
  if (!entry?.args) {
    throw new Error(
      `expected a serena MCP entry, got ${JSON.stringify(entry)}`,
    );
  }
  const idx = entry.args.indexOf("--context");
  if (idx === -1 || entry.args[idx + 1] !== context) {
    throw new Error(
      `expected serena entry with --context ${context}, got ${JSON.stringify(entry.args)}`,
    );
  }
  const isBridge = entry.args.includes("bridge");
  const isStdio = entry.args.includes("start-mcp-server");
  if (!isBridge && !isStdio) {
    throw new Error(
      `expected an oma-managed serena entry, got ${JSON.stringify(entry)}`,
    );
  }
  // Guard against the 11.0.0 regression: bridge entries must invoke the bare
  // `oma` binary. An absolute interpreter/script path is machine-specific and
  // lands in committed config files.
  const expectedCommand = isBridge ? "oma" : "serena";
  if (entry.command !== expectedCommand) {
    throw new Error(
      `expected serena entry command "${expectedCommand}", got ${JSON.stringify(entry.command)}`,
    );
  }
}
