---
title: "Guía: Proyectos Multi-Agente"
description: Guía completa para coordinar múltiples agentes de dominio en frontend, backend, base de datos, móvil y QA — desde la planificación hasta el merge.
---

# Guía: Proyectos Multi-Agente

## Cuándo Usar Coordinación Multi-Agente

Tu funcionalidad abarca múltiples dominios — API backend + UI frontend + esquema de base de datos + cliente móvil + revisión QA. Un solo agente no puede manejar todo el alcance, y necesitas que los dominios progresen en paralelo sin pisar los archivos del otro.

La coordinación multi-agente es la opción correcta cuando:

- La tarea involucra 2 o más dominios (frontend, backend, mobile, db, QA, debug, pm).
- Hay contratos de API entre dominios (ej., un endpoint REST consumido tanto por web como por móvil).
- Quieres ejecución paralela para reducir el tiempo total.
- Necesitas revisión QA después de la implementación en todos los dominios.

Si tu tarea cabe completamente dentro de un dominio, usa el agente específico directamente.

---

## La Secuencia Completa: /plan a /review

El flujo multi-agente recomendado sigue una pipeline estricta de cuatro pasos.

### Paso 1: /plan — Requisitos y Descomposición de Tareas

El flujo `/plan` se ejecuta inline (sin generación de subagentes) y produce un plan estructurado.

```
/plan
```

Qué sucede:

1. **Recopilar requisitos** — El agente PM pregunta sobre usuarios objetivo, funcionalidades centrales, restricciones y objetivos de despliegue.
2. **Analizar viabilidad técnica** — Usa herramientas de análisis de código MCP (`get_symbols_overview`, `find_symbol`, `search_for_pattern`) para escanear el codebase existente buscando código reutilizable y patrones de arquitectura.
3. **Definir contratos de API** — Diseña contratos de endpoints (método, ruta, esquemas de solicitud/respuesta, autenticación, respuestas de error) y los guarda en `.agents/skills/_shared/core/api-contracts/`.
4. **Descomponer en tareas** — Divide el proyecto en tareas accionables, cada una con: agente asignado, título, criterios de aceptación, prioridad (P0-P3) y dependencias.
5. **Revisar plan con usuario** — Presenta el plan completo para confirmación. El flujo no procederá sin aprobación explícita del usuario.
6. **Guardar plan** — Escribe el plan aprobado en `.agents/plan.json` y registra un resumen en memoria.

El output `.agents/plan.json` es la entrada tanto para `/coordinate` como para `/orchestrate`.

### Paso 2: /coordinate o /orchestrate — Ejecución

Tienes dos caminos de ejecución:

| Aspecto | /coordinate | /orchestrate |
|:--------|:-----------|:-------------|
| **Interacción** | Interactivo — el usuario confirma en cada etapa | Automatizado — ejecuta hasta completar |
| **Planificación PM** | Integrada (Paso 2 ejecuta agente PM) | Requiere plan.json de /plan |
| **Checkpoint de usuario** | Después de revisar el plan (Paso 3) | Antes de comenzar (el plan debe existir) |
| **Modo persistente** | Sí — no puede terminarse hasta completar | Sí — no puede terminarse hasta completar |
| **Mejor para** | Primer uso, proyectos complejos que necesitan supervisión | Ejecuciones repetidas, tareas bien definidas |

#### /coordinate — Pipeline Multi-Agente Interactiva

```
/coordinate
```

1. Analiza la solicitud del usuario e identifica dominios involucrados.
2. Ejecuta el agente PM para descomposición de tareas (crea plan.json).
3. Presenta plan para confirmación del usuario — **se bloquea hasta que se confirme**.
4. Genera agentes por nivel de prioridad (P0 primero, luego P1, etc.), con cada tarea de misma prioridad ejecutándose en paralelo.
5. Monitorea progreso de agentes vía archivos de memoria.
6. Ejecuta revisión del agente QA en todos los entregables (OWASP Top 10, rendimiento, accesibilidad, calidad de código).
7. Si QA encuentra problemas CRITICAL o HIGH, regenera el agente responsable con los hallazgos de QA. Repite hasta 2 veces por problema. Si el mismo problema persiste, activa el **Bucle de Exploración**.

#### /orchestrate — Ejecución Paralela Automatizada

```
/orchestrate
```

1. Carga `.agents/plan.json` (no procederá sin uno).
2. Inicializa sesión con formato de ID `session-YYYYMMDD-HHMMSS`.
3. Crea `orchestrator-session.md` y `task-board.md` en el directorio de memoria.
4. Genera agentes por nivel de prioridad, cada uno recibiendo: descripción de tarea, contratos API y contexto.
5. Monitorea progreso sondeando archivos `progress-{agent}.md`.
6. Verifica cada agente completado vía `verify.sh` — PASS (exit 0) acepta, FAIL (exit 1) regenera con contexto de error (máximo 2 reintentos), y fallo persistente activa el Bucle de Exploración.
7. Recopila todos los archivos `result-{agent}.md` y compila un informe final.

### Paso 3: agent:spawn — Gestión de Agentes a Nivel CLI

El comando `agent:spawn` es el mecanismo de bajo nivel que los flujos llaman internamente. También puedes usarlo directamente:

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

### Paso 4: /review — Verificación QA

```
/review
```

El flujo de revisión ejecuta una pipeline QA completa: verificaciones de seguridad automatizadas, revisión manual OWASP Top 10, análisis de rendimiento, accesibilidad WCAG 2.1 AA, revisión de calidad de código, e informe con hallazgos categorizados como CRITICAL/HIGH/MEDIUM/LOW con `archivo:línea`, descripción y código de remediación.

---

## Estrategia de ID de Sesión

Cada sesión de orquestación obtiene un identificador único en el formato `session-YYYYMMDD-HHMMSS`.

El ID de sesión se usa para nombrar archivos de memoria, rastrear procesos de agentes vía archivos PID, correlacionar archivos de log y agrupar resultados.

---

## Asignación de Workspace por Dominio

Cada agente se genera en un directorio de workspace aislado para prevenir conflictos de archivos. La asignación sigue auto-detección desde configuración de monorepo, candidatos de respaldo, o sobrescritura explícita con `-w`.

| Tipo de Agente | Palabras Clave (en orden de prioridad) |
|:---------------|:--------------------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

---

## Regla de Contratos Primero

Los contratos de API son el mecanismo de sincronización entre agentes. La regla de contratos primero significa:

1. **Los contratos se definen antes de que comience la implementación.**
2. **Cada agente recibe sus contratos relevantes como contexto.**
3. **Los contratos definen la frontera de interfaz** (método HTTP, ruta, esquemas de request/response, autenticación, formatos de error).
4. **Las violaciones de contrato se detectan durante el monitoreo.**
5. **La revisión QA verifica la adherencia a contratos.**

**Por qué importa:** Sin contratos, un agente backend podría devolver `{ "user_id": 1 }` mientras el agente frontend consume `{ "userId": 1 }`. La regla de contratos primero elimina esta clase de bugs de integración completamente.

---

## Puertas de Merge: 4 Condiciones

Antes de que cualquier trabajo multi-agente se considere completo, cuatro condiciones deben cumplirse:

### 1. Build Exitoso
Todo el código compila y construye sin errores.

### 2. Pruebas Pasan
Todas las pruebas existentes continúan pasando, y nuevas pruebas cubren la funcionalidad implementada.

### 3. Solo Archivos Planificados Modificados
Los agentes no deben modificar archivos fuera de su alcance asignado.

### 4. Revisión QA Limpia
No quedan hallazgos CRITICAL o HIGH de la revisión del agente QA.

---

## Anti-Patrones a Evitar

1. **Saltarse el Plan** — Iniciar `/orchestrate` sin un plan.json.
2. **Workspaces Superpuestos** — Asignar dos agentes al mismo directorio de workspace.
3. **Contratos API Faltantes** — Generar agentes backend y frontend sin definir contratos primero.
4. **Ignorar Hallazgos QA** — Tratar la revisión QA como opcional.
5. **Coordinación Manual de Archivos** — Intentar fusionar manualmente las salidas de agentes.
6. **Sobre-Paralelización** — Ejecutar tareas P1 antes de que completen las tareas P0.
7. **Saltarse Verificación** — Usar `agent:spawn` directamente sin ejecutar el script de verificación después.

---

## Validación de Integración Cross-Dominio

Después de que todos los agentes completen sus tareas individuales, se debe validar la integración cross-dominio: alineación de contratos API, consistencia de tipos, flujo de autenticación, manejo de errores y alineación del esquema de base de datos.

---

## Cuándo Está Terminado

Un proyecto multi-agente está completo cuando:

- Todos los agentes en todos los niveles de prioridad han completado exitosamente.
- Los scripts de verificación pasan para cada agente (código de salida 0).
- El informe de revisión QA reporta cero CRITICAL y cero HIGH.
- La alineación de contratos API cross-dominio está confirmada.
- El build tiene éxito y todas las pruebas pasan.
- El informe final está escrito en memoria y presentado al usuario.
- El usuario da aprobación final (en `/coordinate` y SHIP_GATE de ultrawork).
