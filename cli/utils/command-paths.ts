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
  },
  { path: "state archive", source: "state", prefix: ["--archive"], args: "" },
  { path: "state purge", source: "state", prefix: ["--purge"], args: "" },
  { path: "stats reset", source: "stats", prefix: ["--reset"], args: "" },
  {
    path: "memory maintain backup",
    source: "memory:maintain",
    prefix: ["backup"],
    args: "",
  },
  {
    path: "memory maintain prune",
    source: "memory:maintain",
    prefix: ["prune"],
    args: "",
  },
  {
    path: "memory maintain vacuum",
    source: "memory:maintain",
    prefix: ["vacuum"],
    args: "",
  },
  {
    path: "state inject-log get",
    source: "state:inject-log",
    prefix: [],
    args: "<session-id> <file>",
  },
] as const;
