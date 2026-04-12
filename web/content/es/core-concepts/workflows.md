---
title: Flujos de Trabajo
description: Referencia completa de los 14 flujos de trabajo de oh-my-agent — comandos slash, modos persistente vs no persistente, palabras clave de activación en 11 idiomas, fases y pasos, archivos leídos y escritos, mecánica de auto-detección vía triggers.json y keyword-detector.ts, filtrado de patrones informativos y gestión de estado del modo persistente.
---

# Flujos de Trabajo

Los flujos de trabajo son procesos estructurados de múltiples pasos activados por comandos slash o palabras clave en lenguaje natural. Definen cómo los agentes colaboran en tareas — desde utilidades de una sola fase hasta puertas de calidad complejas de 5 fases.

Hay 14 flujos de trabajo, 3 de los cuales son persistentes (mantienen estado y no pueden ser interrumpidos accidentalmente).

---

## Flujos de Trabajo Persistentes

Los flujos persistentes continúan ejecutándose hasta que todas las tareas estén completadas. Mantienen estado en `.agents/state/` y reinyectan contexto `[OMA PERSISTENT MODE: ...]` en cada mensaje del usuario hasta que se desactivan explícitamente.

### /orchestrate

**Descripción:** Ejecución paralela automatizada de agentes basada en CLI. Genera subagentes vía CLI, coordina a través de memoria MCP, monitorea progreso y ejecuta bucles de verificación.

**Persistente:** Sí. Archivo de estado: `.agents/state/orchestrate-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "orchestrate" |
| Inglés | "parallel", "do everything", "run everything" |
| Coreano | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japonés | "オーケストレート", "並列実行", "自動実行" |
| Chino | "编排", "并行执行", "自动执行" |
| Español | "orquestar", "paralelo", "ejecutar todo" |
| Francés | "orchestrer", "parallèle", "tout exécuter" |
| Alemán | "orchestrieren", "parallel", "alles ausführen" |
| Portugués | "orquestrar", "paralelo", "executar tudo" |
| Ruso | "оркестровать", "параллельно", "выполнить всё" |
| Neerlandés | "orkestreren", "parallel", "alles uitvoeren" |
| Polaco | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Pasos:**
1. **Paso 0 — Preparación:** Leer habilidad de coordinación, guía de carga de contexto, protocolo de memoria. Detectar proveedor.
2. **Paso 1 — Cargar/Crear Plan:** Verificar `.agents/results/plan-{sessionId}.json`. Si falta, pedir al usuario ejecutar `/plan` primero.
3. **Paso 2 — Inicializar Sesión:** Cargar `oma-config.yaml`, mostrar tabla de mapeo CLI, generar ID de sesión (`session-YYYYMMDD-HHMMSS`), crear `orchestrator-session.md` y `task-board.md` en memoria.
4. **Paso 3 — Generar Agentes:** Para cada nivel de prioridad (P0 primero, luego P1...), generar agentes usando método apropiado del proveedor (herramienta Agent para Claude Code, `oma agent:spawn` para Gemini/Antigravity, mediado por modelo para Codex). Nunca exceder MAX_PARALLEL.
5. **Paso 4 — Monitorear:** Sondear archivos `progress-{agent}.md`, actualizar `task-board.md`. Vigilar completaciones, fallos, crashes.
6. **Paso 5 — Verificar:** Ejecutar `verify.sh {agent-type} {workspace}` por cada agente completado. En caso de fallo, regenerar con contexto de error (máximo 2 reintentos). Después de 2 reintentos, activar Bucle de Exploración: generar 2-3 hipótesis, generar experimentos paralelos, puntuar, conservar el mejor.
7. **Paso 6 — Recopilar:** Leer todos los archivos `result-{agent}.md`, compilar resumen.
8. **Paso 7 — Informe Final:** Presentar resumen de sesión. Si se midió Quality Score, incluir resumen del Ledger de Experimentos y auto-generar lecciones.

**Archivos leídos:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Archivos escritos:** `orchestrator-session.md`, `task-board.md` (memoria), informe final.

**Cuándo usar:** Proyectos grandes que requieren máximo paralelismo con coordinación automatizada.

---

### /work

**Descripción:** Coordinación multi-dominio paso a paso. El PM planifica primero, luego los agentes ejecutan con confirmación del usuario en cada puerta, seguido de revisión QA y remediación de problemas.

**Persistente:** Sí. Archivo de estado: `.agents/state/work-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "work", "step by step" |
| Coreano | "코디네이트", "단계별" |
| Japonés | "コーディネート", "ステップバイステップ" |
| Chino | "协调", "逐步" |
| Español | "coordinar", "paso a paso" |
| Francés | "coordonner", "étape par étape" |
| Alemán | "koordinieren", "schritt für schritt" |

**Pasos:**
1. **Paso 0 — Preparación:** Leer habilidades, carga de contexto, protocolo de memoria. Registrar inicio de sesión.
2. **Paso 1 — Analizar Requisitos:** Identificar dominios involucrados. Si es dominio único, sugerir uso directo del agente.
3. **Paso 2 — Planificación del Agente PM:** El PM descompone requisitos, define contratos de API, crea desglose priorizado de tareas, guarda en `.agents/results/plan-{sessionId}.json`.
4. **Paso 3 — Revisar Plan:** Presentar plan al usuario. **Debe obtener confirmación antes de proceder.**
5. **Paso 4 — Generar Agentes:** Generar por nivel de prioridad, paralelo dentro del mismo nivel, workspaces separados.
6. **Paso 5 — Monitorear:** Sondear archivos de progreso, verificar alineación de contratos API entre agentes.
7. **Paso 6 — Revisión QA:** Generar agente QA para seguridad (OWASP), rendimiento, accesibilidad, calidad de código.
8. **Paso 6.1 — Quality Score** (condicional): Medir y registrar línea base.
9. **Paso 7 — Iterar:** Si se encuentran problemas CRITICAL/HIGH, regenerar agentes responsables. Si el mismo problema persiste después de 2 intentos, activar Bucle de Exploración.

**Cuándo usar:** Funcionalidades que abarcan múltiples dominios donde quieres control paso a paso y aprobación del usuario en cada puerta.

---

### /ultrawork

**Descripción:** El flujo obsesionado con la calidad. 5 fases, 17 pasos totales, 11 de los cuales son pasos de revisión. Cada fase tiene una puerta que debe pasar antes de proceder.

**Persistente:** Sí. Archivo de estado: `.agents/state/ultrawork-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "ultrawork", "ulw" |

**Fases y pasos:**

| Fase | Pasos | Agente | Perspectiva de Revisión |
|------|-------|--------|------------------------|
| **PLAN** | 1-4 | Agente PM (inline) | Completitud, Meta-revisión, Sobre-ingeniería/Simplicidad |
| **IMPL** | 5 | Agentes Dev (generados) | Implementación |
| **VERIFY** | 6-8 | Agente QA (generado) | Alineación, Seguridad (OWASP), Prevención de Regresiones |
| **REFINE** | 9-13 | Agente Debug (generado) | División de archivos, Reusabilidad, Impacto en Cascada, Consistencia, Código Muerto |
| **SHIP** | 14-17 | Agente QA (generado) | Calidad de Código (lint/cobertura), Flujo UX, Problemas Relacionados, Preparación para Despliegue |

**Definiciones de puertas:**
- **PLAN_GATE:** Plan documentado, suposiciones listadas, alternativas consideradas, revisión de sobre-ingeniería hecha, confirmación del usuario.
- **IMPL_GATE:** Build exitoso, pruebas pasan, solo archivos planificados modificados, Quality Score de línea base registrado (si se mide).
- **VERIFY_GATE:** Implementación coincide con requisitos, cero CRITICAL, cero HIGH, sin regresiones, Quality Score >= 75 (si se mide).
- **REFINE_GATE:** Sin archivos/funciones grandes (> 500 líneas / > 50 líneas), oportunidades de integración capturadas, efectos secundarios verificados, código limpio, Quality Score no ha retrocedido.
- **SHIP_GATE:** Verificaciones de calidad pasan, UX verificada, problemas relacionados resueltos, checklist de despliegue completa, Quality Score final >= 75 con delta no negativo, aprobación final del usuario.

**Comportamiento en caso de fallo de puerta:**
- Primer fallo: volver al paso relevante, corregir y reintentar.
- Segundo fallo en el mismo problema: activar Bucle de Exploración (generar 2-3 hipótesis, experimentar cada una, puntuar, conservar la mejor).

**Mejoras condicionales:** Medición de Quality Score, decisiones Keep/Discard, Ledger de Experimentos, Exploración de Hipótesis, Auto-aprendizaje (lecciones de experimentos descartados).

**Condición de omisión de REFINE:** Tareas simples de menos de 50 líneas.

**Cuándo usar:** Entrega de máxima calidad. Cuando el código debe estar listo para producción con revisión exhaustiva.

---

## Flujos de Trabajo No Persistentes

### /plan

**Descripción:** Desglose de tareas dirigido por el PM. Analiza requisitos, selecciona stack tecnológico, descompone en tareas priorizadas con dependencias, define contratos de API.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "task breakdown" |
| Inglés | "plan" |
| Coreano | "계획", "요구사항 분석", "스펙 분석" |
| Japonés | "計画", "要件分析", "タスク分解" |
| Chino | "计划", "需求分析", "任务分解" |

**Pasos:** Recopilar requisitos -> Analizar viabilidad técnica (análisis de código MCP) -> Definir contratos API -> Descomponer en tareas -> Revisar con usuario -> Guardar plan.

**Salida:** `.agents/results/plan-{sessionId}.json`, escritura en memoria, opcionalmente `docs/exec-plans/active/` para planes complejos.

**Ejecución:** Inline (sin generación de subagentes). Consumido por `/orchestrate` o `/work`.

---

### /exec-plan

**Descripción:** Crea, gestiona y rastrea planes de ejecución como artefactos de repositorio de primera clase en `docs/exec-plans/`.

**Palabras clave de activación:** Ninguna (excluido de auto-detección, debe invocarse explícitamente).

**Pasos:** Preparación -> Analizar alcance (evaluar complejidad: Simple/Media/Compleja) -> Crear plan de ejecución (markdown en `docs/exec-plans/active/`) -> Definir contratos API (si cruza límites) -> Revisar con usuario -> Ejecutar (delegar a `/orchestrate` o `/work`) -> Completar (mover a `completed/`).

**Salida:** `docs/exec-plans/active/{nombre-plan}.md` con tabla de tareas, registro de decisiones, notas de progreso.

**Cuándo usar:** Después de `/plan` para funcionalidades complejas que necesitan ejecución rastreada con registro de decisiones.

---

### /brainstorm

**Descripción:** Ideación orientada al diseño. Explora intención, clarifica restricciones, propone enfoques, produce un documento de diseño aprobado antes de planificar.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "brainstorm" |
| Inglés | "ideate", "explore design" |
| Coreano | "브레인스토밍", "아이디어", "설계 탐색" |
| Japonés | "ブレインストーミング", "アイデア", "設計探索" |
| Chino | "头脑风暴", "创意", "设计探索" |

**Pasos:** Explorar contexto del proyecto (análisis MCP) -> Hacer preguntas clarificadoras (una a la vez) -> Proponer 2-3 enfoques con compromisos -> Presentar diseño sección por sección (con aprobación del usuario en cada paso) -> Guardar documento de diseño en `docs/plans/` -> Transición: sugerir `/plan`.

**Reglas:** No implementar ni planificar antes de la aprobación del diseño. Sin salida de código. YAGNI.

---

### /deepinit

**Descripción:** Inicialización completa del proyecto. Analiza un codebase existente, genera AGENTS.md, ARCHITECTURE.md y una base de conocimiento estructurada en `docs/`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "deepinit" |
| Coreano | "프로젝트 초기화" |
| Japonés | "プロジェクト初期化" |
| Chino | "项目初始化" |

**Pasos:** Preparación -> Analizar codebase (tipo de proyecto, arquitectura, reglas implícitas, dominios, límites) -> Generar ARCHITECTURE.md (mapa de dominios, menos de 200 líneas) -> Generar base de conocimiento `docs/` (design-docs/, exec-plans/, generated/, product-specs/, references/, docs de dominio) -> Generar AGENTS.md raíz (~100 líneas, tabla de contenidos) -> Generar archivos AGENTS.md de límites (paquetes de monorepo, menos de 50 líneas cada uno) -> Actualizar harness existente (si se re-ejecuta) -> Validar (sin enlaces rotos, límites de líneas).

**Salida:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md, y docs específicos de dominio según se descubran.

---

### /review

**Descripción:** Pipeline completa de revisión QA. Auditoría de seguridad (OWASP Top 10), análisis de rendimiento, verificación de accesibilidad (WCAG 2.1 AA) y revisión de calidad de código.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "code review", "security audit", "security review" |
| Inglés | "review" |
| Coreano | "리뷰", "코드 검토", "보안 검토" |
| Japonés | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chino | "审查", "代码审查", "安全审计" |

**Pasos:** Identificar alcance de revisión -> Verificaciones de seguridad automatizadas (npm audit, bandit) -> Revisión de seguridad manual (OWASP Top 10) -> Análisis de rendimiento -> Revisión de accesibilidad (WCAG 2.1 AA) -> Revisión de calidad de código -> Generar informe QA.

**Bucle opcional de corrección-verificación** (con `--fix`): Después del informe QA, generar agentes de dominio para corregir problemas CRITICAL/HIGH, re-ejecutar QA, repetir hasta 3 veces.

**Delegación:** Para alcances grandes, delega los Pasos 2-7 a un subagente QA generado.

---

### /debug

**Descripción:** Depuración estructurada con escritura de pruebas de regresión y escaneo de patrones similares.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "debug" |
| Inglés | "fix bug", "fix error", "fix crash" |
| Coreano | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japonés | "デバッグ", "バグ修正", "エラー修正" |
| Chino | "调试", "修复 bug", "修复错误" |

**Pasos:** Recopilar info del error -> Reproducir (MCP `search_for_pattern`, `find_symbol`) -> Diagnosticar causa raíz (MCP `find_referencing_symbols` para trazar ruta de ejecución) -> Proponer corrección mínima (se requiere confirmación del usuario) -> Aplicar corrección + escribir prueba de regresión -> Escanear patrones similares (puede generar subagente debug-investigator si el alcance > 10 archivos) -> Documentar bug en memoria.

**Criterio de generación de subagente:** El error abarca múltiples dominios, alcance de escaneo > 10 archivos, o se necesita rastreo profundo de dependencias.

---

### /design

**Descripción:** Flujo de diseño de 7 fases que produce DESIGN.md con tokens, patrones de componentes y reglas de accesibilidad.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "design system", "DESIGN.md", "design token" |
| Inglés | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Coreano | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japonés | "デザイン", "ランディングページ", "デザインシステム" |
| Chino | "设计", "着陆页", "设计系统" |

**Fases:** SETUP (recopilación de contexto, `.design-context.md`) -> EXTRACT (opcional, desde URLs de referencia/Stitch) -> ENHANCE (aumento de prompt vago) -> PROPOSE (2-3 direcciones de diseño con color, tipografía, layout, movimiento, componentes) -> GENERATE (DESIGN.md + tokens CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heurísticas de Nielsen, verificación de AI slop) -> HANDOFF (guardar, informar al usuario).

**Obligatorio:** Todo el output es responsive-first (móvil 320-639px, tablet 768px+, escritorio 1024px+).

---

### /scm

**Descripción:** Genera Conventional Commits con división automática basada en funcionalidades.

**Palabras clave de activación:** Ninguna (excluido de auto-detección).

**Pasos:** Analizar cambios (git status, git diff) -> Separar funcionalidades (si > 5 archivos abarcando diferente alcance/tipo) -> Determinar tipo (feat/fix/refactor/docs/test/chore/style/perf) -> Determinar alcance (módulo modificado) -> Escribir descripción (imperativo, < 72 caracteres) -> Ejecutar commit inmediatamente (sin prompt de confirmación).

**Reglas:** Nunca `git add -A`. Nunca hacer commit de secretos. HEREDOC para mensajes multilínea. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**Descripción:** Gestionar visibilidad y restricciones de herramientas MCP.

**Palabras clave de activación:** Ninguna (excluido de auto-detección).

**Funcionalidades:** Mostrar estado actual de herramientas MCP, habilitar/deshabilitar grupos de herramientas (memory, code-analysis, code-edit, file-ops), cambios permanentes o temporales (`--temp`), análisis de lenguaje natural ("memory tools only", "disable code edit").

**Grupos de herramientas:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /stack-set

**Descripción:** Auto-detectar stack tecnológico del proyecto y generar referencias específicas del lenguaje para la habilidad backend.

**Palabras clave de activación:** Ninguna (excluido de auto-detección).

**Pasos:** Detectar (escanear manifiestos: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Confirmar (mostrar stack detectado, obtener confirmación del usuario) -> Generar (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` con 8 patrones obligatorios, `stack/api-template.*`) -> Verificar.

**Salida:** Archivos en `.agents/skills/oma-backend/stack/`. No modifica SKILL.md ni `resources/`.

---

## Habilidades vs. Flujos de Trabajo

| Aspecto | Habilidades | Flujos de Trabajo |
|---------|-------------|-------------------|
| **Qué son** | Experiencia del agente (lo que un agente sabe) | Procesos orquestados (cómo los agentes trabajan juntos) |
| **Ubicación** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activación** | Automática vía palabras clave de enrutamiento | Comandos slash o palabras clave de activación |
| **Alcance** | Ejecución de dominio único | Múltiples pasos, a menudo múltiples agentes |
| **Ejemplos** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Auto-Detección: Cómo Funciona

### El Sistema de Hooks

oh-my-agent usa un hook `UserPromptSubmit` que se ejecuta antes de que cada mensaje del usuario sea procesado. El sistema de hooks consiste en:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Define mapeos de palabra clave a flujo para los 11 idiomas soportados (inglés, coreano, japonés, chino, español, francés, alemán, portugués, ruso, neerlandés, polaco).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): Lógica TypeScript que escanea la entrada del usuario contra las palabras clave de activación, respeta coincidencias específicas del idioma e inyecta contexto de activación del flujo.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Aplica la ejecución de flujos persistentes verificando archivos de estado activos y reinyectando contexto del flujo.

### Flujo de Detección

1. El usuario escribe entrada en lenguaje natural
2. El hook verifica si hay un `/command` explícito presente (si es así, omitir detección para evitar duplicación)
3. El hook escanea la entrada contra las listas de palabras clave de `triggers.json`
4. Si se encuentra una coincidencia, verificar si la entrada coincide con patrones informativos
5. Si es informativa (ej., "what is orchestrate?"), filtrarla — no se activan flujos
6. Si es accionable, inyectar `[OMA WORKFLOW: {workflow-name}]` en el contexto
7. El agente lee la etiqueta inyectada y carga el archivo de flujo correspondiente desde `.agents/workflows/`

### Filtrado de Patrones Informativos

La sección `informationalPatterns` de `triggers.json` define frases que indican preguntas en lugar de comandos. Estas se verifican antes de la activación del flujo:

| Idioma | Patrones Informativos |
|--------|----------------------|
| Inglés | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Coreano | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japonés | "とは", "って何", "どうやって", "説明して" |
| Chino | "是什么", "什么是", "怎么", "解释" |

Si la entrada coincide tanto con una palabra clave de flujo como con un patrón informativo, el patrón informativo tiene prioridad y no se activa ningún flujo.

### Flujos Excluidos

Los siguientes flujos están excluidos de la auto-detección y deben invocarse con `/command` explícito:
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`

---

## Mecánica del Modo Persistente

### Archivos de Estado

Los flujos persistentes (orchestrate, ultrawork, work) crean archivos de estado en `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

Estos archivos contienen: nombre del flujo, fase/paso actual, ID de sesión, marca de tiempo y cualquier estado pendiente.

### Refuerzo

Mientras un flujo persistente está activo, el hook `persistent-mode.ts` inyecta `[OMA PERSISTENT MODE: {workflow-name}]` en cada mensaje del usuario. Esto asegura que el flujo continúe ejecutándose incluso a través de turnos de conversación.

### Desactivación

Para desactivar un flujo persistente, el usuario dice "workflow done" (o equivalente en su idioma configurado). Esto:
1. Elimina el archivo de estado de `.agents/state/`
2. Deja de inyectar el contexto del modo persistente
3. Vuelve a la operación normal

El flujo también puede terminar naturalmente cuando todos los pasos están completados y la puerta final pasa.

---

## Secuencias Típicas de Flujos

### Funcionalidad Rápida
```
/plan → revisar salida → /exec-plan
```

### Proyecto Multi-Dominio Complejo
```
/work → PM planifica → usuario confirma → agentes generados → QA revisa → corregir problemas → entregar
```

### Entrega de Máxima Calidad
```
/ultrawork → PLAN (4 pasos de revisión) → IMPL → VERIFY (3 pasos de revisión) → REFINE (5 pasos de revisión) → SHIP (4 pasos de revisión)
```

### Investigación de Bug
```
/debug → reproducir → causa raíz → corrección mínima → prueba de regresión → escaneo de patrones similares
```

### Pipeline de Diseño a Implementación
```
/brainstorm → documento de diseño → /plan → desglose de tareas → /orchestrate → implementación paralela → /review → /scm
```

### Configuración de Nuevo Codebase
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
