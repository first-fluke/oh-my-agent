---
title: "Caso de Uso: Skill Individual"
description: Cuando solo necesitas un agente para una tarea enfocada — la vía rápida.
---

# Ejecucion de Skill Individual

La ejecucion de skill individual es la via rapida — un agente, un dominio, una tarea enfocada. Sin sobrecarga de orquestacion, sin coordinacion multiagente. La habilidad se activa automaticamente desde tu prompt en lenguaje natural.

---

## Cuando Usar Skill Individual

Usa esto cuando tu tarea cumpla TODOS estos criterios:

- **Pertenece a un dominio** — la tarea completa pertenece a frontend, backend, mobile, base de datos, diseno, infraestructura u otro dominio individual
- **Autocontenida** — sin cambios de contrato API entre dominios, sin cambios de backend necesarios para una tarea de frontend
- **Alcance claro** — sabes cual deberia ser el resultado (un componente, un endpoint, un esquema, una correccion)
- **Sin coordinacion** — otros agentes no necesitan ejecutarse antes ni despues

**Ejemplos de tareas de skill individual:**
- Construir un componente de UI
- Agregar un endpoint de API
- Corregir un bug en una capa
- Disenar una tabla de base de datos
- Escribir un modulo de Terraform
- Traducir un conjunto de cadenas i18n
- Crear una seccion del sistema de diseno

**Cambiar a multiagente** (`/work` u `/orchestrate`) cuando:
- El trabajo de UI necesita un nuevo contrato API (frontend + backend)
- Una correccion se propaga entre capas (agentes de debug + implementacion)
- La funcionalidad abarca frontend, backend y base de datos
- El alcance crece mas alla de un dominio despues de la primera iteracion

---

## Lista de Verificacion Previa

Antes de escribir el prompt, responde estas cuatro preguntas (se mapean a los cuatro elementos de la [Estructura de Prompt](/es/core-concepts/skills)):

| Elemento | Pregunta | Por Que Importa |
|----------|----------|-----------------|
| **Objetivo** | Que artefacto especifico debe crearse o modificarse? | Previene ambiguedad — "agregar un boton" vs "agregar un formulario con validacion" |
| **Contexto** | Que stack, framework y convenciones aplican? | El agente detecta desde archivos del proyecto, pero ser explicito es mejor |
| **Restricciones** | Que reglas deben seguirse? (estilo, seguridad, rendimiento, compatibilidad) | Sin restricciones, los agentes usan valores por defecto que pueden no coincidir con tu proyecto |
| **Completado Cuando** | Que criterios de aceptacion verificaras? | Da al agente un objetivo y a ti una lista de verificacion |

Si falta algun elemento en tu prompt, el agente:
- **Incertidumbre LOW:** Aplica valores por defecto y lista suposiciones
- **Incertidumbre MEDIUM:** Presenta 2-3 opciones y procede con la mas probable
- **Incertidumbre HIGH:** Se bloquea y hace preguntas (no escribira codigo)

---

## Plantilla de Prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Desglose de la Plantilla

| Parte | Proposito | Ejemplo |
|-------|-----------|---------|
| `Build <specific artifact>` | El Objetivo — que crear | "Build a user registration form component" |
| `using <stack/framework>` | El Contexto — stack tecnologico | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Reglas que el agente debe seguir | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Completado Cuando — resultados verificables | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Requisitos de pruebas | "valid/invalid submit paths, edge cases for email validation" |

---

## Ejemplos Reales

### Frontend: Formulario de Login

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Flujo de ejecucion esperado:**

1. **Skill activation:** `oma-frontend` activates (keywords: "form", "component", "Tailwind CSS", "React")
2. **Difficulty assessment:** Medium (2-3 files, some design decisions around validation UX)
3. **Resources loaded:**
   - `execution-protocol.md` (always)
   - `snippets.md` (form + Zod patterns)
   - `component-template.tsx` (React structure)
4. **CHARTER_CHECK output:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **Implementation:**
   - Creates `src/features/auth/components/login-form.tsx` (Client Component with `"use client"`)
   - Creates `src/features/auth/utils/login-schema.ts` (Zod schema)
   - Creates `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Uses shadcn/ui `<Button>`, `<Input>`, `<Label>` (read-only, no modifications)
   - Form handled by `@tanstack/react-form` with Zod validation
   - Absolute imports with `@/`
   - One component per file
6. **Verification:**
   - Checklist: ARIA labels present, semantic headings, keyboard navigation works
   - Mobile: renders correctly at 320px viewport
   - Performance: no CLS
   - Tests: Vitest test file at `src/features/auth/utils/__tests__/login-schema.test.ts`

---

### Backend: Endpoint REST API

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Flujo de ejecucion esperado:**

1. **Skill activation:** `oma-backend` activates (keywords: "API", "endpoint", "REST")
2. **Stack detection:** Reads `pyproject.toml` or `package.json` to determine language/framework. If `stack/` exists, loads conventions from there.
3. **Difficulty assessment:** Medium (2-3 files: route, service, repository, plus test)
4. **Resources loaded:**
   - `execution-protocol.md` (always)
   - `stack/snippets.md` if available (route, paginated query patterns)
   - `stack/tech-stack.md` if available (framework-specific API)
5. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementation:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` with parameterized query
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` — business logic wrapper
   - Router: `GET /api/tasks` with JWT auth middleware, input validation, response formatting
   - Tests: auth required returns 401, pagination returns correct cursor, filter works, empty returns 200 with empty array

---

### Mobile: Pantalla de Configuracion

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Flujo de ejecucion esperado:**

1. **Skill activation:** `oma-mobile` activates (keywords: "Flutter", "screen", "mobile")
2. **Difficulty assessment:** Medium (settings screen + state management + offline handling)
3. **Resources loaded:**
   - `execution-protocol.md`
   - `snippets.md` (screen template, Riverpod provider pattern)
   - `screen-template.dart`
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **Implementation:**
   - Screen: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget with Riverpod)
   - Providers: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Offline handling: Dio interceptor catches `SocketException`, falls back to cached data
   - All controllers disposed in `dispose()` method

---

### Base de Datos: Diseno de Esquema

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Flujo de ejecucion esperado:**

1. **Skill activation:** `oma-db` activates (keywords: "database", "schema", "ERD", "migration")
2. **Difficulty assessment:** Complex (architecture decisions, multiple entities, capacity planning)
3. **Resources loaded:**
   - `execution-protocol.md`
   - `document-templates.md` (deliverable structure)
   - `examples.md`
   - `anti-patterns.md` (review during optimization)
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Explore (entities, relationships, access patterns, volume estimates) -> Design (external/conceptual/internal schemas, constraints, lifecycle fields) -> Optimize (indexes for query patterns, partitioning strategy, backup plan, anti-pattern review)
6. **Deliverables:**
   - External schema summary (views per role: admin, project manager, team member)
   - Conceptual schema with ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.)
   - Internal schema with physical DDL, indexes, partitioning
   - Data standards table (field naming rules, type conventions)
   - Glossary (tenant, workspace, assignee, etc.)
   - Capacity estimation sheet
   - Backup strategy (daily full + hourly incremental, 30-day retention)
   - Migration script

---

## Lista de Verificacion de Puerta de Calidad

Despues de que el agente entregue su salida, verifica estos elementos antes de aceptar:

### Verificaciones Universales (Todos los Agentes)

- [ ] **El comportamiento coincide con los criterios de aceptacion** — cada criterio de tu prompt esta satisfecho
- [ ] **Las pruebas cubren el camino feliz y casos limite clave** — no solo el camino feliz
- [ ] **Sin cambios de archivos no relacionados** — solo se modificaron archivos relevantes para la tarea
- [ ] **Modulos compartidos no rotos** — importaciones, tipos e interfaces usadas por otro codigo siguen funcionando
- [ ] **Se siguio el charter** — las restricciones "Must NOT do" fueron respetadas
- [ ] **Lint, typecheck, build pasan** — ejecuta las verificaciones estandar de tu proyecto

### Especificos de Frontend

- [ ] Accesibilidad: elementos interactivos tienen `aria-label`, encabezados semanticos, la navegacion por teclado funciona
- [ ] Movil: renderiza correctamente en breakpoints 320px, 768px, 1024px, 1440px
- [ ] Rendimiento: sin CLS, objetivo FCP cumplido
- [ ] Error boundaries y loading skeletons implementados
- [ ] Componentes shadcn/ui no modificados directamente (se usan wrappers)
- [ ] Importaciones absolutas con `@/` (sin `../../` relativo)

### Especificos de Backend

- [ ] Arquitectura limpia mantenida: sin logica de negocio en manejadores de ruta
- [ ] Todas las entradas validadas (sin confiar en entrada del usuario)
- [ ] Solo consultas parametrizadas (sin interpolacion de strings en SQL)
- [ ] Excepciones personalizadas via modulo centralizado de errores (sin excepciones HTTP directas)
- [ ] Endpoints de autenticacion con limite de tasa

### Especificos de Mobile

- [ ] Todos los controladores liberados en el metodo `dispose()`
- [ ] Offline manejado con gracia
- [ ] Objetivo 60fps mantenido (sin jank)
- [ ] Probado en iOS y Android

### Especificos de Base de Datos

- [ ] Al menos 3NF (o justificacion documentada para desnormalizacion)
- [ ] Las tres capas de esquema documentadas (externa, conceptual, interna)
- [ ] Restricciones de integridad explicitas (entidad, dominio, referencial, regla de negocio)
- [ ] Revision de anti-patrones completada

---

## Senales de Escalamiento

Observa estas senales que indican que deberias cambiar de skill individual a ejecucion multiagente:

| Senal | Que Significa | Accion |
|-------|--------------|--------|
| El agente dice "esto requiere un cambio de backend" | La tarea tiene dependencias entre dominios | Cambiar a `/work` — agregar agente backend |
| El CHARTER_CHECK del agente muestra elementos "Must NOT do" que realmente se necesitan | El alcance excede un dominio | Planificar la funcionalidad completa con `/plan` primero |
| La correccion se propaga a 3+ archivos en diferentes capas | Una correccion afecta multiples dominios | Usar `/debug` con alcance mas amplio, o `/work` |
| El agente descubre un desajuste en el contrato API | Desacuerdo frontend/backend | Ejecutar `/plan` para definir contratos, luego regenerar ambos agentes |
| La puerta de calidad falla en puntos de integracion | Los componentes no se conectan correctamente | Agregar paso de revision QA: `oma agent:spawn qa "Review integration"` |
| La tarea crece de "un componente" a "tres componentes + nueva ruta + API" | Ampliacion del alcance durante la ejecucion | Detener, ejecutar `/plan` para descomponer, luego `/orchestrate` |
| El agente se bloquea con clarificacion HIGH | Requisitos fundamentalmente ambiguos | Responder las preguntas del agente o ejecutar `/brainstorm` para clarificar el enfoque |

### La Regla General

Si te encuentras regenerando el mismo agente mas de dos veces con refinamientos, la tarea probablemente es multidominio y necesita `/work` o como minimo un paso `/plan` para descomponerla correctamente.
