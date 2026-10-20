---
title: "Guía: Confianza de los hooks de Codex"
sidebar_label: Confianza de hooks de Codex
description: Por qué los hooks de Codex no se ejecutan hasta que los revisas una vez, qué ocurre con las actualizaciones y qué automatiza oh-my-agent para los subprocesos de Codex que crea.
---

# Guía: Confianza de los hooks de Codex

Cuando oh-my-agent se instala en un proyecto, escribe configuraciones de hooks nativas del proveedor, incluido `.codex/hooks.json` para el CLI de Codex. A diferencia de Claude Code, Codex no ejecuta estos hooks automáticamente. Protege cada hook de comandos no gestionado mediante Trust-On-First-Use (TOFU): un hook solo se ejecuta después de que lo hayas revisado y habilitado una vez.

---

## El paso único: revisa los hooks en Codex

Después de que `oma` (install), `oma link` o `oma update` escriban `.codex/hooks.json` en un proyecto que Codex aún no haya visto (en una instalación global, `~/.codex/hooks.json`), los hooks todavía **no** se ejecutan. Debes abrir Codex y revisarlos una vez:

1. Abre el proyecto en el CLI de Codex.
2. Ejecuta `/hooks` para abrir el navegador de hooks (TUI).
3. Revisa los hooks de la lista y habilítalos.

Hasta que lo hagas, los hooks no son de confianza y se omiten en silencio. Por eso oh-my-agent muestra un aviso cada vez que crea o cambia `.codex/hooks.json`:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Verifica el archivo generado antes de abrir Codex:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

El resultado esperado es el aviso de instalación o actualización seguido de los hooks en el navegador `/hooks` de Codex. `oma link codex` reconcilia el archivo generado; no sustituye la decisión de confianza que se toma una sola vez.

**Nota:** `--dangerously-bypass-hook-trust` no ayuda en este caso. Su advertencia («Enabled hooks may run without review») significa que solo omite la revisión de hooks que ya estaban habilitados; no ejecutará un hook que nunca se haya revisado. El navegador `/hooks` es la única forma de habilitar un hook por primera vez.

Internamente, Codex guarda la decisión en `~/.codex/config.toml`, en una entrada `[hooks.state]` identificada por la ruta del archivo de hooks, el evento, el bloque y el hook, con un indicador `enabled` y un `trusted_hash` de la cadena de comandos.

---

## Qué sucede con las actualizaciones

Una vez que hayas confiado en los hooks, no tienes que repetir el paso en cada actualización:

- **Volver a ejecutar `oma link` o `oma update` conserva la confianza** mientras las cadenas de comandos de los hooks no cambien. Codex compara el hash almacenado con el comando actual; si coinciden, el hook sigue siendo de confianza.
- **Si una versión futura de oh-my-agent cambia una cadena de comandos de un hook**, el hash deja de coincidir y ese hook vuelve silenciosamente a no ser de confianza. Verás de nuevo el aviso del instalador y tendrás que volver a confiar en él mediante `/hooks`.

Por tanto, el paso de revisión solo es necesario la primera vez y después de una versión que cambie realmente un comando de hook.

---

## Qué automatiza oh-my-agent

Cuando oh-my-agent crea por sí mismo un subproceso de Codex, por ejemplo, un agente de otro proveedor enviado mediante `oma agent spawn`, pasa automáticamente `--dangerously-bypass-hook-trust`. Así, sus hooks revisados pueden ejecutarse entre actualizaciones sin pedirte que vuelvas a confiar en ellos manualmente.

Este flag se aplica **solo** a los procesos de Codex que crea oh-my-agent. Nunca se escribe en `~/.codex/config.toml` ni en la configuración del proyecto, por lo que no afecta a las sesiones de Codex que inicies tú mismo.

---

## No hace falta el flag `[features] hooks`

Las versiones antiguas de oh-my-agent escribían `[features] codex_hooks = true` en la configuración de Codex. Codex 0.124 renombró ese flag a `hooks` y convirtió los hooks en una funcionalidad estable y activada por defecto, así que no hace falta ningún flag. oh-my-agent no escribe ninguna de las dos claves y elimina los flags obsoletos `codex_hooks` y `child_agents_md` de la tabla `[features]` cuando los encuentra.

---

## Resumen

| Situación | Qué haces |
|:----------|:------------|
| Primera instalación o primer `.codex/hooks.json` en un proyecto | Abre Codex, ejecuta `/hooks` y habilita los hooks una vez |
| `oma update` con comandos de hooks sin cambios | Nada: la confianza se conserva |
| `oma update` que cambia un comando de hook | Vuelve a ejecutar `/hooks` para confiar de nuevo (el instalador muestra un aviso) |
| Subproceso de Codex creado por oh-my-agent | Nada: el bypass se aplica automáticamente |

## Consulta también

- [Integración en un proyecto existente](./integration.md): qué escribe el instalador para cada proveedor
- [Instalación global](./global-install.md): instalaciones para todo el usuario que escriben `~/.codex/`
