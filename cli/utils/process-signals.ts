const sigintCleanupHandlers = new Set<() => void>();
const sigtermCleanupHandlers = new Set<() => void>();

function runSignalHandlers(handlers: Set<() => void>): void {
  for (const handler of [...handlers]) {
    handler();
  }
}

function processSigintHandler(): void {
  runSignalHandlers(sigintCleanupHandlers);
}

function processSigtermHandler(): void {
  runSignalHandlers(sigtermCleanupHandlers);
}

let processSignalHandlersRegistered = false;

function ensureProcessSignalHandlersRegistered(): void {
  if (processSignalHandlersRegistered) return;
  process.on("SIGINT", processSigintHandler);
  process.on("SIGTERM", processSigtermHandler);
  processSignalHandlersRegistered = true;
}

export function registerSignalCleanup(
  onSigint: () => void,
  onSigterm: () => void,
): () => void {
  ensureProcessSignalHandlersRegistered();
  sigintCleanupHandlers.add(onSigint);
  sigtermCleanupHandlers.add(onSigterm);

  return () => {
    sigintCleanupHandlers.delete(onSigint);
    sigtermCleanupHandlers.delete(onSigterm);
  };
}
