Add OMA for Orca (first-fluke.oma)

OMA for Orca connects project-local OMA skills and verification procedures to
existing Orca agent terminals. Users can connect a project, review current
changes, diagnose an identified error, verify changes, and summarize results from
a sidebar panel or the command palette.

- Identity: `first-fluke.oma`
- Source: `https://github.com/first-fluke/oh-my-agent.git` at `orca-v0.1.0`
- Requires: Orca >=1.4.197, pluginApi 1
- Category: `productivity` (community)
- Capabilities: `workspace:read`, `terminal:send`

All actions insert a previewable request without Enter. The panel requires an
explicit terminal selection and checks for changed context; palette commands
require a single terminal. No task completion is inferred from text insertion.
The plugin does not run subprocesses, access the network, subscribe to events,
change global instructions, or declare unsupported skill contributions. OMA
installation is a separate project setup step, explained in the README.

Validation: `node --test plugin.test.mjs` in the standalone source covers the shipped
worker and inline panel code, including stale targets, rejected and denied writes,
duplicate requests, timeout handling, and catalog parity (11 tests passed).
Local-folder installation and enablement passed on macOS with Orca 1.4.197.
The native sidebar loaded workspace context and inserted a request into an
explicitly selected disposable terminal; `orca terminal read` confirmed delivery.
Enter was not sent and no coding-agent task was submitted. No build was needed.
Linux/Windows native UI installation has not been assessed.
