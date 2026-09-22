import { EXIT_CODES } from "../../utils/exit-codes.js";

// Alias of the shared scale (cli/utils/exit-codes.ts); kept under the
// video-local name for existing imports.
export const VIDEO_EXIT_CODES = EXIT_CODES;

export type VideoExitCode =
  (typeof VIDEO_EXIT_CODES)[keyof typeof VIDEO_EXIT_CODES];

export class VideoError extends Error {
  constructor(
    message: string,
    public readonly exitCode: VideoExitCode = VIDEO_EXIT_CODES.generic,
    public readonly kind = "video-error",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProviderUnavailableError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.authRequired, "provider-unavailable");
  }
}

export class CompositorBootstrapError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.generic, "compositor-bootstrap");
  }
}

export class CostGuardrailError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.generic, "cost-guardrail");
  }
}

export class CaptureRequiredError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.notFound, "capture-required");
  }
}

export class SchemaValidationError extends VideoError {
  constructor(
    message: string,
    public readonly schemaName?: string,
  ) {
    super(message, VIDEO_EXIT_CODES.invalidInput, "schema-validation");
  }
}

export class SafetyError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.safety, "safety");
  }
}

export class TimeoutError extends VideoError {
  constructor(message: string) {
    super(message, VIDEO_EXIT_CODES.timeout, "timeout");
  }
}

export function exitCodeForError(err: unknown): VideoExitCode {
  if (err instanceof VideoError) return err.exitCode;
  return VIDEO_EXIT_CODES.generic;
}

export function messageForError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
