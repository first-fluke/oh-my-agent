---
title: "Guía: Generación de Imágenes"
description: Guía completa de la generación de imágenes en oh-my-agent — despacho multi-proveedor vía Codex (gpt-image-2), Pollinations (flux/zimage, gratis) y Gemini, con imágenes de referencia, controles de costo, estructura de salida, solución de problemas y patrones de invocación compartidos.
---

# Generación de Imágenes

`oma-image` es el enrutador de imágenes multi-proveedor de oh-my-agent. Genera imágenes a partir de prompts en lenguaje natural, despacha al CLI del proveedor con el que estés autenticado y escribe un manifiesto determinista junto a la salida para que cada ejecución sea reproducible.

La skill se activa automáticamente con palabras clave como *image*, *illustration*, *visual asset*, *concept art*, o cuando otra skill necesita una imagen como efecto secundario (hero, miniatura, foto de producto).

---

## Cuándo Usar

- Generar imágenes, ilustraciones, fotos de producto, concept art, visuales hero/landing
- Comparar el mismo prompt entre varios modelos en paralelo (`--vendor all`)
- Producir activos desde un flujo de trabajo dentro del editor (Claude Code, Codex, Gemini CLI)
- Permitir que otra skill (diseño, marketing, docs) llame al pipeline de imágenes como infraestructura compartida

## Cuándo NO Usar

- Editar o retocar una imagen existente — fuera de alcance (usa una herramienta dedicada)
- Generar videos o audio — fuera de alcance
- Composición SVG / vectorial inline a partir de datos estructurados — usa una skill de plantillas
- Redimensionar o convertir formato de manera simple — usa una librería de imágenes, no un pipeline de generación

---

## Proveedores de un Vistazo

La skill es CLI-first: cuando el CLI nativo de un proveedor puede devolver bytes de imagen sin procesar, se prefiere la ruta vía subproceso por encima de una API key directa.

| Proveedor | Estrategia | Modelos | Activador | Costo |
|---|---|---|---|---|
| `pollinations` | HTTP directo | Gratis: `flux`, `zimage`. Con créditos: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` configurada (registro gratuito en https://enter.pollinations.ai) | Gratis para `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` vía OAuth de ChatGPT | `gpt-image-2` | `codex login` (no se necesita API key) | Cargado a tu plan de ChatGPT |
| `gemini` | CLI-first → fallback a API directa | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` o `GEMINI_API_KEY` + facturación | Deshabilitado por defecto; requiere facturación |

`pollinations` es el proveedor por defecto porque `flux` / `zimage` son gratuitos, así que activarlo automáticamente con palabras clave es seguro.

---

## Inicio Rápido

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` es un alias de `oma image`.

---

## Comando Slash (Dentro de un Editor)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

El comando slash se reenvía al mismo pipeline de `oma image generate` — todos los flags del CLI también funcionan aquí.

---

## Referencia del CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Flags Clave

| Flag | Propósito |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini`, o `all`. Con `all`, todos los proveedores solicitados deben estar autenticados (modo estricto). |
| `-n, --count <n>` | Número de imágenes por proveedor, 1–5 (acotado por tiempo de pared). |
| `--size <size>` | Aspecto: `1024x1024` (cuadrado), `1024x1536` (vertical), `1536x1024` (horizontal), o `auto`. |
| `--quality <level>` | `low`, `medium`, `high`, o `auto` (por defecto del proveedor). |
| `--out <dir>` | Directorio de salida. Por defecto `.agents/results/images/{timestamp}/`. Las rutas fuera de `$PWD` requieren `--allow-external-out`. |
| `-r, --reference <path>` | Hasta 10 imágenes de referencia (PNG/JPEG/GIF/WebP, ≤ 5 MB cada una). Repetible o separado por comas. Soportado en `codex` y `gemini`; rechazado en `pollinations`. |
| `-y, --yes` | Omite el prompt de confirmación de costo para ejecuciones estimadas en ≥ `$0.20`. También vía `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Almacena el SHA-256 del prompt en lugar del texto sin procesar en `manifest.json`. |
| `--dry-run` | Imprime el plan y la estimación de costo sin gastar. |
| `--format text\|json` | Formato de salida del CLI. JSON es la superficie de integración para otras skills. |
| `--strategy <list>` | Escalado solo para Gemini, p. ej. `mcp,stream,api`. Sobrescribe `vendors.gemini.strategies`. |

---

## Imágenes de Referencia

Adjunta hasta 10 imágenes de referencia para guiar el estilo, la identidad del sujeto o la composición.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Proveedor | Soporte de referencia | Cómo |
|---|---|---|
| `codex` (gpt-image-2) | Sí | Pasa `-i <path>` a `codex exec` |
| `gemini` (2.5-flash-image) | Sí | Inserta `inlineData` en base64 dentro de la solicitud |
| `pollinations` | No | Rechazado con código de salida 4 (requiere hosting por URL) |

### Dónde Viven las Imágenes Adjuntadas

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, expuestas en mensajes del sistema como `[Image: source: <path>]`. Acotadas a la sesión: cópialas a una ubicación duradera si quieres reutilizarlas más adelante.
- **Antigravity** — directorio de carga del workspace (el IDE muestra la ruta exacta)
- **Codex CLI como host** — debe pasarse explícitamente; los adjuntos dentro de la conversación no se reenvían

Cuando el usuario adjunta una imagen y pide generar o editar otra basada en ella, el agente que invoca **debe** reenviarla vía `--reference <path>` en lugar de describirla en prosa. Si el CLI local es demasiado antiguo para soportar `--reference`, ejecuta `oma update` y reintenta.

---

## Estructura de Salida

Cada ejecución escribe en `.agents/results/images/` dentro de un directorio con timestamp y sufijo de hash:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` registra el proveedor, modelo, prompt (o su SHA-256), tamaño, calidad y costo — cada ejecución es reproducible solo a partir del manifiesto.

---

## Costo, Seguridad y Cancelación

1. **Control de costo** — las ejecuciones estimadas en ≥ `$0.20` piden confirmación. Omítela con `-y` o `OMA_IMAGE_YES=1`. El `pollinations` por defecto (flux/zimage) es gratis, así que el prompt se omite automáticamente para él.
2. **Seguridad de rutas** — las rutas de salida fuera de `$PWD` requieren `--allow-external-out` para evitar escrituras inesperadas.
3. **Cancelable** — `Ctrl+C` (SIGINT/SIGTERM) aborta toda llamada a proveedor en curso junto con el orquestador.
4. **Salidas deterministas** — `manifest.json` siempre se escribe junto a las imágenes.
5. **`n` máximo = 5** — un límite de tiempo de pared, no una cuota.
6. **Códigos de salida** — alineados con `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Protocolo de Clarificación

Antes de invocar `oma image generate`, el agente que llama ejecuta esta lista de verificación. Si falta algo y no se puede inferir, pregunta primero o amplifica el prompt y muestra la expansión para aprobación.

**Requerido:**
- **Sujeto** — ¿cuál es el elemento principal de la imagen? (objeto, persona, escena)
- **Entorno / fondo** — ¿dónde está?

**Fuertemente recomendado (preguntar si está ausente y no es inferible):**
- **Estilo** — ¿fotorrealista, ilustración, render 3D, óleo, concept art, vector plano?
- **Mood / iluminación** — brillante vs sombrío, cálido vs frío, dramático vs minimalista
- **Contexto de uso** — ¿hero image, ícono, miniatura, foto de producto, póster?
- **Relación de aspecto** — cuadrada, vertical u horizontal

Para un prompt breve como *"a red apple"*, el agente **no** hace preguntas de seguimiento. En su lugar amplifica inline y muestra al usuario:

> Usuario: "a red apple"
> Agente: "Lo generaré como: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. ¿Procedo, o prefieres un estilo/composición diferente?"

Cuando el usuario ha redactado un brief creativo completo (≥ 2 de: sujeto + estilo + iluminación + composición), su prompt se respeta literalmente — sin clarificación, sin amplificación.

**Idioma de salida.** Los prompts de generación se envían al proveedor en inglés (los modelos de imagen están entrenados predominantemente con descripciones en inglés). Si el usuario escribió en otro idioma, el agente traduce y muestra la traducción durante la amplificación para que el usuario pueda corregir cualquier malinterpretación.

---

## Invocación Compartida (Desde Otras Skills)

Otras skills llaman a la generación de imágenes como infraestructura compartida:

```bash
oma image generate "<prompt>" --format json
```

El manifiesto JSON escrito en stdout incluye las rutas de salida, proveedor, modelo y costo — fácil de parsear y encadenar.

---

## Configuración

- **Configuración del proyecto:** `config/image-config.yaml`
- **Variables de entorno:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — sobrescribe el proveedor por defecto (de lo contrario, `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — sobrescribe el directorio de salida por defecto
  - `OMA_IMAGE_YES` — `1` para omitir la confirmación de costo
  - `POLLINATIONS_API_KEY` — requerida para el proveedor pollinations (registro gratuito)
  - `GEMINI_API_KEY` — requerida cuando el proveedor gemini cae al fallback de la API directa
  - `OMA_IMAGE_GEMINI_STRATEGIES` — orden de escalado separado por comas para gemini (`mcp,stream,api`)

---

## Solución de Problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Código de salida `5` (auth-required) | El proveedor seleccionado no está autenticado | Ejecuta `oma image doctor` para ver qué proveedor necesita login. Luego `codex login` / configura `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Código de salida `4` en `--reference` | `pollinations` rechaza referencias, o el archivo es demasiado grande / formato incorrecto | Cambia a `--vendor codex` o `--vendor gemini`. Cada referencia debe ser ≤ 5 MB y PNG/JPEG/GIF/WebP. |
| `--reference` no reconocido | El CLI local está desactualizado | Ejecuta `oma update` y reintenta. No recurras a una descripción en prosa. |
| La confirmación de costo bloquea la automatización | La ejecución se estima en ≥ `$0.20` | Pasa `-y` o configura `OMA_IMAGE_YES=1`. Mejor: cambia al `pollinations` gratuito. |
| `--vendor all` aborta de inmediato | Uno de los proveedores solicitados no está autenticado (modo estricto) | Autentica el proveedor faltante, o elige un `--vendor` específico. |
| Salida escrita en un directorio inesperado | El valor por defecto es `.agents/results/images/{timestamp}/` | Pasa `--out <dir>`. Las rutas fuera de `$PWD` necesitan `--allow-external-out`. |
| Gemini no devuelve bytes de imagen | El bucle agéntico del CLI de Gemini no emite `inlineData` sin procesar en stdout (a partir de 0.38) | El proveedor cae automáticamente a la API directa. Configura `GEMINI_API_KEY` y asegura facturación. |

---

## Relacionado

- [Skills](/docs/core-concepts/skills) — la arquitectura de skills de dos capas que impulsa `oma-image`
- [Comandos del CLI](/docs/cli-interfaces/commands) — referencia completa del comando `oma image`
- [Opciones del CLI](/docs/cli-interfaces/options) — matriz global de opciones
