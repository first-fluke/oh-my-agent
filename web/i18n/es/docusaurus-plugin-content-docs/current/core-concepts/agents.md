---
title: Agentes
description: Referencia de los 33 paquetes de habilidades de OMA, 13 roles de despacho canónicos y 12 definiciones de subagentes incluidas, con sus dominios, recursos, preflight de charter, carga progresiva, reglas de alcance, puertas de calidad, estrategia de workspaces, orquestación y memoria en tiempo de ejecución.
---

# Agentes

OMA separa los paquetes de habilidades, los roles de despacho y los archivos de definición de subagentes. Una habilidad enruta y carga orientación del dominio; un rol canónico es la identidad de runtime usada para el despacho; una definición registrada proporciona una personalidad nativa del proveedor a un subagente. Estas capas se superponen por diseño, así que usa el límite de la tarea y los criterios de aceptación para decidir si basta una habilidad.

Las definiciones de agentes bajo `.agents/agents/` son la fuente de verdad. OMA las proyecta en archivos nativos del proveedor para los runtimes que admiten subagentes personalizados:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` u otra proyección del proveedor seleccionado cuando sea compatible

Cuando un flujo asigna un agente al mismo proveedor que el runtime actual, debe usar primero el archivo nativo de ese runtime. Las tareas entre proveedores recurren a `oma agent spawn`.

> **Despacho de modelos por agente:** cada agente resuelve un slug de modelo, proveedor CLI y esfuerzo de razonamiento concretos mediante `model_preset` (y sobrescrituras opcionales de `agents:`) en `.agents/oma-config.yaml`. Consulta [Modelos por agente](../guide/per-agent-models.md) para la configuración y [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) para inspeccionar la matriz activa.

---

## Categorías de agentes

| Categoría | Agentes | Responsabilidad |
|-----------|---------|-----------------|
| **Ideación** | oma-brainstorm | Explorar ideas, proponer enfoques, producir documentos de diseño |
| **Arquitectura** | oma-architecture | Límites de sistema/módulo/servicio, análisis al estilo ADR/ATAM/CBAM, registros de compromisos |
| **Planificación** | oma-pm | Descomposición de requisitos, desglose de tareas, contratos de API, asignación de prioridad |
| **Implementación** | oma-frontend, oma-backend, oma-mobile, oma-db | Escribir código en sus respectivos dominios |
| **Diseño** | oma-design | Sistemas de diseño, DESIGN.md, tokens, tipografía, color, movimiento, accesibilidad |
| **Infraestructura** | oma-tf-infra | Aprovisionamiento Terraform multi-nube, IAM, optimización de costos, política como código |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migraciones, coordinación de releases, automatización de monorepos |
| **Observabilidad** | oma-observability | Pipelines de observabilidad, enrutamiento de trazabilidad, señales MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), gestión de SLO, forense de incidentes, ajuste de transporte |
| **Calidad** | oma-qa | Auditoría de seguridad (OWASP), rendimiento, accesibilidad (WCAG), revisión de calidad de código |
| **Depuración** | oma-debug | Reproducción de bugs, análisis de causa raíz, correcciones mínimas, pruebas de regresión |
| **Localización** | oma-translation | Traducción consciente del contexto preservando tono, registro y términos del dominio |
| **Coordinación** | oma-orchestration, oma-coordination | Orquestación multiagente automatizada y manual |
| **Git** | oma-scm | Generación de Conventional Commits, división de commits por funcionalidad |
| **Búsqueda y Recuperación** | oma-search | Enrutador de búsqueda basado en intención con puntuación de confianza (documentos Context7, web, código `gh`/`glab`, inteligencia de código local) |
| **Retrospectiva** | oma-recap | Análisis de historiales de conversación entre herramientas y resúmenes de trabajo temáticos |
| **Procesamiento de Documentos** | oma-hwp, oma-pdf | Conversión de HWP/HWPX/HWPML y PDF a Markdown para ingesta de LLM/RAG |
| **Documentación** | oma-docs | Detección de drift documental (verificar referencias rotas, proponer parches sync para diffs afectados) |
| **Explicación** | oma-explanation | Explainers HTML interactivos offline para diffs, branches, PRs o rangos de commits |
| **Redacción académica** | oma-academic-writing, oma-scholar | Redacción/auditoría de prosa académica de calidad editorial e investigación y revisión científica con sidecars Knows |
| **Seguridad** | oma-deepsec | Ejecución consciente del costo del escáner de vulnerabilidades deepsec de Vercel (scan, gate de PR, matchers, triaje) |
| **Refactorización** | oma-refactor | Reestructuración incremental preservando comportamiento, con hotspots y redes de seguridad de pruebas de caracterización |
| **Investigación de mercado** | oma-market | Investigación de señales comunitarias sobre problemas, tendencias, competidores y descubrimiento con SWOT/Porter's 5F/PESTEL |
| **Creación de habilidades** | oma-skill-creation | Creación y validación de habilidades OMA en formato SSL-lite |
| **Generación multimedia** | oma-image, oma-slide, oma-video, oma-voice | Generación de imágenes, presentaciones HTML, vídeo corto/explainer/demo y TTS/STT local |

---

## Referencia detallada de agentes

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
- Salida del plan JSON más un task board con ámbito de sesión para compatibilidad con el orquestador

**Salida:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, escritura en memoria para el orquestador.

**Recursos:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md` (los contratos se escriben en `.agents/results/api-contracts/`).

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
| Hooks | ahooks o @mantine/hooks |
| Utilidades | es-toolkit |
| Estado URL | nuqs |
| Estado Servidor | TanStack Query (o hooks generados por orval cuando existe una especificación OpenAPI) |
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

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` y `checklist.md`.

**Lista de verificación de puerta de calidad:**
- Accesibilidad: etiquetas ARIA, encabezados semánticos, navegación por teclado
- Móvil: verificado en viewports móviles
- Rendimiento: sin CLS, carga rápida
- Resiliencia: Error Boundaries y Loading Skeletons
- Pruebas: lógica cubierta por Vitest
- Calidad: typecheck y lint pasan

---

### oma-backend

**Dominio:** APIs, lógica del lado del servidor, autenticación, operaciones de base de datos.

**Cuándo usar:** APIs REST/GraphQL, migraciones de base de datos, autenticación, lógica de negocio del servidor, trabajos en segundo plano.

**Arquitectura:** Router (HTTP) -> Service (Lógica de Negocio) -> Repository (Acceso a Datos) -> Models.

**Detección de stack:** Lee manifiestos del proyecto (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) para determinar lenguaje y framework. Si faltan convenciones específicas del proyecto, pide al usuario ejecutar `/stack-set`; ese comando materializa las referencias `stack/` resueltas a partir del esquema y las plantillas distribuidas.

**Reglas principales:**
- Arquitectura limpia: sin lógica de negocio en manejadores de ruta
- Todas las entradas validadas con la librería de validación del proyecto
- Solo consultas parametrizadas (nunca interpolación de strings en SQL)
- JWT + Argon2id para autenticación (bcrypt es aceptable por compatibilidad con sistemas legacy); limitar la tasa en endpoints de autenticación
- Async donde sea soportado; anotaciones de tipo en todas las firmas
- Excepciones personalizadas vía módulo centralizado de errores
- Estrategia de carga ORM explícita, límites de transacciones, ciclo de vida seguro

**Recursos:** `execution-protocol.md`, `orm-reference.md`, `checklist.md` y `error-playbook.md`. `variants/stack.schema.json` define la forma del manifiesto de stack.

<!-- oma-docs:ignore-start -->
Los `stack/stack.yaml`, `stack/tech-stack.md`, snippets y plantillas de API específicos del proyecto se generan mediante `/stack-set` cuando hacen falta; están ausentes hasta que se materializa el stack.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Dominio:** Aplicaciones móviles multiplataforma y nativas — Flutter, React Native y Swift nativo para iOS.

**Cuándo usar:** Apps móviles nativas (iOS + Android), patrones de UI específicos para móvil, funcionalidades de plataforma (cámara, GPS, notificaciones push), arquitectura offline-first; apps nativas de iOS en Swift usando SwiftUI y `swift-openapi-generator`.

**Arquitectura:** Clean Architecture: domain -> data -> presentation. Para iOS en Swift: estructura de proyecto `App/Core/Features/Shared`.

**Stacks tecnológicos:**
- Flutter/Dart: Riverpod/Bloc (gestión de estado), Dio con interceptores (API), GoRouter (navegación), Material Design 3 (Android) + iOS HIG.
- Swift nativo para iOS (iOS 17+): SwiftUI + `@Observable` (Observation framework), `swift-openapi-generator` de Apple para clientes de API, estructura `App/Core/Features/Shared`.

**Reglas principales:**
- Riverpod/Bloc para gestión de estado (sin setState directo para lógica compleja)
- Todos los controladores liberados en el método `dispose()`
- Dio con interceptores para llamadas API; manejar offline con gracia
- Objetivo 60fps; probar en ambas plataformas
- Swift: usar `@Observable` en lugar de `ObservableObject` en iOS 17+; generar clientes de API a partir de especificaciones OpenAPI con `swift-openapi-generator`

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` y `error-playbook.md`. El directorio `variants/` contiene el esquema del stack y las referencias de plataforma generadas cuando `/stack-set` las materializa.

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

**Recursos:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, más directorio `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

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
- Documentar en `.agents/results/`

**Herramientas de inteligencia de código usadas (Gortex o Serena):**
- `find_symbol("functionName")` o navegación de símbolos de Gortex — localizar la función
- `find_referencing_symbols("Component")` o análisis de impacto de Gortex — encontrar todos los usos
- `search_for_pattern("error pattern")` o búsqueda de Gortex — encontrar problemas similares

**Recursos:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

**Dominio:** Traducción multilingüe consciente del contexto.

**Cuándo usar:** Traducir cadenas de UI, documentación, textos de marketing, revisar traducciones existentes, crear glosarios.

**Flujo de seis escenas:** Preparar, Adquirir, Razonar, Actuar, Verificar y Finalizar. El método de traducción tiene cuatro pasos: leer el significado y la sintaxis protegida, elegir el registro, reconstruir en el idioma de destino y preservar el estilo del autor donde corresponda.

**Reglas principales:**
- Escanear archivos de locale existentes primero para coincidir convenciones
- Traducir significado, no palabras
- Preservar connotaciones emocionales
- Nunca producir traducciones palabra por palabra
- Nunca mezclar registros dentro de un texto
- Preservar terminología específica del dominio tal cual

**Recursos:** `translation-rubric.md`, `anti-ai-patterns.md` (ambos neutros respecto al idioma), más un perfil por idioma de destino en `resources/lang/` (`ko`, `ja`, `zh`, `en`; usa `_template.md` para añadir otros).

---

### oma-orchestration

**Dominio:** Coordinación multiagente automatizada vía generación CLI.

**Cuándo usar:** Funcionalidades complejas que requieren múltiples agentes en paralelo, ejecución automatizada, implementación full-stack.

**Valores de configuración por defecto:**

| Configuración | Predeterminado | Descripción |
|---------------|----------------|-------------|
| MAX_PARALLEL | 3 | Máximo de subagentes concurrentes |
| MAX_RETRIES | 2 | Intentos de reintento por tarea fallida |
| POLL_INTERVAL | 30s | Intervalo de verificación de estado |

**Fases del flujo:** Plan -> Configuración (ID de sesión, inicialización de memoria) -> Ejecución (generar por nivel de prioridad) -> Monitoreo (sondear progreso) -> Verificación (automatizada + bucle de revisión cruzada) -> Recopilación (compilar resultados).

**Bucle de revisión agente-a-agente:**
1. Auto-revisión: el agente verifica su propio diff contra criterios de aceptación
2. Verificación automatizada: `oma verify agent {agent-type} --workspace {workspace}`
3. Revisión cruzada: el agente QA revisa los cambios
4. En caso de fallo: los problemas se devuelven para corrección (máximo 5 iteraciones totales)

**Monitoreo de Deuda de Clarificación:** Rastrea las correcciones del usuario durante las sesiones. Los eventos se puntúan como clarify (+10), correct (+25), redo (+40). DC >= 50 activa RCA obligatoria. DC >= 80 pausa la sesión.

**Recursos:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Dominio:** Gestión de configuración de software (SCM) y Git, con ramas, merges, conflictos, worktrees, líneas base, preparación para auditoría y Conventional Commits.

**Cuándo usar:** Después de cambios de código (`/scm`), conflictos de merge, estrategia de ramas, releases/tags o cualquier pregunta de configuración de repositorio.

**Tipos de commit:** feat, fix, refactor, docs, test, chore, style, perf.

**Flujo de trabajo (commits):** Analizar cambios -> Dividir por funcionalidad cuando sea necesario -> tipo -> alcance -> descripción (imperativo, menos de 72 caracteres, minúsculas y sin punto final) -> commit con rutas explícitas.

**Reglas:**
- Nunca usar `git add -A` o `git add .`
- Nunca hacer commit de archivos de secretos
- Siempre especificar archivos al preparar
- Usar HEREDOC para mensajes de commit multilínea
- Los trailers de coautor solo se incluyen cuando la configuración efectiva `scm.co_author` los habilita y proporciona nombre y correo.

---

### oma-coordination

**Dominio:** Guía de coordinación manual paso a paso multi-agente.

**Cuándo usar:** Proyectos complejos donde quieres control con humano en el bucle en cada puerta, orientación manual de generación de agentes, recetas de coordinación paso a paso.

**Cuándo NO usar:** Ejecución paralela totalmente automatizada (usa oma-orchestration), tareas de un solo dominio (usa el agente de dominio directamente).

**Reglas principales:**
- Presentar siempre el plan para confirmación del usuario antes de generar agentes
- Un nivel de prioridad a la vez — esperar la finalización antes del siguiente nivel
- El usuario aprueba cada transición de puerta
- La revisión de QA es obligatoria antes de fusionar
- Bucle de remediación de problemas para hallazgos CRITICAL/HIGH

**Flujo de trabajo:** PM planifica → Usuario confirma → Generar por nivel de prioridad → Monitorear → Revisión QA → Corregir problemas → Entregar.

**Diferencia con oma-orchestration:** La coordinación es manual y guiada (el usuario controla el ritmo); el orchestrator es automatizado (los agentes se generan y ejecutan con mínima intervención del usuario).

---

### oma-search

**Dominio:** Enrutador de búsqueda basado en intención con puntuación de confianza de dominio. Enruta consultas a Context7 (documentos), búsqueda web nativa, `gh`/`glab` (código) e inteligencia de código local (Gortex o Serena).

**Cuándo usar:** Encontrar documentación oficial de bibliotecas/frameworks, investigación web para tutoriales/ejemplos/comparaciones/soluciones, búsqueda de código en GitHub/GitLab para patrones de implementación, cualquier consulta donde el canal de búsqueda no esté claro (auto-enrutamiento), otras habilidades que necesitan infraestructura de búsqueda (invocación compartida).

**Cuándo NO usar:** Exploración solo local del código base (usar directamente el MCP de inteligencia de código), análisis del historial o blame de Git (usar oma-scm), investigación completa de arquitectura (usar oma-architecture, que puede invocar esta habilidad internamente).

**Reglas principales:**
- Clasificar la intención antes de buscar; cada consulta pasa primero por IntentClassifier
- Una consulta, una mejor ruta; evitar multi-ruta redundante a menos que la intención sea ambigua
- Puntuar la confianza de cada resultado; todos los resultados no locales obtienen etiquetas de confianza de dominio del registro
- Los flags sobrescriben al clasificador: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: si la ruta primaria falla, retroceder con gracia (docs→web, web→estrategias `oma search fetch`)
- No se requiere MCP adicional: Context7 para documentos, nativo del runtime para web, CLI para código y proveedor configurado (Gortex o Serena) para local
- Búsqueda web independiente del proveedor: usar lo que proporcione el runtime actual (WebSearch, Google, Bing)
- Solo confianza a nivel de dominio — sin puntuación a nivel de sub-ruta o página

**Recursos:** `SKILL.md`, directorio `resources/` con clasificador de intención, definiciones de ruta y registro de confianza.

---

### oma-recap

**Dominio:** Análisis del historial de conversaciones a través de múltiples herramientas de IA (Claude, Codex, Qwen, Cursor) con resúmenes temáticos de trabajo diarios/periódicos.

**Cuándo usar:** Resumir la actividad de trabajo de un día o período, entender el flujo de trabajo a través de múltiples herramientas de IA, analizar patrones de cambio de herramientas entre sesiones, preparar standups diarios / retros semanales / registros de trabajo.

**Cuándo NO usar:** Retrospectiva de cambios de código basada en commits de Git (usar `oma retro`), monitoreo en tiempo real de agentes (usar `oma dashboard terminal`), métricas de productividad (usar `oma stats get`).

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

### oma-academic-writing

**Dominio:** Prosa académica en inglés de calidad editorial: redacción, revisión y auditoría de ensayos, informes, secciones de análisis, resúmenes ejecutivos, conclusiones y revisiones bibliográficas.

**Cuándo usar:** Redactar o revisar informes o ensayos académicos y secciones de análisis, escribir resúmenes ejecutivos, conclusiones o revisiones bibliográficas, reescribir prosa que suene a IA en inglés natural, pulir un borrador según una rúbrica de nivel alto (HD, A, top-band), o revisar variedad de estructuras, calidad verbal, hedging y cumplimiento anti-IA.

**Cuándo NO usar:** Traducción (usar oma-translation), descubrimiento de fuentes o recopilación de citas (usar oma-scholar), interpretación de rúbricas y descomposición de tareas (usar oma-pm), documentación de código/README/referencia de API (usar la habilidad de dominio correspondiente), textos informales o de marketing, redacción académica no inglesa (redactar en inglés y después pasar a oma-translation).

**Modos:** `draft` (encabezado + prosa + Writing Notes + Claim-Evidence Map), `revise` (original + revisión + lista de cambios), `review` (informe PASS/FAIL sobre estructura de frases, calidad verbal, anti-IA, especificidad, hedging, claridad de párrafos, ritmo y alineación de afirmaciones con evidencia).

**Reglas principales:**
- Cita antes de juzgar: cita literalmente el texto de la rúbrica o restricción antes de aplicar una regla.
- Cada frase debe poder verificarse; nunca inventes datos, estadísticas ni citas.
- Los verbos genéricos prohibidos (`show`, `have`, `make`, `do`, `get`, `use`, …) no deben ser el verbo principal.
- Varía el tipo, la longitud y el inicio de las frases; nunca encadenes 3 o más frases del mismo tipo.
- Ajusta la fuerza del hedging a la fuerza de la evidencia; no uses la primera persona `I think`/`I believe`.
- Cada afirmación debe asociarse a evidencia en el Claim-Evidence Map; debilita o elimina las afirmaciones sin respaldo.

**Flujo:** 6 pasos: READ (leer la rúbrica/el borrador y citar restricciones), PLAN (párrafos como Topic-Support-Conclude), DRAFT (redactar bajo los cuatro protocolos), AUDIT (comprobar la lista anti-IA), REVERSE-OUTLINE + construir el Claim-Evidence Map, POLISH (lectura en voz alta, cohesión, especificidad, recuento de palabras y ritmo).

**Recursos:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md`, además de `context-loading` y `quality-principles` compartidos.

---

### oma-deepsec

**Dominio:** Ejecutar de principio a fin, de forma segura y consciente del costo, el escáner de vulnerabilidades `deepsec` basado en agentes de Vercel dentro de un repositorio objetivo.

**Cuándo usar:** Primera instalación de deepsec en un repositorio (`init`, escritura de `INFO.md`, escaneo de calibración), ejecutar y procesar un escaneo completo o acotado, preparar una puerta CI por PR con `process --diff`, escribir matchers específicos del proyecto, clasificar una cola de hallazgos (por severidad, cortes de FP mediante `revalidate`, exportación) o diagnosticar fallos de deepsec.

**Cuándo NO usar:** Revisión genérica tipo OWASP/lint sin deepsec (usar oma-qa), avisos genéricos de CVE o dependencias (usar oma-qa u oma-search), diseñar un pipeline SAST que no sea deepsec (usar oma-architecture), escribir o auditar código de aplicación (enrutar a oma-backend/frontend/mobile), endurecimiento de cloud/IAM/Terraform (usar oma-tf-infra), razonar sobre la corrección de un hallazgo en código de producto (usar oma-debug después de que deepsec produzca el hallazgo).

**Reglas principales:**
- Nunca ejecutes un `process` sin límite en un repositorio cuyo tamaño no hayas medido; calibra primero (`--limit 50 --concurrency 5`) cuando se desconozca el número de archivos o sea mayor que 500.
- Declara el costo y la condición de parada antes de cualquier pasada de IA (≈ $25-60 para 100 archivos hasta $500-1,200 para 2,000, con una variación de ×2-3).
- Reanuda, no reinicies: después de una interrupción por cuota, red o Ctrl-C, vuelve a ejecutar el mismo comando; nunca elimines `data/<id>/` para empezar de cero.
- Mantén `INFO.md` breve y específico del proyecto (50-100 líneas, 3-5 ejemplos por sección).
- Para puertas PR/CI usa el patrón de dos jobs; nunca otorgues `pull-requests: write` al job que ejecuta código controlado por PR; fija las actions a SHAs completos en producción.
- Pregunta la elección de agente (`codex`/`gpt-5.5` frente a `claude`/`claude-opus-4-8`) antes de la primera llamada de pago; nunca muestres ni hagas commit de credenciales.

**Flujo:** PREPARE (intención, raíz del repositorio, credencial, presupuesto, umbral de severidad y agente) → ACQUIRE (configuración, `INFO.md`, historial de ejecuciones y señales del repositorio) → REASON (elegir la pasada suficiente más pequeña) → ACT (ejecutar desde `.deepsec/`) → VERIFY (`status`, `RunMeta`, código de salida) → FINALIZE (hallazgos por severidad/veredicto, costo y seguimientos).

**Recursos:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Dominio:** Detección de drift documental: verificar referencias de `docs/**/*.md` contra el código actual y proponer parches para documentación afectada por un diff.

**Cuándo usar:** Después de un refactor, renombrado o eliminación de archivos para encontrar referencias obsoletas, antes de una release para comprobar comandos CLI/rutas/claves de configuración, después de un diff importante o como comprobación rutinaria en un repositorio con mucha documentación.

**Cuándo NO usar:** Generar documentación desde cero para funcionalidad no documentada, traducir documentación (usar oma-translation), drift a nivel de símbolos, enforcement de CI (v1 solo advierte).

**Reglas principales:**
- Nunca modifiques `.agents/` (protección SSOT) en ningún modo.
- Nunca apliques automáticamente parches sync; sync siempre es interactivo (requiere confirmación `[y]` por documento).
- Si no hay LLM, degrada con gracia: verify devuelve JSON sin procesar y sync solo la lista de candidatos.
- Los archivos que contienen secretos (`.env*`, `*.pem`, `*.key`, `id_rsa*`, gitignored) nunca aparecen en la salida sync.
- La CLI no hace llamadas directas a APIs LLM: emite datos estructurados; el host LLM sintetiza y redacta los parches (independiente del proveedor).
- La comprobación de URLs se delega a `lychee`; el hook es warn-only en v1 y nunca bloquea la finalización del flujo.

**Flujo:** modo verify — extract → resolve → report (CLI determinista, salida 0 limpia / 1 con referencias rotas). Modo sync — git diff → reverse lookup → lista de candidatos → propuestas de parche del host LLM → aceptación/rechazo interactivos → regenerar `doc-refs.json`.

**Recursos:** Usa solo recursos compartidos; la implementación vive en `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Dominio:** Explainers interactivos para cambios de código.

**Cuándo usar:** Explicar un diff, pull request, branch o rango de commits a lectores que necesitan contexto, intuición, recorrido del código y un cuestionario breve en un único artefacto HTML autocontenido y utilizable offline.

**Flujo:** Lee el cambio solicitado, crea un explainer HTML autocontenido con secciones Background / Intuition / Code / Quiz, valida el artefacto y lo escribe bajo `.agents/results/explain/`.

**Cuándo NO usar:** Una página documental normal, la implementación de una funcionalidad en vivo o una presentación (usar `oma-slide` para presentaciones).

**Recursos:** Usa los recursos compartidos de ejecución y calidad, además de la validación de artefactos del flujo `/explain`.

---

### oma-image

**Dominio:** Generación de imágenes con varios proveedores y despacho paralelo consciente de la autenticación (Codex `gpt-image-2`, modelos Gemini-family “nano-banana” de Antigravity mediante `agy` con el modelo concreto seleccionado internamente y Pollinations flux/zimage).

**Cuándo usar:** Generar imágenes, recursos visuales, ilustraciones, fotos de producto, concept art o mockups; comparar varios modelos de imagen con el mismo prompt; crear imágenes desde prompts dentro de flujos de edición.

**Cuándo NO usar:** Editar una imagen o manipular fotos existentes, generar vídeo o audio (usar oma-video u oma-voice), composición vectorial/SVG inline a partir de datos estructurados, redimensionar recursos o convertir formatos de forma simple.

**Reglas principales:**
- Aclara antes de invocar: si sujeto, estilo, composición o uso son ambiguos, pregunta o amplía el prompt y muestra al usuario la versión ampliada.
- Despacho consciente de la autenticación: ejecuta solo proveedores autenticados; con `--vendor all`, todos los proveedores solicitados deben estar disponibles.
- Guardarraíl de costo: confirma antes de ejecuciones cuyo costo estimado sea >= $0.20 (`--yes`/`OMA_IMAGE_YES=1` lo omiten); `pollinations` y `antigravity` son gratuitos por defecto.
- Seguridad de rutas: la salida fuera de `$PWD` requiere `--allow-external-output`; `n` máximo = 5.
- Salidas registradas: cada ejecución escribe `manifest.json` junto a las imágenes con prompt, proveedor/modelo, entradas y metadatos del artefacto. Registra datos de reproducibilidad, no promete imágenes idénticas píxel a píxel.
- Reenvío automático de imágenes de referencia adjuntas mediante `--reference <path>` (codex/antigravity).

**Flujo:** PREPARE (aclarar/ampliar el prompt y elegir proveedor) → ACQUIRE (validar autenticación, referencias y ruta de salida) → ACT (`oma image generate`) → VERIFY (manifest, archivos y código de salida) → FINALIZE (rutas de salida y advertencias).

**Recursos:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md` y `config/image-config.yaml`.

---

### oma-market

**Dominio:** Investigación de mercado basada en señales comunitarias: extracción de problemas, detección de tendencias, posicionamiento de competidores y descubrimiento. Las ejecuciones usan el motor upstream [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web y más), que oma mantiene en la versión más reciente automáticamente.

**Cuándo usar:** Extraer problemas reales de usuarios desde publicaciones comunitarias, detectar tendencias de una categoría en ventanas de 7/30/90/180 días, analizar el sentimiento de competidores y su posicionamiento con SWOT / Porter's 5F, descubrimiento abierto (`--discover`), investigar personas/empresas/tickers, señales de contratación y análisis de seguimiento.

**Cuándo NO usar:** Investigación web general sin marco de mercado (usar oma-search), literatura académica (usar oma-scholar), dashboards en vivo o monitoreo programado (envolver esta habilidad con `oma schedule <action>`).

**Reglas principales:**
- Primero detect-trap: nunca ejecutes el motor sin preflight (`--force` solo después de que el usuario reconfirme explícitamente).
- Un solo motor, siempre actualizado: `oma market resolve` actualiza la copia gestionada (`~/.cache/oma-market/last30days/<tag>/`) antes de usarla; una copia instalada por el usuario y obsoleta solo es fallback cuando no hay caché offline.
- Sigue literalmente el `SKILL.md` del motor resuelto; la única sustitución es `oma market run <args>` en lugar de la llamada cruda `python3 scripts/last30days.py`.
- Nunca uses solo WebSearch: si no hay motor, no hay Python 3.12+ o hay una salida distinta de cero, detente e informa.
- Las fuentes con clave solo se habilitan mediante el asistente de configuración upstream con consentimiento; las fuentes omitidas permanecen visibles en el pie.
- Los marcos citan solo clusters del motor; se imponen el badge en la primera línea y las LAWs upstream antes de escribir el archivo.
- Un único brief por ejecución en `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; el framework cambia automáticamente según la intención (pain/trend → SWOT, competitor → SWOT + Porter's 5F, discovery → SWOT + PESTEL).

**Flujo:** detect-trap → `oma market resolve` → leer el `SKILL.md` upstream → pasos upstream de pre-research (asistente de configuración, resolución de handles/subreddits y plan de consultas) → `oma market run … --emit=compact` → sintetizar según el OUTPUT CONTRACT upstream → añadir marcos → self-check → escribir.

**Recursos:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md` y `frameworks/` (swot, porters-5f, pestel). CLI: `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Dominio:** Refactorización que preserva el comportamiento: reestructuración incremental segura con objetivos de code smells/SATD/hotspots, redes de seguridad de pruebas de caracterización y commits solo de refactorización.

**Cuándo usar:** Ejecutar una refactorización en archivos o módulos concretos (extraer, mover, renombrar, descomponer, alinear idioms), preparar una refactorización antes de una funcionalidad, rescatar código legacy/brownfield (descubrir seams + pruebas de caracterización), seleccionar objetivos mediante hotspot (churn × complejidad) o auditar si el código está listo para refactorizar.

**Cuándo NO usar:** Corregir un bug o comportamiento fallido (usar oma-debug; una refactorización no debe cambiar el comportamiento), auditar seguridad/rendimiento/accesibilidad (usar oma-qa), diseñar sistemas o límites de módulos (usar oma-architecture), diseñar esquemas o migraciones de DB (usar oma-db), dividir commits o preparar staging (usar oma-scm), optimizar rendimiento como objetivo.

**Reglas principales:**
- Preservar comportamiento: el contrato del consumidor (consciente de Hyrum) es inviolable; cualquier mejora de rendimiento es un efecto secundario, nunca el objetivo.
- Verificar: nunca reestructures sin una red de seguridad; si falta o es débil, escribe primero pruebas de caracterización (golden-master) en commits separados.
- Incrementar: una transformación nombrada por commit; ante fallos repetidos usa Mikado (registra el prerrequisito, revierte por completo y vuelve a entrar de forma recursiva).
- Separar (dos sombreros): nunca mezcles cambios de comportamiento en commits de refactorización (solo tipo `refactor:`).
- Economía: la legibilidad es el objetivo dominante; no refactorices código que se va a eliminar ni código frío y con poco churn.
- Una desviación de convenciones requiere la ruta ADR de oma-architecture, no un cambio local; todas las métricas son proxies (Goodhart).

**Flujo:** PREPARE (clasificar green/brownfield, puertas de tamaño y ranking de hotspots) → ACQUIRE (leer código mediante herramientas de símbolos, recopilar métricas y señales de Git) → REASON (planificar una secuencia de transformaciones atómicas / expand-contract) → ACT (una transformación engine-first) → VERIFY (volver a ejecutar pruebas sin cambios → commit, o revertir con Mikado) → FINALIZE (delta de métricas y veredicto de legibilidad).

**Recursos:** `definition.md`, `measurement.md`, `governance.md`, además de `context-loading` y `quality-principles` compartidos.

---

### oma-scholar

**Dominio:** Compañero de investigación académica basado en la especificación de sidecars Knows `.knows.yaml`: generar, validar, revisar, consultar y comparar sidecars estructurados de artículos, además de recuperarlos desde knows.academy.

**Cuándo usar:** Leer artículos de forma eficiente mediante sidecars (solo claims de ~700 tokens frente a un PDF completo de ~10K), generar `.knows.yaml` desde borradores/LaTeX/notas, validar la estructura antes de compartir, producir revisiones por pares como sidecars, consultar o resumir sidecars existentes, comparar dos artículos estructuralmente o buscar/recuperar desde knows.academy.

**Cuándo NO usar:** Búsqueda web general o contenido no académico (usar oma-search), traducir artículos (usar oma-translation), analizar PDFs sin sidecar (usar oma-pdf), flujo completo de peer review con sistema editorial.

**Modos:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Reglas principales:**
- La especificación objetivo es el perfil v0.9.0 / `paper@1`; el host LLM genera sidecars (nunca invoques un SDK LLM externo desde shell).
- Anti-fabricación: si DOI, venue o año no aparecen en la fuente, omite por completo la clave; nunca escribas `doi: TODO` ni adivines.
- Nombres de campo exactos, un único objeto `provenance.actor`, enums cerrados y números sin comillas.
- Densidad de relaciones >= 1.5 por afirmación; cada afirmación necesita evidencia `supported_by`.
- Valida antes de compartir (`oma scholar lint`); usa `--lenient` para sidecars de terceros.
- knows.academy → fallback a OpenAlex para artículos anteriores o no pertenecientes a 2026; la API proxy pública no requiere autenticación.

**Flujo:** PREPARE (modo + fuente) → ACQUIRE (metadatos, secciones o texto local) → REASON (extraer afirmaciones/evidencia/relaciones) → ACT (generar/lint/revisar/analizar/comparar/recuperar) → VERIFY (esquema, enums, IDs y relaciones) → FINALIZE (sidecar/informe/resumen con salvedades).

**Recursos:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md` y `config/scholar-config.yaml`.

---

### oma-skill-creation

**Dominio:** Crear y validar habilidades OMA en formato Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Cuándo usar:** Crear una habilidad nueva en `.agents/skills/{name}/SKILL.md`, actualizar una existente al formato SSL-lite, añadir una ruta de comando o flujo canónico a una habilidad con mucha ejecución, auditar si una habilidad tiene suficientes detalles de enrutamiento/ejecución/validación/recuperación o decidir si una variante debe ir inline o en `resources/`.

**Cuándo NO usar:** Instalar habilidades de terceros en `$CODEX_HOME/skills` (externo), crear un bundle de plugin Codex (externo), redactar un plan general no relacionado con la autoría de habilidades (usar oma-pm), editar código de producto/infraestructura/frontend/backend/mobile directamente (usar la habilidad especialista correspondiente).

**Reglas principales:**
- Mantener exactamente las cuatro secciones de nivel superior: Scheduling, Structural Flow, Logical Operations, References.
- Mantener frontmatter YAML con `name` y `description` claros; ejecutar `oma skill audit` después de editar la descripción (advertencia >= 60%, fallo >= 75% de colisión TF-IDF).
- Incluir límites concretos de `When NOT to use` con rutas a habilidades adyacentes.
- Añadir exactamente una ruta canónica inline (`Canonical command path` para comandos frágiles/repetibles, `Canonical workflow path` para flujos de juicio/investigación).
- Colocar los detalles largos específicos de variantes en `resources/`, no en el cuerpo principal; no crear README/changelog/docs de instalación dentro de una habilidad.

**Flujo:** PREPARE (propósito, disparadores, límites, I/O y dependencias) → ACQUIRE (leer 1-3 habilidades análogas y convenciones) → REASON (inline frente a `resources/`) → ACT (redactar desde la plantilla SSL-lite) → VERIFY (comprobaciones estructurales, de enrutamiento, ejecución y formato) → FINALIZE (archivos modificados e informe de validación).

**Recursos:** `ssl-lite-template.md`, `validation-checklist.md`, además de `context-loading` y `quality-principles` compartidos.

---

### oma-slide

**Dominio:** Generación de presentaciones HTML con muchas animaciones en un escenario fijo de 1920×1080, con validación, empaquetado y exportación deterministas a PDF/PNG/PPTX mediante la CLI `oma slide`.

**Cuándo usar:** Crear una presentación desde un tema o esquema, mejorar o reformatear un deck existente, generar HTML por diapositiva con animaciones y estética de doctrina de diseño, exportar a PDF/PNG/PPTX, aplicar un preset de estilo o exportar a/importar desde Canva.

**Cuándo NO usar:** Crear documentos sin diapositivas, generar imágenes de forma aislada (usar oma-image), definir un sistema de marca/diseño (usar oma-design), operaciones CLI deterministas (validar/empaquetar/exportar) sin generación (invocar directamente la CLI `oma slide`).

**Reglas principales:**
- La habilidad escribe el HTML; la CLI hace todo lo demás (scaffold, validar, empaquetar y exportar).
- Solo recursos locales: no uses URLs remotas en `<img src>`/`<video src>`, solo `./assets/<file>`.
- CJK requiere la fuente Pretendard en cualquier diapositiva coreana, japonesa o china.
- Cada diapositiva requiere un wrapper `prefers-reduced-motion`, estados de foco visibles y `data-om-validate`.
- Máximo 3 iteraciones de auto-fix en la validación; después muestra el diff al usuario.
- Delega la generación de imágenes en oma-image; Canva MCP es opcional y solo se aprovisiona automáticamente con consentimiento explícito.

**Flujo:** 7 fases: DETECT (modo), DISCOVER (aclarar + evaluar recursos), STYLE (3 vistas previas en vivo → el usuario elige), GENERATE (`slide-NN.html` a 1920×1080), VALIDATE (`oma slide validate`, ≤3 bucles de auto-fix), REVIEW (visor + editor bbox opcional), DELIVER (`bundle` + exportación opcional a PDF/PNG/PPTX).

**Recursos:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md` y un directorio `assets/`.

---

### oma-video

**Dominio:** Generación de vídeos cortos, explainers y demos grabadas por humanos mediante la CLI `oma video`, componiendo guion → narración → visuales → subtítulos → render de Remotion.

**Cuándo usar:** Generar vídeos cortos (shorts/reels, 9:16) desde un tema, explainers (16:9/9:16) desde README/código/datos, demos/walkthroughs desde una captura de pantalla (`--source file`) o una captura supervisada de una aplicación web con navegador visible de cualquier URL (`--source web`), o volver a renderizar de forma determinista una ejecución existente.

**Cuándo NO usar:** Generar una imagen fija (usar oma-image), generar un deck (usar oma-slide; video lo invoca internamente para los frames de explicación), generar solo audio de voz (usar oma-voice), edición no lineal de un mp4 terminado o streaming en vivo (la captura web supervisada sí está incluida).

**Reglas principales:**
- Aclara o infiere el modo antes de invocar; muestra al usuario el plan inferido en lugar de renderizar en silencio desde un brief vago.
- La configuración de proveedores permite fallbacks de recursos cuando hay claves opcionales; proveedores de pago (Pexels, Pixelle) se habilitan automáticamente solo si existe su clave de entorno, pero un fallo del compositor nunca se sustituye con un vídeo fallback.
- Guardarraíl de costo en >= `$0.20` (`--yes`/`OMA_VIDEO_YES=1` lo omite); límites de 180 s de duración / 40 escenas.
- Las entradas del render se registran en `render-spec.json`, recursos, seed y Pretendard embebido; `OMA_VIDEO_MOCK=1` es un harness de pruebas para fixtures dorados, no un entregable de usuario.
- La demo está supervisada por una persona: la captura web solo abre un navegador visible y graba mientras una persona conduce el flujo — NO automatiza credenciales; `--url` y los tokens se enmascaran en logs/manifiesto.
- Seguridad de rutas (`--allow-external-output` para salidas fuera de `$PWD`).

**Flujo:** PREPARE (modo/aspecto/locale, aclarar/ampliar el brief) → ACQUIRE (comprobar disponibilidad de proveedores, validar la captura y comprobar el costo) → ACT (guion → voz ∥ visuales ∥ subtítulos → render-spec → render) → VERIFY (esquema, hashes del manifest, código de salida y mp4) → FINALIZE (directorio de ejecución + ruta al mp4 + advertencias de cobertura).

**Recursos:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, además del compositor Remotion distribuido en `remotion/`, el driver de captura web y el compositor fallback `mpt/`; `config/video-config.yaml`.

---

### oma-voice

**Dominio:** Texto a voz y voz a texto local mediante el servidor MCP Voicebox: todo en el dispositivo, sin nube, sin claves de API y sin costo por llamada.

**Cuándo usar:** Generar audio breve de notificación para terminar o bloquear tareas de agentes, crear voiceovers/narración/recursos de audio (mp3 o wav), transcribir archivos de audio locales (mp3, wav, m4a, webm, flac) a Markdown o comparar perfiles de voz ejecutando el mismo texto con distintos IDs de perfil.

**Cuándo NO usar:** TTS en la nube o voces multilingües cloud de alta fidelidad, dictado de micrófono en tiempo real desde la terminal (usar el dictado por hotkey de Voicebox), subir muestras o crear perfiles de clonación de voz (se hace en la app de escritorio Voicebox), vídeo/música/diseño sonoro.

**Reglas principales:**
- Voicebox es obligatorio: si falla el handshake o `GET /health`, termina con una indicación única para instalar/iniciar; no reintentes ni reinicies automáticamente.
- El perfil es obligatorio: si `voicebox_list_profiles` devuelve una lista vacía, dirige al usuario a la UI de la app y termina.
- Límites de longitud: TTS máximo 5000 caracteres por llamada (avisa a partir de 2000), STT máximo 30 minutos; v1 no divide automáticamente.
- Transparencia de invocación automática: las notificaciones solo se disparan cuando la tarea supera `auto_notify_after_sec` (60 s por defecto); anuncia siempre la intención en una línea.
- Seguridad de rutas (avisa y pide confirmación para salidas fuera de `$PWD`); SIGINT no escribe una salida parcial.
- Manifest obligatorio en cada generación; sin guardarraíl de costo (Voicebox es gratuito).

**Flujo:** PREPARE (validar texto/audio/idioma/ruta/perfil) → ACQUIRE (aclarar una vez si falta una señal) → ACT (MCP `voicebox_speak` o `voicebox_transcribe`) → VERIFY (presencia de audio/transcripción + campos del manifest) → FINALIZE (escribir `manifest.json` e informar de la ruta).

**Recursos:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md` y `config/voice-config.yaml`.

---

## Preflight de charter (CHARTER_CHECK)

Antes de escribir cualquier código, cada agente de implementación debe producir un bloque CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
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

## Carga de habilidades en dos capas

El conocimiento de cada agente se divide en dos capas:

**Capa 1: SKILL.md (~3,100 tokens de mediana):**
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

## Ejecución acotada

Los agentes operan bajo límites estrictos de dominio:

- Un agente frontend no modificará código backend
- Un agente backend no tocará componentes de UI
- Un agente DB no implementará endpoints de API
- Los agentes documentan dependencias fuera de alcance para otros agentes

Cuando se descubre una tarea que pertenece a un dominio diferente durante la ejecución, el agente la documenta en su archivo de resultados como un elemento de escalamiento, en lugar de intentar manejarla.

---

## Estrategia de workspaces

Para proyectos multiagente, los workspaces separados previenen conflictos de archivos:

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Los workspaces se especifican con el flag `-w` al generar agentes:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Flujo de orquestación

Al ejecutar un flujo multiagente (`/orchestrate` o `/work`):

1. **Agente PM** descompone la solicitud en tareas específicas por dominio con prioridades (P0, P1, P2) y dependencias
2. **Sesión inicializada:** ID de sesión generado, `orchestrator-session-{sessionId}.md` y `task-board-{sessionId}.md` creados en el almacén de memoria configurado
3. **Tareas P0** generadas en paralelo (hasta MAX_PARALLEL agentes concurrentes)
4. **Progreso monitoreado:** el orquestador sondea archivos de progreso con ámbito de ejecución `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` cada POLL_INTERVAL
5. **Tareas P1** generadas después de que P0 completa, y así sucesivamente
6. **Bucle de verificación** ejecutado para cada agente completado (auto-revisión -> verificación automatizada -> revisión cruzada por QA)
7. **Resultados recopilados** de archivos de resultados con ámbito de ejecución y claims estructurados, que declaran el resultado de cada ejecución
8. **Informe final** con resumen de sesión, archivos modificados, problemas pendientes

---

## Definiciones de agentes

Los agentes se definen en dos ubicaciones:

**`.agents/agents/`** — Contiene 12 archivos de definición de subagentes:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Estos archivos definen la identidad del agente, referencia del protocolo de ejecución, plantilla CHARTER_CHECK, resumen de arquitectura y reglas. Se usan al generar subagentes vía la herramienta Task/Agent (Claude Code) o CLI.

El runtime también expone 13 roles de despacho canónicos: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` y `explore`. `research-explorer.md` es la definición registrada asociada a `explore`; `orchestrator` es un rol de coordinación de runtime sin una definición separada.

**Proyecciones nativas del proveedor:** OMA materializa las definiciones fuente en archivos de agente específicos del runtime:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` y otras proyecciones seleccionadas cuando sean compatibles

Estos archivos generados se actualizan mediante `oma link`, `oma install` y `oma update`.

---

## Estado en tiempo de ejecución (almacén de memoria del proyecto)

Durante las sesiones de orquestación, los agentes se coordinan mediante archivos persistentes en `.agents/state/memories/` (los proyectos antiguos recurren a la ruta heredada `.serena/memories/`; se configura en `mcp.json`):

| Archivo | Propietario | Propósito | Otros |
|---------|-------------|-----------|-------|
| `orchestrator-session-{sessionId}.md` | Orquestador | ID de sesión, estado, hora de inicio, seguimiento de fases | Solo lectura |
| `task-board-{sessionId}.md` | Orquestador | Asignaciones de tareas, prioridades, actualizaciones de estado | Solo lectura |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Esa ejecución | Progreso turno a turno: acciones realizadas, archivos leídos/modificados y estado actual | El orquestador lee |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Esa ejecución | Salida final: estado (completado/fallido), resumen, archivos modificados y lista de criterios de aceptación | El orquestador lee |
| `session-metrics.md` | Orquestador | Seguimiento de Deuda de Clarificación, progresión de Quality Score | QA lee |
| `experiment-ledger.md` | Orquestador/QA | Seguimiento de experimentos cuando Quality Score está activo | Todos leen |

Las herramientas de memoria son configurables. Por defecto los agentes leen y escriben estos archivos de coordinación directamente con sus herramientas nativas (`Read`, `Write`, `Edit`), pero se pueden configurar herramientas personalizadas y una ruta base en `mcp.json`:

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Los dashboards (`oma dashboard terminal` y `oma dashboard web`) observan estos archivos de memoria para monitoreo en tiempo real.
