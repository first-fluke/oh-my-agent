import { describe, expect, it } from "vitest";
import {
  CLAUDE_AGENTS_MD_MIN_VERSION,
  claudeReadsAgentsMd,
  isVersionAtLeast,
  parseSemver,
} from "./claude-version.js";

describe("claude-version", () => {
  it("parses the semver triple out of a --version line", () => {
    expect(parseSemver("2.1.277 (Claude Code)")).toEqual([2, 1, 277]);
    expect(parseSemver("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseSemver("unknown")).toBeNull();
  });

  it("compares numerically, not lexically", () => {
    expect(isVersionAtLeast("2.1.277", "2.1.277")).toBe(true);
    expect(isVersionAtLeast("2.1.300", "2.1.277")).toBe(true);
    expect(isVersionAtLeast("2.2.0", "2.1.277")).toBe(true);
    expect(isVersionAtLeast("3.0.0", "2.1.277")).toBe(true);
    expect(isVersionAtLeast("2.1.276", "2.1.277")).toBe(false);
    expect(isVersionAtLeast("2.1.99", "2.1.277")).toBe(false);
    expect(isVersionAtLeast("1.9.999", "2.1.277")).toBe(false);
    expect(isVersionAtLeast(undefined, "2.1.277")).toBe(false);
    expect(isVersionAtLeast("garbage", "2.1.277")).toBe(false);
  });

  it("gates AGENTS.md support on the minimum version", () => {
    expect(
      claudeReadsAgentsMd(`${CLAUDE_AGENTS_MD_MIN_VERSION} (Claude Code)`),
    ).toBe(true);
    expect(claudeReadsAgentsMd("2.1.276")).toBe(false);
    expect(claudeReadsAgentsMd(null)).toBe(false);
  });
});
