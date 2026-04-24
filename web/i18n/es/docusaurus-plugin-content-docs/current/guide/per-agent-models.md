---
title: "Guía: configuración de modelo por agente"
description: Configura distintos proveedores de CLI, modelos y niveles de razonamiento por agente mediante oma-config.yaml y models.yaml. Cubre agent_cli_mapping, perfiles de runtime, oma doctor --profile, models.yaml y el límite de cuota de sesión.
---

# Guía: configuración de modelo por agente

## Descripción general

 introduce la **selección de modelo por agente** mediante `agent_cli_mapping`. Cada agente (pm, backend, frontend, qa…) puede ahora apuntar a un proveedor, modelo y nivel de razonamiento propios, en lugar de compartir un único proveedor global.

Esta página cubre:

1. La jerarquía de tres archivos de configuración
2. El formato dual de `agent_cli_mapping`
3. Los presets de perfiles de runtime
4. El comando `oma doctor --profile`
5. Slugs de modelo definidos por el usuario en `models.yaml`
6. El límite de cuota de sesión

---

## Jerarquía de archivos de configuración

 lee tres archivos en orden de precedencia (de mayor a menor):

| Archivo | Propósito | ¿Editable? |
|:--------|:----------|:-----------|
| `.agents/oma-config.yaml` | Overrides del usuario: mapeo agente–CLI, perfil activo, cuota de sesión | Sí |
| `.agents/config/models.yaml` | Slugs de modelo aportados por el usuario (añadidos al registro integrado) | Sí |
| `.agents/config/defaults.yaml` | Línea base integrada del Profile B (4 `runtime_profiles`, fallbacks seguros) | No — SSOT |

> `defaults.yaml` forma parte del SSOT y no debe modificarse directamente. Toda personalización va en `user-preferences.yaml` y `models.yaml`.

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

**Forma de cadena legada**: `agent: "vendor"` — sigue funcionando; usa el modelo y el effort por defecto del proveedor.

**Forma de objeto AgentSpec**: `agent: { model, effort }` — fija un slug de modelo exacto y un nivel de razonamiento (`low`, `medium`, `high`).

Puedes combinar ambas libremente. Los agentes no declarados caen al `runtime_profile` activo.

---

## Perfiles de runtime

`defaults.yaml` incluye Profile B con cuatro `runtime_profiles` listos para usar. Selecciona uno en `user-preferences.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # ver opciones abajo
```

| Perfil | Todos los agentes enrutan a | Cuándo usarlo |
|:-------|:----------------------------|:---------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic uniforme |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack puro de OpenAI |
| `gemini-only` | Gemini CLI | Flujos centrados en Google |
| `antigravity` | Mixto: pm→claude, backend→codex, qa→gemini | Combinar fortalezas entre proveedores |
| `qwen-only` | Qwen CLI | Inferencia local / autogestionada |

Los perfiles son la vía rápida para rehacer toda la flota sin editar cada línea.

---

## `oma doctor --profile`

El nuevo flag `--profile` imprime una matriz con el proveedor, modelo y effort resultantes para cada agente **después** de fusionar los tres archivos de configuración.

```bash
oma doctor --profile
```

**Salida de ejemplo:**

```
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Si un subagente elige un proveedor inesperado, ejecuta esto primero: la columna `Source` indica qué capa de configuración ganó.

---

## Añadir slugs en `models.yaml`

`models.yaml` es opcional y sirve para registrar slugs de modelo que todavía no están en el registro integrado — útil para modelos recién lanzados.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — candidato a release GPT-5.5 Spud"
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

Añade `session.quota_cap` en `user-preferences.yaml` para acotar el spawn descontrolado de subagentes:

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

Cuando se alcanza un límite, el orquestador rechaza nuevos spawns y emite el estado `QUOTA_EXCEEDED`. Dejar un campo sin definir (u omitir `quota_cap` entero) desactiva esa dimensión.

---

## Todo junto

Un `user-preferences.yaml` realista:

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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
