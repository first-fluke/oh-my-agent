import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("Stargazers Daily workflow", () => {
  it("uses a collaborator token for the restricted stargazer listing API", () => {
    const workflow = parseYaml(
      readFileSync(
        resolve(PROJECT_ROOT, ".github/workflows/stargazers-daily.yml"),
        "utf8",
      ),
    ) as {
      jobs: {
        track: {
          permissions: Record<string, string>;
          steps: Array<{ name?: string; env?: Record<string, string> }>;
        };
      };
    };

    const track = workflow.jobs.track;
    const tracker = track.steps.find(
      (step) => step.name === "Track stargazers on orphan branch",
    );

    expect(tracker?.env?.GH_TOKEN).toBe(
      "$" + "{{ secrets.ACTION_SYNC_TOKEN }}",
    );
    expect(track.permissions).toEqual({ contents: "write" });
  });
});
