---
title: Disposición de artefactos
sidebar_label: Disposición de artefactos
description: Dónde guarda OMA los documentos mantenidos, los informes de ejecución y el estado de runtime, y cómo migrar las ubicaciones heredadas.
---

# Disposición de artefactos

OMA usa tres ubicaciones: `docs/` para los documentos de proyecto mantenidos, `.agents/results/` para los informes de ejecución legibles y `.agents/state/` para la coordinación y la evidencia de ejecución. Las rutas de abajo son relativas a la raíz del proyecto.

## Documentos mantenidos

| Ubicación | Contenido |
|----------|---------|
| `docs/decisions/` | Propuestas de enfoque, compensaciones y registros de decisiones de arquitectura (ADR) |
| `docs/plans/work/` | Planes de trabajo, progreso, registros de decisiones y el seguimiento de deuda técnica |
| `docs/plans/contracts/` | Contratos de API adoptados |
| `DESIGN.md` | Sistema de diseño de UI: tipografía, color, espaciado, movimiento y componentes |

Usa un campo `Status` en los documentos de decisión para registrar `draft`, `accepted` o `superseded`. Conserva una decisión sustituida y enlázala con su reemplazo para que su razonamiento siga disponible. En OMA, `design` se refiere al diseño de UI; las propuestas técnicas y los ADR comparten `docs/decisions/`.

Usa un índice de documentos del proyecto, como `docs/README.md`, para enlazar los documentos mantenidos. La migración de artefactos mueve los archivos existentes; no crea un índice ni cambia el estado de un documento.

## Informes de ejecución y estado de runtime

| Ubicación | Contenido |
|----------|---------|
| `.agents/results/result-*.md` | Informes de resultados de agentes y workflows legibles por personas |
| `.agents/results/architecture/` | Análisis y recomendaciones de arquitectura |
| `.agents/results/bugs/` | Informes de bugs |
| `.agents/results/refactor/` | Planes e informes de refactorización |
| `.agents/results/security/` | Informes de escaneo de seguridad |
| `.agents/results/market/` | Briefs de investigación de mercado |
| `.agents/results/recap/` | Recaps de trabajo |
| `.agents/results/explain/` | Explicaciones HTML |
| `.agents/results/api-contracts/` | Borradores de contratos de API |
| `.agents/results/plan-{sessionId}.json` | Plan de tareas actual |
| `.agents/state/memories/` | Resúmenes de sesión, tableros de tareas, progreso, lecciones y registros de experimentos |
| `agent-runs/` de runtime | Recibos estructurados, claims y evidencia de verificación |
| `agent-plans/` de runtime | Planes de ejecución congelados |

Los subdirectorios de informes siguen separados por dominio. Los informes legibles complementan la evidencia estructurada; por sí solos no establecen una finalización verificada. Consulta [Resultados y reanudación](../agent-results-and-resume/).

Los recibos actuales y los planes congelados viven en el directorio de estado del proyecto del perfil activo. Los proyectos más antiguos pueden conservarlos bajo `.agents/state/`. Esta migración no cambia su almacenamiento ni sus vínculos de verificación.

## Promover un documento mantenido

Cuando un artefacto de ejecución pasa a ser una referencia del proyecto, muévelo a la ubicación mantenida correspondiente. Por ejemplo, mueve un contrato adoptado de `.agents/results/api-contracts/` a `docs/plans/contracts/`, o convierte una recomendación de arquitectura en un registro de decisión en `docs/decisions/`. Deja un enlace en la ubicación antigua y actualiza el índice de documentos.

Si la evidencia de ejecución estructurada registra el archivo original o su hash, deja ese archivo intacto y crea en su lugar una versión mantenida. Enlaza el documento mantenido desde el índice del proyecto.

Install, update y link ignoran `.agents/results/`, `.agents/state/` y `docs/plans/` en Git de forma predeterminada. `docs/decisions/` queda fuera de esa exclusión predeterminada. Revisa el `.gitignore` del proyecto cuando adoptes un contrato o un plan de trabajo que el equipo deba versionar.

## Migrar un proyecto existente

Previsualiza primero la migración:

```bash
oma docs migrate --dry-run
```

Para una salida estructurada, añade `--json`. Aplica la misma migración de forma explícita cuando estés listo:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` y `oma update` también ejecutan esta migración. Consolida estas ubicaciones heredadas:

<!-- oma-docs:ignore-start -->
| Ubicación heredada | Destino |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` y sus sidecars de diagramas de autoría | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Los documentos de decisión conservan su estructura de subdirectorios. Los ADR de arquitectura heredados se mueven con sus sidecars `.archify.json` y `.archify.html` de autoría. Las revisiones, recomendaciones y logs de validación específicos de una ejecución permanecen en el directorio de resultados. La migración de resultados cubre los archivos `result-*.md` de nivel superior en los dos directorios de memoria; los demás archivos de memoria se quedan en su sitio.

La migración conserva los archivos de destino existentes. Si otro archivo tiene el mismo nombre, añade un sufijo de origen, como `001-cache--from-plan-designs.md`, e informa de la ruta elegida. Si ese nombre está ocupado, añade un hash de contenido estable. Volver a ejecutar la migración no crea copias duplicadas ni renombra archivos que ya migraron.

Actualiza los enlaces Markdown y las referencias de ruta compatibles en los documentos movidos, las notas de coordinación en Markdown, `docs/**/*.md` y los archivos `README*.md` y `AGENTS.md` de la raíz. Revisa esos cambios con el informe de migración y el diff de Git. La evidencia de runtime estructurada y los archivos `DESIGN.md` de UI quedan excluidos de la reescritura de referencias. Los bloques `oma-docs:ignore-start` / `oma-docs:ignore-end` existentes conservan ejemplos de rutas heredadas.

Revisa el informe en busca de archivos aplazados. Un informe de resultados referenciado por evidencia de ejecución estructurada permanece en su ruta original para que el recibo y el hash registrados sigan siendo válidos. Los recibos, los claims, los planes de ejecución congelados y el resto de la evidencia de runtime se dejan en su sitio. La migración no promueve borradores de contratos, no acepta decisiones ni cambia el sistema de diseño de UI.
