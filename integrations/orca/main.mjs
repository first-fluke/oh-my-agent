import { readFileSync } from "node:fs";

// Orca panels cannot import local scripts or call worker commands. Keep the
// catalog in the self-contained panel so both entry points use identical text.
const panel = readFileSync(new URL("./panel.html", import.meta.url), "utf8");
const catalogMatch = panel.match(
  /<script id="oma-catalog" type="application\/json">([\s\S]*?)<\/script>/,
);
if (!catalogMatch) throw new Error("OMA prompt catalog is missing.");
export const catalog = JSON.parse(catalogMatch[1]);

export function buildPrompt(action) {
  const entry = catalog.actions.find((item) => item.id === action);
  if (!entry) throw new Error(`Unknown OMA action: ${action}`);
  return `${catalog.preamble} ${entry.prompt}`;
}

export async function insertRequest(orca, action) {
  const context = await orca.host.call("workspace.readContext", {});
  if (!context) throw new Error("Open an Orca project worktree first.");
  if (context.terminals.length !== 1) {
    throw new Error(
      "Open the OMA panel and select an agent terminal. Palette actions require exactly one terminal.",
    );
  }
  const terminalId = context.terminals[0].id;
  const result = await orca.host.call("terminal.sendText", {
    terminalId,
    text: buildPrompt(action),
    enter: false,
  });
  if (result?.accepted !== true) {
    throw new Error(
      "Orca did not accept the request. Check the terminal before trying again.",
    );
  }
  return { status: "inserted", terminalId, submitted: false };
}

export default function activate(orca) {
  // No effects on activation. Each write follows an explicit palette action.
  let inserting = false;
  for (const action of catalog.actions) {
    orca.commands.register(`oma.${action.id}`, async () => {
      if (inserting) throw new Error("An OMA insertion is already pending.");
      inserting = true;
      try {
        return await insertRequest(orca, action.id);
      } finally {
        inserting = false;
      }
    });
  }
}
