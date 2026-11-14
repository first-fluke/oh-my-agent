---
title: Reparar hooks de plugins y el arranque del proyecto
description: Cómo se repararon las rutas de hooks del marketplace, el aprovisionamiento de Bash y los registros de verificación de arranque del proyecto, con fixtures de regresión.
---

# Reparar hooks de plugins y el arranque del proyecto

La reparación del plugin en [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) abordó el despacho de hooks y el comportamiento del arranque. Su padre, `82649cbd`, aporta el estado anterior de esta comparación.

## Mecanismo del fallo

El [manifiesto de hooks antiguo](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) invocaba archivos bajo `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Esas rutas dependen de archivos generados; el fixture con una caché de plugin nueva las deja fuera del directorio del plugin.

El [arranque antiguo](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) también ejecutaba el instalador de Bash descargado mediante `sh -c`. Su marcador de éxito vivía en datos compartidos del plugin, y la ruta rápida comprobaba solo ese marcador, la versión de la CLI y la presencia del archivo de ajustes del proyecto. Un segundo proyecto con un archivo de ajustes podía, por tanto, saltarse su propio cableado.

## Reparación

El [despachador nuevo](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) llama a la CLI instalada. Cuando un hook de proyecto ejecutable que coincide ya es dueño del evento, el hook del marketplace le cede el paso para que el evento no se despache dos veces.

El [arranque nuevo](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Ejecuta el instalador de Bash mediante Bash y comprueba los fallos de aprovisionamiento.
- Fuerza la instalación del proyecto aunque se herede un ajuste de instalación global.
- Guarda el registro de verificación en `.agents/state/plugin-bootstrap.version` de ese proyecto.
- Comprueba la configuración, los metadatos de versión, el wrapper ejecutable y los eventos registrados antes de reutilizar un registro de verificación.
- Conserva los diagnósticos de una instalación fallida en `.agents/state/plugin-bootstrap.last-error.log` sin registrar un registro de verificación de éxito.

## Reproducir las comprobaciones de regresión

Usa un checkout desechable de `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` con Bun y las dependencias de desarrollo del repositorio ya disponibles. Desde su raíz:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

Los fixtures cubren límites distintos:

| Fixture | Qué comprueban sus aserciones |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Aprovisionamiento solo con Bash, registros de verificación de proyecto separados, configuración solo con CUE, cableado incompleto, fallos de versión y diagnósticos conservados. |
| [Hook dispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Despacho con caché nueva, presupuestos de tiempo de los handlers, conservación del payload, propiedad del hook de proyecto que coincide y fallback cuando esa propiedad falta o no es válida. |
| [Install integration](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Dos instalaciones de proyecto, ajustes de usuario conservados, una entrega de prompt/Stop entre ambos registros y reintento tras un cableado fallido. |

Estos fixtures crean directorios temporales y comandos de CLI falsos; el fixture de integración usa el compositor de hooks real. Comprueban el despacho de shell y los efectos registrados sin una instalación de marketplace ni una llamada a un modelo. Las suites se omiten en Windows.

## Qué queda por comprobar en una sesión real

Una ejecución de fixtures que pasa no establece una sesión de Claude Code que funcione. En el proyecto de destino real, inspecciona el registro de verificación y la configuración, ejecuta `oma doctor`, reinicia la sesión y ejercita el comportamiento relevante de prompt y Stop mientras compruebas sus efectos observados. La disponibilidad de la CLI, las credenciales, el comportamiento del proveedor y la política de hooks del host necesitan su propia evidencia.

Para el mismo enfoque de reproducir, corregir y verificar en otro fallo, empieza por [depurar un test que falla](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Elegir una configuración](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) explica cuándo hace falta el runtime del proyecto.
