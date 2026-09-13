export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = "127.0.0.1";
export function resolvePort(env: NodeJS.ProcessEnv): number {
  const raw = Number.parseInt(env.PORT ?? "", 10);
  return Number.isFinite(raw) ? raw : DEFAULT_PORT;
}
