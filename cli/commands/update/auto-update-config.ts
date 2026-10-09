import { loadOmaConfig } from "../../utils/config.js";

/** Effective project config (including local overlay), then global, then true. */
export function resolveAutoUpdateCli(cwd: string): boolean {
  return loadOmaConfig(cwd)?.auto_update_cli ?? true;
}
