---
title: "Guía: Investigación de mercado (motor last30days)"
sidebar_label: Investigación de mercado
description: "Cómo la skill oma-market de oh-my-agent realiza investigación de señales de comunidad con el motor upstream mvanhorn/last30days, instalado como skill mediante la CLI de skills: la sección de configuración de market, oma market resolve / update / run, el gate detect-trap, el mapeo de intención a marcos y los modos de fallo."
---

# Investigación de mercado

`oma-market` responde a «qué dice realmente la gente sobre X en los últimos N días»: puntos de dolor, tendencias, sentimiento de competidores y descubrimiento, a partir de fuentes comunitarias con cifras reales de interacción: Reddit (votos y comentarios destacados), X, transcripciones de YouTube, TikTok, Instagram, Hacker News, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, la web y más.

La investigación se ejecuta en el motor upstream [**last30days**](https://github.com/mvanhorn/last30days-skill) (MIT, Python 3.12+). oh-my-agent no lo bifurca: el motor se instala como skill de agente mediante la [skills CLI](https://github.com/vercel-labs/skills), y oh-my-agent controla cada ejecución y añade una capa de marcos estratégicos. La cadencia de releases, el número de estrellas y la cobertura de proveedores pertenecen al proyecto upstream y pueden cambiar.

---

## Inicio rápido

Pídeselo a tu agente en lenguaje natural. Frases como «investigación de mercado», «puntos de dolor», «análisis de competidores», «voz del cliente» o «detección de tendencias» activan la skill `oma-market`:

```text
Encuentra los principales puntos de dolor que reportan los desarrolladores sobre los contenedores remotos de VS Code en los últimos 30 días.
Compara la percepción de la comunidad sobre Cursor vs Windsurf en los últimos 90 días, frameworks swot,5f.
```

| Ajusta con | Efecto |
|---|---|
| «A vs B», o `--vs B` | Intención de competidor: flujo de comparación upstream + SWOT + 5 fuerzas de Porter |
| `--days 7`, `30`, `90` o `180` | Ventana de investigación |
| `--intent pain`, `trend`, `competitor` o `discovery` | Sustituye la clasificación automática de la intención |
| `--frameworks none`, o una lista como `swot,5f,pestel` | Desactiva las secciones de marcos o las elige |

El resultado es un único informe en `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`. Su primera línea es el badge del motor (`🌐 last30days v<version> · synced <date>`), seguida de clusters de evidencia ordenados con enlaces, las secciones de marcos y el pie del motor, que enumera las fuentes omitidas.

| Funciona sin claves | Necesita el asistente de configuración upstream (claves o cookies) |
|---|---|
| Reddit, Hacker News, GitHub, Polymarket, arXiv, Techmeme, Digg, web | X, transcripciones de YouTube, TikTok, Instagram y otras fuentes con clave; las fuentes omitidas se enumeran en el pie |

---

## Instala el motor (requiere Python 3.12+) {#always-the-latest-engine--nothing-to-install}

```bash
oma market update   # installs last30days when missing, otherwise updates it
# runs: bunx skills add mvanhorn/last30days-skill --skill last30days -g -y
#   or: bunx skills update last30days -g -y
```

```bash
# Illustrative output; the version, install path, and Python version vary.
oma market resolve
# engine:   last30days
# reason:   last30days 3.21.1 via home:~/.agents/skills
# root:     ~/.agents/skills/last30days
# skill:    ~/.agents/skills/last30days/SKILL.md
# version:  3.21.1
# python:   python3.14 (3.14.7, PATH)
# save_dir: <workspace>/.agents/results/market/raw
```

- `resolve` solo lee los directorios de skills instalados y nunca toca la red. Cuando no hay nada instalado, no queda en estado ok e indica el comando de instalación; la skill pregunta antes de ejecutar `oma market update`.
- `oma update` no instala el motor. Actualízalo con `oma market update` (o `bunx skills update last30days -g -y`).
- Python: `LAST30DAYS_PYTHON` → `market.python` → `python3.14`, `python3.13`, `python3.12`, `python3`, `python` en PATH (debe ser ≥ 3.12) → `uv python find '>=3.12'`. Si no encuentra ninguno, `resolve` no queda en estado ok y muestra la sugerencia de instalación; la skill se detiene en vez de degradarse a una investigación solo con búsqueda web.
- La configuración del motor y las claves API viven en `~/.config/last30days/` (las escribe el asistente de configuración upstream con tu consentimiento), así que sobreviven a las actualizaciones del motor.

Orden de resolución (gana el primer resultado): `market.path` → `LAST30DAYS_HOME` → directorios de skills instalados (`.agents|.claude|.codex|.cursor|.qwen|.kiro|.gemini|.copilot/skills/last30days` en el proyecto, luego bajo `~`, después `~/.config/agents/skills/last30days` y la caché del plugin de Claude Code). Una instalación de plugin de Claude Code se actualiza mediante `/plugin`, no con `oma market update`.

```bash
oma market run -- --help     # the engine's own flags (without `--`, oma prints its own help)
```

Las versiones anteriores guardaban su propia copia en `~/.cache/oma-market/`. Ya no se lee; puedes eliminarla.

---

## Configuración

```yaml
market:
  path: null                      # explicit engine dir (pin)
  python: null                    # interpreter override
  save_dir: .agents/results/market/raw
```

`managed`, `channel` y `check_interval_min` están obsoletos: siguen validándose pero se ignoran, y `resolve` muestra una advertencia mientras estén definidos.

---

## Cómo funciona una ejecución

```mermaid
flowchart TD
  trap["oma market detect-trap"] -->|"exit 2: refused"| reframe["Show the reframe; engine not run"]
  trap -->|ok| resolve["oma market resolve --json"]
  resolve -->|"ok: false"| stopNode["Stop with the update or Python hint"]
  resolve -->|"ok: true"| contract["Read the engine SKILL.md"]
  contract --> run["oma market run (same args as upstream)"]
  run --> synth["Synthesize per OUTPUT CONTRACT + frameworks"]
  synth --> check["Write the brief, then self-check the written file"]
```

1. `oma market detect-trap "<topic>"`: rechaza temas que activen trampas de palabras clave o compras demográficas (código 2) y sugiere un replanteamiento. Un tema vacío o de más de 200 caracteres termina con el código 4.
2. `oma market resolve --json`: motor y Python; se detiene con `ok: false`.
3. El agente lee de principio a fin el `SKILL.md` del motor resuelto y lo sigue: asistente de configuración inicial, resolución previa a la investigación de handles, subreddits y hashtags (cuando WebSearch está disponible), planificación de consultas y gate de precondiciones.
4. `oma market run "<topic>" <flags> --emit=compact`: argumentos idénticos a la llamada upstream `python3 scripts/last30days.py`; añade `--save-dir` desde `market.save_dir`.
5. La síntesis sigue el CONTRATO DE SALIDA upstream (badge en la primera línea, clusters de evidencia ordenados y LAWs 1–8); después oma añade secciones de marcos, situadas entre el cuerpo del motor y el pie del motor, que citan solo clusters del motor:

| Intención | Formulación del motor | Marcos |
|---|---|---|
| pain | tema con forma de queja, `--days 30`, `--deep` cuando los datos sean escasos | SWOT |
| trend | `--days 7/30/90/180`, `--discover "<domain>"` para «qué está de moda» | SWOT |
| competitor | `"A vs B"` → flujo de comparación upstream | SWOT + 5 fuerzas de Porter |
| discovery | `--discover` y después seguimientos `--drill` | SWOT + PESTEL |

6. Escribe `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` y luego ejecuta la autocomprobación sobre el archivo escrito; corrige y vuelve a comprobar antes de entregar el brief.

---

## Modos de fallo

| Situación | Resultado |
|---|---|
| Tema rechazado por detect-trap | Se muestra un replanteamiento y no se ejecuta el motor. `--force` solo después de que el usuario confirme de nuevo explícitamente |
| Motor no instalado | `ok: false` → `oma market update` (lo instala con la CLI de skills) |
| No hay Python 3.12+ | `ok: false` con sugerencia de instalación (brew / apt / `uv python install 3.12`), o define `LAST30DAYS_PYTHON` / `market.python`; no hay sustituto de solo búsqueda web |
| `oma market update` falla | Se muestra el error de la CLI de skills; una instalación existente sigue funcionando |
| Fuentes sin claves | El motor las omite y las enumera en el pie; actívalas mediante el asistente de configuración upstream |

---

## Próximos pasos

- [Flujos de contenido e investigación](./content-and-research.md): elige la capacidad adecuada para otras tareas de investigación y documentación
- [Motor de diagramas](./diagram-engine.md): el mismo patrón de instalación mediante la CLI de skills para archify
- [Semántica de oma-config.yaml](./oma-config-semantics.md): cómo se combina la sección `market:`
- [Comandos de la CLI: market](../cli-interfaces/commands.md#market): lista completa de opciones
- Upstream: [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
