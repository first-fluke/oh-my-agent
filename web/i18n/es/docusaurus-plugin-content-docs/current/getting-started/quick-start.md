---
title: Inicio rápido
description: Elige una habilidad o un preset de runtime y ejecuta una primera tarea acotada con verificación observada.
---

# Inicio rápido

Usa una tarea concreta para comprobar el resultado. Carga una habilidad en el agente de código que ya usas, o instala el runtime cuando necesites hooks de proyecto, agentes especialistas y flujos de trabajo. [Elegir una configuración](./choose-setup.md) explica las rutas disponibles y sus dependencias.

## 1. Elige la configuración {#1-install}

Para la tarea de Git de solo lectura de abajo, pide a tu agente que cargue la habilidad y lea sus instrucciones y su directorio de soporte:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Continúa con la tarea del paso 3. Las operaciones CLI de la habilidad, otras habilidades, las reglas del proyecto y los servicios externos siguen siendo dependencias aparte. Cargar esta habilidad no ejecuta el instalador de OMA.

### Instala el runtime cuando lo necesites

El instalador de arranque puede preparar `bun`, `uv`, Serena, CUE y el comando global `oma`. Selecciona la CLI o IDE de IA que ya usas; las integraciones de proveedores y de navegador dependen de las tareas que planees ejecutar.

Desde el directorio del proyecto, ejecuta el instalador de arranque:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

En Windows PowerShell, ejecuta:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

La configuración conserva un idioma de respuesta existente o detecta el idioma del sistema automáticamente. La configuración interactiva pregunta por los proveedores de CLI, los [proveedores de capacidades](./glossary.md#capability-provider), el [preset de modelos](./glossary.md#model-preset), el [preset de habilidades](./glossary.md#skill-preset) del proyecto y cualquier variante de stack. Para la primera ejecución, conserva los valores predeterminados, selecciona el proveedor que ya usas y elige el preset de proyecto más cercano al repositorio. Consulta [Presets](./installation.md#presets) para ver las habilidades de cada preset y los [flujos de trabajo que necesitan habilidades fuera de un preset](./installation.md#workflows-that-need-skills-outside-a-preset).

Si ya tienes `bun`, usa directamente el instalador:

```bash
bunx oh-my-agent@latest
```

Los scripts de arranque instalan en el proyecto actual. Usa `oma install --global` cuando quieras una instalación a nivel de HOME; lee [Instalación global](../guide/global-install.md) antes de mezclar instalaciones de proyecto y globales.

## 2. Comprueba el resultado

Para la carga temporal de una habilidad, confirma que el agente leyó las instrucciones seleccionadas y verifica la tarea en sí. Para una instalación del runtime, ejecuta la comprobación de salud desde el mismo directorio del proyecto:

```bash
oma doctor
```

El comando de texto imprime un informe con secciones como `CLI Status` y `Skills Status` y después devuelve el estado de salida del shell. Las filas exactas dependen de los hosts instalados en el proyecto:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` puede informar de problemas de integraciones opcionales como advertencias. La preparación predeterminada de AgentMemory se comprueba durante `oma install` y `oma update`; los fallos de instalación, arranque o salud detienen esos comandos. Seleccionar `providers.semantic_memory: none` o `honcho`, o establecer `OMA_NO_AGENTMEMORY=1`, omite esa preparación.

Para obtener un estado legible por máquina, `oma doctor --json` devuelve un estado distinto de cero cuando el informe contiene problemas. Usa `oma doctor --profile` para inspeccionar el modelo y el CLI resueltos para cada rol de agente canónico.

Si `oma` no está disponible pero Bun está instalado, ejecuta la misma comprobación sin el comando global:

```bash
bunx oh-my-agent@latest doctor
```

Si el comando `oma` sigue sin encontrarse, abre un shell nuevo o añade el directorio bin del gestor de paquetes a tu `PATH`; [Instalación](./installation.md#method-3-global-install) muestra cómo instalar el comando `oma`. Si `oma doctor` informa de una configuración no válida, corrige el campo indicado y vuelve a ejecutarlo. No borres `.agents/oma-config.yaml` para recuperarte: es la configuración propiedad del usuario que conserva los ajustes entre actualizaciones.

## 3. Ejecuta una tarea pequeña

Abre un repositorio Git existente en tu herramienta de IA. Usa la habilidad `oma-scm` cargada o la copia instalada por un preset de runtime con nombre. Si usaste la selección Custom, incluye `oma-scm` para este ejemplo:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Compara la rama y los cambios informados con la salida real de Git. El agente debe informar qué comandos se ejecutaron y sus estados de salida. Esta tarea de solo lectura no necesita pruebas de código ni compilación.

Un prompt en lenguaje natural no inicia ningún flujo de trabajo; donde el hook de prompt está habilitado, añade una sugerencia orientativa de habilidad. El host o el flujo seleccionado realiza el enrutamiento de habilidades, por lo que un prompt arbitrario del host no garantiza un hook ni una habilidad concreta. El contrato de ejecución debe revisar aun así las convenciones del repositorio, respetar el alcance de solo lectura solicitado e informar de las comprobaciones observadas. Los archivos y comandos exactos dependen del proyecto.

Para una tarea que cruce los límites de API y UI, selecciona `/work` o `/orchestrate` explícitamente. Para un solo dominio, continúa con [Ejecución de una habilidad](../guide/single-skill.md). La [Guía de uso](../guide/usage.md) contiene ejemplos más largos.

## 4. Conoce los valores predeterminados del runtime antes de escalar

La carga temporal de una habilidad no configura estos valores predeterminados del runtime. Para hooks de proyecto, configuración de proveedores o flujos de trabajo en equipo, usa la ruta del runtime en [Elegir una configuración](./choose-setup.md).

OMA empieza con `model_preset: auto`, Serena para la inteligencia de código, Agent Memory para la memoria semántica, búsqueda web nativa y la telemetría desactivada. Serena usa el transporte compartido `bridge` y se actualiza automáticamente, salvo que se configure de otro modo. El MCP de DevTools del navegador es opt-in; una configuración interactiva nueva ofrece Aside primero. Consulta [Valores predeterminados importantes](./important-defaults.md) para conocer las consecuencias y las claves de sobrescritura.

Si una tarea gestionada se atasca, empieza con `oma agent status <session-id> [agent-id]` y después inspecciona su registro de verificación en `.agents/state/agent-runs/` y la ruta de declaración de resultados estructurada inyectada. Esos registros muestran la ejecución, la tarea, el workspace, el código de salida y el estado de verificación. Los archivos legibles `result-*.md` y `progress-*.md` de `.agents/state/memories/` aportan contexto cuando existen. Vuelve a ejecutar solo el comando fallido más pequeño después de confirmar que la ejecución ya no está activa. Un [flujo de trabajo persistente](./glossary.md#persistent-workflow) sigue activo hasta completarse o hasta que digas `workflow done`; consulta [Flujos de trabajo](../core-concepts/workflows.md#persistent-mode-mechanics) para recuperar el archivo de estado.

## Próximos pasos

- [Elegir una configuración](./choose-setup.md) para una habilidad, un preset de runtime o el plugin de Claude Code
- [Valores predeterminados importantes](./important-defaults.md) para la precedencia, los proveedores y las opciones de recuperación
- [Instalación](./installation.md) para presets, configuración de proveedores, instalaciones globales y actualizaciones
- [Agentes](../core-concepts/agents.md) para los 33 paquetes de habilidades y los roles de despacho
- [Flujos de trabajo](../core-concepts/workflows.md) para planificación, ejecución paralela, QA y modos persistentes
- [Solución de problemas](../guide/troubleshooting.md) cuando la instalación, un proveedor o un hook no se comportan como se espera
