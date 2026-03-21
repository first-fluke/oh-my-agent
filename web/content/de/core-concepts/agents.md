---
title: Agenten
description: Agententypen, Workspace-Strategie und Orchestrierungsablauf.
---

# Agenten

## Agentenkategorien

- Ideenfindung: Brainstorm
- Planung: PM agent
- Implementierung: Frontend, Backend, Mobile, DB
- Infrastruktur: TF-infra agent
- DevOps: Dev-workflow
- Qualitätssicherung: QA, Debug
- Lokalisierung: Translator
- Koordination: oma-coordination, oma-orchestrator

## Workspace-Strategie

Separate Workspaces reduzieren Merge-Konflikte:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Agent-Manager-Ablauf

1. PM definiert die Aufgabenzerlegung
2. Domänen-Agenten arbeiten parallel
3. Fortschritt wird in Serena-Speicher gestreamt
4. QA validiert die systemweite Konsistenz

## Serena-Laufzeitdateien

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
