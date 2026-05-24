---
title: "Guía: Instalación Global"
description: Instala oh-my-agent en tu HOME de usuario (~/.agents/) en lugar de por proyecto, de modo que las mismas skills, workflows y reglas se apliquen en todos los proyectos. Cubre oma install --global, oma update --global, oma uninstall --global, la sobrescritura con OMA_HOME, la detección de doble instalación vía oma doctor y advertencias de plataforma (rechazo de sudo, CI, WSL, salvaguarda cwd=HOME).
---

## ¿qué es una instalación global?

Por defecto, `oma install` limita todo al directorio del proyecto actual: el SSOT vive en `<cwd>/.agents/` y las configuraciones de proveedor se escriben en `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Una **instalación global** (`oma install --global`) instala oh-my-agent en tu HOME de usuario, de modo que las mismas skills, workflows y reglas estén disponibles en cada proyecto que abras sin repetir el paso de instalación. El SSOT vive en `~/.agents/` y las configuraciones de proveedor en `~/.claude/`, `~/.codex/`, etc.

## Comparación entre proyecto y global

| Aspecto | Proyecto (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Ubicación del SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configuraciones de proveedor | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Lock file | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadatos | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Caso de uso | Personalización por proyecto | Valor por defecto personal en todos los proyectos |
| Alcance de oma-config.yaml | Específico del proyecto | Baseline a nivel de usuario |

Ambos modos pueden coexistir. `oma doctor` informa de ambas instalaciones si están presentes y señala cualquier desviación entre ellas.

## Configuración inicial

La primera vez que ejecutas `oma install --global` en una máquina, la instalación muestra una nota explicativa antes de continuar:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirma para continuar. La instalación sigue después el mismo flujo interactivo que una instalación de proyecto (idioma, preset de modelo, tipo de proyecto, selección de proveedor).

Tras una instalación exitosa, se muestran los siguientes pasos:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Advertencias

### Sudo rechazado

`oma install` (en cualquier modo) sale inmediatamente cuando se ejecuta bajo `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Ejecuta el comando como tu usuario normal sin `sudo`.

### Entornos de CI

Ejecutar `oma install --global` dentro de una pipeline de CI modifica el directorio HOME del runner de CI. Esto normalmente no es deseable. Si realmente lo necesitas (p. ej., una pipeline de bootstrap), oma emite una advertencia:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

La instalación continúa si `--yes` / `OMA_YES=1` está definido. Sin él, se muestra la advertencia y la instalación continúa de forma interactiva (lo que se quedará colgado en la mayoría de los entornos de CI).

### WSL: HOME de Linux vs USERPROFILE de Windows

Cuando oma detecta que se está ejecutando dentro de Windows Subsystem for Linux, imprime:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Una instalación en WSL y una instalación en PowerShell son independientes. Si quieres cobertura global en ambos lados, ejecuta `oma install --global` una vez desde WSL y otra desde PowerShell.

### Advertencia cwd = HOME (modo proyecto)

Si ejecutas `oma install` (sin `--global`) mientras tu directorio actual es tu HOME, oma te avisa:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En modo no interactivo / CI esto se aborta automáticamente. Usa `--global` si tu intención es una instalación a nivel de usuario.

## Desinstalación

```bash
# Vista previa de lo que se eliminaría (nunca borra nada)
oma uninstall --global --dry-run

# Eliminar la instalación global
oma uninstall --global
```

El comando de desinstalación separa los archivos gestionados por oma de los gestionados por el usuario. El contenido del usuario (oma-config.yaml, mcp.json, skills personalizadas sin el marcador `<!-- oma:generated -->`) nunca se elimina.

Para desinstalar una instalación de proyecto, omite `--global`:

```bash
oma uninstall [--dry-run]
```

## Sobrescritura con OMA_HOME

Para fines de testing o staging puedes redirigir todas las operaciones de oma a un directorio arbitrario:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` tiene prioridad sobre `--global` y `process.cwd()`. Las rutas de sistema prohibidas (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) se rechazan incluso vía `OMA_HOME`. La ruta debe ser absoluta y con permisos de escritura.
