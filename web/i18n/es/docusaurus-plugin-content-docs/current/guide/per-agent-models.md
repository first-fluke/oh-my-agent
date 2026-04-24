---
title: "Guía: configuración de modelo por agente"
description: Configura distintos proveedores de CLI, modelos y niveles de razonamiento por agente mediante oma-config.yaml y models.yaml. Cubre agent_cli_mapping, perfiles de runtime, oma doctor --profile, models.yaml y el límite de cuota de sesión.
---

# Guía: configuración de modelo por agente

## Descripción general

oh-my-agent admite la **selección de modelo por agente** mediante `agent_cli_mapping`. Cada agente (pm, backend, frontend, qa…) puede apuntar a un proveedor, modelo y nivel de razonamiento propios, en lugar de compartir un único proveedor global.

Esta página cubre:

1. La jerarquía de tres archivos de configuración
2. El formato dual de `agent_cli_mapping`
3. Los presets de perfiles de runtime
4. El comando `oma doctor --profile`
5. Slugs de modelo definidos por el usuario en `models.yaml`
6. El límite de cuota de sesión

---

## Jerarquía de archivos de configuración

oh-my-agent lee la configuración de tres archivos en orden de precedencia (de mayor a menor):

| Archivo | Propósito | ¿Editable? |
|:--------|:----------|:-----------|
| `.agents/oma-config.yaml` | Overrides del usuario: mapeo agente–CLI, perfil activo, cuota de sesión | Sí |
| `.agents/config/models.yaml` | Slugs de modelo aportados por el usuario (añadidos al registro integrado) | Sí |
| `.agents/config/defaults.yaml` | Línea base integrada del Profile B (5 `runtime_profiles`, fallbacks seguros) | No — SSOT |

> `defaults.yaml` forma parte del SSOT y no debe modificarse directamente. Toda personalización va en `oma-config.yaml` y `models.yaml`.

---

## Formato dual de `agent_cli_mapping`

`agent_cli_mapping` acepta dos formas de valor para permitir una migración gradual:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legado — solo proveedor (usa modelo por defecto)
  backend:                            # nuevo objeto AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Forma de cadena legada**: `agent: "vendor"` — sigue funcionando; usa el modelo por defecto del proveedor con el effort por defecto mediante el runtime profile correspondiente.

**Forma de objeto AgentSpec**: `agent: { model, effort }` — fija un slug de modelo exacto y un nivel de razonamiento (`low`, `medium`, `high`).

Puedes combinar ambas libremente. Los agentes no declarados caen al `runtime_profile` activo y, después, a `agent_defaults` de nivel superior en `defaults.yaml`.

---

## Perfiles de runtime

`defaults.yaml` incluye Profile B con cinco `runtime_profiles` listos para usar. Selecciona uno en `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # ver opciones abajo
```

| Perfil | Todos los agentes enrutan a | Cuándo usarlo |
|:-------|:----------------------------|:--------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic uniforme |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack puro de OpenAI |
| `gemini-only` | Gemini CLI | Flujos centrados en Google |
| `antigravity` | Mixto: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Combinar fortalezas entre proveedores |
| `qwen-only` | Qwen Code | Inferencia local / autogestionada |

Los perfiles son la vía rápida para rehacer toda la flota sin editar cada línea de agente.

---

## `oma doctor --profile`

El flag `--profile` imprime una matriz con el proveedor, modelo y effort resultantes para cada agente —después de fusionar `oma-config.yaml`, `models.yaml` y `defaults.yaml`.

```bash
oma doctor --profile
```

**Salida de ejemplo:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Úsalo siempre que un subagente elija un proveedor inesperado: la columna `Source` indica qué capa de configuración ganó.

---

## Añadir slugs en `models.yaml`

`models.yaml` es opcional y sirve para registrar slugs de modelo que todavía no están en el registro integrado —útil para modelos recién lanzados.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Una vez registrado, el slug se puede usar en `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Los slugs son identificadores: mantén exactamente la grafía en inglés publicada por el proveedor.

---

## Límite de cuota de sesión

Añade `session.quota_cap` en `oma-config.yaml` para acotar el spawn descontrolado de subagentes:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # techo total de tokens por sesión
    spawn_count: 40          # máximo de subagentes paralelos + secuenciales
    per_vendor:              # sub-límites de tokens por proveedor
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Cuando se alcanza un límite, el orquestador rechaza nuevos spawns y emite el estado `QUOTA_EXCEEDED`. Dejar un campo sin definir (u omitir `quota_cap` por completo) desactiva esa dimensión.

---

## Todo junto

Un `oma-config.yaml` realista:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Ejecuta `oma doctor --profile` para confirmar la resolución y arranca el workflow como siempre.


## Propiedad de los archivos de configuración

| Archivo | Propietario | ¿Se puede editar? |
|---------|-------------|-------------------|
| `.agents/config/defaults.yaml` | SSOT incluido con oh-my-agent | No — tratar como solo lectura |
| `.agents/oma-config.yaml` | Tú | Sí — personaliza aquí |
| `.agents/config/models.yaml` | Tú | Sí — añade nuevos slugs aquí |

`defaults.yaml` lleva un campo `version:` para que las nuevas versiones de oh-my-agent puedan añadir runtime_profiles, nuevos slugs del Profile B o ajustar la matriz de effort. Editarlo directamente significa que no recibirás esas actualizaciones de forma automática.

## Actualización de defaults.yaml

Cuando tires de una versión más reciente de oh-my-agent, ejecuta `oma install` —el instalador compara la versión local de `defaults.yaml` con la incluida en el paquete:

- **Coincidencia** → sin cambios, silencioso.
- **Discrepancia** → advertencia:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Discrepancia + `--update-defaults`** → la versión incluida sobreescribe la tuya:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

El instalador nunca toca tu `oma-config.yaml` ni tu `models.yaml`.

## Actualización desde una instalación anterior a la 5.16.0

Si tu proyecto es anterior a la funcionalidad de modelo/effort por agente:

1. Ejecuta `oma install` (o `oma update`) desde la raíz de tu proyecto. El instalador deposita un `defaults.yaml` nuevo en `.agents/config/` y ejecuta la migración `003-oma-config`, que mueve automáticamente cualquier `.agents/config/user-preferences.yaml` heredado a `.agents/oma-config.yaml`.
2. Ejecuta `oma doctor --profile`. Tus valores existentes `agent_cli_mapping: { backend: "gemini" }` se resuelven a través de `runtime_profiles.gemini-only.agent_defaults.backend`, por lo que la matriz muestra el slug y la CLI correctos de forma automática.
3. (Opcional) Actualiza las entradas de cadena legadas al nuevo formato AgentSpec en `oma-config.yaml` cuando quieras overrides de `model`, `effort`, `thinking` o `memory` por agente:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Si en algún momento personalizaste `defaults.yaml`, `oma install` advertirá sobre la discrepancia de versión en lugar de sobreescribir. Mueve tus personalizaciones a `oma-config.yaml` / `models.yaml` y, después, ejecuta `oma install --update-defaults` para aceptar el nuevo SSOT.

No hay cambios que rompan la compatibilidad con `agent:spawn` —las configuraciones heredadas siguen funcionando mediante fallback graceful mientras migras a tu propio ritmo.
