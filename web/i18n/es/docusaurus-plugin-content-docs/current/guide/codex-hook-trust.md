---
title: "Guía: Confianza de los hooks de Codex"
sidebar_label: Confianza de hooks de Codex
description: Cómo Codex condiciona los hooks a la confianza, qué registra oh-my-agent para que sus hooks se ejecuten y cuándo aún debes revisar los hooks tú mismo.
---

# Guía: Confianza de los hooks de Codex

Cuando oh-my-agent se instala en un proyecto, escribe configuraciones de hooks nativas del proveedor, incluido `.codex/hooks.json` para el CLI de Codex. Codex no ejecuta un hook solo porque esté configurado. Dos aprobaciones lo condicionan, y ambas viven en tu configuración de usuario (`$CODEX_HOME/config.toml`, por defecto `~/.codex/config.toml`). Un proyecto no puede aprobar sus propios hooks:

1. **Confianza del proyecto.** La carpeta `.codex/` de un proyecto (su `config.toml` y su `hooks.json`) se carga solo en un proyecto de confianza: `[projects."<path>"] trust_level = "trusted"`.
2. **Confianza por hook.** Cada hook no gestionado, en el ámbito del proyecto o del usuario, necesita una entrada `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` cuyo `trusted_hash` coincida con la declaración actual del hook (comando, timeout, matcher, flag async, mensaje de estado).

Un hook nuevo o modificado muestra "Hooks need review" en la TUI de Codex. `codex exec` lo omite en silencio.

---

## Qué registra oh-my-agent por ti

`oma install`, `oma update` y `oma link` escriben ambas aprobaciones para **los hooks propios de oh-my-agent**. Son los handlers llamados `oma-hook-*` o que se ejecutan a través del wrapper `oma-hook.sh`. El hash es el mismo que calcula Codex cuando eliges "Trust all and continue", así que los hooks se ejecutan en la primera sesión de Codex sin un paso de `/hooks`. Una versión posterior de oh-my-agent que cambie un comando de hook registra el hash nuevo durante `oma update`, así que los hooks siguen activos.

oh-my-agent edita solo las tablas afectadas de `config.toml`. Vuelve a leer el resultado y deja el archivo intacto si cualquier otra cosa cambiaría. Nunca:

- aprueba un hook que hayas añadido tú al mismo `hooks.json`,
- marca como de confianza un proyecto que hayas marcado con `trust_level = "untrusted"`,
- vuelve a activar un hook que hayas desactivado (`enabled = false`),
- toca Codex antes de que Codex haya creado su directorio home.

Una instalación global (`~/.codex/hooks.json`) recibe solo las entradas por hook, porque no hay un proyecto en el que confiar.

---

## Cuándo aún revisas los hooks tú mismo

Si oh-my-agent no pudo registrar la confianza, imprime el motivo junto con el aviso:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Los casos habituales son un `config.toml` que no puede analizar, un proyecto que marcaste como no confiable o que Codex aún no se haya ejecutado. En ese caso abre el proyecto en Codex, ejecuta `/hooks` y habilita los hooks una vez. Después ejecuta `oma link codex` para que las actualizaciones posteriores los mantengan de confianza.

---

## Los procesos de Codex que inicia oh-my-agent

Cuando oh-my-agent inicia por sí mismo un subproceso de Codex (por ejemplo `oma agent spawn`), también pasa `--dangerously-bypass-hook-trust`. Ese flag ejecuta los hooks habilitados sin la comprobación del hash. No levanta la confianza del proyecto. El flag se aplica solo a los procesos que inicia oh-my-agent y nunca se escribe en tu configuración.

---

## No hace falta el flag `[features] hooks`

Las versiones antiguas de oh-my-agent escribían `[features] codex_hooks = true` en la configuración de Codex. Codex 0.124 renombró ese flag a `hooks` y convirtió los hooks en una funcionalidad estable y activada por defecto, así que no hace falta ningún flag. oh-my-agent no escribe ninguna de las dos claves y elimina los flags obsoletos `codex_hooks` y `child_agents_md` de la tabla `[features]` cuando los encuentra.

---

## Resumen

| Situación | Qué haces |
|:----------|:------------|
| Primera instalación en un proyecto | Nada: el instalador registra la confianza |
| `oma update` que cambia un comando de hook | Nada: se registra el hash nuevo |
| El instalador imprime "not trusted (…)" | Corrige el motivo o ejecuta `/hooks` una vez en Codex |
| Un hook que añadiste a `.codex/hooks.json` | Revísalo tú en `/hooks` |

## Consulta también

- [Integración en un proyecto existente](./integration.md): qué escribe el instalador para cada proveedor
- [Instalación global](./global-install.md): instalaciones para todo el usuario que escriben `~/.codex/`
