---
title: Revisar código de IA antes de fusionarlo
description: Revisa el código escrito por IA en busca de bugs, comprobaciones ausentes y regresiones, con un diff acotado y hallazgos reproducibles.
---

# Revisar código de IA antes de fusionarlo

Usa `oma-qa` para revisar un cambio frente a su comportamiento previsto. Empieza por el diff y las comprobaciones existentes del proyecto.

## Cargar la skill

Pide a tu agente de código que ejecute este comando y después lea las instrucciones devueltas y el directorio de apoyo:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Aportar la entrada

- El cambio o un ref de comparación local, como `origin/main`.
- El comportamiento esperado, en especial permisos, cambios de datos y manejo de fallos.
- Los comandos de lint y test existentes y cualquier límite del entorno.

## Dar la tarea

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Comprobar el resultado

Espera hallazgos ordenados con una reproducción o evidencia de código decisiva, una corrección sugerida y los comandos que realmente se ejecutaron. Si no se confirma ningún defecto, el informe debe identificar aun así el alcance inspeccionado y las lagunas que quedan.

Abre cada ubicación citada y verifica que el disparador llega hasta ella. Vuelve a ejecutar la comprobación estrecha usada como evidencia. Una herramienta ausente o un camino sin probar es una laguna de verificación; un resumen de revisión por sí solo no establece que el cambio sea seguro para publicar.

## Dependencias y paso siguiente

El agente necesita acceso al diff, al código local y a las herramientas de comprobación existentes del proyecto. Las comprobaciones de navegador, seguridad y rendimiento necesitan su objetivo y su tooling correspondientes. Cargar la skill no aprovisiona esas dependencias.

Ante un fallo confirmado, continúa con [depurar un test que falla](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Si quieres hooks de proyecto o workflows de equipo, [elige una configuración de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que incluya `oma-qa`.
