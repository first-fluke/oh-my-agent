import type { Option } from "commander";

export type OptionSpelling = {
  flags: string;
  legacy: string;
  convert?: (value: string) => string;
};

function duration(value: string, unit: number, requireUnit = false): string {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/.exec(value);
  if (!match || (requireUnit && !match[2]))
    throw new Error(
      `Invalid duration: ${value}. Include a unit, e.g. 30s or 2m.`,
    );
  if (!match[2]) return value;
  const units: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };
  const result = (Number(match[1]) * (units[match[2]] ?? Number.NaN)) / unit;
  if (!Number.isFinite(result) || !Number.isInteger(result))
    throw new Error(
      `Duration ${value} must resolve to a whole number of legacy units.`,
    );
  return String(result);
}

/** Names only: defaults and validation still belong to the original handler. */
export function standardOption(path: string, option: Option): OptionSpelling {
  const legacy = option.long ?? option.short ?? option.flags;
  const result: OptionSpelling = { flags: option.flags, legacy };
  if (legacy === "--model" && option.flags.includes("<vendor>"))
    result.flags = "--vendor <vendor>";
  else if (legacy === "--root") result.flags = "--project-root <path>";
  else if (["--sid", "--session"].includes(legacy))
    result.flags = "--session-id <id>";
  else if (legacy === "--format" && path !== "search media")
    result.flags = "--output <format>";
  else if (legacy === "--out")
    result.flags = option.flags.includes("<dir>")
      ? "--output-dir <path>"
      : path === "slide validate"
        ? "--report-file <path>"
        : "--output-file <path>";
  else if (legacy === "--out-dir") result.flags = "--output-dir <path>";
  else if (legacy === "--out-file")
    result.flags =
      path === "explain validate"
        ? "--report-file <path>"
        : "--output-file <path>";
  else if (legacy === "--dir")
    result.flags =
      path === "slide new"
        ? "--output-dir <path>"
        : path.startsWith("slide ")
          ? "--workspace <path>"
          : "--input-dir <path>";
  else if (legacy === "--max" && path === "scholar search")
    result.flags = "--limit <n>";
  else if (legacy === "--allow-external-out")
    result.flags = "--allow-external-output";
  else if (legacy === "--timeout") {
    result.flags = "--timeout <duration>";
    const milliseconds = option.flags.includes("<ms>");
    result.convert = (v) => duration(v, milliseconds ? 1 : 1000, milliseconds);
  } else if (legacy === "--timeout-minutes") {
    result.flags = "--timeout <duration>";
    result.convert = (v) => duration(v, 60000, true);
  } else if (legacy === "--max-age-days") {
    result.flags =
      path === "schedule:add"
        ? "--expires-after <duration>"
        : "--max-age <duration>";
    result.convert = (v) => (v === "0" ? v : duration(v, 86400000, true));
  }
  return result;
}
