---
title: "Guía: Generación de vídeo"
sidebar_label: Generación de vídeo
description: "Guía completa de generación de vídeo de oh-my-agent: un router de tres niveles con claves opcionales que compone guion, narración, elementos visuales, subtítulos y un compositor HyperFrames gestionado en directorios de ejecución reproducibles para modos shorts, explainer y demo."
---

# Generación de vídeo

`oma-video` es el router de vídeo de oh-my-agent. A partir de un brief de una línea, compone un guion, narración, elementos visuales y subtítulos, y después registra el plan en un directorio de ejecución. Las etapas de proveedor no requieren necesariamente una clave y pueden usar alternativas locales o deterministas; un MP4 real sigue necesitando un compositor funcional y una composición válida.

La skill se activa automáticamente con palabras clave como *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough* o *screencast*, o cuando otra skill necesita un vídeo como efecto secundario.

---

## Cuándo usarlo

- Convertir un brief, README, código o datos en un clip corto.
- Producir un explicador narrado o una grabación de demostración/recorrido.
- Cualquier pipeline reproducible de «brief → `.mp4`» que quieras volver a ejecutar de forma determinista.

## Cuándo NO usarlo

- Imágenes fijas individuales → usa [`oma-image`](/docs/guide/image-generation).
- Emisión o streaming de pantalla en directo → queda fuera del alcance (la captura es supervisada, no se transmite).
- Narración de audio independiente → usa `oma-voice`.

---

## Modos de un vistazo

| Modo | Relación de aspecto | Qué compone |
|------|---------------------|-------------|
| `shorts` | 9:16 | Clip vertical de formato corto (guion → narración → elementos visuales → subtítulos). |
| `explainer` | 16:9 | Explicador horizontal a partir de un README, código o brief de datos. |
| `demo` | derivada | Recorrido construido a partir de una grabación humana proporcionada con `--capture`; `--source web --url` aporta contexto para una captura supervisada en un navegador con interfaz y nunca automatiza el inicio de sesión. |

El modo elige valores predeterminados razonables; pasa los flags pertinentes cuando necesites valores diferentes.

---

## Inicio rápido

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Cada ejecución imprime su directorio de ejecución. Un `--seed` fijo estabiliza las entradas deterministas de planificación; la salida de los proveedores live y las imágenes capturadas aún pueden variar. Vuelve a renderizar un directorio de ejecución existente cuando necesites reutilizar su especificación de renderizado y sus recursos guardados.

Otras herramientas que ejecutan `oma video generate --output json` interpretan un sobre JSON de stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. No existe ninguna clave `outputs`; lee las rutas de salida y recursos del manifiesto en `manifestPath`.

---

## Referencia de la CLI

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Flags principales

| Flag | Propósito |
|------|-----------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Etiqueta de idioma de narración/subtítulos. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (alineación sin clave). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Voz de narración o `none` (la predeterminada); si se omite, el vídeo se renderiza sin sonido con una temporización de subtítulos estimada. |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` o `none`. |
| `--compositor <c>` | `hyperframes` (predeterminado) \| `mpt`. |
| `--capture <path>` | Ruta de grabación de entrada para el modo demo (`--source file`). |
| `--source <k>` | Fuente de captura demo: `file` o `web` (predeterminada: `file`). |
| `--url <url>` | URL objetivo para `--source web` (local, staging o producción); no sustituye a `--capture` cuando se requiere una grabación. |
| `--device <name>` | Marco de dispositivo para captura web; sobreescribe el tamaño de aspecto. |
| `--ready-selector <css>` | Selector CSS que se espera antes de la captura web. |
| `--show-cursor` | Superpone un cursor visible en la captura web. |
| `--polish` | Superpone la composición HyperFrames sobre las imágenes capturadas. |
| `--capture-timeout <sec>` | Límite máximo para la captura web en directo. |
| `--capture-stop <mode>` | Detención no interactiva para CI: `duration:<sec>` o `selector:<css>`. |
| `--output-dir <path>` | Directorio base de salida. Las rutas fuera de `$PWD` requieren `--allow-external-output`. |
| `--allow-external-output` | Permite rutas de salida fuera de `$PWD`. |
| `--max-usd <n>` | Coste máximo estimado antes de pedir confirmación. |
| `--duration <sec>` | Duración objetivo o `auto`. |
| `--seed <n>` | Semilla determinista. |
| `--dry-run` | Emite el guion, la especificación de renderizado y el manifiesto, y omite el renderizado. |
| `--script <path>` | `script.json` escrito por el agente para inyectar (sobrescribe el esqueleto; controla la narración, el texto en pantalla y los prompts visuales de cada escena). |
| `-y, --yes` | Omite el prompt de confirmación del coste. |
| `--output <f>` | Salida de la CLI: `text` (predeterminada) o `json`. |
| `--no-brief-in-manifest` | Guarda un SHA-256 del brief en lugar del brief sin procesar. |

---

## Proveedores con claves opcionales

Las etapas de proveedor se resuelven en una **rama real** y, cuando la etapa lo admite, en una **alternativa determinista**. Por ello, la falta de claves puede dejar una ejecución planificada con temporización estimada o recursos locales. El compositor es una etapa final obligatoria y no tiene una alternativa de placeholder normal:

| Capacidad | Rama real | Alternativa |
|-----------|-----------|-------------|
| script | LLM cuando hay una clave | esquema determinista a partir del brief |
| voice | `oma-voice` (Voicebox, local) | temporización estimada, sin audio |
| visual | `oma-image` / `oma-slide` / stock | recurso placeholder |
| caption | alineación forzada sin clave | temporización estimada por palabra |
| capture | captura web supervisada en navegador (`--source web`) o grabación proporcionada (`--source file --capture`) | protocolo guiado «grábalo tú mismo» |
| compositor | HyperFrames (gestionado) o MoneyPrinterTurbo | sin alternativa de compositor; la ejecución falla con diagnósticos |

No se automatizan credenciales: una persona realiza cualquier inicio de sesión en pantalla durante la captura; las URL y los tokens de consulta se enmascaran en los registros y en el manifiesto.

Los subtítulos se renderizan como **indicaciones estáticas por ventana**: una sola línea de subtítulo activa en el fotograma actual, ajustada mediante CSS, sin animación por palabra.

---

## Toolchain y `doctor`

El toolchain pesado (el `node_modules` del proyecto HyperFrames gestionado, la fuente Pretendard integrada, el checkout de MoneyPrinterTurbo, los navegadores de captura y Chrome Headless Shell) se **provisiona bajo demanda**, nunca se distribuye dentro del paquete. Un `doctor` sin flags solo informa: nunca instala nada:

```bash
oma video doctor
```

Informa sobre `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` y `cap`, y muestra la indicación de instalación para lo que falte. La línea base requiere Node.js 22+, el toolchain de HyperFrames y su navegador Chrome, FFmpeg/FFprobe y `oma-image`. Un MP4 real también requiere HTML escrito.

Usa los flags de instalación para provisionar el toolchain:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` también descarga la fuente Pretendard integrada (versión fijada) en la caché compartida del toolchain; esto forma parte del límite de determinismo. Ante un fallo de red, avisa y el renderizado vuelve a las fuentes del sistema; las diferencias de navegador y de sistema operativo aún pueden afectar a la salida codificada.

---

## Estructura de salida

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

El `render-spec.json` y los recursos son el límite de determinismo; la captura live se registra como `nondeterministic` en el manifiesto.

---

## Solución de problemas

| Síntoma | Causa / solución |
|---------|-----------------|
| No se produce ningún MP4 | Falló una comprobación del compositor, de la composición o del toolchain. Ejecuta `oma video doctor`, después `oma video compose <runDir>` y corrige la composición indicada antes de volver a ejecutar `oma video render <runDir>`. |
| La narración está en silencio (`source: estimated`) | Voicebox no está disponible; inicia el servidor `oma-voice` o acepta la temporización estimada. |
| `--source web` imprime un protocolo guiado en lugar de grabar | No hay TTY o no está disponible el runtime de captura del navegador → protocolo guiado de alternativa. Usa un terminal interactivo con un runtime de captura provisionado y `--capture-stop`, o pasa un archivo grabado con `--capture`. |
| El primer renderizado es lento | El navegador HyperFrames o el checkout de MPT se provisiona una vez; las ejecuciones posteriores reutilizan la caché. |

---

## HyperFrames siempre actualizado: tú escribes la composición

oh-my-agent **no incluye código de composición de HyperFrames**. Cada ejecución obtiene su propio proyecto en `<runDir>/hyperframes/`, preparado por `oma video compose` con la versión más reciente de HyperFrames publicada en npm (la caché del toolchain está en `~/.cache/oma-video/hyperframes/<version>/`, compartida mediante un enlace simbólico a `node_modules`) y con [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) en HEAD (`~/.cache/oma-video/hyperframes-skills/`). El agente escribe el código de composición generado siguiendo el `AUTHORING.md` del scaffold, las skills y la especificación del modo en `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Las comprobaciones de versión más reciente (npm + GitHub) están limitadas por `video.hyperframes.check_interval_min` (60 de forma predeterminada; `0` = comprobar en cada compose). `oma update` respeta el intervalo; `oma video doctor --upgrade` fuerza una comprobación; las ejecuciones sin conexión usan el toolchain en caché e informan `stale`.
- La reproducibilidad vive en el directorio de ejecución: `render-spec.json`, el código de composición escrito y la versión del toolchain registrada en los metadatos del paquete HyperFrames generado. Volver a renderizar la misma ejecución reutiliza ese contrato de renderizado; una ejecución nueva comprueba la versión más reciente de HyperFrames.
- Un fallo de lint o renderizado **no** se oculta detrás de un placeholder (eso solo existe para `OMA_VIDEO_MOCK=1`): `oma video render` termina con código 1 y los diagnósticos, y el agente corrige la composición usando las skills más recientes. Un fallo en una versión nueva de HyperFrames es un error de composición, nunca un motivo para fijar la versión.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Relacionado

- [Flujo de trabajo `/video`](/docs/core-concepts/workflows) — pipeline brief → guion → recursos → render-spec → HyperFrames.
- [Generación de imágenes](/docs/guide/image-generation) — router de imágenes fijas que se reutiliza como proveedor visual de vídeo.
