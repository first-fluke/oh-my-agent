---
title: Agentes
description: Tipos de agentes, estrategia de espacios de trabajo y flujo de orquestacion.
---

# Agentes

## Categorias de agentes

- Ideación: Brainstorm
- Planificación: PM agent
- Implementación: Frontend, Backend, Mobile, DB
- Infraestructura: TF-infra agent
- DevOps: Dev-workflow
- Aseguramiento: QA, Debug
- Localización: Translator
- Coordinación: oma-coordination, oma-orchestrator

## Estrategia de espacios de trabajo

Los espacios de trabajo separados reducen los conflictos de merge:

```text
./apps/api      -> backend
./apps/web      -> frontend
./apps/mobile   -> mobile
```

## Flujo del gestor de agentes

1. El PM define la descomposicion
2. Los agentes de dominio ejecutan en paralelo
3. El progreso se transmite a las memorias de Serena
4. QA valida la consistencia a nivel de sistema

## Archivos de tiempo de ejecucion de Serena

- `orchestrator-session.md`
- `task-board.md`
- `progress-{agent}.md`
- `result-{agent}.md`
