/** Payload contracts shared by hook writers, CLI verification, and diagnostics. */
export function isEventRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonblankEventText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateEventPayload(kind: string, payload: unknown): string[] {
  const errors: string[] = [];
  const fields =
    kind === "decision.made"
      ? ["subject", "decision", "rationale"]
      : kind === "blocker.raised"
        ? ["summary"]
        : [];
  const record = isEventRecord(payload) ? payload : undefined;
  if (payload !== undefined && !record)
    errors.push("payload must be an object");
  for (const field of fields) {
    if (!isNonblankEventText(record?.[field])) {
      errors.push(`payload.${field} must be a nonblank string`);
    }
  }
  if (
    kind === "session.ended" &&
    record?.status !== "completed" &&
    record?.status !== "failed"
  ) {
    errors.push("payload.status must be completed or failed");
  }
  if (
    record?.instanceId !== undefined &&
    !isNonblankEventText(record.instanceId)
  ) {
    errors.push("payload.instanceId must be a nonblank string");
  }
  return errors;
}

export function validateEventEnvelope(value: unknown): string[] {
  if (!isEventRecord(value)) return ["event must be an object"];
  const errors: string[] = [];
  for (const field of ["eventId", "ts", "sid", "kind"]) {
    if (!isNonblankEventText(value[field])) {
      errors.push(`${field} must be a nonblank string`);
    }
  }
  if (isNonblankEventText(value.ts) && !Number.isFinite(Date.parse(value.ts))) {
    errors.push("ts must be a valid timestamp");
  }
  if (!Number.isInteger(value.writerPid))
    errors.push("writerPid must be an integer");
  if (typeof value.kind === "string") {
    errors.push(...validateEventPayload(value.kind, value.payload));
  }
  return errors;
}
