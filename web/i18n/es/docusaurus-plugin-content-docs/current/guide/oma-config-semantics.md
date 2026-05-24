---
title: "Guía: Semántica de oma-config.yaml"
description: Reglas de precedencia por clave para oma-config.yaml cuando coexisten una instalación de proyecto y una global. Cubre auto_update_cli (gana el proyecto sobre el global), serena.mode, telemetry, language, model_preset, translation_voice, timezone, y qué dotfiles utilizan agy / claude / codex / gemini / qwen.
---

## Visión general

`oma-config.yaml` puede vivir en dos ubicaciones:

- **Proyecto**: `<cwd>/.agents/oma-config.yaml`
- **Global**: `~/.agents/oma-config.yaml`

Cuando ambos archivos existen, el archivo de proyecto gana para todas las claves. Esto es intencional: la personalización por proyecto es la señal más específica y no debería ser sobrescrita por un valor por defecto a nivel de usuario.

## Tabla de precedencia

| Clave | ¿Gana el proyecto? | Notas |
|-----|:---:|-------|
| `auto_update_cli` | Sí | El valor del proyecto sobrescribe al global. Implementado en `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Sí | Controla el modo de transporte del MCP de Serena (p. ej., `stdio`, `sse`). |
| `telemetry` | Sí | Opt-in de telemetría del proveedor (`true` / `false`). |
| `language` | Sí | Idioma de respuesta para las salidas del agente (p. ej., `en`, `ko`, `ja`). |
| `model_preset` | Sí | Preset de selección de modelo (p. ej., `claude`, `mixed`, `codex`). |
| `translation_voice` | Sí | Tono del traductor: `formal`, `balanced`, `interpreter`. |
| `timezone` | Sí | Identificador de zona horaria (p. ej., `Asia/Seoul`, `America/New_York`). |

"Gana el proyecto" significa: si la clave está presente en el archivo de proyecto, se usa ese valor independientemente de lo que diga el archivo global. Si la clave está ausente en el archivo de proyecto, se usa el valor del archivo global. Si está ausente en ambos, se aplica el valor por defecto.

## Valores por defecto

| Clave | Por defecto | Cuándo se aplica |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Ambos archivos ausentes o falta la clave |
| `serena.mode` | `stdio` | Ambos archivos ausentes o falta la clave |
| `telemetry` | `false` | Ambos archivos ausentes o falta la clave |
| `language` | `en` | Ambos archivos ausentes o falta la clave |
| `model_preset` | `claude` | Ambos archivos ausentes o falta la clave |
| `translation_voice` | `balanced` | Ambos archivos ausentes o falta la clave |
| `timezone` | Zona horaria del sistema | Ambos archivos ausentes o falta la clave |

## Razón del orden de lectura

El config de proyecto se lee primero porque representa el contexto más específico — el repositorio en el que un developer está trabajando activamente. Un equipo podría imponer `language: ko` o `model_preset: mixed` para su proyecto, y esas decisiones no deberían ser sobrescritas silenciosamente por el `oma-config.yaml` global de un individuo.

El archivo global proporciona una baseline a nivel de usuario. Las claves que el proyecto no define caen al valor global, que a su vez cae al valor por defecto codificado.

## Notas

- `language` en `oma-config.yaml` controla el idioma de respuesta del agente. **No** se usa para determinar los mensajes de advertencia de instalación/actualización — esos usan la locale del sistema (`$LANG`) porque `oma-config.yaml` aún no está cargado en el momento de la instalación.
- La precedencia de `auto_update_cli` está implementada explícitamente en el comando de actualización. Cuando coexisten una instalación de proyecto y una global, se consulta primero el `oma-config.yaml` del proyecto.
- Editar `oma-config.yaml` directamente es seguro. `oma install` y `oma update` usan reemplazo de campos a nivel de regex y preservan las claves editadas por el usuario que no gestionan (p. ej., overrides personalizados en `agents:`, `session.quota_cap`).
