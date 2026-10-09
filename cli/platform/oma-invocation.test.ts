import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  currentOmaInvocation,
  pinnedServicePath,
  systemdExecStart,
  windowsTaskExec,
} from "./oma-invocation.js";

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

describe("storage root argument escaping", () => {
  it("keeps systemd percent specifiers and variable-like path segments literal", () => {
    expect(
      systemdExecStart(["/bin/oma"], ["--oma-home", "/data/100%/$cache"]),
    ).toBe('"/bin/oma" "--oma-home" "/data/100%%/$$cache"');
  });
  it("quotes Windows storage roots containing spaces without a shell", () => {
    expect(
      windowsTaskExec(["C:\\oma.exe"], ["--oma-home", "C:\\OMA Data\\"])
        .arguments,
    ).toBe("--oma-home &quot;C:\\OMA Data\\\\&quot;");
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
