import { homedir } from "node:os";
import { join } from "node:path";
import { omaHome } from "../../.agents/hooks/core/oma-home.ts";

export {
  omaHome,
  profileStateHome,
} from "../../.agents/hooks/core/oma-home.ts";

export function omaPaths(
  env: NodeJS.ProcessEnv = process.env,
  homeDir = homedir(),
) {
  const home = omaHome(env, homeDir);
  const state = join(home, "state");
  return {
    home,
    definitions: join(home, ".agents"),
    state,
    serena: join(state, "serena"),
    schedule: join(home, "schedule"),
    backup: join(home, "backup"),
  };
}
