import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { currentOmaInvocation, pinnedServicePath } from "./oma-invocation.js";

describe("currentOmaInvocation", () => {
  it("pins the running runtime and an absolute entry script", () => {
    expect(currentOmaInvocation("/opt/node/bin/node", "bin/cli.js")).toEqual([
      "/opt/node/bin/node",
      resolve("bin/cli.js"),
    ]);
  });

  it("falls back to a PATH lookup without an entry script", () => {
    expect(currentOmaInvocation("/opt/node/bin/node", "")).toEqual(["oma"]);
  });
});

describe("pinnedServicePath", () => {
  it("puts the pinned runtime's directory first", () => {
    expect(pinnedServicePath(["/opt/node/bin/node", "/x"], "/usr/bin")).toBe(
      "/opt/node/bin:/usr/bin",
    );
    expect(pinnedServicePath(["oma"], "/usr/bin")).toBe("/usr/bin");
  });
});
