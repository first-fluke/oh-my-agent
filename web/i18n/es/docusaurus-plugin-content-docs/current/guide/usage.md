---
title: Guía de uso
sidebar_label: Uso de OMA
description: Guía de uso de OMA para elegir tareas según el lector, con ejemplos de una sola habilidad y de varios dominios, flujos de trabajo, autodetección, los 33 paquetes de habilidades, ejecución CLI en paralelo, dashboards, valores predeterminados y recuperación.
---

# Cómo usar oh-my-agent

## Inicio rápido

1. Abre tu proyecto en una IDE o CLI con IA compatible (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen u otro host compatible).
2. El host seleccionado puede cargar [habilidades](../getting-started/glossary.md#skill) desde `.agents/skills/`; los hooks habilitados pueden detectar [flujos](../getting-started/glossary.md#workflow) a partir de palabras clave en lenguaje natural.
3. Describe lo que necesitas en lenguaje natural. El host o el flujo seleccionado enruta la tarea a la habilidad correspondiente.
4. Para trabajo multiagente, usa `/work` u `/orchestrate`.

Las tareas de un solo dominio no requieren una sintaxis especial. Usa la [guía para elegir habilidades y flujos](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) para elegir entre una habilidad individual, `/work`, `/orchestrate`, `/ultrawork` y `/ralph`. Consulta [Inicio rápido](../getting-started/quick-start.md) para la configuración y [Valores predeterminados importantes](../getting-started/important-defaults.md) antes de cambiar proveedores.

## Elige una guía

| Tu tarea | Empieza con | Guía |
|----------|-------------|------|
| Un cambio en un dominio | Un prompt normal (enrutamiento de habilidades) | [Una sola habilidad](./single-skill.md) |
| Una funcionalidad que abarca API, UI, mobile o base de datos | `/work` (paso a paso) u `/orchestrate` (automatizado) | [Proyectos multiagente](./multi-agent-project.md) |
| Un bug con un mensaje de error | `/debug` junto con el error y los pasos de reproducción | [Corrección de bugs](./bug-fixing.md) |
| Observar los agentes mientras se ejecutan | `oma dashboard terminal` | [Monitoreo del dashboard](./dashboard-monitoring.md) |
| Auditar o reanudar resultados de agentes | `oma agent resume SESSION_ID --dry-run` | [Resultados y reanudación](./agent-results-and-resume.md) |
| Algo falló | `oma doctor --json` | [Solución de problemas](./troubleshooting.md) |

---

## Ejemplo 1: tarea simple de un solo dominio

**Escribes:**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Qué ocurre:**

1. El host enruta la solicitud a `oma-frontend` (palabras como "form", "component" y "Tailwind CSS" sirven como señales de enrutamiento).
2. La Capa 1 (`SKILL.md`) ya está cargada con la identidad del agente, las reglas principales y la lista de librerías.
3. Los recursos de la Capa 2 se cargan bajo demanda:
   - `execution-protocol.md`: el flujo de 4 pasos (Analyze, Plan, Implement, Verify).
   - `snippets.md`: patrones de formularios y validación con Zod, además de patrones de componentes existentes cuando la habilidad los proporciona.
4. El agente produce un **CHARTER_CHECK**:
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. El agente implementa:
   - Un componente React con TypeScript en `src/features/auth/components/login-form.tsx`.
   - Un esquema de validación Zod en `src/features/auth/utils/login-validation.ts`.
   - Pruebas Vitest en `src/features/auth/utils/__tests__/login-validation.test.ts`.
   - Un skeleton de carga en `src/features/auth/components/skeleton/login-form-skeleton.tsx`.
<!-- oma-docs:ignore-end -->
6. El agente ejecuta la lista de verificación: accesibilidad (etiquetas ARIA, HTML semántico y navegación por teclado), viewport mobile, rendimiento (sin CLS) y Error Boundaries.

**Resultado esperado:** Un componente React acotado con TypeScript, validación, pruebas y evidencia de accesibilidad cuando el proyecto admite esas comprobaciones. El prompt y el flujo seleccionado determinan qué archivos y comprobaciones se ejecutan realmente.

---

## Ejemplo 2: proyecto multidominio

**Escribes:**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Qué ocurre:**

1. La solicitud abarca frontend, backend y mobile. El agente host puede usar ese alcance para recomendar una forma de coordinación.
2. Con el hook de detección de palabras clave habilitado, "Build a TODO app" coincide con un patrón configurado de `/orchestrate` y puede activarlo. El hook compara el texto; no clasifica la solicitud como multidominio. Usa un comando explícito para seleccionar el flujo que quieres.

**Con `/work` (paso a paso con control del usuario):**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Paso 1, el agente PM planifica:**
   - Identifica los dominios: backend (API de auth y CRUD de tareas), frontend (login y UI de lista) y mobile (app Flutter).
   - Define contratos de API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`.
   - Crea un desglose de tareas por nivel de prioridad (los niveles inferiores se ejecutan primero):
     - Nivel 1: API de auth backend, API CRUD de tareas backend.
     - Nivel 2: login/register frontend, lista de tareas frontend, pantallas auth mobile, lista de tareas mobile.
     - Nivel 3: revisión QA.
   - Guarda el resultado en `.agents/results/plan-{sessionId}.json`.

4. **Paso 2, revisar el plan:** El agente presenta el plan y continúa dentro de la autorización existente; solo pregunta por una decisión relevante o una autorización nueva.

5. **Paso 3, generar agentes por nivel de prioridad:**
   ```bash
   # Tier 1 (parallel). Task IDs come from .agents/results/plan-session-todo-01.json
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 --task-id api-auth -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 --task-id db-schema &
   wait

   # Tier 2 (parallel, after tier 1 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 --task-id web-ui -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 --task-id mobile-ui -w ./apps/mobile &
   wait
   ```

   `--task-id` debe coincidir con el `id` de una tarea del plan de la sesión; sin él, el ID de tarea toma por defecto el ID del agente, y una sesión planificada rechaza un ID que no contiene (`Unknown plan task`). Las sesiones ad hoc sin plan pueden omitirlo.

6. **Paso 4, el agente QA revisa:**
   - Seguridad: cumplimiento de OWASP Top 10 (validación JWT, CSRF y comprobación de inyección SQL).
   - Rendimiento: comprobación de consultas N+1 y paginación.
   - Accesibilidad: WCAG 2.2 AA en todos los componentes frontend.
   - Entre dominios: alineación del contrato de API entre frontend, mobile y backend.

7. **Paso 5, iterar:** Si QA encuentra problemas CRITICAL, vuelve a generar el agente responsable con el informe QA.

---

## Ejemplo 3: corrección de bugs

**Escribes:**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Qué ocurre:**

1. `oma-debug` se activa automáticamente (palabras clave: "bug", "error", "Cannot read property").
2. **Paso 1, recopilar:** Se capturan el mensaje de error y el contexto.
<!-- oma-docs:ignore-start -->
3. **Paso 2, reproducir:** MCP `search_for_pattern` encuentra la llamada a `.map()` en `src/features/tasks/components/task-list.tsx`.
<!-- oma-docs:ignore-end -->
4. **Paso 3, diagnosticar:** MCP `find_referencing_symbols` sigue el flujo de datos:
   - El hook `useQuery` obtiene las tareas de la API.
   - El componente se renderiza antes de que lleguen los datos.
   - `tasks` es `undefined` durante el estado de carga.
   - Causa raíz: falta comprobar el estado de carga antes de `.map()`.
5. **Paso 4, proponer la corrección:** Presentar un cambio mínimo que añada la comprobación del estado de carga y una guarda null.
6. **Paso 5, implementar:**
   - Añadir un skeleton de carga mientras se obtienen los datos.
   - Añadir la comprobación null: `tasks?.map()` o un retorno temprano durante la carga.
   - Escribir una prueba de regresión que compruebe que el componente se renderiza cuando `tasks` es `undefined`.
7. **Paso 6, buscar patrones similares:** MCP `search_for_pattern` busca otras llamadas `.map()` sobre arrays potencialmente undefined.
   - Encuentra 3 patrones similares en `user-list.tsx`, `comment-list.tsx` y `notification-list.tsx`.
   - Aplica de forma proactiva el mismo patrón de corrección.
8. **Paso 7, documentar:** El informe del bug se escribe en la memoria con causa raíz, corrección y prevención.

---

## Ejemplo 4: sistema de diseño

**Escribes:**
```text
Design a dark premium landing page for my B2B SaaS analytics product
```

**Qué ocurre:**

1. `oma-design` se activa (palabras clave: "design", "landing page", "dark", "premium").
2. **Fase 1, SETUP:** Comprueba `.design-context.md`. Si falta, pregunta:
   - ¿Qué idiomas admite el servicio? (solo en / + CJK).
   - ¿Cuál es el público objetivo? (B2B, usuarios técnicos, 25-45).
   - ¿Cuál es la personalidad de la marca? (profesional / premium).
   - ¿Cuál es la dirección estética? (dark premium).
   - ¿Qué sitios sirven de referencia? (el usuario proporciona ejemplos).
   - ¿Qué nivel de accesibilidad? (WCAG AA).
3. **Fase 3, ENHANCE:** Si el prompt es vago, lo transforma en una especificación sección por sección.
4. **Fase 4, PROPOSE:** Presenta 3 direcciones de diseño:
   - **Direction A: "Midnight Observatory"**: azul marino profundo (#0f1729), acentos cian (#22d3ee), Inter + JetBrains Mono, layout de bento grid y revelaciones controladas por scroll.
   - **Direction B: "Carbon Interface"**: gris neutro (#18181b), acentos ámbar (#f59e0b), fuentes del sistema, layout de tablero de ajedrez y microinteracciones activadas por hover.
   - **Direction C: "Deep Space"**: oscuro puro (#0a0a0a), acentos esmeralda (#10b981), Geist + Geist Mono, secciones full-bleed y animaciones de entrada.
5. **Fase 5, GENERATE:** Según la dirección elegida, genera:
   - `DESIGN.md` con 6 secciones (tipografía, color, espaciado, movimiento, componentes y accesibilidad).
   - Propiedades personalizadas CSS.
   - Extensiones de configuración Tailwind.
   - Variables de tema de shadcn/ui.
6. **Fase 6, AUDIT:** Ejecuta comprobaciones responsive (mínimo 320px), WCAG 2.2, heurísticas de Nielsen y detección de AI slop.
7. **Fase 7, HANDOFF:** "Diseño completo. Ejecuta `/orchestrate` para implementarlo con oma-frontend."

---

## Ejemplo 5: ejecución paralela mediante CLI

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web             # Web UI; prints http://127.0.0.1:9847/

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Si el runtime actual coincide con el proveedor objetivo en `.agents/oma-config.yaml`, los flujos deben preferir subagentes nativos:

- Claude Code -> `.claude/agents/*.md`.
- Codex CLI -> `.codex/agents/*.toml`.
- Qwen Code -> `.qwen/agents/*.md`, seleccionado mediante el `subagent_type` de la herramienta Agent.
- Antigravity CLI/IDE -> `oma agent spawn` mediante `agy`.

Las tareas entre proveedores y `model_preset: free` usan `oma agent spawn`. El despacho nativo sigue necesitando el [ciclo de vida de resultados](./agent-results-and-resume.md) para registrar la evidencia de verificación.

---

## Ejemplo 6: ultrawork para máxima calidad

**Escribes:**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**Qué ocurre (5 fases, 17 pasos y 12 pasos de revisión aislados):**

**Fase 1, PLAN (pasos 1-4, agente PM inline):**
- Paso 1: Crear el plan con desglose de tareas, contratos de API y dependencias.
- Paso 2: Revisión del plan (comprobación de integridad; ¿están asignados todos los requisitos?).
- Paso 3: Meta-revisión (verificar que la revisión fue suficiente).
- Paso 4: Revisión de sobreingeniería (enfoque MVP, sin complejidad innecesaria).
- PLAN_GATE: plan documentado, suposiciones enumeradas y alcance autorizado.

**Fase 2, IMPL (paso 5, agentes de desarrollo generados):**
- El agente backend implementa la integración con Stripe (webhooks, idempotencia y manejo de errores).
- El agente frontend crea el flujo de checkout y la UI de estado del pago.
- Paso 5.2: Registrar una línea base solo cuando se necesita una comparación de medición definida.
- IMPL_GATE: pasan las comprobaciones y pruebas aplicables que no emiten archivos, solo se modifican los archivos planificados; las comprobaciones de build solo se ejecutan cuando se solicitan explícitamente.

**Fase 3, VERIFY (pasos 6-8, agente QA generado):**
- Paso 6: Revisión de alineación (¿la implementación coincide con el plan?).
- Paso 7: Revisión de seguridad/bugs (OWASP, npm audit y buenas prácticas de seguridad de Stripe).
- Paso 8: Revisión de mejora/regresión (sin regresiones nuevas).
- VERIFY_GATE: cero CRITICAL, cero HIGH, se cumplen los objetivos de medición aplicables del proyecto.

**Fase 4, REFINE (pasos 9-13, agente de refactorización generado):**
- Paso 9: Dividir archivos (> 500 líneas) y funciones (> 50 líneas) grandes.
- Paso 10: Revisión de integración/reutilización (eliminar lógica duplicada).
- Paso 11: Revisión de efectos secundarios (seguir el impacto en cascada con `find_referencing_symbols`).
- Paso 12: Revisión completa del cambio (consistencia de nombres y alineación de estilo).
- Paso 13: Limpiar código muerto.
- REFINE_GATE: ninguna regresión medida sin resolver y código limpio.

**Fase 5, SHIP (pasos 14-17, agente QA generado):**
- Paso 14: Revisión de calidad de código (lint, tipos y cobertura).
- Paso 15: Verificación del flujo UX (recorrido de pago de extremo a extremo).
- Paso 16: Revisión de problemas relacionados (comprobación final del impacto en cascada).
- Paso 17: Preparación para el despliegue (gestión de secretos, scripts de migración y plan de rollback).
- SHIP_GATE: todas las comprobaciones pasan; reutiliza la autorización existente. Publicar o desplegar requiere autorización para esa acción.

---

## Todos los comandos de flujo

| Comando | Tipo | Qué hace | Cuándo usarlo |
|---------|------|----------|---------------|
| `/orchestrate` | Persistente | Carga o crea un plan y delega la ejecución paralela con monitoreo y verificación | Tareas independientes aptas para coordinación paralela automatizada |
| `/work` | Persistente | Planificación, implementación y QA multidominio paso a paso dentro del alcance autorizado | Funcionalidades que cruzan dominios y requieren entrega coordinada |
| `/ultrawork` | Persistente | Flujo de calidad en 5 fases y 17 pasos con 12 checkpoints de revisión aislados | Entregas de máxima calidad y código crítico para producción |
| `/plan` | No persistente | Desglose dirigido por PM, contratos de API y artefactos de plan rastreados en `docs/plans/work/` (secuenciales `NNN-name.md`, campo Status para el ciclo de vida) | Antes de trabajo multiagente complejo; funcionalidades complejas con progreso y decisiones registradas |
| `/brainstorm` | No persistente | Ideación orientada al diseño con 2-3 propuestas de enfoque | Antes de comprometerse con un enfoque de implementación |
| `/deepinit` | No persistente | Inicialización completa del proyecto (AGENTS.md, ARCHITECTURE.md, docs/) | Configurar oh-my-agent en un código existente |
| `/review` | No persistente | Pipeline QA: seguridad OWASP, rendimiento, accesibilidad y calidad de código | Antes de fusionar código o del despliegue |
| `/security` | No persistente | Escanear código fuente de la aplicación, habilidades de agentes o componentes MCP; ejecutar pruebas de penetración web acotadas contra un despliegue de prueba; validar hallazgos y configurar gates de seguridad mediante `oma-security` | Antes de un release o cuando un cambio necesita un escaneo o gate de seguridad |
| `/debug` | No persistente | Depuración estructurada: reproducir, diagnosticar, corregir, probar regresión y escanear | Investigar bugs y errores |
| `/design` | No persistente | Flujo de diseño en 7 fases que produce DESIGN.md con tokens | Crear sistemas de diseño, landing pages o rediseños UI |
| `/scm` | No persistente | Flujo SCM para Git (branch/merge/conflict/worktree/baseline) más Conventional Commits con detección automática de tipo/alcance y división por funcionalidad | Después de cambios o al gestionar la configuración del repositorio |
| `/tools` | No persistente | Gestión de visibilidad de herramientas MCP (activar/desactivar grupos) | Controlar qué herramientas MCP pueden usar los agentes |
| `/stack-set` | No persistente | Detectar el stack y generar referencias backend o mobile (Swift/Flutter/RN) | Configurar convenciones de código específicas del lenguaje |
| `/architecture` | No persistente | Diagnóstico, comparación y registros de decisiones de arquitectura | Revisar límites o elegir una arquitectura |
| `/convert` | No persistente | Enrutar la conversión de documentos a la habilidad adecuada | Convertir fuentes HWP/HWPX o PDF |
| `/docs` | No persistente | Verificación documental y propuestas de sincronización dirigidas por diff | Comprobar docs contra el código actual |
| `/explain` | No persistente | Generar y validar un explainer HTML offline de cambios de código | Enseñar un diff, PR, branch o rango de commits |
| `/recap` | No persistente | Resumir trabajo de historiales de herramientas de IA compatibles | Recaps diarios o de períodos |
| `/schedule` | No persistente | Registrar trabajos recurrentes de agentes | Recaps nocturnos, escaneos o mantenimiento |
| `/video` | No persistente | Componer vídeos reproducibles desde guion, narración y visuales | Shorts, explainers y demos |
| `/ralph` | Persistente | Ejecución ultrawork repetida con un juez mediante prompt y salvaguardas de bucle | Repetir explícitamente hasta que pasen criterios mecánicos |

---

## Ejemplos de autodetección

oh-my-agent detecta palabras clave de flujos en 11 idiomas. Estos ejemplos muestran cómo el lenguaje natural activa los flujos:

| Escribes | Flujo detectado | Idioma |
|----------|-----------------|--------|
| "plan the authentication feature" | `/plan` | Inglés |
| "do everything in parallel" | `/orchestrate` | Inglés |
| "review the code for security" | `/review` | Inglés |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | Inglés |
| "design a landing page for our product" | `/design` | Inglés |
| "fix the login bug" | `/debug` | Inglés |
| "계획 세워줘" | `/plan` | Coreano |
| "버그 수정해줘" | `/debug` | Coreano |
| "디자인 시스템 만들어줘" | `/design` | Coreano |
| "자동으로 실행해" | `/orchestrate` | Coreano |
| "コードレビューして" | `/review` | Japonés |
| "計画を立てて" | `/plan` | Japonés |
| "修复这个 bug" | `/debug` | Chino |
| "设计一个着陆页" | `/design` | Chino |
| "revisar código" | `/review` | Español |
| "diseña la página" | `/design` | Español |
| "debuggen" | `/debug` | Alemán |
| "coordonner étape par étape" | `/work` | Francés |
| "don't stop until it's done" | `/ralph` | Inglés |
| "끝까지 해" | `/ralph` | Coreano |
| "最後までやって" | `/ralph` | Japonés |

**Las consultas informativas se filtran:**

| Escribes | Resultado |
|----------|-----------|
| "what is orchestrate?" | No se activa ningún flujo (patrón informativo: "what is") |
| "explain how /plan works" | No se activa ningún flujo (patrón informativo: "explain") |
| "어떻게 사용해?" | No se activa ningún flujo (patrón informativo: "어떻게") |
| "レビューとは何ですか" | No se activa ningún flujo (patrón informativo: "とは") |

---

## Las 33 habilidades: referencia rápida

El preset `all` del instalador sigue el registro activo. La tabla agrupa cada habilidad actual por su uso principal; una habilidad aún puede coordinarse con otra en una frontera.

| Habilidad | Ideal para | Salida principal |
|-----------|------------|------------------|
| **oma-academic-writing** | Redacción, revisión y auditoría académica anti-IA | Prosa orientada a publicación y revisión de afirmaciones/evidencia |
| **oma-architecture** | Límites de sistema, compromisos y ADR | Recomendación arquitectónica o registro de decisión |
| **oma-backend** | APIs, auth, lógica de servidor y migraciones | Cambios y verificación de router/service/repository |
| **oma-brainstorm** | Ideas ambiguas y comparación de enfoques | Documento de diseño en `docs/plans/designs/` |
| **oma-coordination** | Coordinación manual multiagente | Guía paso a paso de tareas y handoffs |
| **oma-db** | Diseño de esquemas, ERD, consultas, capacidad | Documentación de esquema, migraciones y plan de recuperación |
| **oma-debug** | Reproducción de bugs y causa raíz | Corrección mínima, evidencia de regresión y búsqueda de patrones |
| **oma-security** | Escaneo de seguridad de código fuente, habilidades de agentes y MCP; pruebas de penetración web acotadas | Hallazgos validados y configuración de gates de escaneo |
| **oma-design** | Sistemas de diseño, landing pages y tokens | `DESIGN.md`, tokens y guía de componentes |
| **oma-dev-workflow** | CI/CD, monorepos, migraciones y releases | Configuración de flujos y comprobaciones de release |
| **oma-docs** | Referencias rotas y drift documental | Informe verify o candidatos de sync dirigidos por diff |
| **oma-explanation** | Recorridos de diffs, PRs, branches o commits | Explainer HTML offline con Background, Intuition, Code y Quiz |
| **oma-frontend** | Componentes UI, formularios, páginas y estilos Angular o React | Cambios frontend y comprobaciones relevantes |
| **oma-hwp** | Conversión HWP/HWPX/HWPML | Markdown con encabezados, tablas, imágenes y enlaces |
| **oma-image** | Generación de imágenes y recursos visuales | Ejecución reproducible con manifest |
| **oma-market** | Problemas, tendencias, competidores e investigación de descubrimiento | Brief de investigación conforme a LAW con marcos |
| **oma-mobile** | Trabajo Flutter, React Native y Swift iOS | Pantallas mobile, estado, integración de plataforma y pruebas |
| **oma-observability** | Traces, métricas, logs, perfiles, SLOs y forense de incidentes | Recomendación o guía de implementación de observabilidad por capas |
| **oma-orchestration** | Ejecución paralela automatizada | Planes coordinados, actualizaciones de memoria y recopilación de resultados |
| **oma-pdf** | Conversión PDF y extracción con OCR | Markdown con orden de lectura, tablas, listas e imágenes |
| **oma-pm** | Requisitos, desglose y contratos de API | `.agents/results/plan-{sessionId}.json` y task board |
| **oma-qa** | Revisión de seguridad, rendimiento, accesibilidad y calidad | Informe de hallazgos con severidad y evidencia de corrección |
| **oma-recap** | Retrospectivas de trabajo entre herramientas | Recap diario o de período en `.agents/results/recap/` |
| **oma-refactor** | Reestructuración preservando comportamiento | Cambios con caracterización y evidencia de calidad |
| **oma-scholar** | Búsqueda académica y sidecars de artículos | Operaciones validadas sobre sidecars `.knows.yaml` |
| **oma-scm** | Ramas Git, worktrees, líneas base e higiene de commits | Plan SCM o salida Conventional Commit |
| **oma-search** | Búsqueda confiable de docs, web, código y local | Resultados enrutados con etiquetas de confianza |
| **oma-skill-creation** | Crear y auditar habilidades OMA | Archivos de habilidades SSL-lite y resultados de `oma skill audit` |
| **oma-slide** | Decks HTML y exportaciones | HTML validado empaquetado, PDF, PNG o PPTX |
| **oma-tf-infra** | Infraestructura Terraform, IAM y policy-as-code | Módulos Terraform, planes y controles |
| **oma-translation** | Localización de UI, documentación y marketing | Contenido traducido preservando contexto |
| **oma-video** | Shorts, explainers y demos | Ejecución reproducible con recursos y manifest |
| **oma-voice** | TTS, STT y voiceovers locales | Artefactos de audio o transcripción con manifest |

---

## Configuración de dashboards

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

Ambos comandos observan `.agents/state/memories/` bajo el directorio actual. Pasa `--project-root <path>` para observar otro proyecto, o define `MEMORIES_DIR`. La tabla de agentes tiene cuatro columnas:

| Columna | Origen |
|---------|--------|
| Agent | `task-board.md`, o los nombres de agentes descubiertos en los archivos de memoria |
| Status | Símbolos de terminal: ● en ejecución (verde), ✓ completado (cian), ✗ fallido (rojo), ○ bloqueado (amarillo), ◌ pendiente (atenuado) |
| Turn | `turn: N` en el archivo `progress-<agent>*.md` del agente |
| Task | Texto de la tarea del task board o del archivo del agente |

Debajo de la tabla, ambos dashboards muestran la actividad más reciente de los cinco archivos de memoria modificados más recientemente. Los layouts, las fuentes de datos y los pasos de recuperación están en [Monitoreo del dashboard](./dashboard-monitoring.md).

---

## Conceptos clave explicados

### Divulgación progresiva

Las habilidades se cargan en dos capas para ahorrar tokens. La Capa 1 (`SKILL.md`) entra en contexto cuando el host enruta la habilidad; el inyector pasa una ruta, no el contenido. La Capa 2 (`resources/`) solo se lee cuando la tarea lo necesita; la dificultad fija un presupuesto flexible, no una lista de archivos. El ahorro depende de las habilidades y de la tarea, así que mídelo en lugar de suponer una cifra: el [cálculo de ahorro de tokens](../core-concepts/skills.md#token-savings-math) incluye el script y explica qué cubren sus estimaciones.

### Optimización de tokens

Además de la divulgación progresiva, oh-my-agent optimiza los tokens mediante:
- **Gestión del presupuesto de contexto:** no leas archivos completos; usa `find_symbol` en lugar de `read_file`.
- **Carga perezosa de recursos:** carga guías de errores solo ante errores y listas de verificación solo durante la verificación.
- **Ramas según dificultad:** las tareas Simple omiten el análisis y usan listas mínimas.
- **Seguimiento del progreso:** los agentes registran los archivos leídos para evitar releerlos.

### Generación mediante CLI

Cuando ejecutas `oma agent spawn`, la CLI:
1. Resuelve el proveedor del rol a partir de opciones explícitas, sobrescrituras del agente, el preset de modelo y el fallback configurado.
2. Inyecta el protocolo de ejecución específico del proveedor desde `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.
3. Compone el prompt del agente con las reglas principales de SKILL.md, el protocolo de ejecución y los recursos relevantes para la tarea.
4. Genera el agente como un proceso CLI independiente.
5. La ejecución registra un receipt estructurado en `.agents/state/agent-runs/` e inyecta una ruta de claim.
6. El agente escribe un claim estructurado; los archivos Markdown legibles de progreso y resultados son complementarios.

### Almacén de memoria del proyecto

Los agentes se coordinan mediante archivos persistentes en `.agents/state/memories/` (los proyectos antiguos recurren a `.serena/memories/`). El orquestador escribe archivos de sesión y task board con ámbito de ejecución. Cada ejecución escribe `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` y `result-{agentId}-{taskId}-{runId}-{sessionId}.md` cuando la salida Markdown de progreso o resultado está habilitada; los recibos y claims estructurados de `.agents/state/agent-runs/` son la autoridad para las generaciones CLI. Los agentes leen y escriben estos archivos con sus herramientas nativas; la asignación de herramientas sigue siendo configurable en `.agents/mcp.json → memoryConfig.tools`.

### Workspaces

<!-- oma-docs:ignore-start -->
El flag `-w` de `agent spawn` aísla un agente en un directorio concreto. Esto es fundamental para ejecutar en paralelo. Sin aislamiento, dos agentes pueden modificar el mismo archivo y crear conflictos. Layout estándar: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Consejos

1. **Sé específico en los prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" produce mejores resultados que "make an app".

2. **Usa workspaces para agentes paralelos.** Pasa siempre `-w ./path` para evitar conflictos entre agentes que trabajan a la vez.

3. **Fija los contratos de API antes de generar agentes de implementación.** Ejecuta `/plan` primero para que frontend y backend coincidan en la forma de los endpoints.

4. **Monitorea activamente.** Abre un dashboard de terminal para detectar pronto los agentes que fallan, en lugar de descubrir los problemas cuando todos los agentes ya han terminado.

5. **Itera volviendo a generar agentes.** Si el resultado no es correcto, vuelve a generarlo con la tarea original y el contexto de corrección. No empieces de cero.

6. **Ajusta la coordinación a la tarea.** Empieza con una sola habilidad para un dominio; usa la [guía de selección](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) cuando la tarea necesite coordinación o un proceso de calidad explícito.

7. **Usa `/brainstorm` antes de `/plan` para ideas ambiguas.** Brainstorm aclara la intención y el enfoque antes de que PM descomponga la tarea.

8. **Ejecuta `/deepinit` en códigos nuevos.** Crea AGENTS.md y ARCHITECTURE.md para que todos los agentes entiendan la estructura del proyecto.

9. **Configura `model_preset`.** Empieza con `auto`, elige un preset fijo como `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` o `mixed`, o usa `free` con su gateway local. Añade sobrescrituras `agents:` para un control fino. Consulta [Modelos por agente](./per-agent-models.md).

10. **Usa `/ultrawork` cuando quieras explícitamente su proceso completo de revisión.** El flujo de 5 fases ejecuta 12 pasos de revisión aislados; cargar habilidades por sí solo no ejecuta esas comprobaciones.

---

## Solución de problemas {#troubleshooting}

A continuación se muestran los problemas comunes. Para mensajes de error, fallos en los resultados de ejecución, programaciones y hooks, consulta [Solución de problemas](./troubleshooting.md).

| Problema | Causa | Solución |
|----------|-------|----------|
| Las habilidades no se detectan en la IDE | Falta `.agents/skills/` o no hay archivos `SKILL.md` | Ejecuta el instalador (`bunx oh-my-agent@latest`), comprueba los symlinks en `.claude/skills/` y reinicia la IDE |
| No se encuentra la CLI al generar | La CLI seleccionada no está instalada o no está en `PATH` | Ejecuta `which <selected-cli>` (por ejemplo, `claude`, `codex`, `agy`, `qwen` o `kiro-cli`), abre un shell nuevo o instálala según la guía de instalación |
| Los agentes producen código en conflicto | No hay aislamiento de workspaces | Usa workspaces separados: `-w ./apps/api`, `-w ./apps/web` |
| El dashboard muestra "No agents detected yet" | Los agentes aún no han escrito en memoria, o el dashboard observa otro directorio | Espera al primer archivo de progreso; ejecuta desde la raíz del proyecto o pasa `--project-root <path>` |
| `oma dashboard web` termina con "port 9847 is already in use" | Otro proceso ocupa el puerto | `DASHBOARD_PORT=8080 oma dashboard web` |
| El informe QA tiene más de 50 problemas | Es normal en la primera revisión de un código grande | Atiende primero CRITICAL y HIGH; documenta MEDIUM/LOW para sprints futuros |
| La autodetección activa el flujo equivocado | Ambigüedad de palabras clave | Usa `/command` explícito en lugar de lenguaje natural e informa de los falsos disparos para mejorar el sistema |
| El flujo persistente no se detiene | El archivo de estado todavía existe | Di "workflow done" en el chat o elimina manualmente el archivo de estado de `.agents/state/` |
| El agente está bloqueado en una aclaración HIGH | Requisitos demasiado ambiguos | Responde las preguntas concretas del agente y vuelve a ejecutarlo |
| Las herramientas MCP no funcionan | Serena no está configurado o en ejecución | Ejecuta `oma doctor` para verificar la configuración MCP |
| El agente supera su presupuesto de ejecución | La tarea es demasiado compleja para una sola ejecución | Divide la tarea, usa un flujo con límites explícitos o reintenta con un contrato de aceptación más acotado |
| Se usa la CLI incorrecta | `model_preset` no está configurado o falta una sobrescritura del agente | Ejecuta `oma install` para configurar o establece `model_preset` en `oma-config.yaml`. Consulta [Modelos por agente](./per-agent-models.md). |

---

## Próximos pasos

- Un cambio en un dominio: [Una sola habilidad](./single-skill.md)
- Una funcionalidad que abarca varios dominios: [Proyectos multiagente](./multi-agent-project.md)
- Un bug con un mensaje de error: [Corrección de bugs](./bug-fixing.md)
- Observar una ejecución: [Monitoreo del dashboard](./dashboard-monitoring.md)
- Auditar o reanudar resultados de agentes: [Resultados y reanudación](./agent-results-and-resume.md)
- Algo falló: [Solución de problemas](./troubleshooting.md)
- Detalles de integración del proyecto: [Guía de integración](./integration.md)
- Términos usados en estas guías: [Glosario](../getting-started/glossary.md)
