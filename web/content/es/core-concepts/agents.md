---
title: Agentes
description: Referencia completa de los 14 agentes de oh-my-agent — sus dominios, stacks tecnológicos, archivos de recursos, capacidades, protocolo de verificación previa de charter, carga de habilidades en dos capas, reglas de ejecución acotada, puertas de calidad, estrategia de workspaces, flujo de orquestación y memoria en tiempo de ejecución.
---

# Agentes

Los agentes en oh-my-agent son roles de ingeniería especializados. Cada agente tiene un dominio definido, conocimiento de stack tecnológico, archivos de recursos, puertas de calidad y restricciones de ejecución. Los agentes no son chatbots genéricos — son trabajadores acotados que permanecen en su área y siguen protocolos estructurados.

---

## Categorías de Agentes

| Categoría | Agentes | Responsabilidad |
|-----------|---------|-----------------|
| **Ideación** | oma-brainstorm | Explorar ideas, proponer enfoques, producir documentos de diseño |
| **Planificación** | oma-pm | Descomposición de requisitos, desglose de tareas, contratos de API, asignación de prioridad |
| **Implementación** | oma-frontend, oma-backend, oma-mobile, oma-db | Escribir código de producción en sus respectivos dominios |
| **Diseño** | oma-design | Sistemas de diseño, DESIGN.md, tokens, tipografía, color, movimiento, accesibilidad |
| **Infraestructura** | oma-tf-infra | Aprovisionamiento Terraform multi-nube, IAM, optimización de costos, política como código |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migraciones, coordinación de releases, automatización de monorepos |
| **Calidad** | oma-qa | Auditoría de seguridad (OWASP), rendimiento, accesibilidad (WCAG), revisión de calidad de código |
| **Depuración** | oma-debug | Reproducción de bugs, análisis de causa raíz, correcciones mínimas, pruebas de regresión |
| **Localización** | oma-translator | Traducción consciente del contexto preservando tono, registro y términos del dominio |
| **Coordinación** | oma-orchestrator, oma-coordination | Orquestación multiagente automatizada y manual |
| **Git** | oma-scm | Generación de Conventional Commits, división de commits por funcionalidad |

---

## Referencia Detallada de Agentes

### oma-brainstorm

**Dominio:** Ideación orientada al diseño antes de la planificación o implementación.

**Cuándo usar:** Explorando una nueva idea de funcionalidad, entendiendo la intención del usuario, comparando enfoques. Usar antes de `/plan` para solicitudes complejas o ambiguas.

**Cuándo NO usar:** Requisitos claros (ir a oma-pm), implementación (ir a agentes de dominio), revisión de código (ir a oma-qa).

**Reglas principales:**
- No implementar ni planificar antes de la aprobación del diseño
- Una pregunta clarificadora a la vez (no en lotes)
- Siempre proponer 2-3 enfoques con una opción recomendada
- Diseño sección por sección con confirmación del usuario en cada paso
- YAGNI — diseñar solo lo necesario

**Flujo de trabajo:** 6 fases: Exploración de contexto, Preguntas, Enfoques, Diseño, Documentación (guarda en `docs/plans/`), Transición a `/plan`.

**Recursos:** Usa solo recursos compartidos (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-pm

**Dominio:** Gestión de producto — análisis de requisitos, descomposición de tareas, contratos de API.

**Cuándo usar:** Desglosar funcionalidades complejas, determinar viabilidad, priorizar trabajo, definir contratos de API.

**Reglas principales:**
- Diseño API-first: definir contratos antes de tareas de implementación
- Cada tarea tiene: agente, título, criterios de aceptación, prioridad, dependencias
- Minimizar dependencias para máxima ejecución paralela
- Seguridad y pruebas son parte de cada tarea (no fases separadas)
- Las tareas deben ser completables por un solo agente
- Salida JSON del plan + task-board.md para compatibilidad con el orquestador

**Salida:** `.agents/results/plan-{sessionId}.json`, `.agents/brain/current-plan.md`, escritura en memoria para el orquestador.

**Recursos:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Límite de turnos:** Por defecto 10, máximo 15.

---

### oma-frontend

**Dominio:** UI Web — React, Next.js, TypeScript con arquitectura FSD-lite.

**Cuándo usar:** Construir interfaces de usuario, componentes, lógica del lado del cliente, estilos, validación de formularios, integración con API.

**Stack tecnológico:**
- React + Next.js (Server Components por defecto, Client Components para interactividad)
- TypeScript (estricto)
- TailwindCSS v4 + shadcn/ui (primitivos de solo lectura, extender vía cva/wrappers)
- FSD-lite: raíz `src/` + funcionalidad `src/features/*/` (sin importaciones entre funcionalidades)

**Librerías:**
| Propósito | Librería |
|-----------|----------|
| Fechas | luxon |
| Estilos | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| Utilidades | es-toolkit |
| Estado URL | nuqs |
| Estado Servidor | TanStack Query |
| Estado Cliente | Jotai (minimizar uso) |
| Formularios | @tanstack/react-form + Zod |
| Autenticación | better-auth |

**Reglas principales:**
- shadcn/ui primero, extender vía cva, nunca modificar `components/ui/*` directamente
- Mapeo 1:1 de tokens de diseño (nunca codificar colores en duro)
- Proxy sobre middleware (Next.js 16+ usa `proxy.ts`, no `middleware.ts` para lógica de proxy)
- Sin prop drilling más allá de 3 niveles — usar átomos de Jotai
- Importaciones absolutas con `@/` obligatorias
- Objetivo FCP < 1s
- Breakpoints responsive: 320px, 768px, 1024px, 1440px

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Lista de verificación de puerta de calidad:**
- Accesibilidad: etiquetas ARIA, encabezados semánticos, navegación por teclado
- Móvil: verificado en viewports móviles
- Rendimiento: sin CLS, carga rápida
- Resiliencia: Error Boundaries y Loading Skeletons
- Pruebas: lógica cubierta por Vitest
- Calidad: typecheck y lint pasan

**Límite de turnos:** Por defecto 20, máximo 30.

---

### oma-backend

**Dominio:** APIs, lógica del lado del servidor, autenticación, operaciones de base de datos.

**Cuándo usar:** APIs REST/GraphQL, migraciones de base de datos, autenticación, lógica de negocio del servidor, trabajos en segundo plano.

**Arquitectura:** Router (HTTP) -> Service (Lógica de Negocio) -> Repository (Acceso a Datos) -> Models.

**Detección de stack:** Lee manifiestos del proyecto (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) para determinar lenguaje y framework. Recurre al directorio `stack/` si está presente, o pide al usuario ejecutar `/stack-set`.

**Reglas principales:**
- Arquitectura limpia: sin lógica de negocio en manejadores de ruta
- Todas las entradas validadas con la librería de validación del proyecto
- Solo consultas parametrizadas (nunca interpolación de strings en SQL)
- JWT + bcrypt para autenticación; limitar tasa en endpoints de autenticación
- Async donde sea soportado; anotaciones de tipo en todas las firmas
- Excepciones personalizadas vía módulo centralizado de errores
- Estrategia de carga ORM explícita, límites de transacciones, ciclo de vida seguro

**Recursos:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Recursos específicos del stack en `stack/` (generado por `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Límite de turnos:** Por defecto 20, máximo 30.

---

### oma-mobile

**Dominio:** Aplicaciones móviles multiplataforma — Flutter, React Native.

**Cuándo usar:** Apps móviles nativas (iOS + Android), patrones de UI específicos para móvil, funcionalidades de plataforma (cámara, GPS, notificaciones push), arquitectura offline-first.

**Arquitectura:** Clean Architecture: domain -> data -> presentation.

**Stack tecnológico:** Flutter/Dart, Riverpod/Bloc (gestión de estado), Dio con interceptores (API), GoRouter (navegación), Material Design 3 (Android) + iOS HIG.

**Reglas principales:**
- Riverpod/Bloc para gestión de estado (sin setState directo para lógica compleja)
- Todos los controladores liberados en el método `dispose()`
- Dio con interceptores para llamadas API; manejar offline con gracia
- Objetivo 60fps; probar en ambas plataformas

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Límite de turnos:** Por defecto 20, máximo 30.

---

### oma-db

**Dominio:** Arquitectura de bases de datos — SQL, NoSQL, bases de datos vectoriales.

**Cuándo usar:** Diseño de esquemas, ERD, normalización, indexación, transacciones, planificación de capacidad, estrategia de respaldos, diseño de migraciones, arquitectura de base de datos vectorial/RAG, revisión de anti-patrones, diseño consciente de cumplimiento (ISO 27001/27002/22301).

**Flujo por defecto:** Explorar (identificar entidades, patrones de acceso, volumen) -> Diseñar (esquema, restricciones, transacciones) -> Optimizar (índices, particionamiento, archivado, anti-patrones).

**Reglas principales:**
- Elegir modelo primero, motor después
- 3NF por defecto para relacional; documentar compromisos BASE para distribuido
- Documentar las tres capas de esquema: externa, conceptual, interna
- La integridad es de primera clase: entidad, dominio, referencial, regla de negocio
- La concurrencia nunca es implícita: definir límites de transacción y niveles de aislamiento
- Las BDs vectoriales son infraestructura de recuperación, no fuente de verdad
- Nunca tratar la búsqueda vectorial como reemplazo directo de la búsqueda léxica

**Entregables requeridos:** Resumen de esquema externo, esquema conceptual, esquema interno, tabla de estándares de datos, glosario, estimación de capacidad, estrategia de respaldo/recuperación. Para vectorial/RAG: política de versión de embeddings, política de chunking, estrategia de recuperación híbrida.

**Recursos:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Dominio:** Sistemas de diseño, UI/UX, gestión de DESIGN.md.

**Cuándo usar:** Crear sistemas de diseño, landing pages, tokens de diseño, paletas de colores, tipografía, layouts responsive, revisión de accesibilidad.

**Flujo de trabajo:** 7 fases: Configuración (recopilación de contexto) -> Extracción (opcional, desde URLs de referencia) -> Mejora (aumento de prompts vagos) -> Propuesta (2-3 direcciones de diseño) -> Generación (DESIGN.md + tokens) -> Auditoría (responsive, WCAG, Nielsen, verificación de AI slop) -> Entrega.

**Aplicación de anti-patrones ("sin AI slop"):**
- Tipografía: stack de fuentes del sistema por defecto; sin Google Fonts predeterminadas sin justificación
- Color: sin gradientes púrpura a azul, sin orbes/blobs de gradiente, sin blanco puro sobre negro puro
- Layout: sin tarjetas anidadas, sin layouts solo para escritorio, sin layouts de 3 métricas genéricos
- Movimiento: sin easing de rebote en todas partes, sin animaciones > 800ms, respetar prefers-reduced-motion
- Componentes: sin glassmorphism en todas partes, todos los elementos interactivos necesitan alternativas de teclado/táctil

**Reglas principales:**
- Verificar `.design-context.md` primero; crear si falta
- Stack de fuentes del sistema por defecto (fuentes CJK-ready para ko/ja/zh)
- WCAG AA mínimo para todos los diseños
- Responsive-first (móvil como predeterminado)
- Presentar 2-3 direcciones, obtener confirmación

**Recursos:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, más directorio `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) y `examples/` (design-context-example, landing-page-prompt).

---

### oma-tf-infra

**Dominio:** Infraestructura como código con Terraform, multi-nube.

**Cuándo usar:** Aprovisionamiento en AWS/GCP/Azure/Oracle Cloud, configuración Terraform, autenticación CI/CD (OIDC), CDN/balanceadores de carga/almacenamiento/redes, gestión de estado, infraestructura de cumplimiento ISO.

**Detección de nube:** Lee proveedores Terraform y prefijos de recursos (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Incluye tabla completa de mapeo de recursos multi-nube.

**Reglas principales:**
- Agnóstico al proveedor: detectar nube desde el contexto del proyecto
- Estado remoto con versionado y bloqueo
- OIDC-first para autenticación CI/CD
- Plan antes de apply siempre
- IAM de mínimo privilegio
- Etiquetar todo (Environment, Project, Owner, CostCenter)
- Sin secretos en el código
- Fijar versión de todos los proveedores y módulos
- Sin auto-approve en producción

**Recursos:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Dominio:** Automatización de tareas en monorepos y CI/CD.

**Cuándo usar:** Ejecutar servidores de desarrollo, ejecutar lint/format/typecheck a través de apps, migraciones de base de datos, generación de API, builds i18n, builds de producción, optimización CI/CD, validación pre-commit.

**Reglas principales:**
- Siempre usar tareas `mise run` en lugar de comandos directos del gestor de paquetes
- Ejecutar lint/test solo en apps modificadas
- Validar mensajes de commit con commitlint
- CI debe omitir apps sin cambios
- Nunca usar comandos directos del gestor de paquetes cuando existen tareas mise

**Recursos:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-qa

**Dominio:** Aseguramiento de calidad — seguridad, rendimiento, accesibilidad, calidad de código.

**Cuándo usar:** Revisión final antes del despliegue, auditorías de seguridad, análisis de rendimiento, cumplimiento de accesibilidad, análisis de cobertura de pruebas.

**Orden de prioridad de revisión:** Seguridad > Rendimiento > Accesibilidad > Calidad de Código.

**Niveles de severidad:**
- **CRITICAL**: Brecha de seguridad, riesgo de pérdida de datos
- **HIGH**: Bloquea el lanzamiento
- **MEDIUM**: Corregir este sprint
- **LOW**: Backlog

**Reglas principales:**
- Cada hallazgo debe incluir archivo:línea, descripción y corrección
- Ejecutar herramientas automatizadas primero (npm audit, bandit, lighthouse)
- Sin falsos positivos — cada hallazgo debe ser reproducible
- Proporcionar código de remediación, no solo descripciones

**Recursos:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Límite de turnos:** Por defecto 15, máximo 20.

---

### oma-debug

**Dominio:** Diagnóstico y corrección de bugs.

**Cuándo usar:** Bugs reportados por usuarios, crashes, problemas de rendimiento, fallos intermitentes, condiciones de carrera, bugs de regresión.

**Metodología:** Reproducir primero, luego diagnosticar. Nunca adivinar correcciones.

**Reglas principales:**
- Identificar causa raíz, no solo síntomas
- Corrección mínima: cambiar solo lo necesario
- Cada corrección obtiene una prueba de regresión
- Buscar patrones similares en otros lugares
- Documentar en `.agents/brain/bugs/`

**Herramientas Serena MCP usadas:**
- `find_symbol("functionName")` — localizar la función
- `find_referencing_symbols("Component")` — encontrar todos los usos
- `search_for_pattern("error pattern")` — encontrar problemas similares

**Recursos:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Límite de turnos:** Por defecto 15, máximo 25.

---

### oma-translator

**Dominio:** Traducción multilingüe consciente del contexto.

**Cuándo usar:** Traducir cadenas de UI, documentación, textos de marketing, revisar traducciones existentes, crear glosarios.

**Método de 4 etapas:** Analizar Fuente (registro, intención, términos del dominio, referencias culturales, connotaciones emocionales, mapeo de lenguaje figurado) -> Extraer Significado (eliminar estructura de origen) -> Reconstruir en Idioma Destino (orden natural de palabras, coincidencia de registro, división/fusión de oraciones) -> Verificar (rúbrica de naturalidad + verificación de patrones anti-IA).

**Modo refinado opcional de 7 etapas** para calidad de publicación: extiende con etapas de Revisión Crítica, Revisión y Pulido.

**Reglas principales:**
- Escanear archivos de locale existentes primero para coincidir convenciones
- Traducir significado, no palabras
- Preservar connotaciones emocionales
- Nunca producir traducciones palabra por palabra
- Nunca mezclar registros dentro de un texto
- Preservar terminología específica del dominio tal cual

**Recursos:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Dominio:** Coordinación multiagente automatizada vía generación CLI.

**Cuándo usar:** Funcionalidades complejas que requieren múltiples agentes en paralelo, ejecución automatizada, implementación full-stack.

**Valores de configuración por defecto:**

| Configuración | Predeterminado | Descripción |
|---------------|----------------|-------------|
| MAX_PARALLEL | 3 | Máximo de subagentes concurrentes |
| MAX_RETRIES | 2 | Intentos de reintento por tarea fallida |
| POLL_INTERVAL | 30s | Intervalo de verificación de estado |
| MAX_TURNS (impl) | 20 | Límite de turnos para backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Límite de turnos para qa/debug |
| MAX_TURNS (plan) | 10 | Límite de turnos para pm |

**Fases del flujo:** Plan -> Configuración (ID de sesión, inicialización de memoria) -> Ejecución (generar por nivel de prioridad) -> Monitoreo (sondear progreso) -> Verificación (automatizada + bucle de revisión cruzada) -> Recopilación (compilar resultados).

**Bucle de revisión agente-a-agente:**
1. Auto-revisión: el agente verifica su propio diff contra criterios de aceptación
2. Verificación automatizada: `oma verify {agent-type} --workspace {workspace}`
3. Revisión cruzada: el agente QA revisa los cambios
4. En caso de fallo: los problemas se devuelven para corrección (máximo 5 iteraciones totales)

**Monitoreo de Deuda de Clarificación:** Rastrea las correcciones del usuario durante las sesiones. Los eventos se puntúan como clarify (+10), correct (+25), redo (+40). DC >= 50 activa RCA obligatoria. DC >= 80 pausa la sesión.

**Recursos:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Dominio:** Generación de commits Git siguiendo Conventional Commits.

**Cuándo usar:** Después de completar cambios de código, al ejecutar `/scm`.

**Tipos de commit:** feat, fix, refactor, docs, test, chore, style, perf.

**Flujo de trabajo:** Analizar cambios -> Dividir por funcionalidad (si > 5 archivos abarcando diferentes alcances) -> Determinar tipo -> Determinar alcance -> Escribir descripción (imperativo, < 72 caracteres, minúsculas, sin punto final) -> Ejecutar commit inmediatamente.

**Reglas:**
- Nunca usar `git add -A` o `git add .`
- Nunca hacer commit de archivos de secretos
- Siempre especificar archivos al preparar
- Usar HEREDOC para mensajes de commit multilínea
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

## Verificación Previa de Charter (CHARTER_CHECK)

Antes de escribir cualquier código, cada agente de implementación debe producir un bloque CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {dominio del agente}
- Must NOT do: {3 restricciones del alcance de la tarea}
- Success criteria: {criterios medibles}
- Assumptions: {valores por defecto aplicados}
```

**Propósito:**
- Declara lo que el agente hará y no hará
- Detecta ampliación del alcance antes de escribir código
- Hace las suposiciones explícitas para revisión del usuario
- Proporciona criterios de éxito verificables

**Niveles de clarificación:**
- **LOW**: Requisitos claros. Proceder con suposiciones declaradas.
- **MEDIUM**: Parcialmente ambiguo. Listar opciones, proceder con la más probable.
- **HIGH**: Muy ambiguo. Establecer estado como bloqueado, listar preguntas, NO escribir código.

En modo subagente (generado por CLI), los agentes no pueden preguntar a los usuarios directamente. LOW procede, MEDIUM reduce e interpreta, HIGH bloquea y devuelve preguntas para que el orquestador las transmita.

---

## Carga de Habilidades en Dos Capas

El conocimiento de cada agente se divide en dos capas:

**Capa 1 — SKILL.md (~800 bytes):**
Siempre cargada. Contiene frontmatter (nombre, descripción), cuándo usar / cuándo no usar, reglas principales, vista general de arquitectura, lista de librerías y referencias a recursos de Capa 2.

**Capa 2 — resources/ (cargada bajo demanda):**
Cargada solo cuando el agente está trabajando activamente, y solo los recursos que coinciden con el tipo de tarea y dificultad:

| Dificultad | Recursos Cargados |
|------------|-------------------|
| **Simple** | solo execution-protocol.md |
| **Media** | execution-protocol.md + examples.md |
| **Compleja** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Recursos adicionales se cargan durante la ejecución según sea necesario:
- `checklist.md` — en el paso de Verificación
- `error-playbook.md` — solo cuando ocurren errores
- `common-checklist.md` — para verificación final de tareas Complejas

---

## Ejecución Acotada

Los agentes operan bajo límites estrictos de dominio:

- Un agente frontend no modificará código backend
- Un agente backend no tocará componentes de UI
- Un agente DB no implementará endpoints de API
- Los agentes documentan dependencias fuera de alcance para otros agentes

Cuando se descubre una tarea que pertenece a un dominio diferente durante la ejecución, el agente la documenta en su archivo de resultados como un elemento de escalamiento, en lugar de intentar manejarla.

---

## Estrategia de Workspaces

Para proyectos multiagente, los workspaces separados previenen conflictos de archivos:

```
./apps/api      → workspace del agente backend
./apps/web      → workspace del agente frontend
./apps/mobile   → workspace del agente mobile
```

Los workspaces se especifican con el flag `-w` al generar agentes:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Flujo de Orquestación

Al ejecutar un flujo multiagente (`/orchestrate` o `/work`):

1. **Agente PM** descompone la solicitud en tareas específicas por dominio con prioridades (P0, P1, P2) y dependencias
2. **Sesión inicializada** — ID de sesión generado, `orchestrator-session.md` y `task-board.md` creados en memoria
3. **Tareas P0** generadas en paralelo (hasta MAX_PARALLEL agentes concurrentes)
4. **Progreso monitoreado** — el orquestador sondea archivos `progress-{agent}.md` cada POLL_INTERVAL
5. **Tareas P1** generadas después de que P0 completa, y así sucesivamente
6. **Bucle de verificación** ejecutado para cada agente completado (auto-revisión -> verificación automatizada -> revisión cruzada por QA)
7. **Resultados recopilados** de todos los archivos `result-{agent}.md`
8. **Informe final** con resumen de sesión, archivos modificados, problemas pendientes

---

## Definiciones de Agentes

Los agentes se definen en dos ubicaciones:

**`.agents/agents/`** — Contiene 7 archivos de definición de subagentes:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Estos archivos definen la identidad del agente, referencia del protocolo de ejecución, plantilla CHARTER_CHECK, resumen de arquitectura y reglas. Se usan al generar subagentes vía la herramienta Task/Agent (Claude Code) o CLI.

**`.claude/agents/`** — Definiciones de subagentes específicas del IDE que referencian los archivos de `.agents/agents/` vía enlaces simbólicos o copias directas para compatibilidad con Claude Code.

---

## Estado en Tiempo de Ejecución (Memoria Serena)

Durante las sesiones de orquestación, los agentes se coordinan a través de archivos de memoria compartida en `.serena/memories/` (configurable vía `mcp.json`):

| Archivo | Propietario | Propósito | Otros |
|---------|-------------|-----------|-------|
| `orchestrator-session.md` | Orquestador | ID de sesión, estado, hora de inicio, seguimiento de fases | Solo lectura |
| `task-board.md` | Orquestador | Asignaciones de tareas, prioridades, actualizaciones de estado | Solo lectura |
| `progress-{agent}.md` | Ese agente | Progreso turno a turno: acciones realizadas, archivos leídos/modificados, estado actual | El orquestador lee |
| `result-{agent}.md` | Ese agente | Salida final: estado (completado/fallido), resumen, archivos modificados, lista de criterios de aceptación | El orquestador lee |
| `session-metrics.md` | Orquestador | Seguimiento de Deuda de Clarificación, progresión de Quality Score | QA lee |
| `experiment-ledger.md` | Orquestador/QA | Seguimiento de experimentos cuando Quality Score está activo | Todos leen |

Las herramientas de memoria son configurables. Por defecto usa Serena MCP (`read_memory`, `write_memory`, `edit_memory`), pero se pueden configurar herramientas personalizadas en `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Los dashboards (`oma dashboard` y `oma dashboard:web`) observan estos archivos de memoria para monitoreo en tiempo real.
