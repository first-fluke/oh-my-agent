import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const skill = readFileSync(
  new URL("../../../skills/oma-recap/SKILL.md", import.meta.url),
  "utf8",
);

for (const [date, hours] of [
  ["2026-10-04", 23],
  ["2026-04-05", 25],
] as const) {
  test(`recap fallback respects the ${hours}-hour Sydney calendar day ${date}`, () => {
    const commands = skill
      .split("\n")
      .map((line) =>
        process.platform === "darwin" ? line : line.replace(/^# /, ""),
      )
      .filter((line) => /^(next_date|start_ts|end_ts)=/.test(line))
      .filter((line) =>
        process.platform === "darwin"
          ? line.includes("date -j")
          : line.includes("date -d"),
      );
    expect(commands).toHaveLength(3);
    const result = spawnSync(
      "bash",
      [
        "-c",
        [
          "set -eu",
          `TARGET_DATE=${date}`,
          ...commands,
          'printf "%s %s %s\\n" "$next_date" "$start_ts" "$end_ts"',
        ].join("\n"),
      ],
      { encoding: "utf8", env: { ...process.env, TZ: "Australia/Sydney" } },
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const [nextDate, start, end] = result.stdout.trim().split(" ");
    expect(nextDate).toBe(date === "2026-10-04" ? "2026-10-05" : "2026-04-06");
    expect(Number(end) - Number(start)).toBe(hours * 60 * 60 * 1000);
  });
}
