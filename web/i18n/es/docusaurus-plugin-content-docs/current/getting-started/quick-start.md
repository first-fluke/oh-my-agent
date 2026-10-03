---
title: Inicio rápido
description: Ejecuta una tarea acotada desde la instalación hasta la verificación, con la salida esperada y la recuperación.
---

# Inicio rápido

Usa esta página para ejecutar una tarea pequeña y registrar un resultado concreto. Necesitas un directorio de proyecto y al menos un CLI o IDE de IA compatible. El instalador puede preparar `bun`, `uv`, Serena y CUE en macOS, Linux o Windows; la integración con el host seleccionado es necesaria para el primer prompt, mientras que las integraciones de proveedores y del navegador son opcionales.

## 1. Instala

### La vía más rápida: skills en tus agentes

```bash
npx skills add first-fluke/oh-my-agent
```

Esto instala el paquete de skills de OMA en los runtimes de agentes detectados (Claude Code, Cursor, Codex y más). Las skills enseñan al agente cómo trabajar. Para las puertas de los hooks Stop, la verificación de artefactos, los jueces independientes y el CLI `oma`, instala el harness completo de abajo.

Las instalaciones solo de skills no incluyen el CLI `oma`, los hooks, los flujos de trabajo ni los jueces. Usa una skill instalada con nombre para la primera tarea de abajo; usa el harness completo cuando necesites las comprobaciones del CLI.

### Harness completo (puertas, hooks, CLI)

Desde el directorio del proyecto, ejecuta el instalador de arranque:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

En Windows PowerShell, ejecuta:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

La configuración interactiva pregunta por el idioma de respuesta, los proveedores de CLI, los proveedores de capacidades, el preset de modelos, el preset de skills del proyecto y cualquier variante de stack. Para la primera ejecución, conserva los valores predeterminados, selecciona el proveedor que ya usas y elige el preset de proyecto más cercano al repositorio.

Si ya tienes `bun`, usa directamente el instalador:

```bash
bunx oh-my-agent@latest
```

Los scripts de arranque instalan en el proyecto actual. Usa `oma install --global` cuando quieras una instalación a nivel de HOME; lee [Instalación](./installation.md) antes de mezclar instalaciones de proyecto y globales.

## 2. Comprueba el resultado (solo con el harness completo)

Si instalaste el harness completo, ejecuta la comprobación de salud desde el mismo directorio del proyecto:

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

Las integraciones opcionales de MCP, navegador, memoria o inteligencia de código pueden aparecer como advertencias; solo hacen falta para tareas que las utilicen. Para obtener un estado legible por máquina, `oma doctor --json` devuelve un estado distinto de cero cuando el informe contiene problemas. Usa `oma doctor --profile` para inspeccionar el modelo y el CLI resueltos para cada rol de agente canónico.

Si `oma` no está disponible pero Bun está instalado, ejecuta la misma comprobación sin el comando global:

```bash
bunx oh-my-agent@latest doctor
```

Si el comando `oma` sigue sin encontrarse, abre un shell nuevo o añade el directorio bin del gestor de paquetes a tu `PATH`. Si `oma doctor` informa de una configuración no válida, corrige el campo indicado y vuelve a ejecutarlo. No borres `.agents/oma-config.yaml` para recuperarte: es la configuración propiedad del usuario que conserva los ajustes entre actualizaciones.

Si instalaste solo skills, omite esta comprobación del CLI y continúa con la tarea de la skill con nombre de abajo.

## 3. Ejecuta una tarea pequeña

Abre el repositorio en la herramienta de IA configurada y pide una skill con nombre y un resultado autocontenido:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

El host debe identificar la skill seleccionada, inspeccionar un objetivo e informar de una edición específica del enlace o de que el enlace ya es válido. Incluye la salida del comando y el código de salida de cualquier comprobación que se haya ejecutado de verdad. Una instalación solo de skills no añade `/debug`, `/ralph`, hooks ni puertas de flujo de trabajo; pedir la skill con nombre mantiene esta primera tarea dentro de las capacidades instaladas.

Cuando el hook de palabras clave está habilitado para el host seleccionado, puede activar un flujo de trabajo coincidente. El host o el flujo seleccionado realiza el enrutamiento de skills, por lo que un prompt arbitrario del host no garantiza un hook, una skill concreta ni un `CHARTER_CHECK`. El contrato de ejecución debe revisar aun así las convenciones del repositorio, hacer solo el cambio dentro del alcance e informar de su verificación. Los archivos y comandos exactos dependen del proyecto.

Para una tarea que cruce los límites de API y UI, selecciona `/work` o `/orchestrate` explícitamente. Para un solo dominio, continúa con [Ejecución de una skill](../guide/single-skill.md). La [Guía de uso](../guide/usage.md) contiene ejemplos más largos.

## 4. Conoce los valores predeterminados antes de escalar

OMA empieza con `model_preset: auto`, Serena para la inteligencia de código, Agent Memory para la memoria semántica, búsqueda web nativa y la telemetría desactivada. Serena usa el transporte compartido `bridge` y se actualiza automáticamente, salvo que se configure de otro modo. El MCP de DevTools del navegador está desactivado por defecto; una configuración interactiva nueva ofrece Aside primero. Consulta [Valores predeterminados importantes](./important-defaults.md) para conocer las consecuencias y las claves de sobrescritura.

Si una tarea gestionada se atasca, empieza con `oma agent status <session-id> [agent-id]` y después inspecciona su receipt, el registro de ejecución en `.agents/state/agent-runs/`, y la ruta de claim inyectada, que contiene la declaración estructurada de resultados. Esos registros muestran la ejecución, la tarea, el workspace, el código de salida y el estado de verificación. Los archivos legibles `result-*.md` y `progress-*.md` de `.agents/state/memories/` aportan contexto cuando existen. Vuelve a ejecutar solo el comando fallido más pequeño después de confirmar que la ejecución ya no está activa. Un flujo persistente sigue activo hasta completarse o hasta que digas `workflow done`; consulta [Flujos de trabajo](../core-concepts/workflows.md#persistent-mode-mechanics) para recuperar el archivo de estado.

## Próximos pasos

- [Valores predeterminados importantes](./important-defaults.md) para la precedencia, los proveedores y las opciones de recuperación
- [Instalación](./installation.md) para presets, configuración de proveedores, instalaciones globales y actualizaciones
- [Agentes](../core-concepts/agents.md) para los 33 paquetes de skills y los roles de despacho
- [Flujos de trabajo](../core-concepts/workflows.md) para planificación, ejecución paralela, QA y modos persistentes
