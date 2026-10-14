/** Public command spellings. Legacy registrations remain the execution contract. */
export const COMMAND_PATHS: Record<string, string> = {
  dashboard: "dashboard terminal",
  "dashboard:web": "dashboard web",
  "intel run": "intel suggest",
  hook: "hook run",
  state: "state list",
  "state:get": "state get",
  "state:required-decisions": "state decisions list",
  "state:inject-log": "state inject-log list",
  stats: "stats get",
  "memory:retry-drain": "memory retry drain",
  "vault rm": "vault delete",
  "search api": "search api fetch",
  "search rss": "search rss fetch",
  skills: "skill",
  "skills audit": "skill audit",
  "skills lint": "skill lint",
  "skills eval": "skill eval",
  "skills opt": "skill optimize",
  "skills promotions": "skill promotions",
  "skills rollback": "skill rollback",
  "skills procedure": "skill procedure",
  "skills meta-optimize": "skill meta-optimize",
  "skills evolution-stats": "skill evolution-stats",
  "skills matrix": "skill matrix",
  "slide new": "slide create",
  "slide viewer": "slide preview",
  "slide pdf": "slide export pdf",
  "slide png": "slide export png",
  "slide pptx": "slide export pptx",
  "slide import-pptx": "slide import pptx",
  "slide fetch-video": "slide asset fetch-video",
  "slide styles": "slide style",
  "slide styles list": "slide style list",
  "slide styles preview": "slide style preview",
  "slide styles get": "slide style get",
  "image list-vendors": "image vendor list",
  "video list-providers": "video provider list",
  "schedule:add": "schedule create",
  "schedule:remove": "schedule delete",
};

/**
 * Legacy spellings that are NOT typed by humans but baked into OS scheduler
 * registrations (launchd plists, crontab lines, systemd units, schtasks) by
 * older oma versions. Removing the colon syntax must not silently break every
 * scheduled job registered before the rename, so these keep resolving to
 * their canonical path (see the #788-adjacent scheduler regression: two
 * weekly runs failed with "Unknown command: schedule:run").
 */
export const OS_INVOKED_LEGACY_PATHS: Readonly<Record<string, string>> = {
  "schedule:run": "schedule run",
  // The Serena idle-daemon timer (launchd/systemd/schtasks) written by 15.x.
  "serena daemon:gc": "serena daemon gc",
};

export function canonicalCommandPath(path: string): string {
  return COMMAND_PATHS[path] ?? path.replaceAll(":", " ");
}

export const EXPANDED_COMMANDS = [
  {
    path: "state activate",
    source: "state",
    prefix: ["--activate"],
    args: "<session-id>",
    description: "Set the active session for a category",
  },
  {
    path: "state archive",
    source: "state",
    prefix: ["--archive"],
    args: "",
    description: "Move inactive terminal sessions to the state archive",
  },
  {
    path: "state purge",
    source: "state",
    prefix: ["--purge"],
    args: "",
    description: "Delete inactive sessions older than --older-than",
  },
  {
    path: "stats reset",
    source: "stats",
    prefix: ["--reset"],
    args: "",
    description: "Reset productivity metrics data",
  },
  {
    path: "memory maintain backup",
    source: "memory:maintain",
    prefix: ["backup"],
    args: "",
    description: "Back up AgentMemory local storage",
  },
  {
    path: "memory maintain prune",
    source: "memory:maintain",
    prefix: ["prune"],
    args: "",
    description: "Delete AgentMemory backups beyond --keep",
  },
  {
    path: "memory maintain vacuum",
    source: "memory:maintain",
    prefix: ["vacuum"],
    args: "",
    description: "Run SQLite VACUUM on AgentMemory storage",
  },
  {
    path: "state inject-log get",
    source: "state:inject-log",
    prefix: [],
    args: "<session-id> <file>",
    description: "Print one inject audit log entry for a session",
  },
] as const;

/**
 * Paths that other OMA processes invoke (installed hooks, OS schedulers,
 * supervisors). They stay runnable but are hidden from help and describe.
 */
export const INTERNAL_COMMAND_PATHS: ReadonlySet<string> = new Set([
  "agent parallel-supervisor",
  "hook script",
  "schedule inspect",
  "schedule builtin-evolution-add",
]);

/** Descriptions for command groups that exist only as public path prefixes. */
export const GROUP_DESCRIPTIONS: Readonly<Record<string, string>> = {
  agent: "Spawn, verify, review, and inspect agent runs",
  auth: "Check vendor CLI authentication",
  dashboard: "Monitor agents in the terminal or a browser",
  goal: "Attach a goal contract to a persistent workflow",
  hook: "Run and probe vendor hook integration",
  memory: "Set up and maintain OMA memory",
  "memory retry": "Retry queued semantic-memory deliveries",
  model: "Check, probe, and propose model configuration",
  ralph: "Check ralph execution artifacts",
  schedule: "Create and manage scheduled agent jobs",
  "search api": "Fetch through or search platform APIs",
  "search rss": "Fetch RSS feeds or search Google News",
  "serena daemon": "Stop idle shared Serena daemons",
  "serena reaper": "Install or remove the periodic Serena Reaper task",
  "slide asset": "Download media assets into a deck",
  "slide export": "Export a deck to PDF, PNG, or PPTX",
  "slide import": "Import an existing deck",
  state: "Inspect and maintain OMA sessions and events",
  "state decisions": "List workflow checkpoints and decision subjects",
  "state inject-log": "List or read inject audit logs",
  stats: "View or reset productivity metrics",
  "image vendor": "List image generation vendors",
  "video provider": "List video generation providers",
};
