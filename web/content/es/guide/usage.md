---
title: Guía de Uso
description: Guía completa de uso incluyendo ejemplos, flujos de trabajo, operaciones de dashboard y solución de problemas.
---

# Cómo Usar los Skills Multi-Agente de Antigravity

## Inicio Rápido

1. **Abrir en Antigravity IDE**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Los skills se detectan automáticamente.** Antigravity escanea `.agents/skills/` e indexa todos los skills disponibles.

3. **Chatea en el IDE.** Describe lo que quieres construir.

---

## Ejemplos de Uso

### Ejemplo 1: Tarea Simple de Un Solo Dominio

**Tú escribes:**
```
"Crear un componente de formulario de login con campos de email y password usando Tailwind CSS"
```

**Qué sucede:**
- Invocas `oma-frontend` via /command o campo skills del agente
- El skill se carga bajo demanda (Progressive Disclosure)
- Obtienes un componente React con TypeScript, Tailwind, validación de formularios

### Ejemplo 2: Proyecto Complejo Multi-Dominio

**Tú escribes:**
```
"Construir una app TODO con autenticación de usuarios"
```

**Qué sucede:**

1. **Workflow Guide se activa** — detecta complejidad multi-dominio
2. **PM Agent planifica** — crea desglose de tareas con prioridades
3. **Generas agentes mediante CLI**:
   ```bash
   oma agent:spawn backend "API de autenticación JWT" session-01 &
   oma agent:spawn frontend "UI de Login y TODO" session-01 &
   wait
   ```
4. **Los agentes trabajan en paralelo** — guardan outputs en Knowledge Base
5. **Tú coordinas** — revisas `.agents/results/` para consistencia
6. **QA Agent revisa** — auditoría de seguridad/rendimiento
7. **Corregir e iterar** — re-generar agentes con correcciones

### Ejemplo 3: Corrección de Bugs

**Tú escribes:**
```
"Hay un bug — hacer clic en login muestra 'Cannot read property map of undefined'"
```

**Qué sucede:**

1. **oma-debug se activa** — analiza el error
2. **Se encuentra la causa raíz** — componente mapea sobre `todos` antes de que se carguen los datos
3. **Se proporciona la corrección** — se agregan estados de carga y verificaciones null
4. **Se escribe prueba de regresión** — asegura que el bug no regrese
5. **Se encuentran patrones similares** — corrige proactivamente 3 otros componentes

### Ejemplo: Creación de sistema de diseño

**Escribes:**
```
"Diseña una landing page premium oscura para mi producto SaaS"
```

**Qué sucede:**

1. **oma-design se activa** — verifica `.design-context.md`
2. **Contexto recopilado** — pregunta sobre audiencia, marca, dirección estética
3. **Prompt mejorado** — solicitud vaga se convierte en especificación sección por sección
4. **2-3 direcciones propuestas** — opciones de color, tipografía, diseño, movimiento
5. **DESIGN.md generado** — sistema de diseño de 6 secciones + tokens
6. **Auditoría ejecutada** — responsivo, WCAG, heurísticas de Nielsen, verificación de AI slop
7. **Entrega** — listo para implementación con oma-frontend

### Ejemplo 4: Ejecución Paralela Basada en CLI

```bash
# Un solo agente (workspace auto-detectado)
oma agent:spawn backend "Implementar API de autenticación JWT" session-01

# Agentes en paralelo
oma agent:spawn backend "Implementar API de autenticación" session-01 &
oma agent:spawn frontend "Crear formulario de login" session-01 &
oma agent:spawn mobile "Construir pantallas de autenticación" session-01 &
wait
```

**Monitorear en tiempo real:**
```bash
# Terminal (ventana de terminal separada)
bunx oh-my-agent dashboard

# O navegador
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Dashboards en Tiempo Real

### Dashboard de Terminal

```bash
bunx oh-my-agent dashboard
```

Observa `.serena/memories/` usando `fswatch` (macOS) o `inotifywait` (Linux). Muestra una tabla en vivo con estado de sesión, estados de agentes, turnos y actividad más reciente. Se actualiza automáticamente cuando cambian los archivos de memoria.

**Requisitos:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Dashboard Web

```bash
npm install          # solo la primera vez
bunx oh-my-agent dashboard:web
```

Abre `http://localhost:9847` en tu navegador. Características:

- **Actualizaciones en tiempo real** mediante WebSocket (basado en eventos, no polling)
- **Auto-reconexión** si la conexión se cae
- **UI temática Serena** con colores de acento morado
- **Estado de sesión** — ID y estado running/completed/failed
- **Tabla de agentes** — nombre, estado (con puntos de colores), conteo de turnos, descripción de tarea
- **Log de actividad** — últimos cambios de archivos de progreso y resultado

El servidor observa `.serena/memories/` usando chokidar con debounce (100ms). Solo los archivos modificados activan lecturas — sin re-escaneo completo.

---

## Conceptos Clave

### Progressive Disclosure

Los skills se invocan explícitamente via /command o se cargan a través del campo skills del agente. Solo el skill necesario se carga en contexto.

### Diseño de Skill Optimizado para Tokens

Cada skill usa una arquitectura de dos capas para máxima eficiencia de tokens:
- **SKILL.md** (~40 líneas): Identidad, enrutamiento, reglas principales — cargado inmediatamente
- **resources/**: Protocolos de ejecución, ejemplos, checklists, playbooks de errores — cargado bajo demanda

Los recursos compartidos viven en `_shared/` (no es un skill) y son referenciados por todos los agentes:
- Protocolos de ejecución chain-of-thought con flujo de trabajo de 4 pasos
- Ejemplos few-shot de entrada/salida para guía de modelos de nivel medio
- Playbooks de recuperación de errores con escalamiento "3 strikes"
- Plantillas de razonamiento para análisis multi-paso estructurado
- Gestión de presupuesto de contexto para niveles de modelo Flash/Pro
- Verificación automatizada mediante `verify.sh`
- Acumulación de lecciones aprendidas entre sesiones

### Generación de Agentes CLI

Usa `oma agent:spawn` para ejecutar agentes mediante CLI. Respeta `agent_cli_mapping` en `user-preferences.yaml` para seleccionar el CLI apropiado (gemini, claude, codex, qwen) por tipo de agente. El workspace se auto-detecta de convenciones comunes de monorepo, o puede establecerse explícitamente con `-w`.

### Knowledge Base

Outputs de agentes almacenados en `.agents/results/`. Contiene planes, código, reportes y notas de coordinación.

### Serena Memory

Estado de ejecución estructurado en `.serena/memories/`. El orchestrator escribe información de sesión, task boards, progreso por agente y resultados. Los dashboards observan estos archivos para monitoreo.

### Workspaces

Los agentes pueden trabajar en directorios separados para evitar conflictos. El workspace se auto-detecta de convenciones comunes de monorepo:
```
./apps/api   o ./backend   → Workspace de Backend Agent
./apps/web   o ./frontend  → Workspace de Frontend Agent
./apps/mobile o ./mobile   → Workspace de Mobile Agent
```

---

## Skills Disponibles

| Skill | Caso de uso | Output |
|-------|-------------------|--------|
| oma-coordination | Proyectos multi-dominio complejos | Coordinación de agentes paso a paso |
| oma-pm | "planificar esto", "descomponer" | `.agents/plan.json` |
| oma-frontend | UI, componentes, estilos | Componentes React, pruebas |
| oma-backend | APIs, bases de datos, autenticación | Endpoints API, modelos, pruebas |
| oma-mobile | Apps móviles, iOS/Android | Pantallas Flutter, gestión de estado |
| oma-brainstorm | Ideación, exploración de conceptos | Documento de diseño |
| oma-db | Base de datos, esquema, ERD, migración | Diseño de esquema, ajuste de consultas |
| oma-dev-workflow | CI/CD, git hooks, configuración monorepo | Configuraciones de flujo, automatización |
| oma-tf-infra | Terraform, infraestructura cloud | Módulos IaC, gestión de estado |
| oma-translator | Traducción, contenido multilingüe | Texto traducido preservando el tono |
| oma-qa | "revisar seguridad", "auditoría" | Reporte QA con correcciones priorizadas |
| oma-debug | Reportes de bugs, mensajes de error | Código corregido, pruebas de regresión |
| oma-orchestrator | Ejecución de sub-agentes CLI | Resultados en `.agents/results/` |
| oma-commit | "commit", "커밋해줘" | Commits Git (auto-divide por feature) |

---

## Comandos de Workflow

Escribe estos en el chat de Antigravity IDE para activar workflows paso a paso:

| Comando | Descripción |
|---------|-------------|
| `/brainstorm` | Ideación y exploración de conceptos con enfoque en diseño primero |
| `/coordinate` | Orquestación multi-agente mediante CLI con guía paso a paso |
| `/deepinit` | Inicialización profunda del proyecto con análisis jerárquico de codebase |
| `/exec-plan` | Ejecución de plan paso a paso con gestión de progreso |
| `/orchestrate` | Ejecución paralela automatizada de agentes basada en CLI |
| `/plan` | Descomposición de tareas PM con contratos API |
| `/review` | Pipeline QA completo (seguridad, rendimiento, accesibilidad, calidad de código) |
| `/debug` | Corrección de bugs estructurada (reproducir → diagnosticar → corregir → prueba de regresión) |
| `/setup` | Configuración de CLI y herramientas MCP |
| `/tools` | Gestión de herramientas MCP disponibles |
| `/ultrawork` | Ejecución de máximo paralelismo con orquestación de agentes en paralelo |
| `/stack-set` | Configurar stack de lenguaje backend de oma-backend (Python, Node.js, Rust) |

Estos son separados de **skills** (invocados via /command o campo skills del agente). Los workflows te dan control explícito sobre procesos multi-paso.

---

## Flujos de Trabajo Típicos

### Workflow A: Un Solo Skill

```
Tú: "Crear un componente de botón"
  → Antigravity carga oma-frontend
  → Obtener componente inmediatamente
```

### Workflow B: Proyecto Multi-Agente (Auto)

```
Tú: "Construir una app TODO con autenticación"
  → usa /coordinate para iniciar oma-coordination
  → PM Agent crea plan
  → Generas agentes mediante CLI (oma agent:spawn)
  → Los agentes trabajan en paralelo
  → QA Agent revisa
  → Corregir problemas, iterar
```

### Workflow B-2: Proyecto Multi-Agente (Explícito)

```
Tú: /coordinate
  → Workflow guiado paso a paso
  → Planificación PM → revisión de plan → generación de agentes → monitoreo → revisión QA
```

### Workflow C: Corrección de Bugs

```
Tú: "El botón de login lanza TypeError"
  → oma-debug se activa
  → Análisis de causa raíz
  → Corrección + prueba de regresión
  → Se verifican patrones similares
```

### Workflow D: Orquestación CLI con Dashboard

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "tarea" session-01 &
            oma agent:spawn frontend "tarea" session-01 &
Browser:    http://localhost:9847 → estado en tiempo real
```

---

## Consejos

1. **Sé específico** — "Construir una app TODO con autenticación JWT, frontend React, backend Express" es mejor que "hacer una app"
2. **Usa generación CLI** para proyectos multi-dominio — no intentes hacer todo en un chat
3. **Revisa Knowledge Base** — verifica `.agents/results/` para consistencia de API
4. **Itera con re-generaciones** — refina instrucciones, no comiences de nuevo
5. **Usa dashboards** — `bunx oh-my-agent dashboard` o `bunx oh-my-agent dashboard:web` para monitorear sesiones del orchestrator
6. **Separa workspaces** — asigna a cada agente su propio directorio

---

## Solución de Problemas

| Problema | Solución |
|---------|----------|
| Skills no se cargan | `antigravity open .`, verifica `.agents/skills/`, reinicia IDE |
| CLI no encontrado | Verifica `which gemini` / `which claude`, instala CLIs faltantes |
| Outputs de agentes incompatibles | Revisa ambos en Knowledge Base, re-genera con correcciones |
| Dashboard: "No agents" | Archivos de memoria aún no creados, ejecuta orchestrator primero |
| Dashboard web no inicia | Ejecuta `npm install` para instalar chokidar y ws |
| fswatch no encontrado | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| Reporte QA tiene 50+ problemas | Enfócate en CRITICAL/HIGH primero, documenta el resto para después |

---

## Comandos CLI

```bash
bunx oh-my-agent                # Instalador de skills interactivo
bunx oh-my-agent doctor         # Verificar configuración y reparar skills faltantes
bunx oh-my-agent doctor --json  # Salida JSON para CI/CD
bunx oh-my-agent update         # Actualizar skills a la última versión
bunx oh-my-agent stats          # Ver métricas de productividad
bunx oh-my-agent stats --reset  # Reiniciar métricas
bunx oh-my-agent retro          # Retrospectiva de sesión (aprendizajes y próximos pasos)
bunx oh-my-agent dashboard      # Dashboard en tiempo real en terminal
bunx oh-my-agent dashboard:web  # Dashboard web (http://localhost:9847)
bunx oh-my-agent help           # Mostrar ayuda
```

---

## Para Desarrolladores (Guía de Integración)

Si quieres integrar estos skills en tu proyecto Antigravity existente, consulta [AGENT_GUIDE.md](../AGENT_GUIDE.md) para:
- Integración rápida en 3 pasos
- Integración completa de dashboard
- Personalizar skills para tu tech stack
- Solución de problemas y mejores prácticas

---

**Solo chatea en Antigravity IDE.** Para monitoreo, usa los dashboards. Para ejecución CLI, usa los scripts del orchestrator. Para integrar en tu proyecto existente, consulta [AGENT_GUIDE.md](../AGENT_GUIDE.md).
