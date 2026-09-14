import { beforeEach } from "vitest";

beforeEach(() => {
  // Tests must not report fake subprocesses to the developer's Orca session.
  process.env.OMA_ORCA_SUBAGENTS = "0";
});
