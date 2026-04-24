export interface Messages {
  promptRequired: string;
  countOutOfRange: string;
  unknownVendor: (name: string) => string;
  authFailureHeader: string;
  runDoctor: string;
  dryRunHeader: string;
  costConfirm: (cost: string) => string;
  costDeclined: string;
  using: (vendors: string) => string;
  heartbeat: (vendor: string, elapsedSec: number) => string;
  runOk: (vendor: string, ms: number, file: string) => string;
  runFailed: (vendor: string, kind: string, reason: string) => string;
  manifestWritten: (path: string) => string;
}

const en: Messages = {
  promptRequired: "prompt is required",
  countOutOfRange: "count must be between 1 and 5",
  unknownVendor: (name) => `unknown vendor: ${name}`,
  authFailureHeader: "[oma image] No authenticated vendors available.",
  runDoctor: "Run: oma image doctor",
  dryRunHeader: "[oma image] dry-run plan:",
  costConfirm: (cost) => `Estimated cost ${cost}. Proceed? (y/N) `,
  costDeclined: "[oma image] Cancelled by user.",
  using: (vendors) => `[oma image] using: ${vendors}`,
  heartbeat: (vendor, elapsed) =>
    `[oma image] ${vendor} generating... ${elapsed}s`,
  runOk: (vendor, ms, file) =>
    `[oma image] ${vendor} ok (${(ms / 1000).toFixed(1)}s) -> ${file}`,
  runFailed: (vendor, kind, reason) =>
    `[oma image] ${vendor} failed (${kind}): ${reason}`,
  manifestWritten: (p) => `[oma image] manifest: ${p}`,
};

const ko: Messages = {
  promptRequired: "프롬프트가 비어 있습니다",
  countOutOfRange: "count는 1과 5 사이여야 합니다",
  unknownVendor: (name) => `알 수 없는 vendor: ${name}`,
  authFailureHeader: "[oma image] 인증된 vendor가 없습니다.",
  runDoctor: "실행: oma image doctor",
  dryRunHeader: "[oma image] dry-run 계획:",
  costConfirm: (cost) => `예상 비용 ${cost}. 진행할까요? (y/N) `,
  costDeclined: "[oma image] 사용자가 취소했습니다.",
  using: (vendors) => `[oma image] 사용 vendor: ${vendors}`,
  heartbeat: (vendor, elapsed) =>
    `[oma image] ${vendor} 생성 중... ${elapsed}s`,
  runOk: (vendor, ms, file) =>
    `[oma image] ${vendor} 완료 (${(ms / 1000).toFixed(1)}s) -> ${file}`,
  runFailed: (vendor, kind, reason) =>
    `[oma image] ${vendor} 실패 (${kind}): ${reason}`,
  manifestWritten: (p) => `[oma image] manifest: ${p}`,
};

export function getMessages(language: string): Messages {
  if (language?.toLowerCase().startsWith("ko")) return ko;
  return en;
}
