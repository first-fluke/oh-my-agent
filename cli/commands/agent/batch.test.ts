import { describe, expect, it } from "vitest";
import {
  type BatchDeps,
  type BatchDispatch,
  parseBatchItems,
  parseCheckTemplate,
  parseFallbackVendors,
  renderBatchPrompt,
  renderCheck,
  runBatch,
} from "./batch.js";

/**
 * A fake worklist: an item passes its check once it is in `done`. `onDispatch`
 * decides what one agent session does and returns the `agent spawn` exit code.
 */
function harness(
  initiallyDone: string[],
  onDispatch: (request: BatchDispatch, done: Set<string>) => number | null,
) {
  const done = new Set(initiallyDone);
  const dispatched: BatchDispatch[] = [];
  const logs: string[] = [];
  const deps: BatchDeps = {
    check: async (item) => ({
      ok: done.has(item),
      output: done.has(item) ? "" : `${item} is not done`,
    }),
    dispatch: async (request) => {
      dispatched.push(request);
      return onDispatch(request, done);
    },
    log: (line) => logs.push(line),
  };
  return { deps, dispatched, logs };
}

const options = { concurrency: 2, maxAttempts: 2, vendors: [undefined] };

describe("runBatch", () => {
  it("skips items whose check already passes and fixes the rest", async () => {
    const { deps, dispatched } = harness(["a"], (request, done) => {
      done.add(request.item);
      return 0;
    });

    const report = await runBatch(["a", "b", "c"], options, deps);

    expect(report.ok).toBe(true);
    expect(report.counts).toEqual({
      "already-passing": 1,
      fixed: 2,
      failed: 0,
      "not-run": 0,
    });
    expect(dispatched.map((request) => request.item).sort()).toEqual([
      "b",
      "c",
    ]);
  });

  // Regression: whole-backlog sessions kept reopening finished files, so the
  // remaining count went 202 -> 54 -> 49 -> 106. One session per item with a
  // parent-run check makes a rerun touch only what still fails.
  it("dispatches nothing on a rerun once every check passes", async () => {
    const { deps, dispatched } = harness(["a", "b"], () => 0);

    const report = await runBatch(["a", "b"], options, deps);

    expect(report.ok).toBe(true);
    expect(dispatched).toEqual([]);
  });

  it("retries with the failing check output and reports the item as failed", async () => {
    const { deps, dispatched } = harness([], () => 0);

    const report = await runBatch(["a"], options, deps);

    expect(report.ok).toBe(false);
    expect(report.items[0]).toMatchObject({ status: "failed", attempts: 2 });
    expect(dispatched.map((request) => request.attempt)).toEqual([1, 2]);
    expect(dispatched[1]?.feedback).toBe("a is not done");
  });

  it("does not trust a clean agent exit: the check decides", async () => {
    const { deps } = harness([], (request, done) => {
      if (request.attempt === 2) done.add(request.item);
      return 0;
    });

    const report = await runBatch(["a"], options, deps);

    expect(report.items[0]).toMatchObject({ status: "fixed", attempts: 2 });
  });

  it("accepts an incomplete agent result (exit 3) when the check passes", async () => {
    const { deps } = harness([], (request, done) => {
      done.add(request.item);
      return 3;
    });

    const report = await runBatch(["a"], options, deps);

    expect(report.items[0]?.status).toBe("fixed");
  });

  // Regression: an exhausted vendor answered every dispatch with 429 or 402,
  // and the launcher kept feeding it the rest of the worklist.
  it("stops instead of burning the worklist when the only vendor keeps failing", async () => {
    const { deps, dispatched } = harness([], () => 1);

    const report = await runBatch(
      ["a", "b", "c", "d"],
      { concurrency: 1, maxAttempts: 2, vendors: ["agy"] },
      deps,
    );

    expect(report.ok).toBe(false);
    expect(report.stopped).toMatch(/agy failed 2 runs in a row/);
    expect(dispatched).toHaveLength(2);
    expect(report.counts["not-run"]).toBe(4);
    expect(report.counts.failed).toBe(0);
  });

  it("switches to the fallback vendor and retries the item without spending an attempt", async () => {
    const { deps, dispatched, logs } = harness([], (request, done) => {
      if (request.vendor === "agy") return 1;
      done.add(request.item);
      return 0;
    });

    const report = await runBatch(
      ["a", "b"],
      { concurrency: 1, maxAttempts: 1, vendors: ["agy", "grok"] },
      deps,
    );

    expect(report.ok).toBe(true);
    expect(dispatched.map((request) => request.vendor)).toEqual([
      "agy",
      "agy",
      "grok",
      "grok",
    ]);
    expect(report.items.map((item) => item.vendor)).toEqual(["grok", "grok"]);
    expect(logs.join("\n")).toMatch(/switching to grok/);
  });

  it("does not count one transient vendor failure against the vendor", async () => {
    let failures = 0;
    const { deps } = harness([], (request, done) => {
      if (failures++ === 0) return 1;
      done.add(request.item);
      return 0;
    });

    const report = await runBatch(
      ["a", "b", "c"],
      { concurrency: 1, maxAttempts: 1, vendors: ["agy"] },
      deps,
    );

    expect(report.ok).toBe(true);
    expect(report.stopped).toBeUndefined();
  });

  it.each([null, 124, 130, 143])(
    "stops dispatching after a cancelled or timed-out run (exit %s)",
    async (code) => {
      const { deps, dispatched } = harness([], () => code);

      const report = await runBatch(
        ["a", "b"],
        { ...options, concurrency: 1 },
        deps,
      );

      expect(dispatched).toHaveLength(1);
      expect(report.stopped).toMatch(/cancelled|deadline/);
      expect(report.counts["not-run"]).toBe(2);
    },
  );

  it("never runs more sessions at once than the concurrency limit", async () => {
    let running = 0;
    let peak = 0;
    const done = new Set<string>();
    const deps: BatchDeps = {
      check: async (item) => ({ ok: done.has(item), output: "" }),
      dispatch: async ({ item }) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        done.add(item);
        return 0;
      },
    };

    await runBatch(
      ["a", "b", "c", "d", "e"],
      { concurrency: 2, maxAttempts: 1, vendors: [undefined] },
      deps,
    );

    expect(peak).toBe(2);
  });

  it("refuses to dispatch when the check command itself cannot run", async () => {
    const deps: BatchDeps = {
      check: async () => ({
        ok: false,
        output: "spawn missing-tool ENOENT",
        unavailable: true,
      }),
      dispatch: async () => {
        throw new Error("must not dispatch");
      },
    };

    await expect(runBatch(["a"], options, deps)).rejects.toThrow(
      /could not run/,
    );
  });
});

describe("batch inputs", () => {
  it("parses a worklist: trims, skips blanks and comments, drops duplicates", () => {
    expect(parseBatchItems("# files\n a.md \n\nb.md\r\na.md\n#c.md\n")).toEqual(
      ["a.md", "b.md"],
    );
  });

  it("requires the item placeholder in the check", () => {
    expect(() => parseCheckTemplate("bun run lint")).toThrow(/\{item\}/);
    expect(() => parseCheckTemplate("   ")).toThrow(/command/);
  });

  it("substitutes the item into every check token without a shell", () => {
    const template = parseCheckTemplate('grep -q "ready now" docs/{item}.md');
    expect(renderCheck(template, "a b; rm -rf x")).toEqual([
      "grep",
      "-q",
      "ready now",
      "docs/a b; rm -rf x.md",
    ]);
  });

  it("renders the prompt with the item, the check, and its current output", () => {
    const prompt = renderBatchPrompt(
      "Translate {item} from the English source.\n",
      "ko/intro.md",
      ["check", "ko/intro.md"],
      "3 headings missing",
    );
    expect(prompt).toContain("Translate ko/intro.md from the English source.");
    expect(prompt).toContain("    check ko/intro.md");
    expect(prompt).toContain("3 headings missing");
  });

  it("accepts any named CLI vendor as a fallback and rejects the rest", () => {
    expect(
      parseFallbackVendors(" Grok, cursor ,grok,claude,bogus", "claude"),
    ).toEqual({
      vendors: ["grok", "cursor"],
      rejected: [
        "grok: duplicate or primary vendor",
        "claude: duplicate or primary vendor",
        "bogus: unknown vendor",
      ],
    });
    expect(parseFallbackVendors(undefined, "claude")).toEqual({
      vendors: [],
      rejected: [],
    });
  });
});
