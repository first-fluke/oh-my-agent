export const STARTUP_CHECK_INTERVAL_MS = 1000;
export const STARTUP_PROBE_TIMEOUT_MS = Number.parseInt(
  process.env.OH_MY_AG_BRIDGE_PROBE_TIMEOUT_MS ?? "2000",
  10,
);
