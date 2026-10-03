---
title: "Guía: Instalación global"
sidebar_label: Instalación global
description: Instala oh-my-agent en tu HOME de usuario (~/.agents/) en lugar de hacerlo por proyecto para aplicar las mismas skills, workflows y reglas en todos tus proyectos. Cubre oma install --global, oma update --global, oma uninstall --global, la sobrescritura con OMA_HOME, la detección de instalaciones dobles mediante oma doctor y las particularidades de cada plataforma (rechazo de sudo, CI, WSL y la protección cwd=HOME).
---

## ¿Qué es una instalación global?

De forma predeterminada, `oma install` limita todo al directorio del proyecto actual: el SSOT vive en `<cwd>/.agents/` y las configuraciones de los proveedores se escriben en `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Una **instalación global** (`oma install --global`) instala oh-my-agent en tu HOME de usuario, de modo que las mismas skills, workflows y reglas estén disponibles en cada proyecto que abras sin repetir el paso de instalación. El SSOT vive en `~/.agents/` y las configuraciones de los proveedores en `~/.claude/`, `~/.codex/`, etc.

## Comparación entre instalación de proyecto y global

| Aspecto | Proyecto (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Ubicación del SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configuraciones de los proveedores | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Archivo de bloqueo | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadatos | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Caso de uso | Personalización por proyecto | Valor predeterminado personal en todos los proyectos |
| Alcance de oma-config.yaml | Específico del proyecto | Línea base para el usuario |

Ambos modos pueden coexistir. `oma doctor` informa de las dos instalaciones si están presentes y señala las diferencias entre ellas.

Después de una instalación global correcta, verifica los archivos del usuario y el perfil resuelto:

```bash
oma doctor --json
oma doctor --profile
```

El primer comando informa sobre el estado de la instalación y de los proveedores; el comando de perfil muestra el plan de modelos que usan los agentes. Ejecuta ambos desde cualquier proyecto cuando quieras inspeccionar la instalación global.

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

Confirma para continuar. A continuación, la instalación sigue el mismo flujo interactivo que una instalación de proyecto (idioma, preset de modelo, tipo de proyecto y selección de proveedores).

Después de una instalación correcta, se muestran los pasos siguientes:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularidades

### Sudo rechazado

`oma install` (en cualquier modo) termina inmediatamente si se ejecuta con `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Ejecuta el comando como tu usuario normal, sin `sudo`.

### Entornos de CI

Ejecutar `oma install --global` dentro de una pipeline de CI modifica el HOME del runner de CI. Normalmente no es deseable. Si necesitas hacerlo (por ejemplo, en una pipeline de arranque), oma muestra una advertencia:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

La instalación continúa si se establece `--yes` / `OMA_YES=1`. Sin ellos, se muestra la advertencia y la instalación continúa de forma interactiva, lo que hará que la mayoría de las configuraciones de CI se queden bloqueadas.

### WSL: HOME de Linux frente a USERPROFILE de Windows

Cuando oma detecta que se ejecuta dentro de Windows Subsystem for Linux, imprime:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Una instalación en WSL y otra desde PowerShell son independientes. Si quieres cobertura global en ambos lados, ejecuta `oma install --global` una vez desde WSL y otra desde PowerShell.

### Guard de cwd = HOME (modo de proyecto)

`oma link` y `oma update` (sin `--global`) se niegan a ejecutarse mientras tu directorio actual es tu HOME. En modo de proyecto, `<cwd>/.claude/settings.json` sería `~/.claude/settings.json`, es decir, tu configuración global de Claude Code, y el render con ámbito de proyecto reescribiría sus comandos `$HOME/.claude/hooks/...` a `$CLAUDE_PROJECT_DIR/...`, lo que rompería todos los hooks y la barra de estado en los proyectos que no tengan su propio `.claude/hooks/`. Para la instalación en HOME, usa en su lugar `oma link --global` / `oma update --global`, o entra primero con `cd` en un proyecto.

Si ejecutas `oma install` (sin `--global`) mientras tu directorio actual es tu HOME, oma te avisa:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En modo no interactivo o de CI, la operación se cancela automáticamente. Usa `--global` si quieres una instalación para todo el usuario.

## Volver a enlazar una instalación global

`oma link` regenera los archivos nativos de los proveedores a partir del SSOT sin reinstalar. Al igual que `install` y `update`, resuelve el destino según el contexto de instalación, así que pasa `--global` para reconciliar `~/.agents/`; funciona desde cualquier directorio, no solo desde `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```

Sin `--global`, `oma link` apunta a `<cwd>/.agents/`; por eso, si lo ejecutas dentro de un proyecto mientras la instalación es global, informa de que allí no encontró un directorio `.agents/`.

## Desinstalación

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

El comando de desinstalación separa los archivos propiedad de oma de los archivos del usuario. El contenido del usuario (oma-config.yaml, mcp.json y las skills personalizadas sin el marcador `<!-- oma:generated -->`) nunca se elimina.

Para desinstalar una instalación de proyecto, omite `--global`:

```bash
oma uninstall [--dry-run]
```

## Sobrescritura con OMA_HOME

Para pruebas o staging, puedes redirigir todas las operaciones de oma a un directorio arbitrario:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` tiene prioridad sobre `--global` y `process.cwd()`. Las rutas de sistema prohibidas (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) se rechazan incluso mediante `OMA_HOME`. La ruta debe ser absoluta y permitir escritura.

Para una prueba rápida segura, apunta `OMA_HOME` a un directorio vacío con permisos de escritura y ejecuta `oma install --global --yes`; el resumen debe indicar ese directorio como raíz de instalación. Elimina el directorio después de la prueba y ejecuta la instalación real con el HOME previsto.
