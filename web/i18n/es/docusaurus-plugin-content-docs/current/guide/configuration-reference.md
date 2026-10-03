---
title: "Guía: Referencia de configuración"
sidebar_label: Referencia de configuración
description: Ubicaciones de configuración compatibles con OMA, precedencia, claves tipadas, valores predeterminados y reglas de propiedad durante las actualizaciones.
---

# Referencia de configuración

OMA lee la configuración desde `.agents/oma-config.cue` o `.agents/oma-config.yaml`. Una sobrecarga local, `.agents/oma-config.local.cue` o `.agents/oma-config.local.yaml`, sirve para ajustes específicos de la máquina que no deben entrar en el archivo compartido.

Ejecuta esto desde el proyecto cuya configuración quieres inspeccionar:

```bash
oma doctor --profile
```

El resultado esperado es un perfil resuelto que muestra el preset seleccionado y el plan de modelos por agente. Si el comando informa de un error de análisis, corrige la capa de configuración más cercana antes de cambiar los ajustes del modelo.

## Qué archivo gana

El cargador sube desde el directorio actual y se detiene en el directorio `.agents/` más cercano que contenga una configuración compartida o local. En ese directorio:

1. Se evalúa primero `oma-config.cue`.
2. `oma-config.yaml` se usa cuando falta el archivo CUE compartido o no se puede evaluar.
3. Un archivo local (`oma-config.local.cue` o `.local.yaml`) se combina sobre el archivo compartido.
4. `OMA_MODEL_PRESET`, cuando está definido, sobrescribe `model_preset` para ese proceso.

Los mapas se combinan recursivamente. Los arrays, escalares y `null` sustituyen el valor compartido. Mantener ambos formatos locales es un error. Un archivo local mal formado detiene la carga para evitar que una sobrecarga privada se ignore en silencio.

Esta es una regla de capa más cercana, no una combinación general entre proyecto y HOME. Una instalación global lee `~/.agents/oma-config.*` porque HOME es su raíz de instalación. Un comando de proyecto lee la capa de proyecto más cercana. La comprobación de actualización de `auto_update_cli` es la excepción: revisa el proyecto, después HOME y finalmente usa el valor predeterminado activado.

## Claves de nivel superior

Las siguientes claves las lee el esquema del runtime actual o los consumidores incluidos con OMA. Una clave marcada como sparse es intencionadamente parcial: omite un valor anidado para conservar el valor predeterminado del código.

| Clave | Tipo o valores aceptados | Valor predeterminado si falta | Finalidad |
| --- | --- | --- | --- |
| `language` | string | `en` | Idioma de respuesta usado por los flujos de trabajo y las skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` en la plantilla incluida | Selección de voz para `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` en la plantilla; omitirla no añade una sobrescritura explícita | Preferencia de formato de fecha. |
| `timezone` | nombre IANA | zona horaria del sistema | Fechas usadas por programaciones e informes. |
| `auto_update_cli` | boolean | `true` | Comprobaciones del CLI en segundo plano; desactívalas con `false`. |
| `telemetry` | boolean | `false` | Activación de telemetría del proveedor usada por install, update y link. |
| `model_preset` | string no vacío | `auto` en las plantillas nuevas | Preset de modelo integrado o personalizado. `OMA_MODEL_PRESET` lo sobrescribe para un proceso. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Ajustes de FreeLLMAPI cuando el preset es `free`; `FREELLM_BASE_URL` y `FREELLM_MODEL` sobrescriben los valores del archivo, y el nombre de la clave nunca contiene el secreto. Consulta [Configuración de modelos por agente](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Selecciona los proveedores de documentación, búsqueda, inteligencia de código y memoria semántica. La inteligencia de código acepta `serena` o `gortex`; la memoria semántica acepta `agentmemory`, `honcho` o `none`. `code_intelligence_guard` (`block` u `off`) controla el guard de búsqueda de PreToolUse. Las búsquedas nativas limitadas a exclusiones confirmadas del proveedor o a rutas fuera del proyecto se permiten sin necesidad de omitir el guard. El guard lee las exclusiones de Serena y las reglas de gitignore habilitadas, o el listado de exclusiones de Gortex; no infiere dependencias a partir de los nombres de directorio. El hook no nombra `OMA_CI_ALLOW_NATIVE`. Una búsqueda de shell con el prefijo `OMA_CI_ALLOW_NATIVE=1` omite el guard solo para recursos fuera del proyecto o rutas ignoradas que el guard no reconoció, no para el código fuente del proyecto. |
| `brave` | `api_key_env` o `api_key_vault` | sin definir | Referencia de credenciales de búsqueda de Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Consulta [Detalles de Honcho](#honcho-semantic-memory) | Ajustes de conexión de la memoria semántica de Honcho. |
| `agents` | ID de agente → `model`, `effort`, `thinking`, `memory` opcionales | resolución del preset | Sobrescrituras por agente aplicadas sobre el preset seleccionado. El nivel de esfuerzo es `none`, `low`, `medium`, `high` o `xhigh`; el tipo de memoria es `user`, `project` o `local`. |
| `models` | identificador de modelo → asignación de CLI | sin definir | Definiciones de modelo en línea para CLIs de proveedores compatibles. |
| `custom_presets` | preset → descripción, `extends` y `agent_defaults` opcionales | sin definir | Presets definidos por el usuario; `extends` puede heredar uno integrado. |
| `vendors` | YAML: `string[]` de IDs de proveedores seleccionados; plantilla CUE: mapa opcional de fallback `vendors.pi` | todos los proveedores enlazables para la lista YAML | Selecciona qué integraciones proyectan `oma install` y `oma update` en YAML. El mapa de capacidades de despacho está en la configuración de orquestación gestionada; consulta [Selección de proveedores y metadatos de despacho](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | fallback del consumidor | Fallback antiguo solo de proveedor cuando no se resuelve ningún plan de modelos. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | cada dimensión omitida queda sin límite | Límites estrictos de tokens y spawns comprobados antes del siguiente spawn; consulta [Límites de cuota de sesión](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportamiento y exclusiones de escaneo de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transporte MCP y comportamiento de actualización de Serena. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` o `[]` | sin definir = deja intacta la configuración existente | Selección de MCP de DevTools del navegador durante la reconciliación. Una lista vacía explícita elimina las entradas seleccionadas. |
| `video` | mapa sparse propiedad de la skill | valor predeterminado de la skill; consulta [Generación de vídeo](/docs/guide/video-generation) | Enrutamiento de vídeo, orden de proveedores, salida, costos, límites y ajustes de actualización de HyperFrames. |
| `image` | mapa sparse propiedad de la skill | valor predeterminado de la skill; consulta [Generación de imágenes](/docs/guide/image-generation) | Proveedor de imágenes, tamaño, calidad, salida, comparación y costos. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Perfil, salida y límites de longitud de Voicebox. |
| `hwp` | `format`, `version.*`, `output.*` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#extract-hwp-family-documents) | Formato de Kordoc, canal de versión y ubicación de salida. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#extract-pdf-content) | Extracción de PDF, OCR, imágenes y sobrescritura. |
| `scholar` | `base_url` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host del endpoint de Knows; la forma del protocolo sigue siendo propiedad de la skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | valor predeterminado de la skill; consulta [Motor de diagramas](/docs/guide/diagram-engine) | Selección de Mermaid o archify y ajustes del motor gestionado. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | valor predeterminado de la skill; consulta [Investigación de mercado](/docs/guide/market-research) | Resolución del motor last30days gestionado y ubicación de resultados. |

La plantilla incluida también contiene bloques gestionados por los consumidores. Sus claves y valores predeterminados actuales son:

| Bloque | Claves que lee el consumidor | Valor predeterminado | Efecto |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | conserva 100 sesiones; elimina artefactos de Serena con más de 50 días; `0` desactiva la limpieza por antigüedad | Valores predeterminados de `oma memory gc`; los flags del comando los sobrescriben. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Controla la ruta programada de limpieza de LSP de Serena. `oma serena reap` interactivo sigue siendo explícito; las ejecuciones silenciosas programadas son opcionales. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Activa el guard de presupuesto de líneas del stop-hook y define el presupuesto de código por archivo. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | la plantilla activa commits convencionales y protección del PR, e incluye sus listas de coautoría y nombres de archivo | Gobierna la skill SCM, el hook de commits y el guard de patrones secretos. Sustituye los valores de identidad de la plantilla por los tuyos antes de activar los trailers de coautor. |

Estos bloques se aceptan mediante el passthrough de configuración y los interpreta la funcionalidad o el flujo de trabajo correspondiente. El parser de `serena_reaper` lee las claves snake_case mostradas arriba, aunque los comentarios de plantillas antiguas usaban nombres camelCase. Lee la guía de la funcionalidad correspondiente antes de añadir claves anidadas; esta página no inventa claves fuera de los consumidores enumerados aquí.

## Objetos anidados exactos

### Memoria semántica de Honcho {#honcho-semantic-memory}

El mapa `honcho` se valida mediante `HonchoConfigSchema`. Los nombres de las claves y el comportamiento efectivo del runtime son:

| Clave | Forma | Valor predeterminado o restricción efectiva |
| --- | --- | --- |
| `base_url` | string de URL | `https://api.honcho.dev`; se exige HTTPS salvo HTTP de loopback. Se rechazan credenciales, cadenas de consulta y fragmentos. |
| `workspace_id` | 1–128 letras, dígitos, `_` o `-` | Obligatorio cuando se inicia el proveedor. El instalador interactivo usa `oma` si no existe un valor guardado. |
| `project_id` | string recortado de 1–128 caracteres | Omitirlo significa la raíz del proyecto OMA actual. |
| `api_key_env` | nombre de variable de entorno | `HONCHO_API_KEY`. Un endpoint que no sea de loopback necesita esta variable o `api_key_vault`. |
| `api_key_vault` | nombre de clave del vault (`A-Z`, `a-z`, dígitos, `.`, `_`, `-`; 1–64 caracteres) | Omitirlo significa que no se consulta el vault. Si existen ambas referencias, se usa primero el valor del entorno. |
| `timeout_ms` | entero `100`–`30000` | `5000` milisegundos. El mismo plazo cubre una petición de estado o memoria. |
| `max_results` | entero `1`–`50` | `8` resultados de recuperación. |
| `max_tokens` | entero `128`–`16000` | `2000` bytes UTF-8 para el contenido recuperado y el contexto inferido. |
| `recall_mode` | `messages` o `hybrid` | El instalador escribe `messages` para una selección nueva. Omitirlo activa la petición de representación del proveedor además de la recuperación de mensajes. |

Por ejemplo, un workspace remoto puede usar una referencia a un secreto sin ponerlo en YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

El instalador usa `http://127.0.0.1:8000` como URL inicial al configurar Honcho de forma interactiva o no interactiva sin una URL guardada. Esa semilla del instalador es independiente del fallback de runtime del proveedor descrito arriba. Usa `oma memory status` después de seleccionar el proveedor; la ausencia de un workspace o de credenciales se informa como no disponible en vez de cambiar silenciosamente a otro proveedor de memoria.

### Límites de cuota de sesión {#session-quota-caps}

`session.quota_cap` es un mapa parcial. Todos los campos son opcionales; un campo omitido deja esa dimensión sin límite. Los valores deben ser enteros no negativos y `per_vendor` asigna nombres de proveedor a presupuestos de tokens:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

El cargador de límites revisa la capa CUE del usuario, después la capa YAML del usuario y finalmente el fallback de valores predeterminados incluido. Antes de un spawn, OMA comprueba `spawn_count`, el total de `tokens` y `per_vendor`, en ese orden. Se alcanza un límite cuando el uso es mayor o igual que el límite; OMA bloquea el siguiente spawn e informa de la dimensión que ganó. El uso es contabilidad de tokens, no una estimación de facturación.

### Selección de proveedores y metadatos de despacho {#vendor-selection-and-dispatch-metadata}

En el `.agents/oma-config.yaml` propiedad del usuario, `vendors` es una lista de IDs de integración seleccionados:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Una lista ausente o vacía selecciona todos los IDs del registro de proveedores enlazables de OMA. La lista controla las proyecciones de instalación/actualización; no es el mapa de capacidades de comandos por proveedor.

El esquema `.agents/oma-config.cue` incluido también permite un objeto `vendors.pi` con los campos `command`, `prompt_flag`, `model_flag`, `default_model` y `thinking_flag`. Ese bloque es una forma de fallback tipada en la plantilla CUE; la ruta actual de despacho de agentes resuelve sus campos de capacidad desde el registro de orquestación gestionado que aparece abajo, así que no uses `vendors.pi` como sustituto de la lista de selección YAML.

El archivo gestionado `.agents/skills/oma-orchestration/config/cli-config.yaml` contiene ese mapa de capacidades. Cada entrada `vendors.<id>` admite estos campos:

| Campo | Forma | Uso |
| --- | --- | --- |
| `command` | string ejecutable | Binario que se ejecuta. |
| `subcommand` | string | Subcomando insertado antes de las opciones, como `codex exec`. |
| `prompt_flag` | string, o `none`/`null` para desactivar | Flag asociado al prompt; se usa un prompt posicional cuando está desactivado. |
| `auto_approve_flag` | string | Flag del proveedor para omitir permisos en ejecuciones modificables. Se suprime en modo de solo lectura. |
| `read_only_flag` | string | Flag de solo lectura del proveedor. Si falta, el generador usa el fallback específico del proveedor o muestra una advertencia. |
| `output_format_flag` | string | Flag que selecciona la salida legible por máquinas. |
| `output_format` | string | Valor asociado a `output_format_flag`. |
| `model_flag` | string | Flag asociado a `default_model`. |
| `default_model` | string | Valor de modelo usado cuando un plan resuelto no proporciona uno. |
| `isolation_env` | string `NAME=value` | Asignación de entorno opcional; se rechazan claves inseguras de cargador o intérprete y `$$` se expande al ID del proceso actual. |
| `isolation_flags` | string de argumentos estilo shell | Argumentos de aislamiento adicionales separados en tokens argv. |

El archivo de capacidades gestionado se regenera con las actualizaciones de OMA. Edita las claves `agents`, `models` y `custom_presets` propiedad del usuario para seleccionar modelos; usa este mapa de capacidades solo al mantener los datos de orquestación gestionados o depurar un adaptador de proveedor. El objeto `vendors.pi` comentado en plantillas antiguas son metadatos de fallback y no sustituyen la lista de proveedores seleccionados ni el registro de despacho gestionado.

## Cambios habituales

Elige un preset fijo para un proyecto mientras mantienes local una sobrescritura personal:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Selecciona explícitamente los proveedores de inteligencia de código y memoria:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Mantén la configuración del navegador sin cambios durante las actualizaciones o elimínala deliberadamente:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Reglas de actualización y propiedad

`.agents/oma-config.yaml` pertenece al usuario. `oma update` conserva el contenido existente y puede añadir nuevas claves de nivel superior de la plantilla bajo un marcador `# Added by oma update`. `oma update --force` puede sustituir la configuración del usuario, la configuración MCP y los directorios de stack; úsalo solo cuando pretendas restablecer esas personalizaciones. Los archivos de sobrecarga local siguen siendo el lugar privado para valores específicos de la máquina.

No pongas claves API en este archivo. Usa campos `api_key_env` o `api_key_vault` y conserva la credencial real en el almacén de secretos o entorno referenciado.

Para los detalles de resolución de modelos, consulta [Configuración de modelos por agente](/docs/guide/per-agent-models). Para la semántica de capas y el comportamiento ante errores, consulta [Semántica de oma-config](/docs/guide/oma-config-semantics).
