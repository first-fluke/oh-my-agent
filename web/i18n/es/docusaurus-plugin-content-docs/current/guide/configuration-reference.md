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

El cargador lee los valores predeterminados globales desde `$OMA_HOME/.agents/` (por defecto
`~/.oma/.agents/`), después sube desde el directorio actual y se detiene en
el directorio `.agents/` de proyecto más cercano. En cada directorio seleccionado:

1. `oma-config.yaml` aporta los valores compartidos.
2. `oma-config.cue`, cuando existe y es válido, sobrescribe cada clave que define; las claves YAML que no define se mantienen. Si el archivo CUE no se puede evaluar, OMA muestra una advertencia y usa solo el archivo YAML.
3. Un archivo local (`oma-config.local.cue` o `.local.yaml`) se combina sobre el resultado compartido.

El resultado compartido/local del proyecto sobrescribe el resultado compartido/local global.
`OMA_MODEL_PRESET`, cuando está definido, sobrescribe `model_preset` después de todas las capas de archivos.
El orden completo, un diagrama de flujo y la solución de problemas están en
[Carga de la configuración](/docs/guide/oma-config-semantics#precedence-table).

Los mapas se combinan recursivamente. Los arrays, escalares y `null` sustituyen el valor compartido. Mantener ambos formatos locales es un error. Un archivo local mal formado detiene la carga para evitar que una sobrecarga privada se ignore en silencio.

Las raíces de proyecto de distintos ancestros no se combinan. Un `.agents/` de proyecto
más cercano vacío sigue estableciendo ese límite. La instalación retirada de `~/.agents/`
es una entrada de migración y no se lee como fallback de proyecto. Los valores predeterminados globales no
cambian la identidad ni el ámbito de memoria del proyecto actual.

## Claves de nivel superior {#top-level-keys}

Las siguientes claves las lee el esquema del runtime actual o los consumidores incluidos con OMA. Una clave marcada como sparse es intencionadamente parcial: omite un valor anidado para conservar el valor predeterminado del código.

| Clave | Tipo o valores aceptados | Valor predeterminado si falta | Finalidad |
| --- | --- | --- | --- |
| `language` | string | `en` | Idioma de respuesta usado por los flujos de trabajo y las skills. La instalación conserva un valor existente o lo inicializa a partir del idioma del sistema sin preguntar. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` en la plantilla incluida | Selección de voz para `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` en la plantilla; omitirla no añade una sobrescritura explícita | Preferencia de formato de fecha. |
| `timezone` | nombre IANA | zona horaria del sistema | Fechas usadas por programaciones e informes. |
| `auto_update_cli` | boolean | `true` | Comprobaciones del CLI en segundo plano; desactívalas con `false`. |
| `telemetry` | boolean | `false` | Activación opt-in de la telemetría del proveedor usada por la reconciliación de install, update y link. |
| `model_preset` | string no vacío | `auto` en las plantillas nuevas | Preset de modelo integrado o personalizado. `OMA_MODEL_PRESET` lo sobrescribe para un proceso. |
| `free` | `base_url`, `api_key_env`, `model` | sin definir | Forma heredada de `providers.free` (allí `model` es `default_model`); se sigue leyendo, y `oma update` la traslada. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory`; secciones de credenciales `brave`, `exa`, `honcho`; cualquier otro `<name>` → objeto de proveedor LLM | `context7`, `native`, `serena`, `block`, `agentmemory`; sin credenciales ni proveedores LLM | Selecciona los proveedores de documentación, búsqueda, inteligencia de código y memoria semántica, guarda sus referencias de credenciales y declara endpoints LLM por los que se pueden enrutar los agentes. Consulta [Proveedores](#providers). |
| `brave`, `exa`, `honcho` | como bajo `providers` | sin definir | Formas heredadas de nivel superior de `providers.brave`, `providers.exa` y `providers.honcho`; se siguen leyendo, y `oma update` las traslada. |
| `agents` | ID de agente → `model`, `effort`, `thinking`, `memory` opcionales; `default` → `cli`, `effort`, `thinking`, `memory` | resolución del preset; `default.cli` recurre a `claude` (`codex` en una ruta de proveedor) | Sobrescrituras por agente aplicadas sobre el preset seleccionado. El nivel de esfuerzo es `none`, `low`, `medium`, `high` o `xhigh`; el tipo de memoria es `user`, `project` o `local`. `agents.default` rellena esos campos para cada rol que no define los suyos, y su `cli` (una de `claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) es el proveedor que se usa cuando nada más selecciona uno: un runtime no detectado con `auto`, o una ruta de proveedor después de `--vendor`, `OMA_RUNTIME_VENDOR` y el runtime detectado. Un modelo `<provider>/<model-id>` enruta el rol a través de ese proveedor LLM. |
| `models` | identificador de modelo → asignación de CLI | sin definir | Definiciones de modelo en línea para CLIs de proveedores compatibles. |
| `custom_presets` | preset → descripción, `extends` y `agent_defaults` opcionales | sin definir | Presets definidos por el usuario; `extends` puede heredar uno integrado. |
| `vendors` | `string[]` de IDs de proveedores seleccionados (YAML y CUE) | si falta: `oma link` usa todos los proveedores enlazables y `oma update` usa los proveedores cuyos directorios de proyecto existen | Selecciona qué integraciones proyectan `oma install` y `oma update`. El mapa de capacidades de despacho está en la configuración de orquestación gestionada; consulta [Selección de proveedores y metadatos de despacho](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | ID de proveedor | sin definir | Forma heredada de `agents.default.cli`; se sigue leyendo, y `oma update` la traslada. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | cada dimensión omitida queda sin límite | Uso de tokens registrado y límites de spawn comprobados antes del siguiente spawn de agente; consulta [Límites de cuota de sesión](#session-quota-caps). |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | automático en hosts de terminal compatibles, `false`, `1400` | Compara los diagnósticos de Serena antes y después de las ediciones nativas de archivos; consulta [Retroalimentación de diagnósticos](#diagnostic-feedback). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportamiento y exclusiones de escaneo de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transporte MCP y comportamiento de actualización de Serena. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` o `[]` | sin definir = deja intacta la configuración existente | Selección de MCP de DevTools del navegador durante la reconciliación. Una lista vacía explícita elimina las entradas seleccionadas. |
| `video` | mapa sparse propiedad de la skill | valor predeterminado de la skill; consulta [Generación de vídeo](/docs/guide/video-generation) | Enrutamiento de vídeo, orden de proveedores, salida, costos, límites y ajustes de actualización de HyperFrames. |
| `image` | mapa sparse propiedad de la skill | valor predeterminado de la skill; consulta [Generación de imágenes](/docs/guide/image-generation) | Proveedor de imágenes, tamaño, calidad, salida, comparación y costos. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto`; el resto de claves: valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Backend de voz (`auto`, `voicebox`, `voicestudio`; también lo usa la narración de `oma video`), perfil, salida y límites de longitud. |
| `hwp` | `format`, `version.*`, `output.*` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#extract-hwp-family-documents) | Formato de Kordoc, canal de versión y ubicación de salida. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#extract-pdf-content) | Extracción de PDF, OCR, imágenes y sobrescritura. |
| `scholar` | `base_url` | valor predeterminado de la skill; consulta [Flujos de contenido e investigación](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host del endpoint de Knows; la forma del protocolo sigue siendo propiedad de la skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | valor predeterminado de la skill; consulta [Motor de diagramas](/docs/guide/diagram-engine) | Selección de Mermaid o archify y ajustes de fijación y calidad de archify. Los retirados `archify.managed`, `archify.channel` y `archify.check_interval_min` se ignoran con un aviso, y `oma update` los elimina. |
| `market` | `path`, `python`, `save_dir` | valor predeterminado de la skill; consulta [Investigación de mercado](/docs/guide/market-research) | Fijación del motor last30days, intérprete y ubicación de resultados. Los retirados `managed`, `channel` y `check_interval_min` se ignoran con un aviso, y `oma update` los elimina. |

La plantilla incluida también contiene bloques gestionados por los consumidores. Sus claves y valores predeterminados actuales son:

| Bloque | Claves que lee el consumidor | Valor predeterminado | Efecto |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | conserva 100 sesiones; elimina artefactos de Serena con más de 50 días; `0` desactiva la limpieza por antigüedad | Valores predeterminados de `oma memory gc`; los flags del comando los sobrescriben. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Controla la ruta programada de limpieza de LSP de Serena. `oma serena reap` interactivo sigue siendo explícito; las ejecuciones silenciosas programadas son opcionales. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Activa el guard de presupuesto de líneas del stop-hook y define el presupuesto de código por archivo. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | la plantilla activa commits convencionales y protección del PR, e incluye sus listas de coautoría y nombres de archivo | Gobierna la skill SCM, el hook de commits y el guard de patrones secretos. Sustituye los valores de identidad de la plantilla por los tuyos antes de activar los trailers de coautor. |

Estos bloques se aceptan mediante el passthrough de configuración y los interpreta la funcionalidad o el flujo de trabajo correspondiente. El parser de `serena_reaper` lee solo las claves snake_case mostradas arriba e ignora camelCase. Las plantillas incluidas siguen mostrando camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), y el esquema CUE incluido rechaza las claves snake_case dentro de su bloque de esquema (`field not allowed`), así que defínelas en `oma-config.yaml` o en una sobrecarga YAML local. Lee la guía de la funcionalidad correspondiente antes de añadir claves anidadas; esta página no inventa claves fuera de los consumidores enumerados aquí.

## Objetos anidados exactos

### Proveedores {#providers}

`providers` selecciona un proveedor por capacidad:

| Clave | Valores aceptados | Valor predeterminado |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | ID de proveedor de búsqueda (letras minúsculas, dígitos, `_`, `-`), como `native` o `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

Tres claves reservadas guardan la sección de credenciales o de conexión de un selector: `providers.brave` y `providers.exa` (`api_key_env` o `api_key_vault`) para `web`, y `providers.honcho` para `semantic_memory` (consulta [Memoria semántica de Honcho](#honcho-semantic-memory)). Se siguen leyendo sus formas heredadas de nivel superior.

Cualquier otra clave bajo `providers` es un **proveedor LLM**: un endpoint compatible con OpenAI o Anthropic a través del cual `oma agent spawn` puede enrutar una CLI hija en lugar de la cuenta propia de esa CLI. El valor es un objeto:

| Campo | Valores aceptados | Obligatorio | Finalidad |
| --- | --- | --- | --- |
| `base_url` | URL HTTP(S) absoluta sin credenciales, consulta ni fragmento; se añade `/v1` si falta | sí | El endpoint. |
| `api_key_env` | nombre de variable de entorno | sí (excepto `free`, que usa por defecto `FREELLM_API_KEY`) | De dónde se lee la clave; el archivo nunca contiene la clave. `base_url` también es opcional solo para `free` (`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions` (predeterminado), `responses`, `anthropic_messages`, `multi` | no | El protocolo que habla el endpoint. Selecciona la CLI hija: `chat_completions` → Codex o Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi` (un gateway que sirve los tres) → Codex, Claude o Qwen. |
| `default_model` | ID de modelo | cuando el proveedor se usa como `model_preset` | El modelo que usa cada rol con `model_preset: <name>`. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` es el proveedor integrado para un gateway local de FreeLLMAPI: cada campo tiene un valor predeterminado, `FREELLM_BASE_URL` y `FREELLM_MODEL` sobrescriben el archivo, y se sigue leyendo el bloque heredado `free:` de nivel superior (aquí su `model` es `default_model`); consulta [Proveedores LLM personalizados](/docs/guide/per-agent-models#custom-llm-providers).

`code_intelligence_guard` controla el guard de búsqueda de PreToolUse. Las búsquedas nativas limitadas a exclusiones confirmadas del proveedor o a rutas fuera del proyecto se permiten sin necesidad de omitir el guard. El guard lee las exclusiones de Serena y las reglas de gitignore habilitadas, o el listado de exclusiones de Gortex; no infiere dependencias a partir de los nombres de directorio.

El hook no nombra `OMA_CI_ALLOW_NATIVE`. Una búsqueda de shell con el prefijo `OMA_CI_ALLOW_NATIVE=1` omite el guard solo para recursos fuera del proyecto o rutas ignoradas que el guard no reconoció, no para el código fuente del proyecto.

### Memoria semántica de Honcho {#honcho-semantic-memory}

El mapa `providers.honcho` (la forma heredada de nivel superior `honcho`, que se sigue leyendo) se valida mediante `HonchoConfigSchema`. Los nombres de las claves y el comportamiento efectivo del runtime son:

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

`session.quota_cap` es un mapa parcial. Todos los campos son opcionales; un campo omitido deja esa dimensión sin límite. Los valores deben ser enteros no negativos escritos sin separadores `_` (YAML lee `2_000_000` como un string, lo que deja esa dimensión sin límite). `per_vendor` asigna IDs de proveedor de despacho como `claude`, `codex` o `antigravity` a presupuestos de tokens:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

El cargador de límites revisa la capa CUE del usuario, después la capa YAML del usuario y finalmente el fallback de valores predeterminados incluido. Antes de un spawn, OMA comprueba `spawn_count`, el total de `tokens` y `per_vendor`, en ese orden. Se alcanza un límite cuando el uso es mayor o igual que el límite; OMA bloquea el siguiente spawn e informa de la dimensión que ganó.

OMA reserva una estimación de tokens de entrada cuando empieza una ejecución. Cuando hay una transcripción nativa compatible después de la ejecución, el uso registrado de entrada, caché y salida sustituye esa estimación sin contar otro spawn. Si no, el registro permanece estimado de forma explícita a partir de la longitud del prompt. El uso observado de la sesión raíz se marca como parcial cuando los subagentes nativos quedan fuera del alcance de la captura. Los límites de tokens dependen, por tanto, de las observaciones disponibles; no interrumpen a un hijo que ya está en ejecución ni garantizan un límite de facturación. `spawn_count` es el límite más predecible.

### Presupuesto de ejecución de sesión {#session-execution-budget}

Define `session.execution` para acotar el tiempo transcurrido del despacho de CLI gestionado por OMA y de la verificación. Usa un `timeout_seconds` positivo o un `deadline` ISO 8601 con zona horaria:

```yaml
session:
  execution:
    timeout_seconds: 1800
```

Los comandos `oma agent spawn`, `parallel`, `review`, `resume`, `begin` y `verify` aceptan `--timeout-seconds` o `--deadline`. La preparación, la ejecución, los reintentos y las comprobaciones comparten un deadline absoluto. Gana el deadline configurado, heredado o persistido más temprano; los reintentos y la reanudación no reinician el reloj. Omite `session.execution` y ambos flags para dejar esta dimensión sin límite, salvo que el proceso principal haya aportado un deadline.

El historial de ejecución se conserva en `.agents/state/executions/`. Una cancelación o un tiempo agotado bloquea la ejecución posterior de esa sesión y registra el motivo de la parada. Estos controles cubren los procesos lanzados por la ruta de CLI gestionada. Los agentes nativos del proveedor y los trabajos de shell arbitrarios necesitan el mecanismo de cancelación de su host; los límites de CPU, RAM y almacenamiento requieren soporte del proveedor.

Las CLI hijas gestionadas heredan `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE` y `OMA_EXECUTION_ID`. La ruta de estado y el ID de ejecución forman una referencia de herencia acotada; un libro mayor ajeno, mal formado o que no coincide se rechaza antes de escribir. Reenvía el entorno heredado completo al envolver un hijo de OMA. Definir estas variables no añade la aplicación del deadline a un programa que no tenga relación.

Al cancelar, OMA detiene la admisión e intenta una terminación acotada del cómputo que posee. Conserva los logs, los resultados, los worktrees y los metadatos de recursos registrados. Borrar artefactos o recursos externos exige una petición o una política de retención explícita. Una terminación que no tiene éxito permanece visible, en lugar de informarse como una limpieza completa.

### Retroalimentación de diagnósticos {#diagnostic-feedback}

En los hosts de terminal compatibles, OMA compara los errores y las advertencias antes y después de las ediciones nativas de archivos e inyecta los diagnósticos nuevos en la siguiente retroalimentación de herramienta. Usa un daemon HTTP de Serena que ya esté en ejecución y coincida con el proyecto cuando Serena es el proveedor efectivo de inteligencia de código (el predeterminado cuando no se especifica ningún proveedor). Nunca inicia un daemon ni ejecuta un build. Las ediciones simbólicas propias de Serena se excluyen porque ya aportan diagnósticos.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

Define `enabled: false` para desactivar esta retroalimentación. Define `host_diagnostics: true` cuando el host ya aporta diagnósticos de edición; Cursor y Antigravity se omiten automáticamente. Las sobrescrituras locales del proyecto siguen las capas normales de configuración. Las sobrescrituras de entorno son `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS` y `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`.

El tiempo de espera cubre cada hook completo previo o posterior a la edición y se limita a 100–10.000 milisegundos. Los proveedores lentos pueden usar un tiempo mayor. Una consulta fallida o que agota el tiempo omite la retroalimentación e inicia un enfriamiento breve; no cuenta como un resultado de diagnóstico limpio. Las líneas base previas a la edición ausentes o obsoletas también omiten la retroalimentación. Cada hook comprueba como máximo tres archivos e informa como máximo de ocho errores o advertencias nuevos.

### Selección de proveedores y metadatos de despacho {#vendor-selection-and-dispatch-metadata}

En el `.agents/oma-config.yaml` propiedad del usuario, `vendors` es una lista de IDs de integración seleccionados:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Una lista selecciona exactamente esos proveedores, y `vendors: []` no selecciona ninguno. Sin la clave `vendors`, `oma link` apunta a todos los proveedores del registro de proveedores enlazables de OMA, mientras que `oma update` apunta solo a los proveedores cuyos directorios de proyecto ya existen. La lista controla las proyecciones de instalación/actualización; no es el mapa de capacidades de comandos por proveedor.

El esquema `.agents/oma-config.cue` incluido tipa `vendors` como la misma lista (`[...string]`). Las plantillas CUE anteriores lo tipaban como un objeto `vendors.pi` (`#VendorsConfig`) que nada lee: el despacho de agentes resuelve sus campos de capacidad desde el registro de orquestación gestionado que aparece abajo. Si tu `oma-config.cue` aún declara `vendors?: #VendorsConfig`, cámbialo a `vendors?: [...string]` antes de poner ahí una lista de selección.

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

Elige un preset fijo para un proyecto mientras mantienes local una sobrescritura personal.

**Archivo compartido** (incluido en el commit):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Sobrecarga local** (ignorada por Git):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
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

## Reglas de actualización y propiedad {#update-and-ownership-rules}

`.agents/oma-config.yaml` pertenece al usuario. `oma update` conserva el contenido existente y puede añadir nuevas claves de nivel superior de la plantilla bajo un marcador `# Added by oma update`. `oma update --force` puede sustituir la configuración del usuario, la configuración MCP y los directorios de stack; úsalo solo cuando pretendas restablecer esas personalizaciones. Los archivos de sobrecarga local siguen siendo el lugar privado para valores específicos de la máquina.

No pongas claves API en este archivo. Usa campos `api_key_env` o `api_key_vault` y conserva la credencial real en el almacén de secretos o entorno referenciado.

Para los detalles de resolución de modelos, consulta [Configuración de modelos por agente](/docs/guide/per-agent-models). Para la semántica de capas y el comportamiento ante errores, consulta [Semántica de oma-config](/docs/guide/oma-config-semantics).
