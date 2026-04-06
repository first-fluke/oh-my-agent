---
title: Guia de Uso
description: Ejemplos del mundo real mostrando como usar oh-my-agent — desde tareas simples hasta orquestacion multi-agente completa.
---

# Como Usar oh-my-agent

> No sabes por donde empezar? Escribe `/work` seguido de lo que quieres construir.

## Inicio Rapido

1. Abre tu proyecto en un IDE con IA (Claude Code, Gemini, Cursor, etc.)
2. Los skills se detectan automaticamente desde `.agents/skills/`
3. Empieza a chatear — describe lo que quieres

Eso es todo. oh-my-agent se encarga del resto.

---

## Ejemplo 1: Tarea Simple

**Escribes:**
```
"Crea un componente de formulario de login con campos de email y password usando Tailwind CSS"
```

**Lo que pasa:**
- El skill `oma-frontend` se activa
- Carga su protocolo de ejecucion y recursos de tech-stack bajo demanda
- Obtienes un componente React con TypeScript, Tailwind, validacion de formulario y tests

Sin comandos slash necesarios. Solo describe lo que quieres.

## Ejemplo 2: Proyecto Multi-Dominio

**Escribes:**
```
"Construye una app de TODO con autenticacion de usuario"
```

**Lo que pasa:**

1. La deteccion de keywords ve que es multi-dominio → sugiere `/work`
2. **Agente PM** planifica el trabajo: API de auth, esquema de base de datos, UI frontend, alcance de QA
3. **Lanzas agentes:**
   ```bash
   oma agent:spawn backend "JWT authentication API" session-01 -w ./apps/api &
   oma agent:spawn frontend "Login and TODO UI" session-01 -w ./apps/web &
   wait
   ```
4. **Agentes trabajan en paralelo** — cada uno en su propio workspace
5. **Agente QA revisa** — auditoria de seguridad, verificacion de integracion
6. **Iteras** — re-lanza agentes con refinamientos si es necesario

## Ejemplo 3: Correccion de Bugs

**Escribes:**
```
"Hay un bug — al hacer click en login muestra 'Cannot read property map of undefined'"
```

**Lo que pasa:**

1. `oma-debug` se activa automaticamente (keyword: "bug")
2. Causa raiz identificada — el componente mapea sobre `todos` antes de que los datos carguen
3. Correccion aplicada — estados de carga y verificaciones de null
4. Test de regresion escrito
5. Patrones similares encontrados y corregidos proactivamente en 3 otros componentes

## Ejemplo 4: Sistema de Diseno

**Escribes:**
```
"Disena una landing page oscura premium para mi producto SaaS"
```

**Lo que pasa:**

1. `oma-design` se activa (keyword: "disena", "landing page")
2. Recopila contexto — audiencia, marca, direccion estetica
3. Propone 2-3 direcciones de diseno con opciones de color, tipografia y layout
4. Genera `DESIGN.md` con tokens, patrones de componentes y reglas de accesibilidad
5. Ejecuta auditoria — responsivo, WCAG, heuristicas de Nielsen
6. Listo para que `oma-frontend` implemente

## Ejemplo 5: Ejecucion Paralela via CLI

```bash
# Agente unico
oma agent:spawn backend "Implement JWT auth API" session-01

# Multiples agentes en paralelo
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api &
oma agent:spawn frontend "Login form + error states" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens + biometrics" session-01 -w ./apps/mobile &
wait

# Monitorear en tiempo real
oma dashboard        # UI de terminal
oma dashboard:web    # UI web en http://localhost:9847
```

---

## Comandos de Workflow

Escribe estos en tu IDE de IA para activar procesos estructurados:

| Comando | Que Hace | Cuando Usarlo |
|---------|----------|---------------|
| `/brainstorm` | Ideacion libre y exploracion | Antes de comprometerte con un enfoque |
| `/plan` | Descomposicion PM → `.agents/plan.json` | Antes de iniciar cualquier funcionalidad compleja |
| `/exec-plan` | Ejecutar un plan existente paso a paso | Despues de `/plan` |
| `/work` | Coordinacion multi-dominio paso a paso | Funcionalidades que abarcan multiples agentes |
| `/orchestrate` | Ejecucion automatizada de agentes en paralelo | Proyectos grandes, maximo paralelismo |
| `/ultrawork` | Workflow de calidad de 5 fases (11 puertas de revision) | Entrega de maxima calidad |
| `/review` | Auditoria de seguridad + rendimiento + accesibilidad | Antes de hacer merge |
| `/debug` | Depuracion estructurada de causa raiz | Investigando bugs |
| `/design` | Workflow de diseno de 7 fases → `DESIGN.md` | Construyendo sistemas de diseno |
| `/commit` | Commit convencional con analisis de tipo/scope | Haciendo commit de cambios |
| `/tools` | Gestion de servidores MCP | Agregando herramientas externas |
| `/stack-set` | Configuracion de stack tecnologico | Estableciendo preferencias de lenguaje/framework |
| `/deepinit` | Inicializacion completa del proyecto | Configurando en un codebase existente |

---

## Auto-Deteccion (Sin Comandos Slash)

oh-my-agent detecta keywords en 11 idiomas y activa workflows automaticamente:

| Tu Dices | Workflow Que Se Activa |
|----------|------------------------|
| "plan the auth feature" | `/plan` |
| "planifica la autenticacion" | `/plan` |
| "do everything in parallel" | `/orchestrate` |
| "revisa el codigo" | `/review` |
| "disena la pagina" | `/design` |
| "brainstorm some ideas" | `/brainstorm` |

Preguntas como "que es orchestrate?" se filtran — no activaran workflows accidentalmente.

---

## Skills Disponibles

| Skill | Mejor Para | Salida |
|-------|-----------|--------|
| oma-pm | "planifica esto", "descompone" | `.agents/plan.json` |
| oma-frontend | UI, componentes, estilos | Componentes React, tests |
| oma-backend | APIs, bases de datos, auth | Endpoints, modelos, tests |
| oma-db | Schema, ERD, migraciones | Diseno de schema, optimizacion de queries |
| oma-mobile | Apps moviles | Pantallas Flutter, gestion de estado |
| oma-design | UI/UX, sistemas de diseno | `DESIGN.md` con tokens |
| oma-brainstorm | Ideacion, exploracion | Documento de diseno |
| oma-qa | Seguridad, rendimiento, a11y | Reporte QA con correcciones priorizadas |
| oma-debug | Bugs, errores, crashes | Codigo corregido + tests de regresion |
| oma-tf-infra | Infraestructura cloud | Modulos Terraform |
| oma-dev-workflow | CI/CD, automatizacion | Configs de pipeline |
| oma-translator | Traduccion | Contenido multilingue natural |
| oma-orchestrator | Ejecucion paralela | Resultados de agentes |
| oma-commit | Commits Git | Commits convencionales |

---

## Dashboards

### Dashboard de Terminal

```bash
oma dashboard
```

Tabla en vivo mostrando estado de sesion, estados de agentes, turnos y actividad reciente. Observa `.serena/memories/` para actualizaciones en tiempo real.

### Dashboard Web

```bash
oma dashboard:web
# → http://localhost:9847
```

Caracteristicas:
- Actualizaciones en tiempo real via WebSocket
- Auto-reconexion en caidas de conexion
- Estado de sesion con indicadores de agente coloreados
- Log de actividad desde archivos de progreso y resultados

### Layout Recomendado

Usa 3 terminales:
1. Dashboard (`oma dashboard`)
2. Comandos de spawn de agentes
3. Logs de test/build

---

## Consejos

1. **Se especifico** — "Construye una app TODO con JWT auth, frontend React, backend Express" gana a "haz una app"
2. **Usa workspaces** — `-w ./apps/api` evita que los agentes se pisen entre si
3. **Bloquea contratos primero** — ejecuta `/plan` antes de lanzar agentes en paralelo
4. **Monitorea activamente** — los dashboards detectan problemas antes del merge
5. **Itera con re-spawns** — refina prompts de agentes en lugar de empezar de cero
6. **Empieza con `/work`** — cuando no sepas que workflow usar

---

## Solucion de Problemas

| Problema | Solucion |
|----------|----------|
| Skills no detectados en IDE | Verifica que `.agents/skills/` exista con archivos `SKILL.md`, reinicia IDE |
| CLI no encontrado | `which gemini` / `which claude` — instala los faltantes |
| Agentes produciendo codigo conflictivo | Usa workspaces separados (`-w`), revisa salidas, re-lanza con correcciones |
| Dashboard muestra "No agents detected" | Los agentes aun no han escrito en `.serena/memories/` — espera o verifica el session ID |
| Dashboard web no arranca | Ejecuta `bun install` primero |
| Reporte QA tiene 50+ problemas | Enfocate en CRITICAL/HIGH primero, documenta el resto para despues |

---

Para integracion en proyectos existentes, consulta la [Guia de Integracion](./integration).
