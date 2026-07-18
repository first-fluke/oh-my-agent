import { describe, expect, it } from "vitest";
import { replaceBalancedTables } from "../../.agents/skills/oma-hwp/resources/balanced-tables.js";

describe("replaceBalancedTables", () => {
  it("passes a nested table as one balanced outer block", () => {
    const source =
      "before<table><tr><td><table><tr><td>inner</td></tr></table></td></tr></table>after";
    const seen: string[] = [];

    const output = replaceBalancedTables(source, (table) => {
      seen.push(table);
      return "[TABLE]";
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("<table><tr><td>inner</td></tr></table>");
    expect(output).toBe("before[TABLE]after");
  });

  it("preserves an unclosed table verbatim", () => {
    const source = "before<table><tr><td>unfinished";
    expect(replaceBalancedTables(source, () => "[TABLE]")).toBe(source);
  });
});
