---
title: Depurar un test que falla
description: Reproduce un fallo de test, aísla su causa, aplica una corrección acotada y verifica una regresión con el runner de tests existente del proyecto.
---

# Depurar un test que falla

Usa `oma-debug` cuando tengas un comando que falla, un stack trace o un resultado incorrecto que se puede repetir.

## Cargar la habilidad

Pide a tu agente de código que ejecute este comando y lea sus instrucciones y su directorio de apoyo:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Aportar la entrada

- El comando que falla, exacto, y la salida de fallo relevante completa.
- El comportamiento esperado, el checkout o ref, la versión del runtime y los servicios locales necesarios.
- Los archivos o el cambio reciente que sospechas, más el alcance de edición permitido.

## Dar la tarea

Este ejemplo concreto usa los fixtures de regresión de arranque del plugin de este repositorio. En otro proyecto, usa tu propio comando que falla.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Comprobar el resultado

Espera el fallo reproducido, su camino causal, el parche acotado y un test de regresión ligado a ese fallo. El informe debe separar un entorno no disponible de un defecto de código diagnosticado.

Comprueba que la regresión falla con el comportamiento original y pasa con la corrección. Vuelve a ejecutar el comando indicado en el mismo entorno y después inspecciona los resultados de los tests relacionados. Si la reproducción sigue bloqueada, espera el bloqueo exacto y la evidencia más débil disponible.

## Dependencias y paso siguiente

El agente usa el runner de tests de tu proyecto y las herramientas de navegación de código configuradas. El ejemplo requiere Bun y las dependencias de desarrollo del repositorio ya existentes. Estos fixtures del plugin se omiten en Windows; usa un test que falle y que admita tu plataforma. Cargar la habilidad no instala dependencias ni repara un servicio ausente.

Consulta el [ejemplo de reparación de hooks del plugin](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) para el cambio de código real y los límites de los fixtures. Para la ejecución gestionada o los hooks de proyecto, [elige una configuración de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que incluya `oma-debug`.
