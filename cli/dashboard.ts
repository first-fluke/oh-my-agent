import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { basename } from "node:path";
import { watch } from "chokidar";
import * as pc from "picocolors";
import { WebSocket, WebSocketServer } from "ws";
import { buildGraphData } from "./commands/recap/internal/graph.js";
import { collectRecap } from "./commands/recap/internal/index.js";
import { buildFullState, resolveMemoriesDir } from "./dashboard/state.js";
import { DASHBOARD_HTML, RECAP_HTML } from "./dashboard/templates.js";

const PORT = process.env.DASHBOARD_PORT
  ? parseInt(process.env.DASHBOARD_PORT || "9847", 10)
  : 9847;

export function startDashboard() {
  const memoriesDir = resolveMemoriesDir();
  if (!existsSync(memoriesDir)) mkdirSync(memoriesDir, { recursive: true });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/state") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFullState(memoriesDir)));
    } else if (url.pathname === "/api/recap") {
      try {
        const window = url.searchParams.get("window") || "7d";
        const tool = url.searchParams.get("tool") || undefined;
        const top = url.searchParams.get("top")
          ? Number.parseInt(url.searchParams.get("top") as string, 10)
          : undefined;
        const output = await collectRecap({ window, tool, top });
        const graph = buildGraphData(output.entries, top);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...output, graph }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    } else if (url.pathname === "/recap") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(RECAP_HTML);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(DASHBOARD_HTML);
    }
  });

  const wss = new WebSocketServer({ server });
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function broadcast(event?: string, file?: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const msg = JSON.stringify({
        type: "update",
        event,
        file,
        data: buildFullState(memoriesDir),
      });
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
      });
    }, 100);
  }

  const watcher = watch(memoriesDir, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  watcher.on("all", (event, filePath) => broadcast(event, basename(filePath)));

  wss.on("connection", (ws) => {
    ws.send(
      JSON.stringify({ type: "full", data: buildFullState(memoriesDir) }),
    );
    ws.on("error", () => ws.terminate());
  });

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    watcher.close();
    wss.clients.forEach((c) => {
      c.terminate();
    });
    wss.close(() => server.close(() => process.exit(0)));
    setTimeout(() => process.exit(1), 3000).unref();
  });
  process.on("SIGTERM", () => process.emit("SIGINT"));

  server.listen(PORT, () => {
    console.log(pc.magenta(`\n  🛸 Serena Memory Dashboard`));
    console.log(pc.white(`     http://localhost:${PORT}`));
    console.log(pc.dim(`     Watching: ${memoriesDir}\n`));
  });
}
