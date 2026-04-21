---
title: Agentes
description: Referencia completa de los 21 agentes de oh-my-agent — sus dominios, stacks tecnológicos, archivos de recursos, capacidades, protocolo de verificación previa de charter, carga de habilidades en dos capas, reglas de ejecución acotada, puertas de calidad, estrategia de workspaces, flujo de orquestación y memoria en tiempo de ejecución.
---

# Agentes

Los agentes en oh-my-agent son roles de ingeniería especializados. Cada agente tiene un dominio definido, conocimiento de stack tecnológico, archivos de recursos, puertas de calidad y restricciones de ejecución. Los agentes no son chatbots genéricos — son trabajadores acotados que permanecen en su área y siguen protocolos estructurados.

---

## Categorías de Agentes

| Categoría | Agentes | Responsabilidad |
|-----------|---------|-----------------|
| **Ideación** | oma-brainstorm | Explorar ideas, proponer enfoques, producir documentos de diseño |
| **Arquitectura** | oma-architecture | Límites de sistema/módulo/servicio, análisis al estilo ADR/ATAM/CBAM, registros de compromisos |
| **Planificación** | oma-pm | Descomposición de requisitos, desglose de tareas, contratos de API, asignación de prioridad |
| **Implementación** | oma-frontend, oma-backend, oma-mobile, oma-db | Escribir código de producción en sus respectivos dominios |
| **Diseño** | oma-design | Sistemas de diseño, DESIGN.md, tokens, tipografía, color, movimiento, accesibilidad |
| **Infraestructura** | oma-tf-infra | Aprovisionamiento Terraform multi-nube, IAM, optimización de costos, política como código |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migraciones, coordinación de releases, automatización de monorepos |
| **Observabilidad** | oma-observability | Pipelines de observabilidad, enrutamiento de trazabilidad, señales MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), gestión de SLO, forense de incidentes, ajuste de transporte |
| **Calidad** | oma-qa | Auditoría de seguridad (OWASP), rendimiento, accesibilidad (WCAG), revisión de calidad de código |
| **Depuración** | oma-debug | Reproducción de bugs, análisis de causa raíz, correcciones mínimas, pruebas de regresión |
| **Localización** | oma-translator | Traducción consciente del contexto preservando tono, registro y términos del dominio |
| **Coordinación** | oma-orchestrator, oma-coordination | Orquestación multiagente automatizada y manual |
| **Git** | oma-scm | Generación de Conventional Commits, división de commits por funcionalidad |
| **Búsqueda y Recuperación** | oma-search | Enrutador de búsqueda basado en intención con puntuación de confianza (documentos Context7, web, código `gh`/`glab`, Serena local) |
| **Retrospectiva** | oma-recap | Análisis de historiales de conversación entre herramientas y resúmenes de trabajo temáticos |
| **Procesamiento de Documentos** | oma-hwp, oma-pdf | Conversión de HWP/HWPX/HWPML y PDF a Markdown para ingesta de LLM/RAG |

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

---

### oma-architecture

**Dominio:** Arquitectura de software/sistemas — límites de módulos y servicios, análisis de compromisos, síntesis de partes interesadas, registros de decisiones.

**Cuándo usar:** Elección o revisión de la arquitectura del sistema, definición de límites de módulo/servicio/propiedad, comparación de opciones arquitectónicas con compromisos explícitos, investigación de dolores arquitectónicos (amplificación de cambios, dependencias ocultas, APIs incómodas), priorización de inversiones o refactorizaciones arquitectónicas, redacción de recomendaciones de arquitectura o ADRs.

**Cuándo NO usar:** Sistemas visuales/de diseño (usar oma-design), planificación de funcionalidades y desglose de tareas (usar oma-pm), implementación de Terraform (usar oma-tf-infra), diagnóstico de bugs (usar oma-debug), revisión de seguridad/rendimiento/accesibilidad (usar oma-qa).

**Metodologías:** Enrutamiento diagnóstico, comparación design-twice, análisis de riesgo al estilo ATAM, priorización al estilo CBAM, registros de decisiones al estilo ADR.

**Reglas principales:**
- Diagnosticar el problema arquitectónico antes de seleccionar un método
- Usar la metodología más ligera que sea suficiente para la decisión actual
- Distinguir el diseño arquitectónico del diseño de UI/visual y de la entrega de Terraform
- Consultar a agentes de partes interesadas solo cuando la decisión sea lo suficientemente transversal para justificar el costo
- La calidad de la recomendación importa más que el teatro del consenso: consultar ampliamente, decidir explícitamente
- Cada recomendación debe declarar suposiciones, compromisos, riesgos y pasos de validación
- Ser consciente del costo por defecto: costo de implementación, costo operativo, complejidad del equipo, costo de cambios futuros

**Recursos:** `SKILL.md`, directorio `resources/` con guías de metodología (diagnostic-routing, design-twice, ATAM, CBAM, plantillas ADR).

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

### oma-observability

**Dominio:** Enrutador de observabilidad y trazabilidad basado en intención, a través de capas, fronteras y señales.

**Cuándo usar:** Configuración de pipelines de observabilidad (OTel SDK + Collector + backend del proveedor), trazabilidad entre fronteras de servicio y dominio (propagadores W3C, baggage, multi-tenant, multi-nube), ajuste de transporte (umbrales UDP/MTU, OTLP gRPC vs HTTP, topología Collector DaemonSet vs sidecar, recetas de muestreo), forense de incidentes (localización en 6 dimensiones: code / service / layer / host / region / infra), selección de categoría de proveedor (OSS full-stack vs SaaS comercial vs especialista de alta cardinalidad vs especialista en profiling), observability-as-code (dashboards Grafana Jsonnet, CRD PrometheusRule, YAML OpenSLO, alertas SLO burn-rate), meta-observabilidad (salud propia del pipeline, desfase de reloj, guardarraíles de cardinalidad, matriz de retención), cobertura de señales MELT+P (metrics, logs, traces, profiles, cost, audit, privacy), migración desde herramientas obsoletas (Fluentd -> Fluent Bit u OTel Collector).

**Cuándo NO usar:** Observabilidad de LLM ops / gen_ai (usar Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage de pipelines de datos (OpenLineage + Marquez, dbt test, Airflow lineage), telemetría de capa física de IoT / datacenter (Nlyte, Sunbird, Device42), orquestación de ingeniería del caos (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infraestructura GPU / TPU (NVIDIA DCGM Exporter), cadena de suministro de software (sigstore, in-toto, SLSA), flujo de respuesta a incidentes / paging (PagerDuty, OpsGenie, Grafana OnCall), configuración de un único proveedor ya cubierta por el skill propio de ese proveedor.

**Reglas principales:**
- Clasificar la intención antes de enrutar: setup | migrate | investigate | alert | trace | tune | route
- Categoría primero, no registro de proveedores: delegar a skills propios del proveedor vía `resources/vendor-categories.md`; no duplicar documentación del proveedor
- El ajuste de transporte es el foso: umbrales UDP/MTU, selección de protocolo OTLP, topología del Collector y recetas de muestreo son una profundidad que otros skills no cubren
- La meta-observabilidad no es negociable: validar salud propia del pipeline, sincronización de reloj (< 100 ms de deriva), cardinalidad y retención antes de declarar la configuración completa
- Preferencia CNCF-first: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd está obsoleto (CNCF 2025-10): recomendar Fluent Bit u OTel Collector para trabajo nuevo y de migración
- W3C Trace Context como propagador por defecto; traducir por nube (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Privacidad antes que funcionalidades: redacción de PII, reglas de baggage conscientes del muestreo, auditoría inmutable SOC2/ISO + borrado GDPR/PIPA aplicados en la recolección, no solo en el almacenamiento

**Recursos:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, más recursos profundos bajo `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu), y `resources/boundaries/` (cross-application, multi-tenant, release, slo).

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

### oma-coordination

**Dominio:** Guía de coordinación manual paso a paso multi-agente.

**Cuándo usar:** Proyectos complejos donde quieres control con humano en el bucle en cada puerta, orientación manual de generación de agentes, recetas de coordinación paso a paso.

**Cuándo NO usar:** Ejecución paralela totalmente automatizada (usa oma-orchestrator), tareas de un solo dominio (usa el agente de dominio directamente).

**Reglas principales:**
- Presentar siempre el plan para confirmación del usuario antes de generar agentes
- Un nivel de prioridad a la vez — esperar la finalización antes del siguiente nivel
- El usuario aprueba cada transición de puerta
- La revisión de QA es obligatoria antes de fusionar
- Bucle de remediación de problemas para hallazgos CRITICAL/HIGH

**Flujo de trabajo:** PM planifica → Usuario confirma → Generar por nivel de prioridad → Monitorear → Revisión QA → Corregir problemas → Entregar.

**Diferencia con oma-orchestrator:** La coordinación es manual y guiada (el usuario controla el ritmo); el orchestrator es automatizado (los agentes se generan y ejecutan con mínima intervención del usuario).

---

### oma-search

**Dominio:** Enrutador de búsqueda basado en intención con puntuación de confianza de dominio — enruta consultas a Context7 (documentos), búsqueda web nativa, `gh`/`glab` (código), Serena (local).

**Cuándo usar:** Encontrar documentación oficial de bibliotecas/frameworks, investigación web para tutoriales/ejemplos/comparaciones/soluciones, búsqueda de código en GitHub/GitLab para patrones de implementación, cualquier consulta donde el canal de búsqueda no esté claro (auto-enrutamiento), otras habilidades que necesitan infraestructura de búsqueda (invocación compartida).

**Cuándo NO usar:** Exploración solo local del código base (usar Serena MCP directamente), análisis de historial o blame de Git (usar oma-scm), investigación completa de arquitectura (usar oma-architecture, que puede invocar esta habilidad internamente).

**Reglas principales:**
- Clasificar la intención antes de buscar — cada consulta pasa primero por IntentClassifier
- Una consulta, una mejor ruta — evitar multi-ruta redundante a menos que la intención sea ambigua
- Puntuar la confianza de cada resultado — todos los resultados no locales obtienen etiquetas de confianza de dominio del registro
- Los flags sobrescriben al clasificador: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: si la ruta primaria falla, retroceder con gracia (docs→web, web→estrategias `oma search fetch`)
- No se requiere MCP adicional: Context7 para documentos, nativo del runtime para web, CLI para código, Serena para local
- Búsqueda web independiente del proveedor: usar lo que proporcione el runtime actual (WebSearch, Google, Bing)
- Solo confianza a nivel de dominio — sin puntuación a nivel de sub-ruta o página

**Recursos:** `SKILL.md`, directorio `resources/` con clasificador de intención, definiciones de ruta y registro de confianza.

---

### oma-recap

**Dominio:** Análisis del historial de conversaciones a través de múltiples herramientas de IA (Claude, Codex, Gemini, Qwen, Cursor) con resúmenes temáticos de trabajo diarios/periódicos.

**Cuándo usar:** Resumir la actividad de trabajo de un día o período, entender el flujo de trabajo a través de múltiples herramientas de IA, analizar patrones de cambio de herramientas entre sesiones, preparar standups diarios / retros semanales / registros de trabajo.

**Cuándo NO usar:** Retrospectiva de cambios de código basada en commits de Git (usar `oma retro`), monitoreo en tiempo real de agentes (usar `oma dashboard`), métricas de productividad (usar `oma stats`).

**Proceso:**
1. Resolver fecha o ventana de tiempo desde entrada en lenguaje natural (today, yesterday, last Monday, fecha explícita)
2. Obtener datos de conversación vía `oma recap --date YYYY-MM-DD` o `--since` / `--until`
3. Agrupar por herramienta y sesión
4. Extraer temas (funcionalidades trabajadas, bugs corregidos, herramientas exploradas)
5. Renderizar resumen temático diario/periódico

**Recursos:** `SKILL.md` — delega el trabajo pesado a la CLI `oma recap`.

---

### oma-hwp

**Dominio:** Conversión de HWP / HWPX / HWPML (procesador de texto coreano) → Markdown usando `kordoc`.

**Cuándo usar:** Convertir documentos HWP coreanos (`.hwp`, `.hwpx`, `.hwpml`) a Markdown, preparar documentos gubernamentales/empresariales coreanos para contexto de LLM o RAG, extraer contenido estructurado (tablas, encabezados, listas, imágenes, notas al pie, hipervínculos) de HWP.

**Cuándo NO usar:** Archivos PDF (usar oma-pdf), XLSX/DOCX (fuera de alcance), generar/editar HWP (fuera de alcance), archivos ya de texto (usar la herramienta Read directamente).

**Reglas principales:**
- Usar `bunx kordoc@latest` para ejecutar — no se requiere instalación; pasar siempre `@latest` o una versión fijada
- El formato de salida por defecto es Markdown
- Si no se especifica un directorio de salida, la salida va al mismo directorio que la entrada
- kordoc gestiona la preservación de estructura (encabezados, tablas, tablas anidadas, notas al pie, hipervínculos, imágenes)
- Las defensas de seguridad (ZIP bomb, XXE, SSRF, XSS) las proporciona kordoc — no añadir las propias
- Para HWP cifrados o bloqueados con DRM, informar al usuario claramente la limitación
- Postprocesar con `resources/flatten-tables.ts` para convertir bloques `<table>` HTML a tablas pipe GFM y eliminar caracteres del Área de Uso Privado de la fuente Hancom

**Recursos:** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Dominio:** Conversión de PDF a Markdown usando `opendataloader-pdf`.

**Cuándo usar:** Convertir documentos PDF a Markdown para contexto de LLM o RAG, extraer contenido estructurado (tablas, encabezados, listas) de PDFs, preparar datos PDF para consumo de IA.

**Cuándo NO usar:** Generar/crear PDFs (usar herramientas de documento apropiadas), editar PDFs existentes (fuera de alcance), lectura simple de archivos ya de texto (usar la herramienta Read directamente).

**Reglas principales:**
- Usar `uvx opendataloader-pdf` para ejecutar — no se requiere instalación
- El formato de salida por defecto es Markdown
- Si no se especifica un directorio de salida, la salida va al mismo directorio que el PDF de entrada
- Preservar la estructura del documento (encabezados, tablas, listas, imágenes)
- Para PDFs escaneados, usar el modo híbrido con OCR
- Ejecutar siempre `uvx mdformat` sobre la salida para normalizar el formato Markdown
- Validar que la salida Markdown sea legible y esté bien estructurada
- Reportar cualquier problema de conversión (tablas faltantes, texto distorsionado) al usuario

**Recursos:** `SKILL.md`, `config/`, `resources/`.

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
