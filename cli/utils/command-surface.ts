import { Argument, Command, Option } from "commander";
import { standardOption } from "./command-options.js";
import { canonicalCommandPath, EXPANDED_COMMANDS } from "./command-paths.js";

type Route = {
  path: string;
  sourcePath: string;
  source: Command;
  prefix?: readonly string[];
  args?: string;
};

export type CommandSurface = {
  help: Command;
  normalize: (argv: string[]) => string[];
  describePath: (path?: string) => string | undefined;
  showHelp: (argv: string[]) => boolean;
};

function argumentFlags(arg: Argument): string {
  return `${arg.required ? "<" : "["}${arg.name()}${arg.variadic ? "..." : ""}${arg.required ? ">" : "]"}`;
}

function optionsFor(command: Command): Option[] {
  const options: Option[] = [];
  for (let c: Command | null = command; c; c = c.parent)
    options.push(...c.options);
  return options;
}

/** Skip only root flags with known arity, never inspect arbitrary option values. */
function commandOffset(argv: string[], root: Command): number {
  let i = 0;
  while (i < argv.length && argv[i]?.startsWith("-")) {
    const token = argv[i] ?? "";
    const name = token.split("=")[0];
    const option = root.options.find(
      (o) => o.long === name || o.short === name,
    );
    if (!option) break;
    i++;
    if (option.required && !token.includes("=")) i++;
  }
  return i;
}

function matches(argv: string[], offset: number, path: string): boolean {
  return path.split(" ").every((word, i) => argv[offset + i] === word);
}

function normalizeOptions(
  route: Route,
  tail: string[],
  canonical: boolean,
): string[] {
  const options = optionsFor(route.source);
  const spellings = options.map((source) => ({
    source,
    standard: standardOption(route.sourcePath, source),
  }));
  const result: string[] = [];
  let operands = 0;
  let output: string | undefined;
  let json = false;
  for (let i = 0; i < tail.length; i++) {
    const token = tail[i] ?? "";
    if (token === "--") {
      result.push(...tail.slice(i));
      break;
    }
    if (!token.startsWith("-")) {
      operands++;
      // The command following the run ID is owned by the child executable.
      if (route.sourcePath === "agent:verify" && operands >= 2) {
        result.push(...tail.slice(i));
        break;
      }
      result.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    const name = eq < 0 ? token : token.slice(0, eq);
    // Prefer a genuinely existing option over aliases that converge on it.
    const existing = spellings.find(
      (s) => s.source.long === name || s.source.short === name,
    );
    const alias = spellings.find(
      (s) => new Option(s.standard.flags).long === name,
    );
    if (existing) {
      const projected = new Option(existing.standard.flags);
      if (name !== projected.long && name !== projected.short)
        throw new Error(`Removed option ${name}. Use ${projected.long}.`);
    }
    if (
      (route.sourcePath === "state" &&
        ["--activate", "--archive", "--purge"].includes(name)) ||
      (route.sourcePath === "stats" && name === "--reset") ||
      (route.path.startsWith("state inject-log ") && name === "--entry")
    )
      throw new Error(
        `Removed option ${name}. Use an explicit action; see oma --help.`,
      );
    let selected = existing ?? alias;
    let value = eq < 0 ? tail[i + 1] : token.slice(eq + 1);
    // explain validate supports both the shared format and its concise renderer.
    if (name === "--output" && value === "concise") {
      selected =
        spellings.find((s) => s.source.long === "--format") ?? selected;
    }
    if (!selected) {
      const removedShort = spellings.find(
        (s) =>
          s.source.short &&
          token.startsWith(s.source.short) &&
          new Option(s.standard.flags).short !== s.source.short,
      );
      if (removedShort)
        throw new Error(
          `Removed option ${removedShort.source.short}. Use ${new Option(removedShort.standard.flags).long}.`,
        );
      result.push(token);
      continue;
    }
    const { source, standard } = selected;
    const isStandard = new Option(standard.flags).long === name;
    const convert =
      isStandard && (!existing || canonical || /[a-z]$/i.test(value ?? ""));
    const target = isStandard ? standard.legacy : name;
    if (name === "--json") json = true;
    if (name === "--output") output = value;
    if (source.required || source.optional) {
      const consumesNext =
        eq < 0 &&
        value !== undefined &&
        (source.required || !value.startsWith("-"));
      if (value !== undefined && (eq >= 0 || consumesNext)) {
        if (convert && standard.convert) value = standard.convert(value);
        if (eq >= 0) result.push(`${target}=${value}`);
        else {
          result.push(target, value);
          i++;
        }
        if (source.variadic) {
          while (tail[i + 1] !== undefined && !tail[i + 1]?.startsWith("-"))
            result.push(tail[++i] ?? "");
        }
      } else result.push(target);
    } else result.push(eq >= 0 ? `${target}=${token.slice(eq + 1)}` : target);
  }
  if (canonical && json && output && output !== "json")
    throw new Error(
      "--json conflicts with --output. Choose one output format.",
    );
  return result;
}

function positionalIndices(tokens: string[], command: Command): number[] {
  const indices: number[] = [];
  const options = optionsFor(command);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    if (token === "--") {
      for (let j = i + 1; j < tokens.length; j++) indices.push(j);
      break;
    }
    if (!token.startsWith("-")) {
      indices.push(i);
      continue;
    }
    const option = options.find(
      (o) => o.long === token.split("=")[0] || o.short === token,
    );
    if (option?.required && !token.includes("=")) i++;
  }
  return indices;
}

/** Build a canonical discovery tree; execute through the unchanged legacy parser. */
export function createCommandSurface(program: Command): CommandSurface {
  const originals = new Map<string, Command>();
  function visit(parent: Command, parentPath = ""): void {
    for (const command of parent.commands) {
      const path = `${parentPath} ${command.name()}`.trim();
      originals.set(path, command);
      visit(command, path);
    }
  }
  visit(program);
  const routes: Route[] = [...originals].map(([sourcePath, source]) => ({
    path: canonicalCommandPath(sourcePath),
    sourcePath,
    source,
  }));
  for (const entry of EXPANDED_COMMANDS) {
    const source = originals.get(entry.source);
    if (source)
      routes.push({
        path: entry.path,
        sourcePath: entry.source,
        source,
        prefix: entry.prefix,
        args: entry.args,
      });
  }
  // Prefer the primary registration over an alias converging on the same path.
  routes.sort(
    (a, b) => Number(b.path === b.sourcePath) - Number(a.path === a.sourcePath),
  );
  const canonicalRoutes = new Map<string, Route>();
  for (const route of routes)
    if (!canonicalRoutes.has(route.path))
      canonicalRoutes.set(route.path, route);

  const help = new Command(program.name()).description(program.description());
  if (program.version()) help.version(program.version() ?? "");
  for (const option of program.options)
    if (!help.options.some((o) => o.long === option.long))
      help.addOption(option);
  const nodes = new Map<string, Command>([["", help]]);
  for (const route of canonicalRoutes.values()) {
    let parent = help;
    let prefix = "";
    for (const name of route.path.split(" ")) {
      prefix = `${prefix} ${name}`.trim();
      let child = nodes.get(prefix);
      if (!child) {
        child = parent.command(name);
        nodes.set(prefix, child);
      }
      parent = child;
    }
    parent.description(route.source.description());
    if (route.args !== undefined) {
      if (route.args) parent.arguments(route.args);
    } else if (route.sourcePath !== "state") {
      for (const arg of route.source.registeredArguments)
        parent.addArgument(new Argument(argumentFlags(arg), arg.description));
    }
    for (const option of route.source.options) {
      if (
        route.sourcePath === "state" &&
        ["--activate", "--archive", "--purge"].includes(option.long ?? "")
      )
        continue;
      if (route.sourcePath === "stats" && option.long === "--reset") continue;
      if (route.path === "state inject-log get" && option.long === "--entry")
        continue;
      const spelling = standardOption(route.sourcePath, option);
      const projected = new Option(
        spelling.flags,
        option.description,
      ).makeOptionMandatory(option.mandatory);
      if (parent.options.some((o) => o.long === projected.long)) continue;
      if (option.defaultValue !== undefined) {
        const durationUnit = option.flags.includes("<ms>")
          ? "ms"
          : option.long === "--timeout-minutes"
            ? "m"
            : option.long === "--max-age-days"
              ? "d"
              : "s";
        projected.default(
          spelling.flags.includes("<duration>")
            ? `${option.defaultValue}${durationUnit}`
            : option.defaultValue,
        );
      }
      parent.addOption(projected);
    }
  }
  const canonicalOrdered = [...canonicalRoutes.values()].sort(
    (a, b) => b.path.split(" ").length - a.path.split(" ").length,
  );
  function locate(argv: string[]) {
    const offset = commandOffset(argv, program);
    const canonicalRoute = canonicalOrdered.find((r) =>
      matches(argv, offset, r.path),
    );
    return canonicalRoute
      ? {
          offset,
          length: canonicalRoute.path.split(" ").length,
          canonical: true,
          route: canonicalRoute,
        }
      : null;
  }
  return {
    help,
    describePath: (path) => path,
    normalize(argv) {
      const found = locate(argv);
      if (!found) {
        const offset = commandOffset(argv, program);
        if (argv[offset] && !argv[offset]?.startsWith("-"))
          throw new Error(
            `Unknown command: ${argv.slice(offset).join(" ")}. Use oma --help.`,
          );
        return argv;
      }
      const { offset, length, route, canonical } = found;
      let tail = normalizeOptions(
        route,
        argv.slice(offset + length),
        canonical,
      );
      const node = nodes.get(route.path);
      if (node && !node.registeredArguments.length) {
        const count = positionalIndices(tail, route.source).length;
        if (count > node.registeredArguments.length)
          throw new Error(
            `Unexpected argument for oma ${route.path}. Use --help.`,
          );
      }
      if (route.path === "state activate") {
        const indices = positionalIndices(tail, route.source);
        if (indices.length !== 1)
          throw new Error("Usage: oma state activate <session-id>");
        const id = tail.splice(indices[0] ?? 0, 1)[0] ?? "";
        tail = [id, ...tail];
      }
      if (route.path === "state inject-log get") {
        const indices = positionalIndices(tail, route.source);
        if (indices.length !== 2)
          throw new Error(
            "Usage: oma state inject-log get <session-id> <file>",
          );
        const fileIndex = indices[1] ?? 0;
        // Put the selector before -- if it was used to quote positional values.
        const file = tail[fileIndex] ?? "";
        tail.splice(fileIndex, 1);
        tail = ["--entry", file, ...tail];
      }
      return [
        ...argv.slice(0, offset),
        ...route.sourcePath.split(" "),
        ...(route.prefix ?? []),
        ...tail,
      ];
    },
    showHelp(argv) {
      const offset = commandOffset(argv, program);
      const helpCommand = argv[offset] === "help";
      const tokens = helpCommand ? argv.slice(offset + 1) : argv.slice(offset);
      const found = locate(argv);
      // Don't treat a flag embedded in a prompt value or child argv as CLI help.
      const wantsHelp =
        helpCommand ||
        tokens[0] === "--help" ||
        tokens[0] === "-h" ||
        (found &&
          (() => {
            const tail = tokens.slice(found.length);
            const options = optionsFor(found.route.source);
            for (let i = 0; i < tail.length; i++) {
              if (tail[i] === "--") return false;
              if (tail[i] === "--help" || tail[i] === "-h") return true;
              const option = options.find(
                (o) =>
                  o.long === tail[i] ||
                  o.short === tail[i] ||
                  new Option(standardOption(found.route.sourcePath, o).flags)
                    .long === tail[i],
              );
              if (option?.required) i++;
              else if (
                tail[i] &&
                !tail[i]?.startsWith("-") &&
                found.route.sourcePath === "agent:verify"
              )
                return false;
            }
            return false;
          })());
      // A group has no execution route but must still support --help.
      const groupPath = tokens
        .filter((t) => t !== "--help" && t !== "-h")
        .join(" ");
      const groupHelp = tokens.at(-1) === "--help" && nodes.has(groupPath);
      const bareGroup =
        groupPath.length > 0 && nodes.get(groupPath)?.commands.length;
      if (!wantsHelp && !groupHelp && !bareGroup) return false;
      const path = helpCommand
        ? tokens.join(" ")
        : groupHelp || bareGroup
          ? groupPath
          : (found?.route.path ?? "");
      const node = nodes.get(path);
      if (!node) return false;
      node.outputHelp();
      return true;
    },
  };
}
