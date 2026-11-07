import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, parse, relative } from "node:path";

// On Windows `os.tmpdir()` is %TEMP% (default `%LOCALAPPDATA%\Temp`), which
// sits INSIDE the user's home. Product code that walks up from a path or treats
// "anything under HOME" as global config then mistakes test fixtures for the
// developer's real setup: safe-write backups land in the real ~/.oma/backup and
// config walk-ups find the real ~/.qwen/settings.json. POSIX `/tmp` is outside
// HOME, so point TEMP/TMP (which `os.tmpdir()` reads, and which child processes
// inherit) at a drive-root directory to give Windows the same separation.
if (process.platform === "win32") {
  const home = homedir();
  const current = tmpdir();
  const rel = relative(home, current);
  const insideHome = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (insideHome) {
    const dir = join(parse(current).root, "oma-vitest-tmp");
    mkdirSync(dir, { recursive: true });
    process.env.TEMP = dir;
    process.env.TMP = dir;
  }
}
