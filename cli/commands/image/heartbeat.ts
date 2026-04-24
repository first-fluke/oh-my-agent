export interface HeartbeatHandle {
  stop(): void;
}

export function startHeartbeat(args: {
  intervalMs?: number;
  message: (elapsedSec: number) => string;
  stream?: NodeJS.WriteStream;
}): HeartbeatHandle {
  const interval = args.intervalMs ?? 5000;
  const stream = args.stream ?? process.stderr;
  const started = Date.now();
  const timer = setInterval(() => {
    const elapsed = Math.round((Date.now() - started) / 1000);
    stream.write(`${args.message(elapsed)}\n`);
  }, interval);
  timer.unref?.();
  return {
    stop() {
      clearInterval(timer);
    },
  };
}
