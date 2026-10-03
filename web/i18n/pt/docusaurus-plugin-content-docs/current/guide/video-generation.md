---
title: "Guia: Geração de vídeo"
sidebar_label: Geração de vídeo
description: Guia completo da geração de vídeo do oh-my-agent — um roteador de três níveis com chaves opcionais que compõe roteiro, narração, visuais, legendas e um compositor HyperFrames gerenciado em diretórios de execução reproduzíveis para modos shorts, explainer e demo.
---

# Geração de vídeo

`oma-video` é o roteador de vídeo do oh-my-agent. A partir de um briefing de uma linha, ele compõe roteiro, narração, visuais e legendas e depois registra o plano em um diretório de execução. As etapas de providers têm chaves opcionais e podem usar fallbacks locais ou determinísticos; um MP4 real ainda exige um compositor funcional e uma composição válida.

A skill é ativada automaticamente por palavras-chave como *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough* e *screencast*, ou quando outra skill precisa de vídeo como efeito colateral.

---

## Quando usar

- Transformar um briefing, README, código ou dados em um clipe curto.
- Produzir um explainer narrado ou uma gravação de demo/walkthrough.
- Qualquer pipeline reproduzível de "briefing → `.mp4`" que você queira executar novamente de forma determinística.

## Quando NÃO usar

- Imagens estáticas individuais → use [`oma-image`](/docs/guide/image-generation).
- Transmissão de tela ao vivo / streaming → fora do escopo (a captura é supervisionada, não transmitida).
- Áudio de narração independente → use `oma-voice`.

---

## Modos em resumo

| Modo | Proporção | O que compõe |
|------|--------|------------------|
| `shorts` | 9:16 | Clipe vertical curto (roteiro → narração → visuais → legendas). |
| `explainer` | 16:9 | Explainer horizontal a partir de um README, código ou briefing de dados. |
| `demo` | derivada | Walkthrough criado a partir de uma gravação humana fornecida com `--capture`; `--source web --url` fornece contexto para uma captura supervisionada com navegador visível e nunca automatiza o login. |

O modo escolhe padrões sensatos; passe as flags relevantes quando precisar de valores diferentes.

---

## Início rápido

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Cada execução imprime seu diretório. Um `--seed` fixo estabiliza as entradas de planejamento determinísticas; a saída de providers live e a gravação capturada ainda podem variar. Renderize novamente um diretório de execução existente quando quiser reutilizar a especificação de renderização e os ativos salvos.

Outras ferramentas que chamam `oma video generate --output json` analisam um envelope JSON no stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Não existe uma chave `outputs`; leia os caminhos de saída/ativos a partir do manifesto em `manifestPath`.

---

## Referência da CLI

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Flags principais

| Flag | Finalidade |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Tag de idioma da narração/legenda. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (alinhamento sem chave). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Voz de narração ou `none` (o padrão; omita e o vídeo renderiza em silêncio com tempo estimado de legendas). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` ou `none`. |
| `--compositor <c>` | `hyperframes` (padrão) \| `mpt`. |
| `--capture <path>` | Caminho da gravação de entrada para o modo demo (`--source file`). |
| `--source <k>` | Fonte da captura demo: `file` ou `web` (padrão: `file`). |
| `--url <url>` | URL-alvo para `--source web` (local, staging ou produção); não substitui `--capture` quando uma gravação é necessária. |
| `--device <name>` | Moldura de dispositivo para captura web; substitui o dimensionamento da proporção. |
| `--ready-selector <css>` | Seletor CSS aguardado antes da captura web. |
| `--show-cursor` | Sobrepõe um cursor visível na captura web. |
| `--polish` | Sobrepõe a composição HyperFrames à gravação capturada. |
| `--capture-timeout <sec>` | Teto rígido para a captura web ao vivo. |
| `--capture-stop <mode>` | Parada não interativa para CI: `duration:<sec>` ou `selector:<css>`. |
| `--output-dir <path>` | Diretório-base de saída. Caminhos fora de `$PWD` exigem `--allow-external-output`. |
| `--allow-external-output` | Permite caminhos de saída fora de `$PWD`. |
| `--max-usd <n>` | Custo estimado máximo antes da confirmação. |
| `--duration <sec>` | Duração-alvo ou `auto`. |
| `--seed <n>` | Seed determinística. |
| `--dry-run` | Emite roteiro / render-spec / manifesto e ignora a renderização. |
| `--script <path>` | `script.json` criado pelo agente para injetar (substitui o esqueleto; controla narração, texto na tela e prompts visuais por cena). |
| `-y, --yes` | Ignora o prompt de confirmação de custo. |
| `--timeout <duration>` | Limite de tempo de cada chamada a um provedor visual ou de música, como `90s` ou `2m`; um número sem unidade vale como segundos. |
| `--output <f>` | Saída da CLI: `text` (padrão) ou `json`. |
| `--no-brief-in-manifest` | Armazena um SHA-256 do briefing em vez do briefing bruto. |

---

## Providers com chaves opcionais

As etapas de providers resolvem para um **ramo real** e, quando a etapa oferece suporte, para um **fallback determinístico**. Assim, chaves ausentes podem deixar uma execução planejada com tempo estimado ou ativos locais. O compositor é a etapa final obrigatória e não tem um fallback placeholder normal:

| Capacidade | Ramo real | Fallback |
|------------|-------------|----------|
| script | LLM quando há uma chave | esboço determinístico a partir do briefing |
| voice | `oma-voice` (Voicebox, local) | tempo estimado, sem áudio |
| visual | `oma-image` / `oma-slide` / stock | ativo placeholder |
| caption | alinhamento forçado sem chave | tempo estimado por palavra |
| capture | captura web supervisionada (`--source web`) ou gravação fornecida (`--source file --capture`) | protocolo guiado "grave você mesmo" |
| compositor | HyperFrames (gerenciado) ou MoneyPrinterTurbo | sem fallback de compositor; a execução falha com diagnósticos |

Não há automação de credenciais: uma pessoa faz qualquer login na tela durante a captura; URLs e tokens de consulta são mascarados nos logs e no manifesto.

As legendas são renderizadas como **cues estáticos em janelas**: uma única linha de legenda ativa no frame atual, quebrada por CSS, sem animação por palavra.

---

## Toolchain e `doctor`

A toolchain pesada (o `node_modules` do projeto HyperFrames gerenciado, a fonte Pretendard incorporada, o checkout do MoneyPrinterTurbo, navegadores de captura e o Chrome Headless Shell) é **provisionada sob demanda**, nunca enviada no pacote. O `doctor` simples apenas informa o estado: nunca instala nada:

```bash
oma video doctor
```

Ele informa `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` e `cap` e imprime a dica de instalação para tudo que estiver faltando. A base exige Node.js 22+, a toolchain do HyperFrames e seu navegador Chrome, FFmpeg/FFprobe e `oma-image`. Um MP4 real também exige HTML escrito.

Use as flags de instalação para provisionar a toolchain:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` também busca a fonte Pretendard incorporada (release fixada) para o cache compartilhado da toolchain; isso faz parte do limite de determinismo. Em uma falha de rede, ele avisa e o renderizador recorre às fontes do sistema; diferenças de navegador e de SO ainda podem afetar a saída codificada.

---

## Layout de saída

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

O `render-spec.json` com os ativos é o limite de determinismo; a captura live é registrada como `nondeterministic` no manifesto.

---

## Solução de problemas

| Sintoma | Causa / correção |
|---------|-------------|
| Nenhum MP4 é produzido | Falhou uma verificação de compositor, composição ou toolchain. Execute `oma video doctor`, depois `oma video compose <runDir>` e corrija a composição informada antes de executar novamente `oma video render <runDir>`. |
| A narração está silenciosa (`source: estimated`) | O Voicebox está inacessível; inicie o servidor `oma-voice` ou aceite o tempo estimado. |
| `--source web` imprime um protocolo guiado em vez de gravar | Não há TTY ou o runtime de captura do navegador está indisponível → fallback guiado. Use um terminal interativo com runtime de captura provisionado e `--capture-stop`, ou passe um arquivo gravado com `--capture`. |
| A primeira renderização é lenta | O navegador HyperFrames / checkout MPT está sendo provisionado uma vez; execuções posteriores reutilizam o cache. |

---

## HyperFrames sempre atualizado — você escreve a composição

O oh-my-agent não distribui **nenhum código de composição HyperFrames**. Cada execução recebe seu próprio projeto em `<runDir>/hyperframes/`, criado por `oma video compose` na versão mais recente do HyperFrames do npm (cache da toolchain em `~/.cache/oma-video/hyperframes/<version>/`, compartilhado por um symlink `node_modules`), com [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) em HEAD (`~/.cache/oma-video/hyperframes-skills/`). O agente escreve o código-fonte da composição gerada seguindo o `AUTHORING.md` do scaffold, as skills e a especificação do modo em `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- As verificações da versão mais recente (npm + GitHub) são limitadas por `video.hyperframes.check_interval_min` (padrão 60; `0` = a cada compose). `oma update` respeita o intervalo; `oma video doctor --upgrade` força uma verificação; execuções offline usam a toolchain em cache e informam `stale`.
- A reprodutibilidade mora no diretório de execução: `render-spec.json`, o código da composição escrito e a versão da toolchain registrada nos metadados do pacote HyperFrames gerado. Renderizar novamente a mesma execução reutiliza esse contrato; uma nova execução verifica o HyperFrames mais recente.
- Uma falha de lint ou renderização **não** é escondida atrás de um placeholder (isso existe somente para `OMA_VIDEO_MOCK=1`): `oma video render` sai com código 1 e os diagnósticos, e o agente corrige a composição usando as skills mais recentes. Uma quebra em uma nova release do HyperFrames é um bug de composição, nunca motivo para fixar a versão.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Relacionado

- [Workflow `/video`](/docs/core-concepts/workflows) — pipeline briefing → roteiro → ativos → render-spec → HyperFrames.
- [Geração de imagem](/docs/guide/image-generation) — o roteador de imagens estáticas reutilizado como provider visual de vídeo.
