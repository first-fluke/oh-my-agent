import { writeSync } from "node:fs";
import { isatty } from "node:tty";
import { format } from "node:util";

const RETRY_WAIT = new Int32Array(new SharedArrayBuffer(4));

/** Write the whole text to a descriptor, waiting out a full pipe. */
function writeAllSync(fd: number, text: string): void {
  const buffer = Buffer.from(text, "utf-8");
  let offset = 0;
  while (offset < buffer.length) {
    try {
      offset += writeSync(fd, buffer, offset);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EAGAIN") {
        // The reader has not drained the pipe yet.
        Atomics.wait(RETRY_WAIT, 0, 0, 1);
        continue;
      }
      // The reader went away (`| head`); nothing left to deliver.
      if (code === "EPIPE") return;
      throw error;
    }
  }
}

/**
 * Under Bun, console.log to a pipe silently drops everything past the pipe
 * buffer (64 KiB) once process.stdout has been touched, so `oma … --json | jq`
 * received truncated JSON. Route stdout console output through complete
 * synchronous writes instead. Node already writes pipes synchronously.
 */
export function installPipeSafeConsole(): void {
  // isatty(), not process.stdout.isTTY: reading the stream is what arms the bug.
  if (!process.versions.bun || isatty(1)) return;
  const log = (...args: unknown[]): void => {
    writeAllSync(1, `${format(...args)}\n`);
  };
  console.log = log;
  console.info = log;
}
