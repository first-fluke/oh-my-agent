---
title: "Guía: Configuración de Modelo por Agente"
description: Configura qué modelo de IA usa cada agente mediante model_preset en oma-config.yaml. Cubre los presets integrados, sobrescrituras por agente, definiciones de modelo en línea, presets personalizados con extends, oma doctor --profile y la migración desde el antiguo agent_cli_mapping.
---

# Guía: Configuración de Modelo por Agente

## Visión general

`model_preset` es el único concepto que controla qué modelo usa cada agente. Elige uno de los presets integrados y cada agente (pm, backend, frontend, qa, …) queda conectado a un modelo apropiado para esa pila de proveedor. Sobrescribe agentes individuales según sea necesario. Define presets adicionales cuando tu equipo tenga una combinación no estándar.

Toda la configuración vive en un único archivo: `.agents/oma-config.yaml`.

Esta página cubre:

1. Los presets integrados
2. Cómo sobrescribir agentes individuales con el mapa `agents:`
3. Cómo declarar slugs de modelo personalizados con `models:`
4. Cómo definir presets personalizados con `custom_presets:` y `extends:`
5. Cómo inspeccionar la configuración resuelta con `oma doctor --profile`
6. Migración desde el antiguo `agent_cli_mapping`

---

## Presets integrados

Asigna a `model_preset` una de las claves integradas:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Clave | Descripción | Ideal para |
|:----|:-----------|:---------|
| `antigravity` | Todos los agentes usan Antigravity CLI (`agy`): Gemini 3.1 Pro para implementación/arquitectura, Gemini 3.5 Flash para orchestration y retrieval. La selección de modelo se gestiona internamente en `agy` — no se exponen flags `--model` ni `--thinking-budget`. | Usuarios de Antigravity CLI |
| `claude` | Todos los agentes usan Claude (Sonnet/Opus) | Suscriptores de Claude Max |
| `codex` | Todos los agentes usan OpenAI Codex (GPT-5.x) con niveles de esfuerzo | Usuarios de ChatGPT Plus/Pro |
| `gemini` | Todos los agentes usan Gemini CLI, con thinking habilitado para roles de implementación | Usuarios de Google AI Pro |
| `qwen` | Todos los agentes enrutados externamente vía Qwen Code; thinking binario (sin niveles de esfuerzo) | Inferencia local / autoalojada |
| `cursor` | Todos los agentes usan Cursor `composer-2.5` (`composer-2.5-fast` para orchestrator/qa/pm/docs/retrieval) | Suscriptores de Cursor Pro / Pro Student |
| `mixed` | Mixto: roles de implementación usan Codex, architecture/qa/pm usan Claude, retrieval usa Gemini | Aprovechar las fortalezas de varios proveedores sin gestionar la configuración por agente |

Los presets integrados se distribuyen dentro del paquete del CLI y se actualizan automáticamente al actualizar `oh-my-agent`. No hay archivo local que mantener.

---

## Sobrescribir agentes individuales

Usa el mapa `agents:` para sobrescribir agentes específicos por encima del preset activo. Solo se ven afectados los agentes que listas; el resto conserva los valores por defecto del preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Cada entrada es un objeto `AgentSpec`:

| Campo | Tipo | Obligatorio | Descripción |
|:------|:-----|:---------|:-----------|
| `model` | string | Sí | Slug del modelo (integrado o definido por el usuario) |
| `effort` | `low` \| `medium` \| `high` | No | Esfuerzo de razonamiento (se ignora en modelos que no lo admiten) |
| `thinking` | boolean | No | Habilita el thinking extendido (específico del modelo) |
| `memory` | `user` \| `project` \| `local` | No | Alcance de memoria del agente |

IDs de agente válidos: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

La fusión es superficial: cada campo de tu sobrescritura reemplaza el valor del preset para ese campo. Los campos que omites conservan el valor del preset.

---

## Declarar slugs de modelo en línea

Registra bajo `models:` los slugs de modelo que aún no están en el registro integrado. Una vez registrado, usa el slug en cualquier lugar dentro de `agents:` o `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Si un slug definido por el usuario colisiona con un slug integrado, gana la definición del usuario y se emite una advertencia.

---

## Presets personalizados

Define presets adicionales en `custom_presets:`. Usa `extends:` para heredar todos los valores por defecto de agente desde un preset integrado y sobrescribir solo los agentes que te interesen.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # preset base — fusión parcial
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # todos los demás agentes se heredan de claude
```

Sin `extends:`, debes proporcionar `agent_defaults` para los 11 roles de agente. Con `extends:`, solo se sobrescriben las entradas que listas; el resto se hereda del preset base.

---

## `oma doctor --profile`

Ejecuta `oma doctor --profile` para inspeccionar la matriz de modelos completamente resuelta — después de fusionar los valores por defecto del preset, los `custom_presets` y las sobrescrituras de `agents:`.

```bash
oma doctor --profile
```

**Ejemplo de salida:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Cada fila muestra el slug de modelo resuelto y la fuente que lo aplicó (`(preset)` u `(override)`). Úsalo siempre que un subagente seleccione un proveedor inesperado.

---

## Migración desde el antiguo `agent_cli_mapping`

La migración 008 se ejecuta automáticamente con `oma install` y `oma update`. Convierte los proyectos antiguos in situ:

| Configuración antigua | Resultado tras la migración 008 |
|:-------------|:--------------------------|
| Todas las entradas con el mismo proveedor (p. ej., todas `gemini`) | `model_preset: gemini`, sin `agents:` |
| Proveedores mixtos | El proveedor más frecuente -> `model_preset`; el resto -> sobrescrituras en `agents:` |
| Valores de objeto `AgentSpec` | Se mueven a `agents:` tal cual |
| Contenido de `models.yaml` | Se incrusta dentro de `oma-config.yaml.models` |
| `defaults.yaml` personalizado | Se conserva como `custom_presets.user-customized` con una advertencia |

Los originales se respaldan en `.agents/.backup-pre-008-{timestamp}/` antes de cualquier cambio. La migración es idempotente: si `model_preset` ya está presente, se omite.

Tras la migración, se eliminan `.agents/config/defaults.yaml`, `.agents/config/models.yaml` y el directorio `.agents/config/`.

---

## Tope de cuota de sesión

`session.quota_cap` no cambia. Añádelo a `oma-config.yaml` para limitar el spawn descontrolado de subagentes:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Cuando se alcanza un tope, el orchestrator rechaza nuevos spawns y expone un estado `QUOTA_EXCEEDED`.

---

## Ejemplo completo

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Ejecuta `oma doctor --profile` para confirmar la resolución, y luego inicia un workflow como de costumbre.
