---
title: "Guía: Generación de imágenes"
sidebar_label: Generación de imágenes
description: Guía completa de la generación de imágenes en oh-my-agent, con despacho multi-proveedor mediante Codex (gpt-image-2), Pollinations (flux/zimage, gratis) y Antigravity mediante Gemini Code Assist, imágenes de referencia, controles de costo, estructura de salida, solución de problemas y patrones de invocación compartidos.
---

# Generación de imágenes

`oma-image` es el enrutador de imágenes multi-proveedor de oh-my-agent. Genera imágenes a partir de prompts en lenguaje natural, las envía a la CLI del proveedor con el que te hayas autenticado y escribe junto a la salida un manifiesto con las entradas y decisiones del proveedor necesarias para auditar o repetir una ejecución. La salida de un proveedor activo puede variar.

La skill se activa con frases como «genera una imagen», «crea una imagen», «haz una foto», «dibújame …» o «imagen de …», con el nombre de un proveedor (`gpt-image`, `nano-banana`, `pollinations`), o cuando otra skill necesita una imagen como efecto secundario (hero shot, miniatura o foto de producto).

> **TL;DR** Necesitas una de estas opciones: `POLLINATIONS_API_KEY` (`flux` / `zimage` gratis), `codex login` (gpt-image-2 con tu plan de ChatGPT) o `agy` con la sesión iniciada. Ejecuta `oma image doctor` y después `oma image generate "<prompt>" --vendor pollinations`. Las imágenes y `manifest.json` se guardan en `.agents/results/images/{timestamp}-{shortid}/`.

---

## Cuándo usarla

- Generar imágenes, ilustraciones, fotos de producto, concept art y visuales para hero o landing.
- Comparar el mismo prompt entre varios modelos en paralelo (`--vendor all`).
- Producir activos desde cualquier runtime que cargue las skills de oma (Claude Code, Codex CLI, Antigravity, Cursor y otros).
- Permitir que otra skill (diseño, marketing o docs) llame al pipeline de imágenes como infraestructura compartida.

## Cuándo NO usarla

- Editar o retocar una imagen existente (fuera de alcance; usa una herramienta dedicada).
- Generar vídeos o audio (fuera de alcance).
- Componer SVG o vectores inline a partir de datos estructurados (usa una skill de plantillas).
- Cambiar de tamaño o convertir formatos de forma sencilla (usa una librería de imágenes, no un pipeline de generación).

---

## Proveedores de un vistazo

La skill sigue un enfoque CLI-first: cuando la CLI nativa de un proveedor puede devolver bytes de imagen sin procesar, se prefiere la ruta mediante subproceso frente a una clave de API directa.

| Proveedor | Estrategia | Modelos | Activador | Costo |
|---|---|---|---|---|
| `pollinations` | HTTP directo | Gratis: `flux`, `zimage`. Requieren créditos: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` configurada (registro gratuito en https://enter.pollinations.ai) | Gratis para `flux` / `zimage` |
| `codex` | CLI-first mediante `codex exec` (OAuth de ChatGPT) | `gpt-image-2` | `codex login` (no necesita clave de API) | Se carga a tu plan de ChatGPT |
| `antigravity` | CLI `agy` mediante la suscripción de Gemini Code Assist | El modelo lo selecciona internamente `agy` | `agy` instalado y autenticado | Sin costo por imagen mediante Code Assist |

Cómo elige `--vendor` los proveedores de una ejecución:

| `--vendor` | Proveedores que se ejecutan | Carpeta de salida | Sale con código 5 cuando |
|---|---|---|---|
| `auto` (predeterminado) | todos los proveedores que superan su comprobación de salud | `{timestamp}-{shortid}-compare/` cuando se ejecutan dos o más | ningún proveedor está saludable |
| `all` | todos los proveedores habilitados | `{timestamp}-{shortid}-compare/` cuando se ejecutan dos o más | algún proveedor solicitado no está saludable |
| `codex`, `pollinations` o `antigravity` | ese proveedor | `{timestamp}-{shortid}/` | ese proveedor no está saludable |

El modo de proveedor integrado es `auto`: ejecuta en paralelo **todos** los proveedores que superan su comprobación de salud. Pasa `--vendor pollinations` para mantenerte en la ruta gratuita. Los modelos `flux` y `zimage` de Pollinations son gratuitos por imagen, pero requieren una `POLLINATIONS_API_KEY`; Codex y Antigravity requieren iniciar sesión en sus propios servicios. Las estimaciones de pago siguen usando el control de confirmación de costos.

---

## Inicio rápido

Antes de generar por primera vez, comprueba qué proveedor está listo y autentica una de las rutas admitidas:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Una ejecución correcta en modo texto muestra un progreso como este (las rutas son ilustrativas):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Usarla como skill

`oma-image` es una skill que se activa automáticamente a partir del lenguaje natural y también puede invocarse de forma explícita. Tiene tres puntos de entrada.

### 1. Lenguaje natural (autoactivación)

En cualquier runtime que cargue las skills de oma (Claude Code, Codex CLI, Antigravity, Cursor y otros), basta con describir la imagen. Frases como «genera una imagen», «haz una foto», «dibújame …» o «imagen de …» activan la skill; los runtimes que eligen skills por su descripción también pueden activarla con solicitudes como «concept art» o «hero shot».

No necesitas memorizar las opciones de la CLI. Descríbelo en lenguaje llano y la skill lo traduce a las opciones correctas:

| Tú dices | La skill infiere |
|---|---|
| «usa codex» / «con gpt-image-2» / «flux gratis» | `--vendor codex` / `--vendor pollinations` |
| «compara entre proveedores» / «uno al lado del otro» | `--vendor all` |
| «vertical» / «horizontal» / «1024×1536» | `--size 1024x1536` / `--size 1536x1024` |
| «alta calidad» / «borrador» | `--quality high` / `--quality low` |
| «tres variaciones» / «dame 3» | `-n 3` |
| «guarda en ./hero» / «salida a docs/assets» | `--output-dir <dir>` |
| Imagen adjunta + «hazla nocturna» | `-r <attached path>` |
| «solo estima el costo» / «dry run» | `--dry-run` |

Ejemplos:

> «Genera un amanecer minimalista sobre montañas para el hero de la landing, horizontal, alta calidad.»
> «Compara una foto de producto de una taza de cerámica entre todos los proveedores, tres variaciones de cada uno.»
> «Usa codex para hacer dramática y nocturna esta foto de nutria.» (con una referencia adjunta)

El agente [resuelve el brief](#clarification-protocol), completa los huecos con valores predeterminados y llama a `oma image generate` con las opciones inferidas. Usa el comando slash cuando quieras controlar explícitamente los valores exactos de las opciones.

### 2. Comando slash explícito

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Todas las opciones de la CLI (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) funcionan en el comando slash y se reenvían al mismo pipeline de `oma image generate`.

### 3. Desde otra skill (infraestructura compartida)

Otras skills (diseño, marketing y docs) llaman al pipeline como infraestructura compartida con salida JSON:

```bash
oma image generate "<prompt>" --output json
```

Con `--output json`, stdout es un único objeto JSON `{exitCode, manifestPath, runs}`; cada entrada de `runs` indica su proveedor, estado y archivos de salida. Lee `manifestPath` para obtener el registro completo. `--dry-run` imprime la cabecera de texto `[oma image] dry-run plan:` antes del plan, así que omite esa línea al analizarlo.

---

## Referencia de la CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Opciones principales

| Opción | Propósito |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` o `all`. Con `all`, todos los proveedores solicitados deben estar saludables (modo estricto). |
| `-n, --count <n>` | Número de imágenes por proveedor, 1-5 (limitado por el tiempo transcurrido). Valor predeterminado: 1. |
| `--size <size>` | `WxH`, con cada lado múltiplo de 16 entre 16 y 3840 y una relación de aspecto entre 1:3 y 3:1 (por ejemplo `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), o `auto`. Valor predeterminado: `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` o `auto` (predeterminado). |
| `--output-dir <dir>` | Directorio de salida; los archivos se escriben directamente en él. El valor predeterminado es `.agents/results/images/{timestamp}-{shortid}/`. Las rutas fuera de `$PWD` requieren `--allow-external-output`. |
| `--allow-external-output` | Permite un directorio de salida fuera de `$PWD`. |
| `--model <name>` | Sobrescribe el modelo de **todos** los proveedores de la ejecución, así que combínalo con un único `--vendor` (por ejemplo `--vendor pollinations --model zimage`). `antigravity` lo ignora porque `agy` elige su modelo. |
| `-r, --reference <path>` | Hasta 10 imágenes de referencia (PNG/JPEG/GIF/WebP, ≤ 5 MB cada una). Se puede repetir o separar por comas. Compatible con `codex` y `antigravity`; `pollinations` las rechaza. |
| `-y, --yes` | Omite el prompt de confirmación de costos para ejecuciones estimadas en ≥ `$0.20`. También mediante `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Guarda el SHA-256 del prompt en lugar del texto sin procesar en `manifest.json`. |
| `--dry-run` | Imprime el plan y la estimación de costos sin gastar. |
| `--output text\|json` | Formato de salida de la CLI. JSON es la superficie de integración para otras skills. |
| `--timeout <duration>` | Tiempo de espera por imagen. Valor predeterminado: 180 segundos. |

---

## Imágenes de referencia

Adjunta hasta 10 imágenes de referencia para orientar el estilo, la identidad del sujeto o la composición.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Proveedor | Soporte de referencias | Cómo |
|---|---|---|
| `codex` (gpt-image-2) | Sí | Pasa `-i <path>` a `codex exec` |
| `antigravity` | Sí | Copia las referencias en un directorio por ejecución y da acceso a `agy` |
| `pollinations` | No | Rechaza la solicitud con código de salida 4 (requiere alojarlas mediante una URL) |

### Dónde viven las imágenes adjuntas

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, que aparece en los mensajes del sistema como `[Image: source: <path>]`. Solo duran lo que dura la sesión; cópialas a una ubicación persistente si quieres reutilizarlas.
- **Antigravity**: directorio de carga del workspace (el IDE muestra la ruta exacta).
- **Codex CLI como host**: debes pasarlas explícitamente; los adjuntos de la conversación no se reenvían.

Cuando el usuario adjunta una imagen y pide generar o editar otra basándose en ella, el agente que llama **debe** reenviarla mediante `--reference <path>` en lugar de describirla en prosa. Si la CLI local es demasiado antigua para admitir `--reference`, ejecuta `oma update` y vuelve a intentarlo.

---

## Estructura de salida

De forma predeterminada, cada ejecución escribe en `.agents/results/images/` dentro de una carpeta con marca de tiempo y sufijo de hash; con `--output-dir`, los archivos se escriben directamente en ese directorio:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` registra el proveedor, el modelo, el prompt (o su SHA-256), el tamaño, la calidad y el costo para que la solicitud pueda auditarse y repetirse. No obliga a que una salida de un proveedor activo tenga píxeles idénticos.

---

## Costos, seguridad y cancelación

1. **Control de costos**: las ejecuciones con una estimación ≥ `$0.20` piden confirmación; sin una terminal interactiva, la ejecución sale con código 1 y un mensaje que menciona `--yes`. Omítela con `-y` o `OMA_IMAGE_YES=1`. Solo `--vendor pollinations` con `flux` / `zimage` es gratuito con seguridad; `auto` también puede incluir un Codex con la sesión iniciada.
2. **Seguridad de las rutas**: las rutas de salida fuera de `$PWD` requieren `--allow-external-output` para evitar escrituras inesperadas.
3. **Cancelación**: `Ctrl+C` (SIGINT/SIGTERM) cancela todas las llamadas de proveedores en curso y el orquestador.
4. **Registro estable de la ejecución**: `manifest.json` siempre se escribe junto a las imágenes.
5. **Máximo de `n` = 5**: es un límite de tiempo transcurrido, no una cuota.
6. **Códigos de salida**: coinciden con los de `oma search fetch`: `0` correcto, `1` general, `2` seguridad, `3` no encontrado, `4` entrada no válida, `5` autenticación requerida y `6` tiempo de espera.

---

## Cómo resuelve el agente un brief {#clarification-protocol}

El agente usa lo que dijiste y completa los huecos con valores creativos razonables para el entorno, el estilo, la iluminación y la relación de aspecto. Solo hace una pregunta cuando una elección que falta cambiaría el resultado de forma sustancial, y no se detiene a pedir aprobación de un prompt ampliado una vez que le has pedido generar. La redacción explícita, el texto dentro de la imagen y la intención de las referencias se respetan tal como se dieron.

| Tú dices | Qué ocurre |
|---|---|
| «una manzana roja» | Se genera de inmediato; el agente completa el entorno, el estilo, la iluminación y el tamaño |
| «una manzana roja como icono vectorial plano, 512x512» | Se usan tu estilo y tu tamaño tal como los diste |
| «algo para la página de inicio» | Una pregunta sobre el sujeto, porque cambia el resultado |

Para ver exactamente qué se envió al proveedor, revisa el campo `prompt` de `manifest.json` (se guarda como SHA-256 con `--no-prompt-in-manifest`).

---

## Configuración

- **Configuración del proyecto:** sección `image:` de `.agents/oma-config.yaml`. Ya no se lee la configuración heredada `config/image-config.yaml`.
- **Variables de entorno:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: reemplaza el proveedor predeterminado configurado (`auto`). La opción `--vendor` también usa `auto` de forma predeterminada, así que pasa `--vendor` en cada comando cuando necesites un proveedor concreto.
  - `OMA_IMAGE_DEFAULT_OUT`: reemplaza el directorio de salida predeterminado.
  - `OMA_IMAGE_YES`: `1` para omitir la confirmación de costos.
  - `POLLINATIONS_API_KEY`: obligatoria para el proveedor pollinations (registro gratuito).

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Código de salida `5` (auth-required) | El proveedor seleccionado no está autenticado | Ejecuta `oma image doctor` para ver qué proveedor necesita iniciar sesión. Después ejecuta `codex login`, inicia sesión en `agy` o establece `POLLINATIONS_API_KEY`. |
| Código de salida `4` con `--reference` | `pollinations` rechaza las referencias, o el archivo es demasiado grande o tiene un formato incorrecto | Cambia a `--vendor codex` o `--vendor antigravity`. Cada referencia debe pesar ≤ 5 MB y ser PNG/JPEG/GIF/WebP. |
| No se reconoce `--reference` | La CLI local está desactualizada | Ejecuta `oma update` y vuelve a intentarlo. No recurras a una descripción en prosa. |
| La confirmación de costos bloquea la automatización | La ejecución se estima en ≥ `$0.20` | Pasa `-y` o establece `OMA_IMAGE_YES=1`. También puedes cambiar al `pollinations` gratuito. |
| `--vendor all` se cancela de inmediato | Uno de los proveedores solicitados no está saludable (modo estricto) | Instala o autentica el proveedor que falta, o elige un `--vendor` específico. |
| La salida se escribe en un directorio inesperado | El valor predeterminado es `.agents/results/images/{timestamp}-{shortid}/` | Pasa `--output-dir <dir>`. Las rutas fuera de `$PWD` necesitan `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (sale con código 1) | `--output-dir` apunta fuera del proyecto | Vuelve a ejecutar con `--allow-external-output` (el mensaje aún muestra el nombre antiguo de la opción) o elige un directorio dentro del proyecto. |
| Se ejecutaron varios proveedores y la carpeta termina en `-compare` | `--vendor auto` ejecuta todos los proveedores saludables | Pasa un único `--vendor` para ejecutar un solo proveedor. |
| Antigravity falla después de superar la comprobación de salud | `agy --version` demuestra que está instalado, no que se haya iniciado sesión | Inicia sesión en Gemini Code Assist y vuelve a intentarlo con `oma image doctor` y `--vendor antigravity`. |

---

## Próximos pasos

- [Generación de vídeo](./video-generation.md): `oma-video` reutiliza `oma-image` como su proveedor visual.
- [Flujos de contenido e investigación](./content-and-research.md): otras capacidades de contenido y sus requisitos previos.
- [Skills](../core-concepts/skills.md): arquitectura de skills en dos capas que impulsa `oma-image`.
- [Comandos de la CLI: image](../cli-interfaces/commands.md#image): referencia completa del comando `oma image`.
- [Opciones de la CLI](../cli-interfaces/options.md): matriz global de opciones.
