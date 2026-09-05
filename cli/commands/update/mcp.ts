import * as p from "@clack/prompts";
import { saveDevToolsBrowsers } from "../../platform/browser-preferences.js";
import { promptDevToolsBrowsers } from "../../platform/browser-prompts.js";
import {
  getInstallMode,
  getInstallRoot,
} from "../../platform/install-context.js";
import { hasInstalledProject } from "../../platform/manifest.js";
import { loadDevToolsBrowsers } from "../../utils/config.js";
import {
  acquireLock,
  bindInstallLockRelease,
} from "../../utils/install-lock.js";
import { ensureAsideInstalled } from "../../vendors/aside.js";
import { syncBrowserMcp } from "../../vendors/browser-mcp.js";
import type { UpdateOptions } from "./types.js";
import { resolveUpdateVendors } from "./vendors.js";

export async function updateMcp(options: UpdateOptions = {}): Promise<void> {
  const root = getInstallRoot();
  if (!hasInstalledProject(root)) {
    throw new Error("oh-my-agent is not installed. Run `oma install` first.");
  }
  const lock = acquireLock(root);
  if (!lock.ok)
    throw new Error(
      `Another oma install/update is running (pid=${lock.held.pid}).`,
    );
  const release = bindInstallLockRelease(lock.release);
  try {
    const nonInteractive = Boolean(
      options.yes ||
        options.ci ||
        ["1", "true"].includes(process.env.OMA_YES ?? "") ||
        ["1", "true"].includes(process.env.CI ?? ""),
    );
    const vendors = resolveUpdateVendors(root, options);
    const browsers = await promptDevToolsBrowsers(
      nonInteractive,
      release,
      loadDevToolsBrowsers(root) ?? ["aside"],
    );
    const syncOptions = { global: getInstallMode() === "global" };
    syncBrowserMcp(root, browsers, vendors, { ...syncOptions, dryRun: true });
    await ensureAsideInstalled(browsers);
    saveDevToolsBrowsers(root, browsers);
    syncBrowserMcp(root, browsers, vendors, syncOptions);
    p.log.success(`Browser MCP servers: ${browsers.join(", ") || "none"}`);
  } finally {
    release();
  }
}
