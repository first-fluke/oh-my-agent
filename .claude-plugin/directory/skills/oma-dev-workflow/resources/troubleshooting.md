# Troubleshooting

Common issues and solutions.

## Task Not Found

```bash
# List all available tasks
mise tasks --all

# Show task details
mise tasks <task-name>
```

## Runtime Not Found

```bash
# Install all runtimes
mise install

# Install specific runtime
mise install node@24

# List installed runtimes
mise list
```

## Port Already in Use

```bash
# Check ports
lsof -ti:8000  # API port
lsof -ti:3000  # Web port
lsof -ti:8080  # Mobile port

# Inspect the owner and command before stopping a confirmed project process.
lsof -nP -iTCP:8000 -sTCP:LISTEN
# Set PROJECT_PID to the confirmed PID from that output.
ps -p "$PROJECT_PID" -o pid,ppid,user,command
kill -TERM "$PROJECT_PID" # escalate only if this same process does not stop
```

## Task Hangs

```bash
# Run with verbose output
mise run dev --verbose

# Debug mode
MISE_DEBUG=1 mise run dev

# Check for interactive prompts (use --yes if available)
mise run install --yes
```

## Clean State

```bash
# Stop this task with Ctrl-C in its terminal, or TERM its verified project PID.
# Inspect the versions selected by this project before changing toolchains.
mise ls --current
# Repair only the confirmed tool/version, if needed and authorized.
# Example: mise install node@<project-version>
# Do not blanket-kill other mise tasks or uninstall the user's shared runtimes.
```

## Debug Configuration

```bash
# Show mise config
mise config

# Show environment
mise env

# Doctor - check for issues
mise doctor
```
