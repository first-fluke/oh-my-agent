---
title: Flujos de trabajo
description: Referencia completa de los 21 flujos de trabajo de oh-my-agent, incluidos los comandos slash, los modos persistente y no persistente, las palabras clave de activación en 11 idiomas, las fases y los pasos, los archivos que se leen y escriben, la autodetección mediante triggers.json y keyword-detector.ts, el filtrado de patrones informativos y la gestión del estado del modo persistente.
---

# Flujos de trabajo

Los flujos de trabajo son procesos estructurados de varios pasos que se activan mediante comandos slash o palabras clave en lenguaje natural. Definen cómo colaboran los agentes en las tareas, desde utilidades de una sola fase hasta puertas de calidad complejas de 5 fases.

Hay 21 flujos de trabajo, 4 de ellos persistentes (mantienen el estado y no se pueden interrumpir accidentalmente).

---

## Elegir una habilidad o un flujo de trabajo {#choosing-a-skill-or-workflow}

Elige según la coordinación y la verificación que necesite la tarea. Si ya has seleccionado un flujo, síguelo; continúa un flujo activo salvo que lo canceles o cambies explícitamente. Para una tarea nueva sin un flujo seleccionado, usa esta guía:

| Necesidad de la tarea | Elige | Ejemplo |
|-----------------------|-------|---------|
| Un solo dominio sin coordinación entre agentes | [Habilidad individual](/docs/guide/single-skill) | Añadir un endpoint de API y probar su validación |
| Varios dominios con planificación, implementación y QA paso a paso | `/work` | Coordinar un cambio de API con sus clientes web y mobile |
| Delegación automatizada de tareas independientes en paralelo | `/orchestrate` | Implementar tareas de backend y frontend en paralelo después de resolver las dependencias |
| Un proceso completo de calidad solicitado explícitamente | `/ultrawork` | Ejecutar las revisiones completas de planificación, implementación, verificación, refinamiento y preparación para la publicación |
| Una solicitud explícita de repetir la ejecución hasta que pasen criterios verificables mecánicamente | `/ralph` | Repetir la implementación y la verificación independiente hasta que pasen las comprobaciones de regresión indicadas, dentro de las salvaguardas del bucle |

`/orchestrate` carga un plan utilizable o crea uno mediante `/plan` antes de generar agentes. No necesitas ejecutar `/plan` primero. La existencia de un plan no distingue, por tanto, `/work` de `/orchestrate`; elige según cómo quieras coordinar el trabajo. Ambos pueden ejecutar tareas independientes en paralelo.

Los criterios de aceptación y las pruebas también forman parte de las tareas con una sola habilidad. Su presencia por sí sola no requiere `/ralph`: cada iteración de Ralph ejecuta el proceso completo de ultrawork y un juez independiente, así que elígelo cuando quieras ese bucle de verificación repetida. Puede detenerse con trabajo incompleto o bloqueado cuando se aplican las salvaguardas.

Esta tabla es una recomendación de selección, no un enrutador automático de flujos. El agente host puede recomendar un enfoque adecuado; recomendar o explicar un flujo no lo inicia. Un comando slash lo selecciona explícitamente. Cuando el hook de detección de palabras clave está habilitado, las coincidencias con palabras clave o patrones configurados también pueden activar un flujo, sujeto a sus filtros de consultas informativas. El detector no clasifica la cantidad de dominios, no comprueba si el plan está listo ni aplica la tabla como algoritmo de prioridades.

La revisión del plan reutiliza la autorización ya concedida para la tarea. Los agentes solo preguntan si falta una decisión relevante o si una acción queda fuera de ese alcance. Una revisión de preparación para la publicación no autoriza por sí misma a publicar o desplegar.

---

## Flujos de trabajo persistentes {#persistent-workflows}

Los flujos persistentes continúan ejecutándose hasta que todas las tareas terminan. Mantienen el estado en `.agents/state/` y vuelven a inyectar el contexto `[OMA PERSISTENT MODE: ...]` en cada mensaje del usuario hasta que se desactivan explícitamente.

El modo persistente solo se inicia con una **invocación explícita**: el propio nombre del flujo (la lista `explicit` de `triggers.json`, por ejemplo "orchestrate", "ultrawork"/"ulw", "ralph"/"랄프", "work mode"). Las demás palabras clave de activación de abajo son indicios en lenguaje natural: inyectan el flujo como sugerencia sin activar el modo persistente, y nunca se activan cuando la primera o la última línea del prompt es una pregunta que termina en `?`.

### /orchestrate

**Descripción:** Ejecución paralela automatizada de agentes basada en CLI. Genera subagentes mediante CLI, coordina con estado de ejecución y recibos persistentes, monitorea el progreso y ejecuta bucles de verificación.

**Persistente:** Sí. Archivo de estado: `.agents/state/orchestrate-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Explícita (persistente) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |
| Inglés | "do everything", "run everything", "everything in parallel", "automate everything" |
| Coreano | "전부 실행", "전부 해", "전부 병렬로", "자동으로 해줘" |
| Japonés | "全部実行", "全部並列で", "自動でやって" |
| Chino | "编排", "全部执行", "全部并行", "自动处理" |
| Español | "ejecutar todo", "todo en paralelo" |
| Francés | "tout exécuter", "tout en parallèle" |
| Alemán | "alles ausführen", "alles parallel" |
| Portugués | "executar tudo", "tudo em paralelo" |
| Ruso | "выполнить всё", "всё параллельно" |
| Neerlandés | "alles uitvoeren", "alles parallel" |
| Polaco | "wykonaj wszystko", "wszystko równolegle" |

Las palabras "parallel"/"automate" por sí solas (y sus traducciones) no son activadores: "run the tests in parallel" o "automate the release notes" son peticiones normales, no orquestación multiagente.

**Patrones regex de activación** (intención + lista blanca de sustantivos, consulta [Autodetección: campo Pattern](#pattern-field-raw-regex)):
| Sección | Patrón | Ejemplos que activan |
|---------|--------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (me)? + (a\|an) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Lista blanca de sustantivos (14): app, api, service, server, cli, tool, website, dashboard, system, backend, frontend, prototype, mvp, bot. Una funcionalidad concreta ("implement the login feature", "로그인 기능 구현해줘") o algo que ya existe ("make the API faster") no coincide.

**Pasos:**
1. **Paso 0, Preparación:** Lee la habilidad de coordinación, la guía de carga de contexto y el protocolo de memoria. Detecta el proveedor.
2. **Paso 1, Cargar o crear el plan:** Comprueba `.agents/results/plan-{sessionId}.json` y después el `plan-*.json` más reciente. Si no existe ninguno, o el plan no está listo para ejecutarse (a una tarea le falta agente, nivel de prioridad, dependencias o criterios de aceptación), delega en `/plan` dentro del mismo flujo para crear uno conservando el mismo ID de sesión. Presenta el plan y reutiliza la autorización existente; pregunta solo por una decisión relevante o una autorización nueva antes de delegar.
3. **Paso 2, Inicializar la sesión:** Carga `oma-config.yaml`, muestra la tabla de asignación de CLI, reutiliza el ID de sesión creado con el plan o genera uno (`session-YYYYMMDD-HHMMSS`) y crea `orchestrator-session-{sessionId}.md` y `task-board-{sessionId}.md` en el almacén de memoria configurado.
4. **Paso 3, Generar agentes:** Para cada nivel de prioridad (primero P0 y después P1...), genera agentes mediante el método apropiado del proveedor (subagentes nativos cuando el runtime actual y el proveedor de destino coinciden; `oma agent spawn` para trabajo externo o entre proveedores). No superes MAX_PARALLEL.
5. **Paso 4, Monitorear:** Sondea los archivos de ámbito de ejecución `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` y los recibos estructurados, y actualiza el task board. Vigila completaciones, fallos y crashes.
6. **Paso 5, Verificar:** Ejecuta `verify.sh {agent-type} {workspace}` por cada agente completado. Si falla, vuelve a generarlo con el contexto del error (máximo 2 reintentos). Los fallos repetidos pueden justificar hipótesis alternativas, pero todos los intentos consumen el mismo presupuesto de recuperación agregado. Conserva la evidencia sin resolver si el presupuesto no alcanza para una ronda de comparación.
7. **Paso 6, Recopilar:** Lee los archivos de resultados de ámbito de ejecución y los claims estructurados, y compila el resumen.
8. **Paso 7, Informe final:** Presenta el resumen de la sesión. Si se ejecutaron experimentos, resume la evidencia y las decisiones; captura lecciones solo cuando se haya establecido una causa reutilizable.

**Archivos leídos:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, archivos de progreso y resultados de ámbito de ejecución y recibos estructurados de ejecución.
**Archivos escritos:** estado de sesión y task board de ámbito de ejecución en el almacén de memoria configurado, recibos y claims estructurados y el informe final.

**Cuándo usar:** Proyectos grandes que requieren el máximo paralelismo con coordinación automatizada.

---

### /work

**Descripción:** Coordinación multidominio paso a paso. PM planifica primero, después los agentes ejecutan dentro del alcance autorizado y finalmente QA revisa y se corrigen los problemas.

**Persistente:** Sí. Archivo de estado: `.agents/state/work-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Explícita (persistente) | "work mode", "work workflow" |
| Universal | "step by step" |
| Inglés | "one by one", "one step at a time" |
| Coreano | "단계별", "하나씩 해줘", "차근차근" |
| Japonés | "ステップバイステップ", "一歩ずつ" |
| Chino | "逐步", "一步一步" |
| Español | "paso a paso", "uno por uno" |
| Francés | "étape par étape", "un par un" |
| Alemán | "schritt für schritt", "der reihe nach" |

La palabra "work" por sí sola no es un activador: es vocabulario normal ("Does this work on Windows?").

**Pasos:**
1. **Paso 0, Preparación:** Lee las habilidades, la carga de contexto y el protocolo de memoria. Registra el inicio de la sesión.
2. **Paso 1, Analizar requisitos:** Identifica los dominios implicados. Si es un solo dominio, sugiere usar directamente el agente correspondiente.
3. **Paso 2, Planificación del agente PM:** PM descompone los requisitos, define los contratos de API, crea el desglose priorizado y lo guarda en `.agents/results/plan-{sessionId}.json`.
4. **Paso 3, Revisar el plan:** Presenta el plan y continúa dentro de la autorización existente. Pregunta solo por una decisión relevante o una autorización nueva.
5. **Paso 4, Generar agentes:** Genera por niveles de prioridad, en paralelo dentro del mismo nivel y con workspaces separados.
6. **Paso 5, Monitorear:** Sondea los archivos de progreso y verifica la alineación del contrato de API entre agentes.
7. **Paso 6, Revisión QA:** Genera un agente QA para seguridad (OWASP), rendimiento, accesibilidad y calidad de código.
8. **Paso 6.1, Mediciones** (condicional): Registra una línea base cuando se necesita una comparación definida.
9. **Paso 7, Iterar:** Si aparecen problemas CRITICAL/HIGH, vuelve a generar los agentes responsables. Si el mismo problema persiste tras 2 intentos, activa Exploration Loop.

**Cuándo usar:** Funcionalidades que abarcan varios dominios y requieren coordinación paso a paso de planificación y QA.

---

### /ultrawork

**Descripción:** Flujo centrado en la calidad. Tiene 5 fases, 17 pasos en total y 12 pasos de revisión aislados. Cada fase tiene una puerta que debe pasar antes de continuar.

**Persistente:** Sí. Archivo de estado: `.agents/state/ultrawork-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Explícita (persistente) | "ultrawork", "ulw" |

**Fases y pasos:**

| Fase | Pasos | Agente | Perspectiva de revisión |
|------|-------|--------|-------------------------|
| **PLAN** | 1-4 | Agente PM (inline) | Integridad, meta-revisión, sobreingeniería/simplicidad |
| **IMPL** | 5 | Agentes de desarrollo (generados) | Implementación |
| **VERIFY** | 6-8 | Agente QA (generado) | Alineación, seguridad (OWASP), prevención de regresiones |
| **REFINE** | 9-13 | Agente de refactorización (generado) | División de archivos, reutilización, impacto en cascada, consistencia, código muerto |
| **SHIP** | 14-17 | Agente QA (generado) | Calidad de código (lint/cobertura), flujo UX, problemas relacionados, preparación para el despliegue |

**Definiciones de las puertas:**
- **PLAN_GATE:** Plan documentado, suposiciones enumeradas, alternativas consideradas, revisión de sobreingeniería completada y alcance autorizado.
- **IMPL_GATE:** Pasan las comprobaciones y pruebas aplicables que no emiten archivos, solo se modifican los archivos planificados y se registra la evidencia de línea base de los experimentos reales. Las comprobaciones de build solo se ejecutan cuando se solicitan explícitamente.
- **VERIFY_GATE:** La implementación coincide con los requisitos, cero CRITICAL, cero HIGH, sin regresiones y se cumplen los objetivos de medición aplicables del proyecto.
- **REFINE_GATE:** Se siguen las reglas de mantenibilidad del proyecto, se capturaron oportunidades de integración, se verificaron efectos secundarios, se limpió el código y no queda ninguna regresión sin resolver.
- **SHIP_GATE:** Pasan las comprobaciones de calidad, se verifica UX, se resuelven los problemas relacionados, se completa la lista de preparación para el despliegue y se cumplen los objetivos de medición aplicables del proyecto con evidencia actual. Reutiliza la autorización existente; publicar o desplegar requiere autorización para esa acción.

**Comportamiento ante el fallo de una puerta:**
- Primer fallo: vuelve al paso relevante, corrige y reintenta.
- Segundo fallo del mismo problema: reevalúa la causa; si hay alternativas que merezcan probarse dentro del presupuesto restante, compara experimentos aislados con el comportamiento requerido y las métricas definidas.

**Mejoras condicionales:** comparaciones de métricas definidas, decisiones y evidencia de experimentos, exploración de hipótesis con presupuesto y lecciones respaldadas por causas reutilizables.

**Condición para omitir REFINE:** tareas simples de menos de 50 líneas.

**Cuándo usar:** Un proceso completo de revisión antes de decidir si el resultado está listo para publicar. El flujo registra comprobaciones y hallazgos; no toma por ti la decisión de preparación para producción.

---

### /ralph

**Descripción:** Bucle persistente de ejecución autorreferente. Envuelve ultrawork con un verificador independiente que comprueba los criterios de finalización después de cada iteración. Informa de finalización completa cuando todos pasan, de finalización parcial cuando solo quedan criterios PASS y BLOCKED, o se detiene cuando se activan las salvaguardas.

**Persistente:** Sí. Archivo de estado: `.agents/state/ralph-state.json`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Explícita (persistente) | "ralph", "랄프" |
| Inglés | "don't stop", "until done", "keep going until", "finish everything", "run to completion" |
| Coreano | "멈추지마", "끝까지 해", "완료될때까지", "때까지 계속", "끝장내" |
| Japonés | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chino | "不要停", "直到完成", "全部完成", "做完为止" |
| Español | "no pares", "hasta completar", "termina todo" |
| Francés | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Alemán | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

Las frases sueltas para reanudar ("keep going", "carry on", "계속해", "続けて", "продолжай", …) no son activadores: los usuarios las escriben para reanudar tras una interrupción.

**Fases:**
1. **Fase 0, INIT:** Carga los prerrequisitos (carga de contexto, protocolo de memoria y protocolo del juez). Define y registra criterios de finalización verificables mecánicamente, como aserciones de pruebas, comprobaciones de tipos que no emiten archivos, códigos de salida o existencia de archivos. Incluye comprobaciones de build solo cuando se solicitan explícitamente. Muestra los criterios y continúa dentro del alcance autorizado. Inicializa la sesión con `max_iterations: 5`.
2. **Fase 1, WORK:** Ejecuta ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) como una sola iteración.
3. **Fase 2, JUDGE:** Un verificador independiente comprueba cada criterio contra el estado real del proyecto (ejecuta comprobaciones autorizadas y verifica la existencia de archivos). Registra la evidencia y el estado del criterio, incluyendo PASS, FAIL, REGRESSED o BLOCKED.
4. **Fase 3, DECIDE:** Si todos los criterios son PASS → informa de finalización completa. Si solo quedan PASS y BLOCKED → informa de finalización parcial. Si hay FAIL o REGRESSED → devuelve el contexto del fallo a la siguiente iteración, sujeto a las salvaguardas.
5. **Salvaguardas:** El bucle se detiene si `current_iteration >= max_iterations` (5 por defecto), o si el mismo criterio falla 3 veces consecutivas por la misma causa raíz (detección de atasco).

**Diferencia principal con /ultrawork:** Ultrawork ejecuta un proceso de 5 fases con reintentos cuando falla una puerta. Ralph envuelve ultrawork en un bucle de reintentos con un juez independiente que comprueba objetivamente la finalización. El bucle termina con un informe de finalización completa, un informe de finalización parcial para el trabajo bloqueado o un informe de salvaguarda.

**Archivos leídos:** `.agents/workflows/ralph/resources/judge-protocol.md`, todos los archivos de ultrawork.
**Archivos escritos:** `session-ralph.md` (memoria), registros de iteración e informe final.

**Cuándo usar:** Cuando quieres explícitamente una ejecución repetida y una verificación independiente contra criterios de finalización mecánicos. Las pruebas por sí solas no requieren Ralph; considera todo el proceso ultrawork en cada iteración y sus salvaguardas.

---

## Flujos de trabajo no persistentes

### /plan

**Descripción:** Desglose de tareas dirigido por PM. Analiza requisitos, selecciona el stack tecnológico, descompone tareas priorizadas con dependencias y define contratos de API.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "task breakdown" |
| Inglés | "plan" |
| Coreano | "계획", "요구사항 분석", "스펙 분석" |
| Japonés | "計画", "要件分析", "タスク分解" |
| Chino | "计划", "需求分析", "任务分解" |

**Pasos:** Recopilar requisitos -> Analizar viabilidad técnica (análisis de código con MCP) -> Evaluar complejidad (Simple/Medium/Complex) -> Definir contratos de API (si cruza fronteras) -> Descomponer en tareas -> Revisar con el usuario -> Guardar artefactos del plan (JSON legible por máquina y tracker Markdown legible por humanos para Medium/Complex).

**Salida:** `.agents/results/plan-{sessionId}.json`, escritura de memoria y, para Medium/Complex, `docs/plans/work/{NNN}-{name}.md` con tabla de tareas, registro de decisiones y notas de progreso. El ciclo de vida se sigue mediante el campo `Status` de la cabecera Markdown (`Active` -> `Completed`); los planes no se mueven entre carpetas. Los diseños creados mediante `/brainstorm` van a `docs/plans/designs/{NNN}-{name}.md`.

**Ejecución:** Inline (sin generar subagentes). Lo consumen `/orchestrate` o `/work`, que actualizan los campos de tarea y estado durante la ejecución.

---

### /brainstorm

**Descripción:** Ideación orientada al diseño. Explora la intención, aclara restricciones, propone enfoques y produce un documento de diseño aprobado antes de planificar.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "brainstorm" |
| Inglés | "ideate", "explore design" |
| Coreano | "브레인스토밍", "아이디어", "설계 탐색" |
| Japonés | "ブレインストーミング", "アイデア", "設計探索" |
| Chino | "头脑风暴", "创意", "设计探索" |

**Pasos:** Explorar el contexto del proyecto (análisis MCP) -> Hacer preguntas de aclaración (una por vez) -> Proponer 2-3 enfoques con compromisos -> Presentar el diseño sección por sección (con aprobación del usuario en cada paso) -> Guardar el documento en `docs/plans/designs/{NNN}-{name}.md` -> Transición: sugerir `/plan`.

**Reglas:** No implementar ni planificar antes de aprobar el diseño. No producir código. YAGNI.

---

### /architecture

**Descripción:** Flujo de arquitectura de software que diagnostica problemas de arquitectura, selecciona el método de análisis correcto (enrutamiento diagnóstico / design-twice / ATAM / CBAM / ADR), compara opciones, sintetiza aportes de las partes interesadas y produce una recomendación, revisión o ADR.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "architecture", "ADR", "ATAM", "CBAM" |
| Inglés | "architecture review", "architectural tradeoff" |
| Coreano | "아키텍처", "설계 검토" |
| Japonés | "アーキテクチャ" |
| Chino | "架构" |

**Pasos:** Enmarcar la decisión (arquitectura nueva / revisión / análisis de compromisos / priorización de inversiones / redacción de ADR) -> Seleccionar metodología mediante enrutamiento diagnóstico -> Analizar la arquitectura actual con análisis de código MCP (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> Sintetizar los aportes de las partes interesadas (solo cuando el alcance transversal lo justifique) -> Producir la recomendación con suposiciones, compromisos, riesgos y pasos de validación explícitos -> Pasar a `/plan` cuando se requiera implementación.

**Reglas:** No escribas código de implementación ni planes de tareas en este flujo. Pasa a `/plan` después de decidir la arquitectura. Usa herramientas MCP durante todo el flujo; no las sustituyas por lecturas de archivos sin procesar o grep.

**Cuándo usar:** Decisiones de arquitectura del sistema, límites de módulos/servicios/propiedad, priorización de refactorizaciones, redacción de ADR e investigación de problemas arquitectónicos (amplificación de cambios, dependencias ocultas y APIs incómodas).

---

### /deepinit

**Descripción:** Inicialización completa del proyecto. Analiza un código existente y genera AGENTS.md, ARCHITECTURE.md y una base de conocimiento estructurada en `docs/`.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "deepinit" |
| Coreano | "프로젝트 초기화" |
| Japonés | "プロジェクト初期化" |
| Chino | "项目初始化" |

**Pasos:** Preparación -> Analizar el código (tipo de proyecto, arquitectura, reglas implícitas, dominios y fronteras) -> Generar ARCHITECTURE.md (mapa de dominios, menos de 200 líneas) -> Generar la base de conocimiento `docs/` (design-docs/, plans/, generated/, product-specs/, references/ y documentos de dominio) -> Generar AGENTS.md raíz (~100 líneas, tabla de contenidos) -> Generar archivos AGENTS.md de frontera (paquetes del monorepo, menos de 50 líneas cada uno) -> Actualizar el harness existente (si se vuelve a ejecutar) -> Validar (sin enlaces muertos ni límites de líneas).

**Salida:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md y documentos de dominio según se descubran.

---

### /review

**Descripción:** Pipeline completo de revisión QA. Auditoría de seguridad (OWASP Top 10), análisis de rendimiento, comprobación de accesibilidad (WCAG 2.1 AA) y revisión de calidad de código.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "code review", "security audit", "security review" |
| Inglés | "review" |
| Coreano | "리뷰", "코드 검토", "보안 검토" |
| Japonés | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chino | "审查", "代码审查", "安全审计" |

**Pasos:** Identificar el alcance -> Comprobaciones de seguridad automatizadas (npm audit, bandit) -> Revisión de seguridad manual (OWASP Top 10) -> Análisis de rendimiento -> Revisión de accesibilidad (WCAG 2.1 AA) -> Revisión de calidad de código -> Generar el informe QA.

**Bucle opcional de corrección y verificación** (con `--fix`): después del informe QA, genera agentes de dominio para corregir problemas CRITICAL/HIGH, vuelve a ejecutar QA y repite hasta 3 veces.

**Delegación:** Para alcances grandes, delega los pasos 2-7 en un subagente QA generado.

---

### /deepsec

**Descripción:** Ejecuta de principio a fin la habilidad `oma-deepsec`. Instala `.deepsec/`, calibra el costo, ejecuta las pasadas scan/process/triage/revalidate/export, protege PR con `process --diff`, crea matchers personalizados y envía los hallazgos a agentes especialistas. Se ejecuta inline (sin generar subagentes).

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "/deepsec", "deepsec workflow" |
| Inglés | "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers" |
| Coreano | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| Japonés | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| Chino | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

**Pasos:**
1. **Paso 1, Cargar la habilidad:** Lee `.agents/skills/oma-deepsec/SKILL.md` y después carga solo los recursos que correspondan a la intención resuelta (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). Si `.deepsec/` ya existe en la raíz, trata la ejecución como incremental y no vuelvas a ejecutar `init`.
2. **Paso 2, Clasificar la intención:** Resuelve exactamente una de `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config`, `troubleshoot`. Las solicitudes con varias intenciones se ejecutan secuencialmente. Inserta `setup` antes de cualquier intención que haga llamadas de IA si falta `.deepsec/`.
3. **Paso 3, Confirmar la elección del agente:** Antes de cualquier llamada de pago, confirma `claude` (razonamiento más fuerte y más caro) frente a `codex` (sandbox de solo lectura y más barato). Omite este paso si el usuario nombró uno, `deepsec.config.ts` fija `defaultAgent` o el usuario delegó la elección.
4. **Paso 4, Ejecutar la intención resuelta:**
   - **4A `setup`:** `bunx deepsec init`, `bun install`, editar `.env.local`, verificar con `scan --limit 20` + `process --limit 5` y después crear `data/<id>/INFO.md` (50-100 líneas y específico del proyecto). **Requiere confirmación del usuario sobre `INFO.md`.**
   - **4B `scan`:** Scan -> calibrar con `--limit 50 --concurrency 5` -> informar la extrapolación de costo (requiere visto bueno explícito) -> `process` completo -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review`:** Modo directo `process --diff origin/${BASE_REF} --comment-out comment.md`. Emitir el patrón CI de dos jobs (`analyze` sin `pull-requests: write`, `comment` consume solo el artefacto saneado). Salida `1` = al menos un hallazgo nuevo neto.
   - **4D `matchers`:** Recorrer `data/<id>/files/` en busca de huecos de puntos de entrada, escribir matchers por slug en `.deepsec/matchers/<slug>.ts` con el nivel de ruido adecuado (`precise` / `normal` / `noisy`), conectarlos mediante `.deepsec/deepsec.config.ts` y verificar con `scan --matchers`.
   - **4E `triage`:** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> filtrar la exportación para dejar solo `true-positive` / `uncertain`. Anotar formas recurrentes de FP para la siguiente revisión de `INFO.md`.
   - **4F `config` / `troubleshoot`:** Aplicar la tabla de síntomas de `resources/config.md`.
5. **Paso 5, Resumir y enrutar:** Producir un resumen de ejecución (ID del proyecto, tipo de pasada, agente/modelo, archivos escaneados, hallazgos, TP después de revalidate, costo, tiempo de pared y condiciones de parada). Enrutar seguimientos según la capa del archivo vulnerable (backend -> `oma-backend`, frontend -> `oma-frontend`, mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, drift de docs -> `oma-docs`, hueco de punto de entrada -> volver al paso 4D). Si la capa es ambigua o `revalidation.verdict === "uncertain"`, pasar primero por `oma-debug` como salto de triaje.
6. **Paso 6, Condiciones de parada:** Terminar al completar la intención y el resumen del paso 5, ante una precondición bloqueante (credencial ausente o `INFO.md` rechazado) o ante una cuota agotada con un comando de reanudación segura.

**Archivos leídos:** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` (según la intención), `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**Archivos escritos:** `.deepsec/` (en `setup`), `.env.local` (ignorado por Git), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (en `export`), `comment.md` (en `pr-review`).

**Reglas:** No modifiques código fuente del producto en este flujo (pásalo a especialistas). No muestres ni hagas commit de credenciales (`vck_…`, `sk-ant-…`, tokens OIDC). No otorgues `pull-requests: write` a ningún job de CI que ejecute código controlado por un PR. Reanuda, no reinicies: ante una interrupción vuelve a ejecutar el mismo comando; nunca uses `rm -rf data/<id>/` sin una instrucción explícita del usuario.

**Cuándo usar:** Escaneo de vulnerabilidades de un repositorio con agentes, protección de CI/PR mediante `process --diff`, creación de matchers específicos del proyecto para cobertura de puntos de entrada y triaje de hallazgos existentes para reducir falsos positivos.

---

### /debug

**Descripción:** Diagnóstico estructurado y corrección de bugs con escritura de pruebas de regresión y búsqueda de patrones similares.

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "debug" |
| Inglés | "fix bug", "fix error", "fix crash" |
| Coreano | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japonés | "デバッグ", "バグ修正", "エラー修正" |
| Chino | "调试", "修复 bug", "修复错误" |

**Pasos:** Recopilar información del error -> Reproducir (MCP `search_for_pattern`, `find_symbol`) -> Diagnosticar la causa raíz (MCP `find_referencing_symbols` para seguir el camino de ejecución) -> Proponer una corrección mínima (se requiere confirmación del usuario) -> Aplicar la corrección y escribir una prueba de regresión -> Buscar patrones similares (puede generar un subagente debug-investigator si el alcance supera 10 archivos) -> Documentar el bug en la memoria.

**Criterios para generar un subagente:** El error cruza varios dominios, el alcance supera 10 archivos o se necesita seguir dependencias profundas.

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

**Fases:** SETUP (recopilar contexto, `.design-context.md`) -> EXTRACT (opcional, desde URLs de referencia/Stitch) -> ENHANCE (ampliar prompts vagos) -> PROPOSE (2-3 direcciones con color, tipografía, layout, movimiento y componentes) -> GENERATE (DESIGN.md + tokens CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heurísticas de Nielsen y comprobación de AI slop) -> HANDOFF (guardar e informar al usuario).

**Obligatorio:** Toda la salida debe priorizar responsive (mobile 320-639px, tablet 768px+, desktop 1024px+).

---

### /scm

**Descripción:** Genera Conventional Commits con división automática por funcionalidad.

**Palabras clave de activación:** Ninguna (excluido de la autodetección).

**Pasos:** Analizar cambios (git status, git diff) -> Separar funcionalidades (si hay más de 5 archivos con alcance o tipo distinto) -> Determinar tipo (feat/fix/refactor/docs/test/chore/style/perf) -> Determinar alcance (módulo modificado) -> Escribir descripción (imperativo, < 72 caracteres) -> Ejecutar el commit inmediatamente (sin pedir confirmación).

**Reglas:** Nunca uses `git add -A`. Nunca hagas commit de secretos. Usa HEREDOC para mensajes multilínea. Añade un trailer de coautor solo cuando la configuración efectiva `scm.co_author` lo habilite y proporcione ambos valores.

---

### /tools

**Descripción:** Gestiona la visibilidad y las restricciones de herramientas MCP.

**Palabras clave de activación:** Ninguna (excluido de la autodetección).

**Funciones:** Muestra el estado actual de herramientas MCP, activa o desactiva grupos de herramientas (memory, code-analysis, code-edit, file-ops), aplica cambios permanentes o temporales (`--temp`) y analiza lenguaje natural ("memory tools only", "disable code edit").

**Grupos de herramientas:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /convert

**Descripción:** Convierte un archivo de un formato a otro y enruta por categoría de medio. Los **documentos** (PDF mediante `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML mediante `kordoc`/`oma-hwp`) se extraen a Markdown. Los archivos de **imagen**, **vídeo** y **audio** se transcodifican al formato de destino con `ffmpeg` (ya disponible para `oma-video`).

**Palabras clave de activación:** Ninguna (se invoca explícitamente con una ruta de archivo).

**Pasos:** Validar la entrada y enrutar por categoría (documento `.pdf`/`.hwp*`; imagen `.jpg`/`.png`/`.webp`/…; vídeo `.mp4`/`.mov`/…; audio `.mp3`/`.wav`/…) -> Resolver el formato de destino (documento por defecto = Markdown; medio = `--to` explícito) -> Convertir (PDF: `uvx opendataloader-pdf`, PDF escaneado con OCR híbrido; HWP: `bunx kordoc@latest`; medios: `ffmpeg`) -> Normalizar documentos (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> Verificar (leer Markdown / `ffprobe` de medios) -> Informar el formato origen→destino y las decisiones de calidad o códec.

**Reglas:** Enruta por categoría: nunca ejecutes un convertidor de documentos sobre un medio ni viceversa. La salida se ubica por defecto en el mismo directorio del archivo de entrada. Informa las decisiones de calidad o códec de los medios (la transcodificación no es sin pérdidas). No omitas pasos. El idioma de respuesta sigue `.agents/oma-config.yaml`.

**Cuándo usar:** Convertir documentos PDF o de la familia HWP coreana a Markdown para ingesta LLM/RAG, o transcodificar imágenes (jpg→webp/png), vídeo (mov→mp4, mp4→gif) y audio (wav→mp3) entre formatos.

---

### /docs

**Descripción:** Detecta drift y sincroniza documentación mediante `oma-docs`. El modo verify encuentra referencias rotas en todo el Markdown del repositorio (glob predeterminado `**/*.md`); el modo sync propone parches por documento para la documentación afectada por un diff de Git. Se ejecuta inline (sin generar subagentes); todos los proveedores invocan directamente `oma docs`.

**Palabras clave de activación:** Universal: "oma-docs", "docs verify", "docs sync". Inglés: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Coreano: "문서 검증", "문서 드리프트", "문서 동기화". Japonés: "ドキュメント検証", "ドキュメント同期". Chino: "文档校验", "文档同步".

**Pasos:** Detectar el modo (`verify` por defecto; `sync` si el prompt menciona sync o proporciona un rango de diff) -> Preflight (`command -v oma`; para sync confirma un diff utilizable y recurre a `HEAD~1..HEAD`) -> Verify: `oma docs verify --json` (salida `0` limpia, `1` con referencias rotas) o Sync: `oma docs sync --json` contra el rango -> Sintetizar hallazgos conforme al contrato del host LLM (verify: agrupar por CRITICAL/HIGH/MEDIUM/LOW con correcciones concretas; sync: redactar parches unified-diff mínimos) -> Presentar cada parche sync de forma interactiva (`[y] apply [n] skip [d] show diff [s] show full proposal`; nunca aplicar automáticamente) -> Al aplicar, regenerar el índice mediante `oma docs verify --json` -> Informar del modo, recuentos por tipo y punteros a `docs/generated/doc-refs.json` / `url-drift.json`.

**Reglas:** Nunca apliques automáticamente parches sync (se requiere confirmación `[y]` por documento). Nunca modifiques `.agents/` (protección SSOT). Si falta `oma docs`, muestra una indicación de instalación y termina; no recurras a grep manual.

**Archivos leídos:** Markdown objetivo (`**/*.md` o el glob solicitado), `git diff` para los `changedFiles` de sync.
**Archivos escritos:** `docs/generated/doc-refs.json` (siempre lo regenera verify), `docs/generated/url-drift.json` (cuando se ejecuta la comprobación de URLs), parches de documentación aprobados (en sync `[y]`).

**Cuándo usar:** Comprobar si la documentación sigue coincidiendo con el código actual (rutas de archivos, comandos CLI, claves de configuración, variables de entorno) o proponer parches después de un cambio de código.

---

### /recap

**Descripción:** Recapitulación diaria o de período mediante `oma-recap`. Resuelve una fecha o ventana a partir del lenguaje natural, invoca `oma recap --json` sobre historiales de varias herramientas de IA (Grok, Claude, Codex, Qwen, Cursor y Antigravity), delega el análisis de temas y el formato Markdown a la habilidad y comunica un TL;DR junto con la ruta guardada. Se ejecuta inline (sin generar subagentes).

**Palabras clave de activación:** Universal: "recap". Coreano: "리캡". Japonés: "リキャップ".

**Pasos:** Detectar el modo y resolver la ventana (`daily` por defecto con hoy; `period` cuando expresiones como "this week" / "지난 7일" se resuelven a `--window Nd`) -> Extraer un filtro `--tool` solo cuando el usuario nombre herramientas explícitamente (`grok, claude, codex, qwen, cursor, antigravity`) -> Preflight (`command -v oma`) -> Ejecutar `oma recap --json` (daily: `--date YYYY-MM-DD` o sin flag; period: `--window 7d` / `30d`) -> Sintetizar y guardar según el contrato de la habilidad (umbral temático de 15 minutos, plantilla diaria o de varios días) -> Informar un TL;DR de 3 viñetas y la ruta de guardado.

**Reglas:** Nunca modifiques `.agents/` (protección SSOT). Nunca traduzcas automáticamente términos técnicos (nombres de proyecto, nombres de herramientas, flags CLI) en el recap guardado. No inventes un recap si no hay fuentes.

**Archivos leídos:** Historiales de conversaciones de herramientas de IA (mediante `oma recap`).
**Archivos escritos:** `.agents/results/recap/{date}.md` o `.agents/results/recap/{start}~{end}.md`.

**Cuándo usar:** Resumir el trabajo realizado en herramientas de IA durante un día o un período (semana/mes), opcionalmente filtrado por herramientas concretas.

---

### /stack-set

**Descripción:** Detecta automáticamente el stack tecnológico del proyecto y genera referencias específicas del lenguaje para la habilidad de dominio resuelta (backend o mobile). Detecta stacks mobile (Swift/iOS mediante `Package.swift`/`.xcodeproj`, Flutter mediante `pubspec.yaml`, React Native mediante `package.json` + react-native) y enruta a `oma-mobile`; en otro caso enruta a `oma-backend`. Si un monorepo contiene ambos, pregunta cuál configurar.

**Palabras clave de activación:** Ninguna (excluido de la autodetección).

<!-- oma-docs:ignore-start -->
**Pasos:** Detectar (escanear manifiestos: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> Confirmar (mostrar el stack detectado y obtener confirmación del usuario) -> Generar (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` con 8 patrones obligatorios, `stack/api-template.*`) -> Verificar.
<!-- oma-docs:ignore-end -->

**Salida:** Archivos en el directorio `stack/` de la habilidad de dominio resuelta (por ejemplo, `.agents/skills/oma-backend/stack/` o `.agents/skills/oma-mobile/stack/`). No modifica `SKILL.md` ni `resources/`.

---

### /video

**Descripción:** Ejecuta de principio a fin la habilidad `oma-video`: brief → guion → narración → visuales → subtítulos → render-spec → compositor HyperFrames gestionado (o MoneyPrinterTurbo). El flujo crea un directorio de ejecución reproducible y emite un `.mp4` real solo después de que el compositor y las comprobaciones de `ffprobe` pasan. La configuración de proveedores permite fallbacks sin clave; si falla un compositor o la toolchain, la ejecución sigue fallando. Se ejecuta inline (sin generar subagentes).

**Palabras clave de activación:**
| Idioma | Palabras clave |
|--------|----------------|
| Universal | "/video", "oma-video", "hyperframes", "shorts", "reels", "screencast" |
| Inglés | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Coreano | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japonés | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chino | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Pasos:**
1. **Resolver el brief y el modo:** Elige `shorts` (9:16), `explainer` (16:9) o `demo` (captura de pantalla/web); aplica los valores por defecto del modo, que los flags pueden sobrescribir.
2. **Componer el guion:** Genera escenas + narración (LLM cuando hay una clave; si no, un esquema determinista del brief).
3. **Sintetizar recursos:** Narración mediante `oma-voice`, visuales mediante `oma-image`/`oma-slide`/stock, alineación de subtítulos sin clave o captura web supervisada para `demo --source web`. Cada proveedor recurre a un fallback determinista.
4. **Crear el render-spec:** Escribe `render-spec.json` (la frontera de determinismo) y los recursos en el directorio de ejecución.
5. **Renderizar:** Genera el proyecto HyperFrames gestionado (o MoneyPrinterTurbo) como subproceso. Un fallo normal del compositor o de la toolchain hace fallar la ejecución; el placeholder determinista solo está disponible mediante la ruta explícita de mock/test (`OMA_VIDEO_MOCK=1`). La captura en vivo se registra como `nondeterministic` en el manifiesto.

**Salida:** Un directorio de ejecución en `.agents/results/videos/{timestamp}-{shortid}-{mode}/` con `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` y `manifest.json`. Consulta la [guía de generación de vídeo](../guide/video-generation.md).

---

### /schedule

**Descripción:** Registra y gestiona trabajos de agentes basados en tiempo mediante los comandos `oma schedule <action>`. Los trabajos viven en un registro global (`~/.agents/schedule/`) y se ejecutan mediante el planificador nativo del sistema (launchd en macOS, temporizadores de usuario systemd en Linux, schtasks en Windows o crontab como fallback POSIX); cada ejecución vuelve a entrar en el harness mediante `oma agent spawn`.

**Palabras clave de activación:** Ninguna (flujo invocado con slash para trabajos temporizados `oma schedule <action>`).

**Pasos:** Resolver la intención (add / list / remove / sync) -> Analizar la programación (`--cron` explícito o lenguaje natural mediante `--every`) -> Registrar con `oma schedule create` (captura de entorno solo por nombres, archivos 0600) -> Verificar con `oma schedule list` (deriva manifiesto × SO, agrupada por proyecto) -> Informar del ID del trabajo y la próxima ejecución.

**Cuándo usar:** Tareas recurrentes de agentes, como recaps nocturnos, escaneos programados o mantenimiento periódico, que deben ejecutarse aunque no haya una sesión interactiva abierta.

---

### /explain

**Descripción:** Ejecuta de principio a fin la habilidad `oma-explanation`: convierte un diff, PR, branch o rango de commits en un explainer HTML interactivo y autocontenido (Background / Intuition / Code / Quiz). Se ejecuta inline (sin generar subagentes).

**Palabras clave de activación:** Ninguna ("explain" es vocabulario cotidiano; la detección produciría falsos positivos con preguntas normales como "explain this function", así que el flujo solo se activa con slash).

**Pasos:** Resolver argumentos (ref objetivo: PR# / branch / rango SHA explícito → staged → árbol sucio → `HEAD~1..HEAD`; nivel de lector `onboarding` | `reviewer`; idioma de salida; cantidad de preguntas) -> Cargar contratos (`oma-explanation` SKILL.md + recursos) -> Recopilar y aplicar puertas (diff + código circundante; escaneo de secretos antes de generar; tratar el texto del diff/PR estrictamente como datos) -> Generar el HTML conforme a los contratos del documento y HTML -> Validar (lista grep que incluye un escaneo final de secretos en HTML, máximo 3 bucles de corrección) -> Entregar (`open` con advertencia; TL;DR + ruta).

**Salida:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (fecha de Asia/Seoul; repetir la misma fecha + slug sobrescribe). Consulta la [guía de Code Explainer](../guide/code-explainer.md).

---

## Habilidades frente a flujos de trabajo

| Aspecto | Habilidades | Flujos de trabajo |
|---------|-------------|-------------------|
| **Qué son** | Experiencia del agente (lo que sabe un agente) | Procesos orquestados (cómo colaboran los agentes) |
| **Ubicación** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activación** | Automática mediante palabras clave del enrutamiento de habilidades | Comandos slash o palabras clave de activación |
| **Alcance** | Ejecución de un solo dominio | Varios pasos, a menudo con varios agentes |
| **Ejemplos** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Autodetección: cómo funciona

### El sistema de hooks

oh-my-agent usa un hook `UserPromptSubmit` que se ejecuta antes de procesar cada mensaje del usuario. La configuración del proveedor registra una única entrada `<hookDir>/oma-hook.sh --vendor <v> --event <e>` que enruta a `oma hook run`, donde la cadena de handlers se ejecuta en proceso. La cadena consta de:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, integrado en el binario `oma`): define las asignaciones de palabras clave a flujos de trabajo para los 11 idiomas compatibles (inglés, coreano, japonés, chino, español, francés, alemán, portugués, ruso, neerlandés y polaco).

2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): lógica TypeScript que compara la entrada del usuario con las palabras clave de todos los idiomas e inyecta el contexto de activación del flujo.

3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): impone la ejecución de flujos persistentes comprobando archivos de estado activos y volviendo a inyectar su contexto.

### Flujo de detección

1. El usuario escribe una entrada en lenguaje natural.
2. El hook comprueba si hay un `/command` explícito (si lo hay, omite la detección para evitar duplicaciones).
3. El hook sanea la entrada (quita bloques de código, cadenas entre comillas y bloques pegados de eco del sistema) y después busca en `.agents/hooks/core/triggers.json`, incluidas las listas de palabras clave (frases literales) y `patterns` (regex sin procesar). Un guard de refuerzo suprime reactivaciones cuando el mismo flujo se disparó 2 o más veces en los últimos 60 segundos.
4. Si encuentra una coincidencia, comprueba si la entrada coincide con patrones informativos.
5. Si es informativa (por ejemplo, "what is orchestrate?"), la filtra (no activa flujos).
6. Si es accionable, inyecta `[OMA WORKFLOW: {workflow-name}]` en el contexto. Cuando coinciden varios flujos, gana una invocación explícita y después la palabra clave más larga.
7. En un flujo persistente, solo una invocación explícita (`explicit` en `triggers.json`) escribe el archivo de estado del modo persistente; una coincidencia en lenguaje natural se inyecta como sugerencia, y un prompt terminado en pregunta (`?` en la primera o la última línea) no lo activa en absoluto.
8. El agente lee la etiqueta inyectada y carga el archivo correspondiente desde `.agents/workflows/`.

### Convención de secciones de idioma

`.agents/hooks/core/triggers.json` usa una estructura por idioma para `keywords`, `patterns` e `informationalPatterns`:

| Sección | Comportamiento |
|---------|----------------|
| `*` | Universal. Se usa para contenido en inglés (lingua franca) y tokens realmente transversales, como el nombre de flujo `"orchestrate"`. |
| `en` | Inglés. Funcionalmente equivale a `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Formulación específica del idioma. |

Todas las secciones se cargan siempre: los usuarios escriben el prompt en el idioma en el que piensan, y el ajuste `language` de `.agents/oma-config.yaml` solo controla el idioma de las respuestas. Una palabra clave escrita en un idioma solo puede coincidir con un prompt que contenga ese script, por lo que combinar todas las secciones no puede provocar activaciones con prompts no relacionados.

Los límites de palabra dependen únicamente de la propia palabra clave, nunca de `language`: las palabras clave ASCII solo coinciden como palabras completas (así, "work" no coincide con "network", y "review" no coincide con "preview"), mientras que las que contienen texto no ASCII coinciden como subcadenas porque las partículas y las flexiones del CJK se unen directamente a la palabra ("리뷰해줘").

### Campo pattern (regex sin procesar) {#pattern-field-raw-regex}

Además de `keywords` literales, cada flujo puede declarar `patterns`, cadenas regex sin procesar compiladas con flags `iu`. Los patrones permiten asociar intenciones de varios tokens que, de otro modo, exigirían listas combinatorias de palabras clave.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      // Subset of `keywords` that activates persistent mode (persistent workflows only)
      "explicit": ["orchestrate", ...],
      "keywords": { "*": ["orchestrate"], "en": ["do everything", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:me\\s+)?(?:an?)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Reglas de autoría:
- Las cadenas se compilan directamente; escapa las barras inversas una vez para JSON y otra para regex (`\\b`, `\\s+`).
- No se añaden automáticamente límites de palabra; los autores deben encargarse de `\b`.
- Una regex no válida se omite silenciosamente en runtime (se hace visible al editar la configuración mediante fallos de pruebas).

### Filtrado de patrones informativos

La sección `informationalPatterns` de `.agents/hooks/core/triggers.json` define frases que indican preguntas en vez de comandos. Se comprueban en una ventana de 60 caracteres alrededor de cada posible coincidencia del flujo:

| Sección | Ejemplos de patrones |
|---------|----------------------|
| `*` (inglés universal) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Si la entrada coincide con un disparador de flujo y un patrón informativo, el patrón informativo tiene prioridad y no se activa ningún flujo. Esto bloquea prompts como:
- `"How do you build a TODO app?"`: `how do` en `*` bloquea la regex de intención de orchestrate.
- `"orchestrate 트리거 해주면 되나요?"` (con `language: ko`): `트리거` en `ko` bloquea la palabra clave de orchestrate.

### Flujos excluidos

Los siguientes flujos no se activan por palabras clave y deben invocarse mediante un `/command` explícito. `/tools` y `/stack-set` aparecen en `excludedWorkflows` (se retiraron deliberadamente de la autodetección); `/convert` no incluye palabras clave de activación (las habilidades `oma-pdf` y `oma-hwp` tienen su propia detección); `/schedule` es un flujo invocado con slash (`oma schedule <action>` para trabajos temporizados); `/explain` no incluye palabras clave porque "explain" es vocabulario cotidiano y la detección produciría falsos positivos constantes:
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Mecánica del modo persistente {#persistent-mode-mechanics}

### Archivos de estado

Los flujos persistentes (orchestrate, ultrawork, work, ralph) crean archivos de estado en `.agents/state/` cuando se invocan explícitamente (consulta [Flujos de trabajo persistentes](#persistent-workflows)):

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

Estos archivos contienen: nombre del flujo, fase/paso actual, ID de sesión, marca de tiempo y cualquier estado pendiente.

### Refuerzo

Mientras un flujo persistente está activo, el hook `persistent-mode.ts` inyecta `[OMA PERSISTENT MODE: {workflow-name}]` en cada mensaje del usuario. Así el flujo continúa ejecutándose entre turnos de la conversación.

### Contrato de objetivo (puerta de parada y presupuesto opcionales)

`oma goal set` asocia un contrato mecánico de finalización con un flujo persistente activo:

- `--gate typecheck|test|lint`: el hook Stop solo permite terminar la sesión cuando pasa el script de `package.json` indicado (se ejecuta como un array de argumentos, sin shell; los comandos libres se rechazan por diseño). Si falla, bloquea con la cola de salida; los fallos y los timeouts cuentan para el límite de refuerzo, de modo que una puerta roja no puede bloquear para siempre.
- `--budget-minutes <n>`: presupuesto de tiempo de pared desde la activación. Al superarlo, se desactiva el flujo y permite una parada parcial honesta, registrada en el historial de eventos de la sesión.

Sin contrato, el modo persistente se comporta como se describió arriba: el contrato es opcional. Consulta `goal set` en la [referencia de comandos CLI](../cli-interfaces/commands.md#goal-set).

### Desactivación

Para desactivar un flujo persistente, el usuario dice "workflow done" (o su equivalente en el idioma configurado). Esto:
1. Elimina el archivo de estado de `.agents/state/`.
2. Deja de inyectar el contexto de modo persistente.
3. Devuelve la operación al funcionamiento normal.

El flujo también puede terminar de forma natural cuando se completan todos los pasos y pasa la puerta final. Si se configura una puerta mediante `goal set`, superar esa puerta desactiva el flujo automáticamente.

---

## Secuencias habituales de flujos

### Funcionalidad de un solo dominio
```
Describe the task → relevant skill → implement → focused verification
```

### Proyecto multidominio complejo
```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### Implementación paralela automatizada
```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### Entrega de máxima calidad
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Investigación de bugs
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Pipeline de diseño a implementación
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### Configuración de un código base nuevo
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### Ejecución repetida con verificación independiente
```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
