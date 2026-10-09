/** Quote complete argv without allowing registry paths to become shell input. */
export function shellCommand(argv: readonly string[]): string {
  return argv
    .map((arg) =>
      /^[A-Za-z0-9_./:=+-]+$/.test(arg)
        ? arg
        : `'${arg.replace(/'/g, `'"'"'`)}'`,
    )
    .join(" ");
}

export function systemdCommand(argv: readonly string[]): string {
  return argv
    .map((arg) =>
      /^[A-Za-z0-9_./:=+-]+$/.test(arg)
        ? arg
        : `"${arg
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\$/g, () => "$$")
            .replace(/%/g, "%%")}"`,
    )
    .join(" ");
}

/** Parse our generated POSIX/systemd command, including paths with spaces. */
export function parseCommand(command: string): string[] | null {
  const args: string[] = [];
  let value = "";
  let quote = "";
  let active = false;
  for (let i = 0; i < command.length; i++) {
    const character = command[i] ?? "";
    if (character === "\\" && quote !== "'") {
      if (i + 1 >= command.length) return null;
      value += command[++i];
      active = true;
    } else if (quote) {
      if (character === quote) quote = "";
      else value += character;
    } else if (character === "'" || character === '"') {
      quote = character;
      active = true;
    } else if (/\s/.test(character)) {
      if (active) args.push(value);
      value = "";
      active = false;
    } else {
      value += character;
      active = true;
    }
  }
  if (quote) return null;
  if (active) args.push(value);
  return args;
}

export function windowsCommand(argv: readonly string[]): string {
  return argv
    .map((arg) =>
      /^[A-Za-z0-9_./:=+\\-]+$/.test(arg)
        ? arg
        : `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1")}"`,
    )
    .join(" ");
}
