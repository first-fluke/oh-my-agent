import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import { join } from "node:path";

const [home, role] = process.argv.slice(2);
process.env.OMA_HOME = join(home, ".oma");
const manifestPath = join(home, ".oma", "schedule", "schedules.json");
const readFile = fs.readFileSync;
const writeFile = fs.writeFileSync;
os.homedir = () => home;
let paused = false;
fs.readFileSync = (file, ...args) => {
  const content = readFile.call(fs, file, ...args);
  if (role === "add" && !paused && String(file) === manifestPath) {
    paused = true;
    writeFile(join(home, "add.read"), "ready");
    const deadline = Date.now() + 10_000;
    while (!fs.existsSync(join(home, "release"))) {
      if (Date.now() > deadline) throw new Error("Read barrier timed out");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  return content;
};
syncBuiltinESMExports();
const manifest = await import("../../../io/schedule/manifest.ts");
if (manifest.getManifestPath() !== manifestPath)
  throw new Error("Home isolation failed");
if (role === "add") {
  manifest.addJob({ id: "new-job", prompt: "new" });
} else {
  writeFile(join(home, "update.started"), "ready");
  manifest.updateJob("existing-job", { prompt: "updated" });
}
