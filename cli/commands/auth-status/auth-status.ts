import * as p from "@clack/prompts";
import pc from "picocolors";
import { isGhAuthenticated } from "../../io/github.js";
import { VENDORS } from "../../vendors/index.js";

export async function checkAuthStatus(jsonMode = false): Promise<void> {
  const github = isGhAuthenticated();
  const statuses = Object.fromEntries(
    VENDORS.map((v) => [v.id, v.isAuthenticated()]),
  ) as Record<string, boolean>;

  const results = { github, ...statuses };

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  p.intro(pc.bgMagenta(pc.white(" 🔐 oh-my-agent auth status ")));

  const icon = (auth: boolean) => (auth ? "✅" : "❌");
  const label = (auth: boolean) =>
    auth ? pc.green("Authenticated") : pc.red("Not Authenticated");

  const rows: [string, boolean][] = [
    ["GitHub", github],
    ...VENDORS.map(
      (v) => [v.label, statuses[v.id] ?? false] as [string, boolean],
    ),
  ];

  p.note(
    rows
      .map(([name, auth]) => `${icon(auth)} ${name.padEnd(12)} ${label(auth)}`)
      .join("\n"),
    "Authentication Status",
  );

  p.outro(
    `Use ${pc.cyan("gemini auth")}, ${pc.cyan("claude auth")}, etc. to login.`,
  );
}
