---
title: "Guía: Semántica de oma-config.yaml"
sidebar_label: Carga de configuración
description: Cómo selecciona OMA las capas de configuración de CUE y YAML, aplica las sobrescrituras locales y resuelve los pocos fallbacks dependientes del contexto de instalación. Consulta la referencia de configuración para conocer las claves admitidas y sus valores predeterminados.
---

## Visión general

La configuración se selecciona en el directorio `.agents/` más cercano, recorriendo los directorios desde el directorio de trabajo actual hacia arriba:

- **Compartida**: `.agents/oma-config.cue` o `.agents/oma-config.yaml` cuando CUE no está disponible o no se puede evaluar.
- **Local**: `.agents/oma-config.local.cue` o `.agents/oma-config.local.yaml` (un solo archivo, aplicado sobre el archivo compartido; mantenlo privado).

Para las consultas normales del runtime, OMA no combina un archivo de proyecto con `~/.agents/oma-config.*`. Una instalación global lee el archivo del HOME porque su raíz de instalación es HOME; un comando de proyecto lee la capa de proyecto más cercana. `auto_update_cli` es la excepción deliberada: su comprobación de actualización consulta primero la configuración del proyecto, después la del HOME y, por último, usa `true` como valor predeterminado. Consulta la [referencia de configuración](/docs/guide/configuration-reference) para ver el modelo completo.

## Tabla de precedencia

| Clave | Regla efectiva | Notas |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Máxima | Un valor de entorno no vacío sustituye a `model_preset` para ese proceso. |
| Archivo local | Se aplica sobre el compartido | Los mapas normales se combinan de forma recursiva; los arrays, escalares y `null` sustituyen al valor compartido. No pueden existir los dos formatos de archivo local a la vez. |
| CUE compartido | Preferido | Si CUE no existe o falla, el cargador intenta usar el archivo YAML compartido. Un error en CUE local es fatal. |
| YAML compartido | Fallback | Se usa cuando no se selecciona ningún archivo CUE compartido utilizable. |
| `auto_update_cli` | Proyecto, después HOME y luego `true` | Este fallback específico de las actualizaciones está implementado en `resolveAutoUpdateCli`; no es una capa global general. |

Para una sobrescritura local del proyecto, incluye solo las hojas que cambian en el archivo local. Por ejemplo, puedes mantener fuera del archivo compartido una elección local de modelo:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Ejecuta el comando desde el proyecto para que se seleccione el directorio `.agents/` más cercano. Si el archivo local está mal formado, la operación falla de forma explícita; corrígelo o elimínalo antes de volver a intentarlo.

## Valores predeterminados

| Clave | Valor predeterminado | Cuándo se aplica |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Faltan ambos archivos o falta la clave |
| `serena.mode` | `bridge` | Faltan ambos archivos o falta la clave |
| `serena.auto_update` | `true` | Faltan ambos archivos o falta la clave |
| `telemetry` | `false` | Faltan ambos archivos o falta la clave |
| `language` | `en` | Faltan ambos archivos o falta la clave |
| `model_preset` | Obligatorio | La plantilla de proyecto distribuida usa `auto`; el esquema exige un valor no vacío. |
| `translation_voice` | `balanced` | Faltan ambos archivos o falta la clave |
| `timezone` | Zona horaria del sistema | Faltan ambos archivos o falta la clave |

## Motivo del orden de lectura

La regla de la capa más cercana mantiene la configuración del proyecto autocontenida. Si quieres una línea base para todo el usuario, instala globalmente y edita `~/.agents/oma-config.yaml`; las instalaciones de proyecto aún pueden definir su propia capa más cercana.

## Notas

- `language` en `oma-config.yaml` controla el idioma de las respuestas del agente. **No** se usa para determinar los mensajes de advertencia de instalación o actualización: estos usan la locale del sistema (`$LANG`) porque `oma-config.yaml` todavía no se ha cargado al instalar.
- La precedencia de `auto_update_cli` está implementada explícitamente en el comando de actualización. Cuando coexisten una instalación de proyecto y una global, se consulta primero el valor del proyecto y después el del HOME.
- `telemetry` (valor predeterminado `false`) se asigna a la exclusión de telemetría propia de cada proveedor, escrita por `oma install` / `oma update` / `oma link`: Claude `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` + `feedback.enabled`, Grok `[features] telemetry` y Antigravity (agy) `enableTelemetry` en `~/.gemini/antigravity-cli/settings.json`. Establecer `telemetry: true` vuelve a aceptar la telemetría al eliminar la exclusión de oma para ese proveedor.
- `diagram` (motores `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) es una sección dispersa de sobrescritura de skills, como `video` / `image`; consulta [Diagram Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` limita la frecuencia de las comprobaciones de la última versión de la toolchain de HyperFrames por ejecución y de heygen-com/hyperframes (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) configura el motor siempre actualizado `last30days` que utiliza `oma market`; consulta [Market Research](/docs/guide/market-research).
- El esquema tipado del runtime cubre `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` y las secciones dispersas de skills. Las plantillas distribuidas también contienen bloques propiedad de los consumidores, como `scm`, `memory`, `serena_reaper` y `mcp`; cada consumidor es responsable de sus claves anidadas. No deduzcas una clave a partir de esta lista: usa la [referencia de configuración](/docs/guide/configuration-reference) y la guía de la funcionalidad para ese bloque.
- Editar `oma-config.yaml` directamente es seguro. `oma install` y `oma update` usan reemplazos de campos a nivel de regex y conservan las claves editadas por el usuario que no gestionan (por ejemplo, las sobrescrituras personalizadas de `agents:` y `session.quota_cap`).
- `oma update` también añade las claves de nivel superior que define la plantilla distribuida pero que faltan en tu archivo (con los valores predeterminados de la plantilla), bajo un marcador `# Added by oma update`. Las claves que ya tienes nunca se modifican: el contenido existente permanece idéntico byte por byte. Las claves que hayas eliminado de forma deliberada volverán a aparecer con el valor predeterminado de la plantilla; establece la clave explícitamente en lugar de eliminarla si quieres excluirla.
