---
title: Valores predeterminados importantes
description: Los valores predeterminados de oh-my-agent que afectan al enrutamiento, la selección de modelos, los proveedores, las actualizaciones, la telemetría, el MCP del navegador, el transporte de Serena y la recuperación de flujos de trabajo.
---

# Valores predeterminados importantes

Los valores predeterminados están pensados para que el primer proyecto sea utilizable y, a la vez, mantener estables las configuraciones propiedad del usuario. Se resuelven en tiempo de ejecución, por lo que una clave omitida puede comportarse de forma distinta de un valor vacío explícito. Empieza aquí cuando el harness funciona, pero se comporta de forma distinta de lo esperado.

## Valores que afectan a la primera ejecución

| Área | Valor predeterminado | Consecuencia | Sobrescritura |
|---|---|---|---|
| Idioma de respuesta | `en` | Las respuestas de los agentes y los flujos de trabajo usan inglés, salvo que la configuración del proyecto seleccione otro idioma compatible. Una instrucción explícita del usuario o de la sesión aún puede sobrescribir el valor predeterminado del proyecto cuando el host o el flujo de trabajo lo admite. | `language` en `.agents/oma-config.yaml` o `.cue` |
| Enrutamiento de modelos | `auto` | Se usa la configuración nativa de agentes del runtime actual. Los runtimes desconocidos recurren a `default_cli` cuando está definido. | `model_preset`, `default_cli` o `agents.<id>` |
| Inteligencia de código | `serena` | Una instalación nueva intenta instalar Serena y configura su MCP. | `providers.code_intelligence: gortex` o `serena` |
| Guard de búsqueda de código | `block` | Mientras haya un proveedor de inteligencia de código configurado, un hook PreToolUse deniega `Grep`/`Glob` nativos y la búsqueda recursiva en shell (`rg`, `grep -r`, `find -name`), y dirige al agente a las herramientas del proveedor. Se permiten las búsquedas limitadas a exclusiones confirmadas o a rutas fuera del proyecto. El hook no anuncia ninguna forma de omitirlo para el código fuente del proyecto. | `providers.code_intelligence_guard: off` |
| Memoria semántica | `agentmemory` | Agent Memory se selecciona para la memoria semántica cuando está disponible. | `providers.semantic_memory: honcho` o `none` |
| Búsqueda web | `native` | La búsqueda usa el canal web nativo del runtime, salvo que se seleccione un proveedor. | `providers.web` |
| Proveedor de documentación | `context7` | Las consultas de documentación usan Context7 cuando una skill lo solicita. | `providers.docs` |
| Telemetría | desactivada | OMA escribe la configuración de exclusión del proveedor durante el enlazado. | `telemetry: true` |
| Actualización automática del CLI | activada | El CLI busca actualizaciones, salvo que se desactive. | `auto_update_cli: false` |
| Formato de fecha | `ISO` | Las fechas usan el formato ISO cuando el proyecto no define otro formato. | `date_format: US` o `EU` |
| Zona horaria | zona horaria del sistema | Las horas programadas y mostradas siguen al host cuando se omite `timezone`. | `timezone: Australia/Sydney` (u otro nombre IANA) |
| Transporte de Serena | `bridge` | Las sesiones comparten un servidor Serena por proyecto; si el bridge no está disponible, se usa stdio local de la sesión. | `serena.mode: stdio` |
| Actualización automática de Serena | activada | `oma update` actualiza la herramienta local de Serena cuando es posible. | `serena.auto_update: false` |
| MCP de DevTools del navegador | sin definir | Se conservan las entradas de navegador existentes; una instalación interactiva nueva ofrece `aside`. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` o `[]` |
| Serena Reaper | ruta programada desactivada | `serena_reaper.enabled: false` mantiene desactivada la limpieza periódica. `oma serena reap` interactivo sigue funcionando. | `serena_reaper.enabled: true` y `oma serena reaper enable` |

Los nombres y valores predeterminados de los proveedores proceden de los cargadores del runtime y de las preguntas del instalador. El archivo de configuración generado por el instalador incluye comentarios sobre las secciones disponibles; usa esos comentarios como guía del esquema para esa versión.

## Precedencia de configuración

OMA busca hacia arriba desde el directorio de trabajo actual el directorio `.agents/` más cercano. Lee `oma-config.cue` cuando existe y recurre a `oma-config.yaml` si falla la evaluación de CUE compartida. Una sobrecarga local del proyecto, `oma-config.local.cue` o `oma-config.local.yaml`, se combina con la configuración compartida y prevalece sobre ella; conserva solo una sobrecarga local. `OMA_MODEL_PRESET` puede sobrescribir `model_preset` para un proceso. Una configuración local no válida detiene la carga en vez de seleccionar otro valor en silencio.

El enrutamiento de modelos tiene dos casos especiales antes del orden de presets fijos:

- Con `model_preset: auto`, se usa la configuración nativa de agente o modelo del runtime actual. Las sobrescrituras explícitas de `agents.<id>` siguen teniendo prioridad; un runtime desconocido puede usar `default_cli`.
- Con `model_preset: free`, los hijos usan el gateway local de FreeLLMAPI. `free.model` selecciona el modelo del gateway y reemplaza las asignaciones de modelo por agente; si se omite, se usa `FREELLM_MODEL` o el fallback del proveedor `auto`.

Para un preset fijo o personalizado, el orden efectivo es:

1. La sobrescritura explícita `agents.<id>`.
2. La entrada coincidente de `model_preset`, integrada o en `custom_presets`.
3. La entrada `orchestrator` del preset cuando un rol no tiene entrada propia.
4. `default_cli` como fallback del proveedor cuando los niveles anteriores no resuelven un plan.

El preset `free` proporciona valores predeterminados para los tres ajustes del proveedor: `base_url` es `http://127.0.0.1:31415/v1`, `api_key_env` es `FREELLM_API_KEY` (se acepta `FREELLMAPI_API_KEY` como alias de compatibilidad) y `model` es `auto`. Aun así, se necesita una clave API utilizable en la variable de entorno seleccionada; no existe un fallback de proveedor. Define estos valores en `oma-config.local.yaml` cuando deban permanecer locales a la máquina, o usa `FREELLM_BASE_URL` y `FREELLM_MODEL` para sobrescrituras por proceso.

## Valores con consecuencias inesperadas

Omitir la clave `mcp.devtools_browsers` significa «dejar intactas las entradas actuales del navegador». Una lista vacía explícita elimina las entradas del navegador durante la reconciliación. Los procesos MCP del navegador se ejecutan por sesión de agente, así que actívalos solo cuando la tarea controle un navegador.

El modo `bridge` predeterminado de Serena reduce los procesos duplicados del servidor de lenguaje cuando varios agentes trabajan en un proyecto. `stdio` es la opción de recuperación cuando no se puede iniciar un bridge local o se necesita un aislamiento estricto de procesos. Serena repara sus hijos del servidor de lenguaje en la siguiente llamada a una herramienta; el reaper de memoria es independiente y no hace falta activarlo para el uso normal.

La telemetría está excluida por defecto. Definir `telemetry: true` elimina las entradas de exclusión del proveedor de OMA en el siguiente enlazado o actualización, lo que puede volver a activar funciones del proveedor que dependen de la telemetría. Este ajuste controla los cambios de integración del proveedor; no cambia los archivos de costo de sesión que OMA escribe para su propia contabilidad.

## Rutas de recuperación

| Síntoma | Primera comprobación | Recuperación |
|---|---|---|
| Los archivos del proveedor están desactualizados | `oma doctor` y `oma link --dry-run` | Ejecuta `oma link <vendor>` después de editar `.agents/`; conserva el SSOT como fuente. |
| No se acepta un modelo | `oma doctor --profile` | Cambia a `auto`, usa un preset integrado o define un identificador de modelo bajo `models:`. |
| Las herramientas de Serena agotan el tiempo | `oma doctor` y la sección del proveedor | Prueba `serena.mode: stdio`; si el problema es la memoria, previsualiza con `oma serena reap --dry-run`. |
| Un flujo de trabajo persistente no se detiene | `.agents/state/*-state.json` | Di `workflow done`; inspecciona el archivo de estado solo si el flujo no se limpió. |
| Un reaper programado no hace nada | La sección Serena Reaper de `oma doctor` | Define `serena_reaper.enabled: true` y ejecuta `oma serena reaper enable`. |
| La configuración local impide iniciar | La ruta del error de `oma doctor` | Corrige o elimina la sobrecarga local; no crees sobrecargas `.cue` y `.yaml` a la vez. |

Continúa con [Instalación](./installation.md), [Modelos por agente](../guide/per-agent-models.md) o [Semántica de la configuración de OMA](../guide/oma-config-semantics.md).
