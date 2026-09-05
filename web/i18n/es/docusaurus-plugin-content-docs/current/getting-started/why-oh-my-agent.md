---
title: Por qué oh-my-agent
description: Tesis de posicionamiento de oh-my-agent en una categoría saturada de multi-agent CLI. El costo se ha desplazado de la implementación a las pruebas y el mantenimiento; oh-my-agent ofrece quality gates, verificación independiente, multi-vendor dispatch y personalización repo-native para responder a ese cambio.
---

# Por qué oh-my-agent

La categoría multi-agent CLI está saturada. Solo en el último trimestre han aparecido más de veinte multi-agent orchestrators: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy y otros. La mayoría optimizan el mismo eje: hacer que los agentes escriban código más rápido.

oh-my-agent optimiza un eje distinto. La hipótesis de partida es que, con modelos suficientemente capaces, el costo de análisis, diseño e implementación en el SDLC se aproxima a cero. La parte cara del desarrollo de software siempre fue probar y mantener: mantener un sistema funcionando, seguro y comprensible después del primer commit. Ese es el eje sobre el que oh-my-agent está diseñado.

Esta página concreta ese posicionamiento. Para la discusión extendida que originó este encuadre, ver el [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## El costo se desplazó

Cuando un solo modelo capaz puede producir una feature funcionando en minutos, el cuello de botella ya no es el throughput de implementación. El cuello de botella es verificar que el código producido haga realmente lo que se afirma, atrapar regresiones silenciosas entre iteraciones, mantener los secretos fuera de prompts y logs, y exponer el gasto de tokens antes de que sorprenda al equipo.

Un harness que solo lanza agentes más rápido no resuelve nada de eso. Un harness diseñado para la fase posterior a la implementación, sí.

---

## Lo que oh-my-agent aporta al centro de costos real

Cada capacidad debajo responde a un modo de fallo específico reportado en la categoría multi-agent CLI.

### Verificación independiente, no autoevaluación de LLM

`oma verify <agent>` ejecuta catorce chequeos deterministas por tipo de agente. Son chequeos mecánicos: exit code del comando de tests, TypeScript strict pasa, detección de patrones de raw SQL, escaneo de secretos hardcoded, Flutter analyze, escaneo de estilos inline, violación de scope contra el charter del agente. Ningún LLM juzga si el trabajo "se ve correcto". Un chequeo pasa si y solo si su comando subyacente reporta éxito.

Esto responde a la queja más común de la categoría, resumida en una publicación comunitaria como "agents lie - they say tests pass when tests do not". Ver `cli/commands/verify/verify.ts` para la lista de chequeos.

### Re-verificación entre iteraciones

El workflow `ralph` envuelve `ultrawork` con una fase JUDGE independiente. Después de cada iteración, JUDGE re-verifica cada criterion, incluidos los que ya pasaron en iteraciones previas. Esto atrapa el caso en que arreglar el criterion C2 rompe silenciosamente C1, que es el mecanismo real detrás de la mayoría de las regresiones en sesiones largas de agentes.

Las verificaciones pesadas (más de treinta segundos) se cachean contra las rutas de archivos afectadas, así que re-verificar sigue siendo barato. Ver `.agents/workflows/ralph/resources/judge-protocol.md` para el protocolo completo.

### Quota caps que bloquean antes del daño

Cada llamada a `oma agent spawn` registra la estimación de tokens de ese spawn en `.serena/memories/session-cost-{sessionId}.md`. Antes del siguiente spawn, `checkCap` consulta el quota cap configurado y rechaza el lanzamiento si alguna dimensión está excedida. Se imponen tres dimensiones: total de tokens, total de spawns y presupuesto de tokens por vendor.

Esta es la diferencia entre enterarse después de haber gastado cuarenta mil dólares y ser avisado en el spawn quince de que queda un spawn en tu presupuesto. Ver `cli/io/session-cost.ts` y configurar bajo `session.quota_cap` en `.agents/oma-config.yaml`.

### Retry y luego explorar, no retry para siempre

Cuando `orchestrate` Step 5 encuentra un fallo de verificación, reintenta el agente hasta dos veces con contexto del error. Si el segundo reintento sigue fallando y el cap de costo aún no se excedió, el workflow cambia al Exploration Loop: lanza en paralelo dos o tres variantes de hipótesis alternativas en workspaces separados y conserva solo el resultado de mayor puntaje. Los enfoques fallidos se descartan con su costo registrado.

Es una respuesta estructurada al caso donde un enfoque es fundamentalmente equivocado. Reintentarlo nunca converge; probar enfoques distintos en paralelo sí.

### Ruteo de workspace consciente de monorepo

`detectWorkspace` lee configuraciones de pnpm, nx, turbo y lerna y enruta cada agente a su sub-workspace correspondiente automáticamente. El backend agent corre contra `apps/api/`, el frontend agent contra `apps/web/`, sin que el orchestrator tenga que componer rutas manualmente. Ver `cli/io/workspaces.ts`.

---

## Multi-vendor no es opcional

La segunda hipótesis de diseño es que cualquier equipo que haga desarrollo asistido por IA en serio usa más de un proveedor. Hoy eso significa Claude, Codex, Gemini, Copilot, Qwen, Kimi, y lo que aparezca el próximo trimestre. Cambiar de vendor es un hecho, no un edge case: Anthropic mueve funciones de agente a un plan pagado aparte, OpenAI lanza Codex CLI la misma semana en que los modelos de Anthropic se degradan, GitHub Copilot pasa a cobro por consumo.

oh-my-agent trata la selección de vendor como configuración per-agent mediante `model_preset` y `agents.<id>.model` en `.agents/oma-config.yaml`. El directorio portátil `.agents/` es la single source of truth; cada runtime soportado proyecta desde ahí. No se necesita lock-in de vendor para usar oh-my-agent, y no se necesita migración cuando se cambia.

---

## Personalización repo-native

La tercera hipótesis es que ningún par de equipos comparte la misma definición de "done". Un equipo exige escaneos OWASP Top 10 en cada cambio de backend. Otro exige un informe de QA en coreano. Un tercero exige que cada migration sea revisada por un database agent antes del merge.

Como `.agents/` son solo archivos en tu repositorio, cada equipo puede añadir o modificar agentes, skills, workflows y quality gates para encajar con su código de conducta y postura de compliance. Personalizar es un `git commit`, no un ticket de soporte al vendor.

---

## Qué significa esto en la práctica

Si tu prioridad es "lanzar agentes paralelos rápido", muchas herramientas cubren esa superficie. Si tu prioridad es "entregar código que siga funcionando después de que los agentes se vayan", oh-my-agent está construido para ese objetivo específico. `oma verify`, JUDGE, Exploration Loop, quota cap y el ruteo de monorepo no son extras opcionales: son la razón de existir del proyecto.

Para detalles de cada capacidad, ver la sección Core Concepts (Agents, Parallel Execution) en la barra lateral.
