---
title: "Guía: Configuración del modelo por agente"
sidebar_label: Modelos por agente
description: Configura qué modelo de IA usa cada agente mediante model_preset en oma-config.yaml. Cubre los presets integrados y los modelos de cada rol, la tabla de resolución de modelo y CLI, las sobrescrituras por agente, las definiciones de modelos en línea, los presets personalizados con extends, oma doctor --profile, los límites de cuota y los transportes pi/OpenCode/Kimi.
---

# Guía: Configuración del modelo por agente

## Visión general {#overview}

`model_preset: auto` es el valor predeterminado en las instalaciones nuevas. Los agentes sin configurar usan las definiciones y los ajustes de modelo nativos del proveedor actual. Elige un preset fijo para fijar los modelos o sobrescribe agentes concretos cuando necesites otro modelo o proveedor. Los presets explícitos existentes se conservan al reinstalar y actualizar.

La configuración compartida vive en `.agents/oma-config.yaml` y, si existe, en `.agents/oma-config.cue`, cuyas claves sobrescriben las mismas claves de YAML. Un archivo local opcional, ignorado por Git, sobrescribe los ajustes en tu máquina.

Para consultar las claves de nivel superior y la precedencia completa, visita la [referencia de configuración](/docs/guide/configuration-reference).

Esta página cubre:

1. Los presets integrados y los modelos que recibe cada rol
2. Cómo resuelve OMA el modelo y la CLI de un agente
3. La configuración local y el preset de FreeLLMAPI (`free`)
4. La sobrescritura de agentes individuales con el mapa `agents:`
5. La inserción de slugs de modelos personalizados con `models:`
6. La definición de presets personalizados con `custom_presets:` y `extends:`
7. La inspección de la configuración resuelta con `oma doctor --profile`
8. La migración desde `agent_cli_mapping` heredado y los límites de cuota de sesión
9. El despacho mediante pi, OpenCode y Kimi Code CLI

---

## Presets integrados {#built-in-presets}

Establece `model_preset` en una de las claves integradas:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Clave | Descripción | Ideal para |
|:----|:-----------|:---------|
| `auto` | Sigue los ajustes de agente y modelo del runtime actual sin inyectar un flag de modelo ni de esfuerzo | Valor predeterminado en instalaciones nuevas |
| `free` | Modo de gateway especial para procesos de Codex, Claude o Qwen iniciados por OMA; se resuelve por separado del registro de presets integrados. | Gateway local de FreeLLMAPI |
| `antigravity` | Todos los agentes usan la CLI de Antigravity (`agy`): Gemini 3.1 Pro para implementación, arquitectura y QA; Gemini 3.6 Flash para orquestación, PM, documentación y explore. En agy 1.1+, OMA pasa el ID visible de `agy models` (por ejemplo, `--model "Gemini 3.1 Pro (High)"`) y asigna `effort` a un nivel que publique el modelo. agy 1.0 no tiene `--model`, así que decide su propia configuración. agy no tiene `--thinking-budget`. | Usuarios de Antigravity CLI |
| `claude` | Todos los agentes usan Claude: Opus para arquitectura, Haiku para explore y Sonnet para el resto de roles | Suscriptores de Claude Max |
| `codex` | Todos los agentes usan OpenAI Codex (GPT-5.5 para la mayoría de roles, GPT-5.4-mini para explore) con niveles de esfuerzo | Usuarios de ChatGPT Plus/Pro |
| `qwen` | Todos los agentes usan Qwen Code; las sesiones de Qwen que coinciden pueden usar los agentes nativos generados, y los demás runtimes usan el despacho por CLI | Inferencia local o autoalojada |
| `kiro` | Todos los agentes usan la CLI de Kiro; Sonnet gestiona implementación/arquitectura y Haiku gestiona orquestación/explore | Usuarios de Kiro |
| `cursor` | Todos los agentes usan Cursor `composer-2.5` (`composer-2.5-fast` para orchestrator/qa/pm/docs/explore) | Usuarios de Cursor Pro / Pro Student |
| `mixed` | Claude para orchestrator, arquitectura (Opus), qa, pm y docs; Codex GPT-5.5 para los roles de implementación y GPT-5.4-mini para explore | Combinar las fortalezas de varios proveedores sin gestionar la configuración de cada agente |

Los presets integrados se distribuyen dentro del paquete de la CLI y se actualizan automáticamente al actualizar `oh-my-agent`. `gemini` es un alias de compatibilidad que redirige a `antigravity`; no es un preset actual independiente. No hace falta mantener un archivo de presets local.

### Modelos por rol {#models-per-role}

Los presets fijos asignan estos slugs del registro. Se omiten los prefijos de propietario: `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/` y `cursor/` en las seis primeras columnas, y `anthropic/` para los modelos de Claude u `openai/` para los modelos GPT en `mixed`. La fuente de verdad es `cli/platform/built-in-presets.ts`.

| Rol | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

Los valores entre paréntesis son el `effort` del preset (Codex) o `thinking: true` (Qwen). Un rol que el preset no enumera, como `eval`, usa la entrada `orchestrator` de ese preset.

---

## Cómo resuelve OMA el modelo y la CLI de un agente {#how-oma-resolves-an-agents-model-and-cli}

`OMA_MODEL_PRESET`, si está definida, sustituye primero a `model_preset` (consulta [Carga de la configuración](/docs/guide/oma-config-semantics#precedence-table)). Después, el resolvedor elige una fila:

| `model_preset` | ¿Está definido `agents.<id>`? | Modelo enviado a la CLI | CLI que ejecuta el agente |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | Se ignora | `FREELLM_MODEL`; si no, `free.model`; si no, `auto` (todos los roles) | `--vendor`; si no, `OMA_RUNTIME_VENDOR`; si no, el runtime detectado si es Codex, Claude o Qwen; si no, `default_cli`; si no, `codex`. Solo se aceptan `codex`, `claude` y `qwen`. |
| `auto` | No | Ninguno. Se aplican los ajustes de agente y de sesión del propio proveedor. | `--vendor`; si no, un `OMA_RUNTIME_VENDOR` compatible; si no, el runtime detectado; si no, `default_cli`; si no, `claude`. Un valor no compatible es un error. |
| `auto` | Sí | El `model` de la sobrescritura | La `cli` de ese modelo y, después, la regla de sobrescritura de proveedor de más abajo |
| Integrado, alias o personalizado | No | La entrada del preset para el rol; si no, la entrada `orchestrator` del preset | La `cli` de ese modelo y, después, la regla de sobrescritura de proveedor de más abajo |
| Integrado, alias o personalizado | Sí | La entrada del preset combinada de forma superficial con la sobrescritura (ganan los campos de la sobrescritura) | La `cli` de ese modelo y, después, la regla de sobrescritura de proveedor de más abajo |

Cómo encajan las demás piezas:

- **Búsqueda del preset.** OMA comprueba primero los nombres integrados, después los alias (`gemini` redirige a `antigravity` con una advertencia) y luego `custom_presets`. Se ignora un preset personalizado con un nombre integrado. Un nombre desconocido se detiene con `Unknown model_preset "..."`, que enumera los nombres válidos.
- **Búsqueda del modelo.** Un slug se busca primero en `models:` y después en el registro integrado. Un slug desconocido, o una especificación con `api_only: true`, detiene el despacho.
- **Regla de sobrescritura de proveedor.** Cuando `--vendor` u `OMA_RUNTIME_VENDOR` nombra un proveedor para una fila respaldada por un modelo, `pi` siempre toma el control (solo modelos de proveedores reales; consulta [Despachar mediante pi](#dispatching-through-pi-transport-runtime)). Cualquier otro proveedor toma el control solo si figura en `supports.native_dispatch_from` del modelo. En caso contrario, OMA emite una advertencia y conserva la `cli` propia del modelo.
- **Esfuerzo.** `effort` se descarta, con una advertencia, en los modelos cuya CLI no tiene flag de esfuerzo (Claude Code). Se conserva para pi, que lo asigna a `--thinking`.

## Despacho automático {#auto-dispatch}

Con `auto`, OMA usa la ruta de subagente nativa del runtime actual cuando está disponible. Los agentes entre proveedores y los runtimes sin despacho nativo usan `oma agent spawn`. `auto` no se expande a un preset fijo de proveedor. Los planes heredados no inyectan flags de modelo ni de esfuerzo de OMA. Un proceso de CLI externo usa los valores predeterminados persistidos de esa CLI, que pueden diferir de un modelo seleccionado solo en la sesión principal.

`oma doctor --profile` muestra `(vendor agent default)` para los agentes heredados y el modelo resuelto para las sobrescrituras explícitas. Los archivos de agentes nativos conservan sus definiciones del proveedor; las sobrescrituras del mismo proveedor en modo `auto` se aplican cuando esos archivos se generan mediante install/update.

## Configuración local {#local-configuration}

Crea **uno** de estos archivos, `.agents/oma-config.local.cue` o `.agents/oma-config.local.yaml`, junto a la configuración compartida. Install, link y update añaden ambas rutas a `.gitignore`; update conserva los archivos locales existentes, incluso con `--force`.

OMA selecciona el directorio de configuración del proyecto más cercano. Dentro de ese directorio, las claves definidas en el CUE compartido sobrescriben las mismas claves del YAML compartido, y el archivo local sobrescribe los valores compartidos. El orden completo está en la [tabla de precedencia](/docs/guide/oma-config-semantics#precedence-table). Los archivos CUE se evalúan de forma independiente antes de combinarlos, por lo que `model_preset: "auto"` compartido puede sustituirse localmente por `"free"`. Los objetos se combinan de forma recursiva; los arrays, escalares y `null` sustituyen al valor compartido. Un archivo local mal formado, la ausencia del ejecutable CUE para CUE local o la presencia de ambos formatos locales es un error, y no una autorización para usar los valores predeterminados compartidos.

Las opciones del comando y las sobrescrituras de entorno admitidas tienen prioridad sobre la configuración efectiva de los archivos. `oma doctor --profile` muestra qué archivos se usaron. Los archivos locales no viajan con los clones de Git ni con los worktrees nuevos. Los subprocesos en modo free heredan `OMA_MODEL_PRESET=free` y el entorno del gateway resuelto para que los spawns anidados de OMA conserven la ruta; las sesiones iniciadas por separado necesitan su propia configuración local o su entorno. Los ajustes guardados por los comandos de instalación y configuración siguen apuntando a la configuración compartida; la sobrescritura local continúa ganando en runtime.

## Preset de FreeLLMAPI {#freellmapi-preset}

Mantén `model_preset: auto` en el archivo compartido y actívalo localmente:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

El archivo YAML equivalente es:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Inicia FreeLLMAPI por separado y exporta su clave unificada como `FREELLM_API_KEY`. OMA también acepta `FREELLMAPI_API_KEY` de upstream cuando se selecciona la variable de clave predeterminada; la variable canónica gana si ambas están definidas. Un `api_key_env` personalizado solo lee esa variable. Nunca pongas la clave en la configuración. `OMA_MODEL_PRESET` sobrescribe el preset. `FREELLM_BASE_URL` y `FREELLM_MODEL` sobrescriben los valores del archivo. Los valores del ejemplo son los predeterminados, por lo que basta con `model_preset: free` cuando el servidor y la clave estén listos.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

El modo free usa `free.model` para todos los roles que OMA despacha, incluidos los que tienen valores fijados en `agents.*.model`. No resuelve esos valores en suscripciones de pago. Elige `auto`, un ID de modelo del gateway o una cadena de gateway con nombre, como `auto:coding` (crea esa cadena antes en FreeLLMAPI).

El transporte sigue la fila `free` de [Cómo resuelve OMA el modelo y la CLI de un agente](#how-oma-resolves-an-agents-model-and-cli). Solo se admiten los transportes de Codex, Claude y Qwen. Seleccionar explícitamente un transporte no compatible produce un error.

| Transporte | Endpoint del gateway | URL base de la CLI |
|:--|:--|:--|
| Codex | `/v1/responses` | Incluye `/v1` |
| Claude | `/v1/messages` | Raíz del servidor; OMA elimina el sufijo `/v1` |
| Qwen | `/v1/chat/completions` | Incluye `/v1` |

Usa `oma agent spawn` incluso cuando el proceso principal utiliza el mismo proveedor. OMA inyecta la conexión y las credenciales del gateway solo en ese subproceso; cambiar el preset no cambia el modelo de una sesión host ya abierta ni de la herramienta de subagentes nativa del host. Codex recibe un proveedor personalizado de Responses mediante argumentos de invocación, mientras la clave permanece en el entorno hijo. Claude y Qwen reciben sus ajustes de endpoint compatibles. Los ajustes de Claude/Qwen que entrarían en conflicto con la ruta o la clave se informan antes de la ejecución; OMA no reescribe esos archivos.

Spawn y review comprueban el `GET /v1/models` autenticado antes de iniciar el agente. La ausencia de claves, los fallos de conexión y los errores HTTP de autenticación detienen la ejecución. `oma doctor --profile` muestra la URL/modelo efectivos, las sobrescrituras de entorno, la presencia de la clave y la disponibilidad del servidor sin imprimir la clave. La disponibilidad no garantiza que el modelo tenga cuota suficiente para terminar una tarea.

FreeLLMAPI gestiona el failover del proveedor a nivel de petición. El failover explícito de OMA basado en checkpoints sigue siendo un mecanismo separado de recuperación del proceso; cada sucesor en modo free debe seguir usando un transporte de FreeLLMAPI compatible. No se vuelve automáticamente a una configuración de proveedor de pago.

El preset free configura la inferencia de los agentes. No cambia la configuración de embeddings de los servicios de memoria existentes. FreeLLMAPI también expone `/v1/embeddings`; al configurar por separado un vector store, fija una familia de modelos para que los vectores existentes conserven un espacio compatible.

Referencias upstream: [configuración del cliente](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [familias de API y embeddings](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Sobrescribir agentes individuales {#overriding-individual-agents}

Usa el mapa `agents:` para sobrescribir agentes concretos por encima del preset activo. Solo se ven afectados los agentes que enumeres; el resto sigue los ajustes del proveedor en modo `auto` o los valores predeterminados del preset fijo seleccionado.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Cada entrada es un objeto `AgentSpec`:

| Campo | Tipo | Obligatorio | Descripción |
|:------|:-----|:---------|:-----------|
| `model` | string | Sí | Slug del modelo (integrado o definido por el usuario) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | No | Esfuerzo de razonamiento (se ignora en los modelos que no lo admiten) |
| `thinking` | boolean | No | Habilita el thinking extendido (específico del modelo) |
| `memory` | `user` \| `project` \| `local` | No | Alcance de memoria del agente |

Los IDs de agente válidos son: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` y `eval`. Los presets integrados no definen `eval`, así que usa la entrada `orchestrator` del preset salvo que lo sobrescribas.

La combinación es superficial: cada campo de la sobrescritura reemplaza el valor del preset para ese campo. Los campos que omitas conservan el valor del preset.

---

## Insertar slugs de modelos {#inlining-model-slugs}

Registra bajo `models:` los slugs de modelos que aún no estén en el registro integrado. Una vez registrado, referencia el slug desde `agents:` o `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```

Se aplican dos reglas al slug registrado que referencias desde `agents:`:

1. **La clave debe tener la forma `owner/model`.** `agents.<id>.model` se valida contra un patrón `owner/model`, por lo que se rechaza una clave simple como `my-fast-model`; usa una clave con barra como `antigravity/gemini-3.1-pro-low` (o el slug `provider/model` propio del proveedor).
2. **La especificación debe estar completa y ser válida.** En el momento de resolverla son obligatorios `cli`, `cli_model`, `auth_hint` y cada campo de `supports`. `cli` debe ser uno de `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`, `qwen` u `opencode`; las entradas de `native_dispatch_from` deben ser `antigravity`, `claude`, `codex`, `cursor`, `kimi`, `kiro`, `opencode` o `qwen`. `gemini` no es un valor válido en ninguno de los dos. Una especificación no válida registra `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`; si el registro principal no tiene ese slug, el despacho se detiene con un error de slug desconocido.

> Si un slug definido por el usuario colisiona con un slug integrado, gana la definición del usuario y se emite una advertencia.

---

## Presets personalizados {#custom-presets}

Define presets adicionales en `custom_presets:`. Usa `extends:` para heredar todos los valores predeterminados de agente de un preset integrado y sobrescribir solo los agentes que te interesen.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Sin `extends:`, define al menos `orchestrator`: todos los roles que el preset omita usan su entrada `orchestrator`. Con `extends:`, solo se sobrescriben las entradas que enumeres; el resto se hereda del preset base. `extends` puede nombrar un preset integrado u otro preset personalizado, y una cadena circular es un error. Se ignora un preset personalizado con el nombre de uno integrado (por ejemplo, `claude`); gana el integrado.

---

## `oma doctor --profile`

Ejecuta `oma doctor --profile` para inspeccionar la matriz de modelos completamente resuelta después de combinar los valores predeterminados del preset, `custom_presets` y las sobrescrituras de `agents:`.

```bash
oma doctor --profile
```

**Ejemplo de salida** (abreviado: `model_preset: mixed` con una sobrescritura de `backend`; una ejecución real enumera los 13 roles, y el terminal dibuja cada sección dentro de un marco):

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```

Cada fila muestra el rol, el slug de modelo resuelto, la CLI que lo ejecuta y su estado de autenticación. La celda del rol lleva una etiqueta de origen: `(preset)`, `(override)` o `(vendor)` para los agentes que heredan los ajustes del proveedor con `auto`. La columna Role tiene 14 caracteres de ancho, así que las etiquetas largas se cortan, como arriba. Úsalo siempre que un subagente elija un proveedor inesperado.

---

## Migración desde `agent_cli_mapping` heredado {#migration-from-legacy-agent_cli_mapping}

La migración 008 se ejecuta automáticamente con `oma install` y `oma update`. Convierte los proyectos heredados en el mismo sitio:

| Configuración heredada | Resultado después de la migración 008 |
|:-------------|:--------------------------|
| Todas las entradas usan el mismo proveedor (por ejemplo, todo `claude`) | `model_preset` se establece en el preset de ese proveedor (el `gemini` heredado se asigna a `antigravity`), sin `agents:` |
| Proveedores mixtos | El proveedor más frecuente pasa a `model_preset`; los demás pasan a sobrescrituras de `agents:` |
| Valores de objeto `AgentSpec` | Se trasladan tal cual a `agents:` |
| Contenido de `models.yaml` | Se inserta en `oma-config.yaml.models` |
| `defaults.yaml` personalizado | Se conserva como `custom_presets.user-customized` con una advertencia |

Los originales se respaldan en `.agents/backup/008-model-preset/<timestamp>-<pid>/` antes de realizar cualquier cambio (`~/.oma/backup/008-model-preset/...` en la instalación global). La migración es idempotente. Si `model_preset` ya está presente, se omite.

<!-- oma-docs:ignore-start -->
Después de la migración, se eliminan `.agents/config/defaults.yaml`, `.agents/config/models.yaml` y el directorio `.agents/config/`.
<!-- oma-docs:ignore-end -->

---

## Límite de cuota de sesión {#session-quota-cap}

Añade `session.quota_cap` a `oma-config.yaml` para limitar la creación descontrolada de subagentes:

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```

Cuando se alcanza un límite, `oma agent spawn` rechaza el siguiente spawn y falla con `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)`. El uso de tokens se estima a partir de la longitud del prompt, por lo que `spawn_count` es el límite más predecible. Reglas de los campos: [Límites de cuota de sesión](/docs/guide/configuration-reference#session-quota-caps).

---

## Ejemplo completo {#full-example}

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2000000
    spawn_count: 40
```

Ejecuta `oma doctor --profile` para confirmar la resolución y después inicia un workflow como de costumbre.

---

## Despachar mediante pi (runtime de transporte) {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi) (Earendil) es un runtime proxy multi-proveedor, no un propietario de modelos: puede ejecutar modelos de proveedores reales (Anthropic, OpenAI y Google) desde una sola CLI. oma trata pi como una **capa de transporte**: `model_preset` y las sobrescrituras de `agents:` permanecen iguales, y pi se convierte en la CLI que ejecuta un agente concreto.

Despacha cualquier agente a través de pi con la sobrescritura `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

Qué ocurre:

- El modelo resuelto por agente desde el preset o las sobrescrituras (por ejemplo, `openai/gpt-5.5`) se traduce al formato `--model <provider/id>` de pi, y `effort` se traduce al nivel `--thinking` de pi. **Los modelos por subagente funcionan en pi igual que de forma nativa**: distintos agentes pueden ejecutar modelos distintos.
- La persona del agente (el system prompt) se inserta desde `.agents/agents/<id>.md`, porque pi no tiene un archivo de agente del proveedor al que referenciar.
- La autenticación es la que esté configurada en pi (`~/.pi/agent/auth.json` o una API key del proveedor en el entorno). `oma doctor` informa del estado de instalación y autenticación de pi junto con las demás CLIs.

**Restricción:** pi solo ejecuta modelos de proveedores reales. Los presets propios de una CLI (`cursor`, `kiro`, `qwen`, `antigravity`) nombran modelos que solo existen dentro de sus propias CLIs, por lo que despacharlos mediante pi se rechaza con un error claro. Al enrutar agentes mediante pi, usa `claude`, `codex` o `mixed`, o sobrescrituras de `agents.<id>` cuyos modelos sean slugs `anthropic/`, `openai/` o `google/`. `gemini` es un alias de `antigravity`, así que pi lo rechaza.

> El catálogo de modelos de pi está ligado a su versión y requiere autenticación. Si un slug resuelto no coincide con lo que ofrece tu instalación de pi, comprueba `pi --list-models`; la coincidencia de `--model` de pi es flexible, por lo que la mayoría de los slugs de proveedor se resuelven tal cual.

### Modelos fuera del registro integrado de pi (por ejemplo, Z.ai GLM)

pi resuelve `--model` contra su **registro integrado de modelos**, y solo consulta el ajuste `defaultProvider` cuando no se pasa ningún modelo. Para Z.ai, pi incluye solo un subconjunto de IDs de GLM (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` en pi 0.80.x); cualquier otro ID que nombre un preset no se podrá resolver.

Hay dos formas de gestionarlo:

1. **IDs del registro**: limita el preset a los IDs del registro. Usa la forma `provider/id` (por ejemplo, `zai/glm-4.7`) para fijar el proveedor explícitamente; oma lo pasa a pi tal cual mediante `--model`.
2. **IDs no registrados**: regístralos con una extensión de pi. El campo `api` debe nombrar uno de los **IDs de adaptador de API** de pi (`openai-completions`, `anthropic-messages`, …), no el nombre del proveedor. Los nombres de proveedor como `"zai"` o las abreviaturas como `"openai"` no son IDs de adaptador y fallan al despachar con `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

Verifica con `pi --list-models` antes de conectar los IDs a un preset.

---

## Despachar mediante OpenCode

[OpenCode](https://opencode.ai) es un proveedor de tipo extensión: al igual que pi, no es propietario de modelos, sino una CLI que ejecuta modelos de su propio catálogo: el proveedor gratuito `opencode`, el plan de suscripción de bajo costo `opencode-go` y el gateway `opencode-zen`. oma lo integra como un **proveedor plugin en proceso**: opencode carga automáticamente `.opencode/plugins/oma/` en lugar de registrar hooks en archivos de configuración, y resuelve la persona de cada agente a partir de los archivos generados `.opencode/agents/<id>.md`.

### Despacho explícito

Enruta cualquier agente mediante opencode con la sobrescritura `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Esto ejecuta `opencode run --agent pm --dir <workspace> "<prompt>"`. El prompt es un **argumento posicional final**: el flag `-p` de opencode significa `--password`, no el prompt.

### Modelos de OpenCode por agente

Para enrutar agentes concretos a un modelo de opencode, registra el modelo en `models:` y referéncialo desde `agents:`. Se aplican dos requisitos (consulta [Insertar slugs de modelos](#inlining-model-slugs)):

1. **El slug debe tener la forma `owner/model`.** Usa el slug `provider/model` de opencode como clave del registro; el esquema de `agents.<id>.model` rechaza los nombres simples.
2. **La especificación debe estar completa**: `cli`, `cli_model`, `auth_hint` y cada campo de `supports`. Una especificación incompleta falla la validación; OMA registra una advertencia y recurre al registro principal, por lo que el agente no se enrutaría a opencode.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Cada agente enrutado ejecuta `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. Es una buena opción para roles ligeros y rápidos (pm, qa, docs, explore), mientras que los agentes de implementación más pesados permanecen en Codex/Claude/etc.

### Validar un slug de modelo

El catálogo de opencode está restringido por la suscripción y el inicio de sesión, por lo que oma **no** codifica slugs de modelos de opencode. Valida uno contra el catálogo instalado:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` informa `accepted` cuando el slug aparece en `opencode models`, `rejected` cuando no aparece y `auth_required` cuando el proveedor necesita iniciar sesión o una suscripción.

### Autenticación y archivos generados

- **Autenticación:** `opencode auth login` almacena las credenciales en `~/.local/share/opencode/auth.json`, una entrada por proveedor. `oma auth status` / `oma doctor` informan de opencode como autenticado cuando *cualquier* proveedor tiene una credencial. `oma doctor --profile` distingue los proveedores: cada fila se comprueba contra el prefijo del proveedor de su `cli_model` registrado, de modo que un modelo con `cli_model: zai-coding-plan/glm-5.3` se comprueba contra la credencial `zai-coding-plan`. Una fila cuyo modelo no tenga un `cli_model` registrado con la forma `provider/model` muestra `? unknown` en lugar de un fallo de autenticación definitivo.
- **Archivos generados:** `oma link` (o `oma link opencode`) escribe una persona `.opencode/agents/<id>.md` por agente y el puente `.opencode/plugins/oma/`. Estos archivos se generan a partir del SSOT de `.agents/`: no los edites directamente; vuelve a ejecutar `oma link` para regenerarlos.

> **Nota sobre workflows persistentes:** el evento `session.idle` de opencode (su análogo más cercano al hook `Stop` de Claude) solo notifica y no puede impedir que termine la sesión. Por eso, los workflows persistentes (orchestrate / work / ultrawork) se ejecutan con **semántica de Stop degradada** en opencode: el refuerzo del workflow ocurre en el siguiente mensaje en lugar de mantener la sesión abierta.

---

## Despachar mediante Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) solo lee **hooks** desde una configuración global (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`), por lo que `oma install`/`oma link` escriben la cadena de hooks y sus symlinks de skills en HOME con consentimiento explícito (igual que Antigravity). Kimi también busca directamente en el SSOT `.agents/skills/` de oma, por lo que las skills se resuelven en todo el proyecto. **MCP** no necesita escribir en HOME y tiene alcance de proyecto: se escribe según el modo en `<cwd>/.kimi-code/mcp.json` (proyecto) o `~/.kimi-code/mcp.json` (global).

### Despacho explícito

Enruta cualquier agente mediante Kimi con la sobrescritura `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Esto ejecuta `kimi -p "<prompt>"`. El modo `-p` (no interactivo) de Kimi aprueba automáticamente las llamadas normales a herramientas con su política de permisos `auto`, así que oma **no** añade `--yolo`/`--auto` (son mutuamente excluyentes con `-p`).

### Modelos de Kimi por agente

Al igual que con opencode, oma **no** codifica un catálogo de modelos de Kimi (la oferta depende del proveedor y de la suscripción). Para enrutar agentes concretos a un modelo de Kimi, registra una especificación completa bajo `models:` con `cli: kimi` y referencia el modelo desde `agents:`:

La clave del registro debe tener la forma `owner/model` (el esquema `agents.<id>.model` rechaza los nombres simples) y `cli_model` es el alias exacto que se pasa a `kimi --model`; el alias de coding documentado por Kimi es `kimi-code/kimi-for-coding`. Confirma el alias que ofrece tu suscripción con `kimi --model <alias>` antes de guardarlo.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

Cada agente enrutado ejecuta `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Nota sobre workflows persistentes:** la ruta documentada de Kimi para bloquear Stop es el código de salida 2 / stderr, pero el enrutador `oma hook run` siempre sale con código 0 y emite un dialecto por stdout. oma emite un `permissionDecision: "deny"` de mejor esfuerzo (más `decision: "block"` al estilo de Claude) para que los workflows persistentes se degraden correctamente en Kimi.
