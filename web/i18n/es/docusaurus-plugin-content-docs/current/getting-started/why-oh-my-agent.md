---
title: Por qué oh-my-agent
description: Elige oh-my-agent cuando necesites skills y workflows propiedad del repositorio, despacho entre varios proveedores y verificación explícita.
---

# Por qué oh-my-agent

oh-my-agent añade una capa propiedad del repositorio alrededor de las CLIs de agentes que ya usa tu equipo. El directorio `.agents/` guarda [skills](./glossary.md#skill), [workflows](./glossary.md#workflow), [definiciones de agentes](./glossary.md#agent-definition), reglas y configuración de modelos. Los archivos propios de cada proveedor se generan desde esa [fuente de verdad](./glossary.md#ssot), así que el comportamiento puede revisarse y cambiarse junto con el proyecto.

## Elígelo cuando el repositorio necesite una capa de coordinación

OMA encaja cuando necesitas una o varias de estas capacidades:

- **Varios hosts o proveedores de agentes.** `model_preset: auto` usa la configuración nativa del runtime actual. Los presets fijos y personalizados pueden dirigir roles a otros proveedores; `oma agent spawn` gestiona el despacho no nativo.
- **Un workflow de equipo repetible.** `/work` gestiona una tarea acotada, `/orchestrate` coordina trabajo delegado, `/ultrawork` ejecuta trabajo paralelo con pasos de revisión y `/ralph` repite una tarea con una fase de juez explícita.
- **Instrucciones propiedad del repositorio.** Las skills, workflows, reglas y definiciones de agentes viven junto al código. `oma link` proyecta los archivos seleccionados a los formatos compatibles de cada proveedor.
- **Comprobaciones mecánicas y resultados duraderos.** Las ejecuciones de agentes pueden escribir estados y registros de resultados estructurados, mientras `oma verify agent <agent-type>` y `oma docs verify` ofrecen comprobaciones explícitas.

Si un proyecto usa un solo host y no necesita skills compartidas, workflows ni enrutamiento entre proveedores, los archivos `.agents/` y los comandos de la CLI pueden no justificar la configuración. OMA es una capa de coordinación; no sustituye el modelo, el editor ni los criterios de aceptación propios del proyecto.

## La verificación es un comando que eliges

Ejecuta `oma verify agent <agent-type> --workspace <path>` cuando quieras las comprobaciones correspondientes a un rol de backend, frontend, móvil, QA, depuración o planificación. El verificador combina inspecciones estáticas con comandos configurados, como pruebas, comprobaciones de tipos, comprobaciones SQL o `flutter analyze`; consulta [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). El informe muestra el resultado de cada comprobación. Superar estas comprobaciones no demuestra que una funcionalidad cumpla sus requisitos de producto o dominio, por lo que los criterios de aceptación de la tarea también necesitan revisión.

`/ralph` añade una fase de [juez](./glossary.md#judge) separada cuando eliges ese workflow. Vuelve a comprobar los criterios declarados entre iteraciones y registra los artefactos del workflow; no es una puerta que se ejecute en cada prompt normal. Cargar una skill tampoco inicia todos los workflows ni todos los comandos de verificación.

## El despacho permanece visible

`oma doctor --profile` muestra el proveedor y el modelo resueltos para cada rol de despacho. `oma agent spawn <agent-id> <prompt> <session-id>` es la ruta explícita de la CLI cuando el host actual no gestiona un rol. Las reglas de resolución de modelos y el comportamiento específico de cada proveedor están documentados en [Valores predeterminados importantes](./important-defaults.md) y [Modelos por agente](../guide/per-agent-models.md).

Los hooks solo pueden activar un workflow cuando la integración del host correspondiente está habilitada. El host realiza el enrutamiento nativo de skills, mientras que el enrutamiento de workflows sigue al workflow o hook seleccionado; un prompt normal no garantiza que se ejecute una skill o puerta concreta.

Los controles de coordinación opcionales se documentan en el [límite de cuota de sesión](../guide/configuration-reference.md#session-quota-caps), en el [bucle de reintento y exploración de `/orchestrate`](../core-concepts/workflows.md#orchestrate) y en la [asignación de workspace](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## La compensación práctica

OMA ofrece al equipo un lugar compartido para definir el enrutamiento, los pasos de ejecución, las comprobaciones y los archivos de salida. A cambio, el equipo debe mantener actualizada la configuración del repositorio y decidir qué workflows o comandos de verificación forman parte de su contrato de aceptación. Esa compensación resulta útil cuando la coherencia entre colaboradores importa más que tener la instalación más pequeña posible.

Para la discusión de posicionamiento original, consulta el [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Próximos pasos

- [Inicio rápido](./quick-start.md): instala, comprueba la configuración y ejecuta una tarea acotada
- [Valores predeterminados importantes](./important-defaults.md): qué activa el instalador y cómo cambiarlo
- [Instalación](./installation.md#presets): elige un preset de skills que cubra los workflows que piensas usar
- [Workflows](../core-concepts/workflows.md): cuándo usar `/work`, `/orchestrate`, `/ultrawork` y `/ralph`
- [Solución de problemas](../guide/troubleshooting.md): soluciones para problemas de instalación, proveedores y hooks
