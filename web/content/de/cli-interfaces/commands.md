---
title: Befehle
description: Vollständige Befehlsoberfläche aus cli/cli.ts.
---

# Befehle

Die folgende Befehlsoberfläche entspricht der aktuellen Implementierung in `cli/cli.ts`.

## Kernbefehle

```bash
oma                         # interaktiver Installer
oma dashboard               # Terminal-Dashboard
oma dashboard:web           # Web-Dashboard (:9847)
oma usage:anti              # Antigravity-Nutzungskontingente
oma update                  # Skills aus der Registry aktualisieren
oma doctor                  # Umgebungs-/Skill-Diagnose
oma stats                   # Produktivitätskennzahlen
oma retro                   # Retrospektive-Bericht
oma cleanup                 # Verwaiste Ressourcen bereinigen
oma bridge [url]            # MCP stdio -> streamable HTTP
```

## Agenten-Befehle

```bash
oma agent:spawn <agent-id> <prompt> <session-id>
oma agent:status <session-id> [agent-ids...]
```

## Speicher und Verifizierung

```bash
oma memory:init
oma verify <agent-type>
```
