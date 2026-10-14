---
title: "Guía: Instalación global"
sidebar_label: Instalación global
description: Instala oh-my-agent en el home global de OMA (~/.oma/) en lugar de hacerlo por proyecto para aplicar las mismas skills, workflows y reglas en todos tus proyectos. Cubre oma install --global, oma update --global, oma uninstall --global, la sobrescritura con OMA_HOME, la detección de instalaciones dobles mediante oma doctor y las particularidades de cada plataforma (rechazo de sudo, CI, WSL y la protección cwd=HOME).
---

## ¿Qué es una instalación global?

De forma predeterminada, `oma install` limita todo al directorio del proyecto actual: el SSOT vive en `<cwd>/.agents/` y las configuraciones de los proveedores se escriben en `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Una **instalación global** (`oma install --global`) instala oh-my-agent en el home global de OMA, de modo que las mismas skills, workflows y reglas estén disponibles en cada proyecto que abras sin repetir el paso de instalación. El SSOT vive en `~/.oma/.agents/`; las configuraciones de los proveedores siguen en `~/.claude/`, `~/.codex/`, etc.

## Comparación entre instalación de proyecto y global

| Aspecto | Proyecto (`oma install`) | Global (`oma install --global`, home de OMA predeterminado) |
|--------|------------------------|--------------------------------|
| Ubicación del SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Configuraciones de los proveedores | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Archivo de bloqueo | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadatos | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Caso de uso | Personalización por proyecto | Valor predeterminado personal en todos los proyectos |
| Alcance de oma-config.yaml | Específico del proyecto | Línea base para el usuario |

Ambos modos pueden coexistir. `oma doctor` informa de las dos instalaciones si están presentes y señala las diferencias entre ellas.

Después de una instalación global correcta, verifica los archivos del usuario y el perfil resuelto:

```bash
oma doctor --global --json
oma doctor --global --profile
```

El primer comando informa sobre el estado de la instalación y de los proveedores; el comando de perfil muestra el plan de modelos que usan los agentes. Mantén `--global` (o `-g`): sin él, ambos comandos inspeccionan el proyecto del directorio actual, con la configuración de ese proyecto superpuesta a los valores predeterminados globales.

## Configuración inicial

La primera vez que ejecutas `oma install --global` en una máquina, la instalación muestra una nota explicativa antes de continuar:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirma para continuar. A continuación, la instalación sigue el mismo flujo interactivo que una instalación de proyecto (idioma, preset de modelo, tipo de proyecto y selección de proveedores).

Después de una instalación correcta, se muestran los pasos siguientes:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularidades

### Sudo rechazado

`oma install` (en cualquier modo) termina inmediatamente si se ejecuta con `sudo`:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Ejecuta el comando como tu usuario normal, sin `sudo`.

### Entornos de CI

Ejecutar `oma install --global` dentro de una pipeline de CI modifica el HOME del runner de CI. Normalmente no es deseable. Si necesitas hacerlo (por ejemplo, en una pipeline de arranque), oma muestra una advertencia:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

La advertencia aparece cuando `CI` es `true` o `1`. Esos valores ya hacen que la instalación sea no interactiva, así que continúa con los valores predeterminados y no espera ninguna entrada. Fuera de CI, `--yes` u `OMA_YES=1` producen el mismo comportamiento no interactivo.

### WSL: HOME de Linux frente a USERPROFILE de Windows

Cuando oma detecta que se ejecuta dentro de Windows Subsystem for Linux, imprime:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Una instalación en WSL y otra desde PowerShell son independientes. Si quieres cobertura global en ambos lados, ejecuta `oma install --global` una vez desde WSL y otra desde PowerShell.

### Guard de cwd = HOME (modo de proyecto)

`oma link` y `oma update` (sin `--global`) se niegan a ejecutarse mientras tu directorio actual es tu HOME. En modo de proyecto, `<cwd>/.claude/settings.json` sería `~/.claude/settings.json`, es decir, tu configuración global de Claude Code, y el render con ámbito de proyecto reescribiría sus comandos `$HOME/.claude/hooks/...` a `$CLAUDE_PROJECT_DIR/...`, lo que rompería todos los hooks y la barra de estado en los proyectos que no tengan su propio `.claude/hooks/`. Para la instalación global, usa en su lugar `oma link --global` / `oma update --global`, o entra primero con `cd` en un proyecto.

Si ejecutas `oma install` (sin `--global`) mientras tu directorio actual es tu HOME, oma te avisa:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

En modo no interactivo o de CI, la operación se cancela automáticamente. Usa `--global` si quieres una instalación para todo el usuario.

## Volver a enlazar una instalación global

`oma link` regenera los archivos nativos de los proveedores a partir del SSOT sin reinstalar. Al igual que `install` y `update`, resuelve el destino según el contexto de instalación, así que pasa `--global` para reconciliar `~/.oma/.agents/`; funciona desde cualquier directorio, no solo desde `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
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

El comando de desinstalación separa los archivos propiedad de oma de los archivos del usuario. Solo elimina las skills registradas como gestionadas por OMA en `managed-skills.json`, dentro de `.agents/state/`; el marcador `<!-- oma:generated -->` identifica los archivos de prompts de Copilot generados. El contenido del usuario (`oma-config.yaml`, `mcp.json` y las skills no registradas como gestionadas) nunca se elimina. Ejecuta primero `--dry-run` para ver la lista exacta.

Para desinstalar una instalación de proyecto, omite `--global`:

```bash
oma uninstall [--dry-run]
```

## Sobrescritura con OMA_HOME

Define `OMA_HOME` con una ruta absoluta para reubicar los datos globales propiedad de OMA:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` es la raíz de almacenamiento global, no un destino de instalación de proyecto. Con el valor anterior, las definiciones globales viven en `/tmp/oma-test/.agents/`; la instalación y el enlazado de proyecto siguen usando `<cwd>/.agents/`. La configuración nativa de los proveedores y la autenticación quedan fuera de `OMA_HOME`. Los archivos de integración global de OpenCode se escriben en `~/.config/opencode/`, bajo el directorio HOME real.

`OMA_STATE_HOME` es una excepción explícita para el almacenamiento de perfiles, L1 y runtime de proyectos: debe ser absoluta y contiene `u/`. Si no está definida, los perfiles siguen a `OMA_HOME`. `XDG_CONFIG_HOME` ya no reubica el estado de OMA ni cambia la ruta de salida de OpenCode de OMA. Los secretos del llavero del sistema operativo, los datos de AgentMemory/Honcho y las cachés de toolchains gestionadas permanecen con sus propietarios actuales.

## Estructura del almacenamiento global

Los datos globales viven bajo `~/.oma` de forma predeterminada. Cuando `OMA_HOME` está definida, sustituye `~/.oma` por su valor:

| Datos | Ubicación |
|---|---|
| Definiciones globales, configuración, metadatos de instalación | `~/.oma/.agents/` |
| Manifiesto de programación, entorno capturado, registros de ejecución | `~/.oma/schedule/` |
| Copias de seguridad globales | `~/.oma/backup/` |
| Registro, bloqueos y registros de Serena | `~/.oma/state/serena/` |
| Índice de nombres de claves del vault | `~/.oma/state/vault-index.json` |
| Perfiles, sesiones L1, runtime de proyectos | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/` cuando `OMA_STATE_HOME` está definida) |

La configuración global aporta los valores predeterminados. El `.agents/oma-config.*` de proyecto más cercano y
su sobrecarga local los sobrescriben; las raíces de proyecto de distintos ancestros no se combinan.
Consulta [Carga de la configuración](./oma-config-semantics.md#precedence-table) para ver el orden completo.
Un proyecto que selecciona `semantic_memory: none` mantiene la memoria desactivada aunque la
configuración global seleccione AgentMemory.

## Instalaciones existentes

La migración del home copia los datos propiedad de OMA desde `~/.agents/` y `~/.config/oma/`
a la nueva estructura. Los originales se conservan, salvo los directorios de skills verificados como propiedad de OMA
que se convierten en enlaces de descubrimiento: su contenido original se archiva en
`~/.oma/backup/legacy-global-skills/` antes de que la ruta antigua pase a ser un enlace a la skill
migrada. Los archivos de destino existentes no se sobrescriben; los conflictos y los datos en uso
se informan para reintentarlos. Los índices del vault
combinan los nombres de las claves, sin sacar los valores secretos del llavero del sistema operativo. Las skills
del usuario y los enlaces ajenos permanecen en su sitio; los archivos de autenticación de los proveedores no se
mueven. Los lectores del runtime usan solo
las rutas nuevas.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

La instalación y la actualización globales ejecutan la migración antes de escribir sus archivos globales.
La instalación y la actualización de proyecto usan las raíces unificadas sin migrar datos globales
no relacionados. La migración no cambia los registros de trabajos del sistema operativo; ejecuta `oma schedule sync`
después de la migración si existen programaciones. Los servicios o runners activos pueden aplazar datos;
termina esos procesos y vuelve a ejecutar la migración.

## Consulta también

- [Carga de la configuración](./oma-config-semantics.md): cómo se combinan los archivos de configuración global, de proyecto y local
- [Integración en un proyecto existente](./integration.md): instalación en modo proyecto, verificación y reversión
- [Actualizaciones automatizadas](./automated-updates.md): ejecuta `oma update` desde CI
