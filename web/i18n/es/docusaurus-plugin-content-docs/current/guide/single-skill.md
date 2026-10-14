---
title: "Guía: Ejecución de una skill individual"
sidebar_label: Skill individual
description: Guía detallada para tareas de un solo dominio en oh-my-agent, con criterios de uso, lista de verificación previa, plantilla de prompt explicada, ejemplos reales de frontend, backend, mobile y base de datos, flujo de ejecución, puerta de calidad y señales de escalamiento.
---

# Ejecución de una skill individual

La ejecución de una skill individual es la vía rápida: un agente, un dominio y una tarea enfocada. No añade sobrecarga de orquestación ni coordinación entre agentes. El host o el flujo seleccionado puede enrutar un prompt en lenguaje natural a la skill; el sistema de hooks detecta los flujos por su cuenta y el comportamiento del enrutamiento depende del runtime seleccionado.

## Ruta rápida

1. Ejecuta `oma doctor` una vez para confirmar la integración con el host seleccionado. Las advertencias opcionales sobre proveedores no bloquean una tarea que no los use.
2. Describe un cambio autocontenido con una condición clara de **Objetivo**, **Contexto**, **Restricciones** y **Completado cuando**.
3. La skill seleccionada inspeccionará el repositorio, declarará su alcance cuando el contrato de ejecución activo requiera un CHARTER_CHECK e informará qué comprobaciones ejecutó realmente.
4. Si la tarea crece y cruza los límites de API, UI, base de datos o mobile, detén la ejecución individual y cambia a `/work` u `/orchestrate`.

Para ejecuciones administradas atascadas, usa `oma agent status <session-id> [agent-id]`; después inspecciona los receipts de `.agents/state/agent-runs/` y la ruta de claim inyectada antes de reintentar. Consulta [Valores predeterminados importantes](../getting-started/important-defaults.md) para conocer el comportamiento de los proveedores y la recuperación.

---

## Cuándo usar una skill individual

Usa esta modalidad cuando tu tarea cumpla TODOS estos criterios:

- **Pertenece a un solo dominio**: toda la tarea corresponde a frontend, backend, mobile, base de datos, diseño, infraestructura u otro dominio individual.
- **Es autocontenida**: no requiere cambios de contratos API entre dominios ni cambios de backend para una tarea de frontend.
- **Tiene un alcance claro**: sabes cuál debe ser el resultado (un componente, un endpoint, un esquema o una corrección).
- **No requiere coordinación**: otros agentes no necesitan ejecutarse antes ni después.

**Ejemplos de tareas para una skill individual:**
- Construir un componente de UI.
- Agregar un endpoint de API.
- Corregir un bug en una capa.
- Diseñar una tabla de base de datos.
- Escribir un módulo de Terraform.
- Traducir un conjunto de cadenas i18n.
- Crear una sección de un sistema de diseño.

**Cambia a multiagente** (`/work` u `/orchestrate`) cuando:
- El trabajo de UI necesite un contrato API nuevo (frontend + backend).
- Una corrección se propague entre capas (agentes de depuración e implementación).
- La funcionalidad abarque frontend, backend y base de datos.
- El alcance crezca más allá de un dominio después de la primera iteración.

Las pruebas y los criterios de aceptación también forman parte del trabajo con una skill individual; por sí solos no requieren `/ralph`. Para coordinar varios dominios o aplicar un proceso de calidad solicitado explícitamente, consulta la [guía para elegir skills y flujos de trabajo](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Lista de verificación previa

Antes de escribir el prompt, responde estas cuatro preguntas:

| Elemento | Pregunta | Por qué importa |
|---------|----------|-----------------|
| **Objetivo** | ¿Qué artefacto específico debe crearse o modificarse? | Evita ambigüedades (por ejemplo, «agregar un botón» frente a «agregar un formulario con validación»). |
| **Contexto** | ¿Qué stack, framework y convenciones se aplican? | El agente los detecta en los archivos del proyecto, pero es mejor indicarlos explícitamente. |
| **Restricciones** | ¿Qué reglas deben seguirse? (estilo, seguridad, rendimiento o compatibilidad) | Sin restricciones, los agentes usan valores predeterminados que pueden no coincidir con tu proyecto. |
| **Completado cuando** | ¿Qué criterios de aceptación comprobarás? | Da al agente un objetivo y te proporciona una lista de verificación. |

Si falta algún elemento en tu prompt, el agente hará lo siguiente:
- **Incertidumbre LOW:** aplicará valores predeterminados y enumerará las suposiciones.
- **Incertidumbre MEDIUM:** presentará 2-3 opciones y continuará con la más probable.
- **Incertidumbre HIGH:** se bloqueará y hará preguntas (no escribirá código).

---

## Plantilla de prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Desglose de la plantilla

| Parte | Propósito | Ejemplo |
|------|---------|---------|
| `Build <specific artifact>` | El objetivo (qué crear) | «Crear un componente de formulario de registro de usuario» |
| `using <stack/framework>` | El contexto (stack tecnológico) | «usar React + TypeScript + Tailwind CSS» |
| `Constraints:` | Reglas que el agente debe seguir | «etiquetas accesibles, sin bibliotecas externas de formularios, solo validación en el cliente» |
| `Acceptance criteria:` | Completado cuando (resultados verificables) | «1) validación del formato del correo electrónico 2) indicador de fortaleza de la contraseña 3) envío deshabilitado mientras sea inválido» |
| `Add tests for:` | Requisitos de pruebas | «rutas de envío válidas e inválidas, casos límite para la validación del correo electrónico» |

---

## Ejemplos reales

### Frontend: formulario de inicio de sesión

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

**Flujo de ejecución esperado:**

1. **Enrutamiento de la skill:** el host o el flujo selecciona `oma-frontend` (palabras como «form», «component», «Tailwind CSS» y «React» son señales de enrutamiento).
2. **Evaluación de dificultad:** Media (2-3 archivos y algunas decisiones de diseño sobre la experiencia de validación).
3. **Recursos cargados:**
   - `execution-protocol.md` (siempre).
   - `snippets.md` (patrones de formularios y Zod, además de los patrones de componentes existentes cuando la skill los proporcione).
4. **El contrato de ejecución puede emitir `CHARTER_CHECK` cuando está habilitado:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Implementación:**
   - Crea `src/features/auth/components/login-form.tsx` (Client Component con `"use client"`).
   - Crea `src/features/auth/utils/login-schema.ts` (esquema de Zod).
   - Crea `src/features/auth/components/skeleton/login-form-skeleton.tsx`.
   - Usa shadcn/ui `<Button>`, `<Input>`, `<Label>` (solo lectura, sin modificaciones).
   - Gestiona el formulario con `@tanstack/react-form` y validación de Zod.
   - Usa importaciones absolutas con `@/`.
   - Mantiene un componente por archivo.
6. **Verificación:**
   - Lista de verificación: hay etiquetas ARIA, encabezados semánticos y navegación por teclado.
   - Mobile: se renderiza correctamente en un viewport de 320px.
   - Rendimiento: no hay CLS.
   - Pruebas: archivo de pruebas de Vitest en `src/features/auth/utils/__tests__/login-schema.test.ts`.
<!-- oma-docs:ignore-end -->

---

### Backend: endpoint de API REST

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

**Flujo de ejecución esperado:**

1. **Enrutamiento de la skill:** el host o el flujo selecciona `oma-backend` (palabras como «API», «endpoint» y «REST» son señales de enrutamiento).
2. **Detección del stack:** lee `pyproject.toml` o `package.json` para determinar el lenguaje y el framework. Si existen referencias generadas a `stack/` o `variants/` incluidas en el paquete, carga sus convenciones.
3. **Evaluación de dificultad:** Media (2-3 archivos: ruta, servicio, repositorio y prueba).
4. **Recursos cargados:**
   - `execution-protocol.md` (siempre).
<!-- oma-docs:ignore-start -->
   - `stack/snippets.md` coincidente o `variants/{node,python,rust}/snippets.md` si está disponible.
   - `stack/tech-stack.md` coincidente o referencias de stack de la variante si están disponibles.
<!-- oma-docs:ignore-end -->
5. **El contrato de ejecución puede emitir `CHARTER_CHECK` cuando está habilitado:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementación:**
   - Repositorio: `TaskRepository.find_by_user(user_id, cursor, status, limit)` con una consulta parametrizada.
   - Servicio: `TaskService.get_user_tasks(user_id, cursor, status, limit)` (envoltorio de lógica de negocio).
   - Router: `GET /api/tasks` con middleware de autenticación JWT, validación de entradas y formateo de respuestas.
   - Pruebas: la autenticación obligatoria devuelve 401, la paginación devuelve el cursor correcto, el filtro funciona y una respuesta vacía devuelve 200 con un array vacío.

---

### Mobile: pantalla de ajustes

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

**Flujo de ejecución esperado:**

1. **Enrutamiento de la skill:** el host o el flujo selecciona `oma-mobile` (palabras como «Flutter», «screen» y «mobile» son señales de enrutamiento).
2. **Evaluación de dificultad:** Media (pantalla de ajustes, gestión de estado y manejo sin conexión).
3. **Recursos cargados:**
   - `execution-protocol.md`.
   - `snippets.md` (plantilla de pantalla y patrón de proveedor Riverpod).
   - `screen-template.dart`.
4. **El contrato de ejecución puede emitir `CHARTER_CHECK` cuando está habilitado:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Implementación:**
   - Pantalla: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget con Riverpod).
   - Proveedores: `lib/features/settings/providers/settings_provider.dart`.
   - Repositorio: `lib/features/settings/data/settings_repository.dart`.
   - Manejo sin conexión: el interceptor de Dio captura `SocketException` y recurre a los datos almacenados en caché.
   - Todos los controladores se liberan en el método `dispose()`.
<!-- oma-docs:ignore-end -->

---

### Base de datos: diseño de esquema

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

**Flujo de ejecución esperado:**

1. **Enrutamiento de la skill:** el host o el flujo selecciona `oma-db` (palabras como «database», «schema», «ERD» y «migration» son señales de enrutamiento).
2. **Evaluación de dificultad:** Compleja (decisiones de arquitectura, varias entidades y planificación de capacidad).
3. **Recursos cargados:**
   - `execution-protocol.md`.
   - `document-templates.md` (estructura de entregables).
   - `examples.md`.
   - `anti-patterns.md` (revisión durante la optimización).
4. **El contrato de ejecución puede emitir `CHARTER_CHECK` cuando está habilitado:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Flujo de trabajo:** Explorar (entidades, relaciones, patrones de acceso y estimaciones de volumen) -> Diseñar (esquemas externo, conceptual e interno, restricciones y campos de ciclo de vida) -> Optimizar (índices para los patrones de consulta, estrategia de particionado, plan de copias de seguridad y revisión de anti-patrones).
6. **Entregables:**
   - Resumen del esquema externo (vistas por rol: admin, gerente de proyecto y miembro del equipo).
   - Esquema conceptual con ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.).
   - Esquema interno con DDL físico, índices y particionado.
   - Tabla de estándares de datos (reglas de nombres de campos y convenciones de tipos).
   - Glosario (tenant, workspace, assignee, etc.).
   - Hoja de estimación de capacidad.
   - Estrategia de copias de seguridad (completa diaria + incremental cada hora, retención de 30 días).
   - Script de migración.

---

## Lista de verificación de la puerta de calidad

Después de que el agente entregue el resultado, verifica estos elementos antes de aceptarlo:

### Comprobaciones universales (todos los agentes)

- [ ] **El comportamiento coincide con los criterios de aceptación**: cada criterio del prompt está satisfecho.
- [ ] **Las pruebas cubren el camino feliz y los casos límite importantes**: no solo el camino feliz.
- [ ] **No hay cambios en archivos no relacionados**: solo se modificaron los archivos pertinentes a la tarea.
- [ ] **Los módulos compartidos no están rotos**: las importaciones, los tipos y las interfaces que usan otros componentes siguen funcionando.
- [ ] **Se respetó el charter**: se cumplieron las restricciones de «Must NOT do».
- [ ] **Pasan lint, typecheck y build**: ejecuta las comprobaciones estándar del proyecto.

### Comprobaciones específicas de frontend

- [ ] Accesibilidad: los elementos interactivos tienen `aria-label`, hay encabezados semánticos y funciona la navegación por teclado.
- [ ] Mobile: se renderiza correctamente en los breakpoints de 320px, 768px, 1024px y 1440px.
- [ ] Rendimiento: no hay CLS y se cumple el objetivo de FCP.
- [ ] Se implementaron Error Boundaries y Loading Skeletons.
- [ ] Los componentes de shadcn/ui no se modificaron directamente (se usan wrappers).
- [ ] Las importaciones son absolutas con `@/` (sin `../../` relativo).

### Comprobaciones específicas de backend

- [ ] Se mantiene la arquitectura limpia: no hay lógica de negocio en los manejadores de rutas.
- [ ] Se validan todas las entradas (no se confía en la entrada del usuario).
- [ ] Solo se usan consultas parametrizadas (sin interpolación de strings en SQL).
- [ ] Las excepciones personalizadas pasan por el módulo centralizado de errores (sin excepciones HTTP directas).
- [ ] Los endpoints de autenticación tienen límite de tasa.

### Comprobaciones específicas de mobile

- [ ] Todos los controladores se liberan en el método `dispose()`.
- [ ] El modo sin conexión se gestiona correctamente.
- [ ] Se mantiene el objetivo de 60fps (sin jank).
- [ ] Se probó en iOS y Android.

### Comprobaciones específicas de base de datos

- [ ] Al menos 3NF (o existe una justificación documentada para la desnormalización).
- [ ] Las tres capas del esquema están documentadas (externa, conceptual e interna).
- [ ] Las restricciones de integridad son explícitas (entidad, dominio, referencial y regla de negocio).
- [ ] Se completó la revisión de anti-patrones.

---

## Señales de escalamiento

Observa estas señales que indican que deberías cambiar de una skill individual a una ejecución multiagente:

| Señal | Qué significa | Acción |
|--------|--------------|--------|
| El agente dice «esto requiere un cambio de backend» | La tarea tiene dependencias entre dominios | Cambia a `/work` y agrega un agente de backend. |
| El `CHARTER_CHECK` del agente muestra elementos «Must NOT do» que en realidad son necesarios | El alcance supera un dominio | Planifica primero toda la funcionalidad con `/plan`. |
| Una corrección se propaga a 3+ archivos de distintas capas | Una corrección afecta a varios dominios | Usa `/debug` con un alcance mayor o `/work`. |
| El agente descubre un desajuste en un contrato API | Hay un desacuerdo entre frontend y backend | Ejecuta `/plan` para definir los contratos y vuelve a generar ambos agentes. |
| La puerta de calidad falla en puntos de integración | Los componentes no se conectan correctamente | Ejecuta `/review` o agrega una pasada de QA: `oma agent spawn qa "Review the integration" SESSION_ID --read-only`. |
| La tarea pasa de «un componente» a «tres componentes + una ruta nueva + API» | El alcance crece durante la ejecución | Detén el trabajo, ejecuta `/plan` para descomponerlo y después `/orchestrate`. |
| El agente se bloquea con una aclaración HIGH | Los requisitos son fundamentalmente ambiguos | Responde las preguntas del agente o ejecuta `/brainstorm` para aclarar el enfoque. |

### Regla general

Si vuelves a generar el mismo agente más de dos veces con refinamientos, probablemente la tarea abarca varios dominios. Ejecuta `/work` o, como mínimo, `/plan` para descomponerla.

---

## Próximos pasos

- La tarea abarca varios dominios: [Proyectos multiagente](./multi-agent-project.md)
- La tarea es un bug: [Corrección de bugs](./bug-fixing.md)
- Auditar o reanudar una ejecución: [Resultados y reanudación](./agent-results-and-resume.md)
- Algo falló: [Solución de problemas](./troubleshooting.md)
- Elegir entre una skill y un workflow: [Workflows](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
