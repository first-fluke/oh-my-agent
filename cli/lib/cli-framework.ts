import { Command } from "commander";

const JSON_OUTPUT_ENV = "OH_MY_AG_OUTPUT_FORMAT";
const OUTPUT_FORMATS = ["text", "json"] as const;
const VENDORS = ["gemini", "claude", "codex", "qwen"] as const;
const AGENT_TYPES = [
  "backend",
  "frontend",
  "mobile",
  "qa",
  "debug",
  "pm",
] as const;

type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export type JsonCapableOptions = {
  json?: boolean;
  output?: string;
};

type DescribeArgument = {
  name: string;
  required: boolean;
  variadic: boolean;
};

type DescribeOption = {
  flags: string;
  long?: string;
  short?: string;
  description: string;
  required: boolean;
  optional: boolean;
  defaultValue?: unknown;
};

type DescribeCommand = {
  name: string;
  path: string;
  summary?: string;
  description: string;
  arguments: DescribeArgument[];
  options: DescribeOption[];
  supportsJsonOutput: boolean;
  supportsDryRun: boolean;
  subcommands: DescribeCommand[];
};

export function addOutputOptions(
  command: Command,
  description = "Output as JSON",
) {
  return command
    .option("--json", description)
    .option("--output <format>", "Output format (text/json)", (value) => {
      const normalized = value.trim().toLowerCase();
      if (!OUTPUT_FORMATS.includes(normalized as OutputFormat)) {
        throw new Error(
          `Invalid output format: ${value}. Expected one of ${OUTPUT_FORMATS.join(", ")}`,
        );
      }

      return normalized;
    });
}

function resolveOutputFormat(options?: JsonCapableOptions): OutputFormat {
  if (options?.json) {
    return "json";
  }

  const explicitOutput = options?.output?.trim().toLowerCase();
  if (
    explicitOutput &&
    OUTPUT_FORMATS.includes(explicitOutput as OutputFormat)
  ) {
    return explicitOutput as OutputFormat;
  }

  const envOutput = process.env[JSON_OUTPUT_ENV]?.trim().toLowerCase();
  if (envOutput === "json") {
    return "json";
  }

  return "text";
}

export function resolveJsonMode(options?: JsonCapableOptions): boolean {
  return resolveOutputFormat(options) === "json";
}

function getActionCommand(args: unknown[]): Command | null {
  const maybeCommand = args.at(-1);
  return maybeCommand instanceof Command ? maybeCommand : null;
}

function getActionOptions(args: unknown[]): Record<string, unknown> {
  const command = getActionCommand(args);
  if (command) {
    return command.opts();
  }

  const maybeOptions = args.at(-1);
  return maybeOptions && typeof maybeOptions === "object"
    ? (maybeOptions as Record<string, unknown>)
    : {};
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function failValidation(message: string): never {
  throw new Error(message);
}

function assertNoControlChars(value: string, label: string): void {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0 && code <= 31) || code === 127) {
      failValidation(`${label} must not contain control characters`);
    }
  }
}

function assertSafeIdentifier(value: string, label: string): void {
  assertNoControlChars(value, label);
  if (/[?#%]/.test(value)) {
    failValidation(`${label} must not contain ?, #, or %`);
  }
  if (value.includes("..")) {
    failValidation(`${label} must not contain '..'`);
  }
}

function assertValidUrl(value: string, label: string): void {
  assertNoControlChars(value, label);
  try {
    new URL(value);
  } catch {
    failValidation(`${label} must be a valid absolute URL`);
  }
}

function validateValue(
  value: unknown,
  label: string,
  mode: "text" | "identifier" | "url" = "text",
): void {
  if (typeof value === "string") {
    if (mode === "identifier") {
      assertSafeIdentifier(value, label);
      return;
    }

    if (mode === "url") {
      assertValidUrl(value, label);
      return;
    }

    assertNoControlChars(value, label);
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      validateValue(entry, `${label}[${index}]`, mode);
    }
  }
}

function validationModeForName(name: string): "text" | "identifier" | "url" {
  const normalized = name.toLowerCase();
  if (normalized === "url" || normalized.endsWith("url")) {
    return "url";
  }
  if (
    normalized.includes("id") ||
    normalized.includes("type") ||
    normalized.includes("vendor") ||
    normalized.includes("session")
  ) {
    return "identifier";
  }

  return "text";
}

function validateKnownOptionValues(options: Record<string, unknown>): void {
  const vendor = options.vendor;
  if (
    typeof vendor === "string" &&
    !VENDORS.includes(vendor as (typeof VENDORS)[number])
  ) {
    failValidation(`vendor must be one of ${VENDORS.join(", ")}`);
  }

  const output = options.output;
  if (
    typeof output === "string" &&
    !OUTPUT_FORMATS.includes(output as OutputFormat)
  ) {
    failValidation(`output must be one of ${OUTPUT_FORMATS.join(", ")}`);
  }
}

function validateCommandInputs(command: Command): void {
  const args = command.processedArgs ?? command.args ?? [];
  const registeredArguments = command.registeredArguments ?? [];

  registeredArguments.forEach((arg, index) => {
    const argName = arg.name?.() || String(index);
    const value = args[index];
    validateValue(value, argName, validationModeForName(argName));

    if (
      argName === "agent-type" &&
      typeof value === "string" &&
      !AGENT_TYPES.includes(value as (typeof AGENT_TYPES)[number])
    ) {
      failValidation(`agent-type must be one of ${AGENT_TYPES.join(", ")}`);
    }
  });

  const options = command.opts();
  validateKnownOptionValues(options);
  for (const [name, value] of Object.entries(options)) {
    validateValue(value, name, validationModeForName(name));
  }
}

function describeArguments(command: Command): DescribeArgument[] {
  return (command.registeredArguments ?? []).map((arg) => ({
    name: arg.name?.() || "",
    required: !!arg.required,
    variadic: !!arg.variadic,
  }));
}

function describeOptions(command: Command): DescribeOption[] {
  return command.options.map((option) => ({
    flags: option.flags,
    long: option.long || undefined,
    short: option.short || undefined,
    description: option.description || "",
    required: !!option.required || !!option.mandatory,
    optional: !!option.optional,
    defaultValue: option.defaultValue,
  }));
}

function getCommandPath(command: Command): string {
  const segments: string[] = [];
  let cursor: Command | null = command;

  while (cursor?.parent) {
    segments.unshift(cursor.name());
    cursor = cursor.parent;
  }

  return segments.join(" ");
}

function commandSupportsJson(command: Command): boolean {
  return command.options.some(
    (option) => option.long === "--json" || option.long === "--output",
  );
}

function commandSupportsDryRun(command: Command): boolean {
  return command.options.some((option) => option.long === "--dry-run");
}

function describeCommand(command: Command): DescribeCommand {
  return {
    name: command.name(),
    path: getCommandPath(command),
    summary: command.summary() || undefined,
    description: command.description(),
    arguments: describeArguments(command),
    options: describeOptions(command),
    supportsJsonOutput: commandSupportsJson(command),
    supportsDryRun: commandSupportsDryRun(command),
    subcommands: command.commands.map((subcommand) =>
      describeCommand(subcommand),
    ),
  };
}

function findCommand(program: Command, commandPath?: string): Command | null {
  if (!commandPath?.trim()) {
    return program;
  }

  const normalizedTarget = commandPath.trim();
  const queue = [...program.commands];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (
      current.name() === normalizedTarget ||
      getCommandPath(current) === normalizedTarget
    ) {
      return current;
    }

    queue.push(...current.commands);
  }

  return null;
}

export function printDescribe(program: Command, commandPath?: string): void {
  const target = findCommand(program, commandPath);
  if (!target) {
    failValidation(`Unknown command: ${commandPath}`);
  }

  const payload = {
    name: program.name(),
    version: program.version(),
    description: program.description(),
    env: {
      [JSON_OUTPUT_ENV]:
        "Set to json to force machine-readable output on commands that support it.",
    },
    command: describeCommand(target),
  };

  console.log(JSON.stringify(payload, null, 2));
}

export function runAction<T extends unknown[]>(
  handler: (...args: T) => Promise<void> | void,
  config: { supportsJsonOutput?: boolean } = {},
) {
  return async (...args: T) => {
    const command = getActionCommand(args);
    const options = getActionOptions(args);

    try {
      if (command) {
        validateCommandInputs(command);
      }
      await handler(...args);
    } catch (error) {
      const message = normalizeErrorMessage(error);
      if (config.supportsJsonOutput && resolveJsonMode(options)) {
        console.log(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(message);
      }
      process.exitCode = 1;
    }
  };
}
