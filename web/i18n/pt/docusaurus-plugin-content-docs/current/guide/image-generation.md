---
title: "Guia: Geração de Imagens"
description: Guia completo da geração de imagens do oh-my-agent — dispatch multi-vendor via Codex (gpt-image-2), Pollinations (flux/zimage, gratuito) e Gemini, com imagens de referência, guardrails de custo, layout de saída, troubleshooting e padrões de invocação compartilhados.
---

# Geração de Imagens

`oma-image` é o roteador multi-vendor de imagens do oh-my-agent. Ele gera imagens a partir de prompts em linguagem natural, faz dispatch para qualquer CLI de vendor com a qual você esteja autenticado, e escreve um manifest determinístico ao lado da saída para que cada execução seja reproduzível.

A skill ativa automaticamente em palavras-chave como *image*, *illustration*, *visual asset*, *concept art*, ou quando outra skill precisa de uma imagem como efeito colateral (hero shot, thumbnail, foto de produto).

---

## Quando Usar

- Gerar imagens, ilustrações, fotos de produto, concept art, visuais de hero/landing
- Comparar o mesmo prompt entre múltiplos modelos lado a lado (`--vendor all`)
- Produzir assets de dentro de um workflow de editor (Claude Code, Codex, Gemini CLI)
- Permitir que outra skill (design, marketing, docs) chame o pipeline de imagem como infraestrutura compartilhada

## Quando NÃO Usar

- Editar ou retocar uma imagem existente — fora de escopo (use uma ferramenta dedicada)
- Gerar vídeos ou áudio — fora de escopo
- Composição inline SVG / vetorial a partir de dados estruturados — use uma skill de templating
- Redimensionamento simples / conversão de formato — use uma biblioteca de imagem, não um pipeline de geração

---

## Vendors em Resumo

A skill é CLI-first: quando a CLI nativa de um vendor consegue retornar bytes de imagem brutos, o caminho via subprocess é preferido em relação a uma chave de API direta.

| Vendor | Estratégia | Modelos | Trigger | Custo |
|---|---|---|---|---|
| `pollinations` | HTTP direto | Gratuitos: `flux`, `zimage`. Com créditos: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` definido (cadastro gratuito em https://enter.pollinations.ai) | Gratuito para `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` via ChatGPT OAuth | `gpt-image-2` | `codex login` (sem necessidade de API key) | Cobrado no seu plano ChatGPT |
| `gemini` | CLI-first → fallback de API direta | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` ou `GEMINI_API_KEY` + billing | Desabilitado por padrão; requer billing |

`pollinations` é o vendor padrão porque `flux` / `zimage` são gratuitos, então o auto-trigger por palavras-chave é seguro.

---

## Início Rápido

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

`oma img` é um alias para `oma image`.

---

## Slash Command (Dentro de um Editor)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

O slash command é encaminhado para o mesmo pipeline `oma image generate` — todas as flags da CLI funcionam aqui também.

---

## Referência da CLI

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

### Flags Principais

| Flag | Propósito |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini` ou `all`. Com `all`, todos os vendors solicitados precisam estar autenticados (modo strict). |
| `-n, --count <n>` | Número de imagens por vendor, 1–5 (limitado por wall-time). |
| `--size <size>` | Proporção: `1024x1024` (quadrado), `1024x1536` (retrato), `1536x1024` (paisagem) ou `auto`. |
| `--quality <level>` | `low`, `medium`, `high` ou `auto` (padrão do vendor). |
| `--out <dir>` | Diretório de saída. Padrão `.agents/results/images/{timestamp}/`. Caminhos fora de `$PWD` exigem `--allow-external-out`. |
| `-r, --reference <path>` | Até 10 imagens de referência (PNG/JPEG/GIF/WebP, ≤ 5 MB cada). Repetível ou separadas por vírgula. Suportado em `codex` e `gemini`; rejeitado em `pollinations`. |
| `-y, --yes` | Pula o prompt de confirmação de custo para execuções estimadas em ≥ `$0.20`. Também via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Armazena o SHA-256 do prompt em vez do texto bruto em `manifest.json`. |
| `--dry-run` | Imprime o plano e a estimativa de custo sem gastar. |
| `--format text\|json` | Formato de saída da CLI. JSON é a superfície de integração para outras skills. |
| `--strategy <list>` | Escalonamento exclusivo do Gemini, ex.: `mcp,stream,api`. Sobrescreve `vendors.gemini.strategies`. |

---

## Imagens de Referência

Anexe até 10 imagens de referência para guiar estilo, identidade do sujeito ou composição.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Suporte a referências | Como |
|---|---|---|
| `codex` (gpt-image-2) | Sim | Passa `-i <path>` para `codex exec` |
| `gemini` (2.5-flash-image) | Sim | Insere base64 `inlineData` inline na requisição |
| `pollinations` | Não | Rejeitado com exit code 4 (requer hospedagem por URL) |

### Onde as Imagens Anexadas Ficam

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, exposto em mensagens de sistema como `[Image: source: <path>]`. Escopo de sessão: copie para um local durável se quiser reutilizar depois.
- **Antigravity** — diretório de upload do workspace (a IDE mostra o caminho exato)
- **Codex CLI como host** — precisa ser passado explicitamente; anexos in-conversation não são encaminhados

Quando o usuário anexa uma imagem e pede para gerar ou editar uma com base nela, o agente que faz a chamada **deve** encaminhá-la via `--reference <path>` em vez de descrevê-la em prosa. Se a CLI local for muito antiga para suportar `--reference`, execute `oma update` e tente novamente.

---

## Layout de Saída

Cada execução escreve em `.agents/results/images/` com um diretório com timestamp e sufixo de hash:

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

`manifest.json` registra o vendor, modelo, prompt (ou seu SHA-256), tamanho, qualidade e custo — cada execução é reproduzível apenas a partir do manifest.

---

## Custo, Segurança e Cancelamento

1. **Guardrail de custo** — execuções estimadas em ≥ `$0.20` pedem confirmação. Ignore com `-y` ou `OMA_IMAGE_YES=1`. O `pollinations` padrão (flux/zimage) é gratuito, então o prompt é pulado automaticamente para ele.
2. **Segurança de path** — caminhos de saída fora de `$PWD` exigem `--allow-external-out` para evitar gravações inesperadas.
3. **Cancelável** — `Ctrl+C` (SIGINT/SIGTERM) aborta toda chamada de provider em andamento e o orquestrador juntos.
4. **Saídas determinísticas** — `manifest.json` é sempre escrito ao lado das imagens.
5. **`n` máximo = 5** — um limite de wall-time, não uma quota.
6. **Exit codes** — alinhados com `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Protocolo de Clarificação

Antes de invocar `oma image generate`, o agente que faz a chamada executa este checklist. Se algo estiver faltando e não for inferível, ele pergunta primeiro ou amplifica o prompt e mostra a expansão para aprovação.

**Obrigatório:**
- **Sujeito** — qual é a coisa principal na imagem? (objeto, pessoa, cena)
- **Cenário / pano de fundo** — onde é?

**Fortemente recomendado (pergunte se ausente e não inferível):**
- **Estilo** — fotorrealista, ilustração, render 3D, pintura a óleo, concept art, vetor flat?
- **Mood / iluminação** — claro vs sombrio, quente vs frio, dramático vs minimalista
- **Contexto de uso** — hero image, ícone, thumbnail, foto de produto, pôster?
- **Aspect ratio** — quadrado, retrato ou paisagem

Para um prompt curto como *"a red apple"*, o agente **não** faz perguntas de follow-up. Em vez disso, amplifica inline e mostra ao usuário:

> Usuário: "a red apple"
> Agente: "Vou gerar isto como: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Posso prosseguir, ou prefere um estilo/composição diferente?"

Quando o usuário escreveu um briefing criativo completo (≥ 2 de: sujeito + estilo + iluminação + composição), o prompt dele é respeitado verbatim — sem clarificação, sem amplificação.

**Idioma de saída.** Os prompts de geração são enviados ao provider em inglês (modelos de imagem são treinados predominantemente em legendas em inglês). Se o usuário escreveu em outro idioma, o agente traduz e mostra a tradução durante a amplificação para que o usuário possa corrigir qualquer interpretação equivocada.

---

## Invocação Compartilhada (A Partir de Outras Skills)

Outras skills chamam a geração de imagens como infraestrutura compartilhada:

```bash
oma image generate "<prompt>" --format json
```

O manifest JSON escrito em stdout inclui os caminhos de saída, vendor, modelo e custo — fácil de parsear e encadear.

---

## Configuração

- **Config do projeto:** `config/image-config.yaml`
- **Variáveis de ambiente:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — sobrescreve o vendor padrão (caso contrário `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — sobrescreve o diretório de saída padrão
  - `OMA_IMAGE_YES` — `1` para ignorar a confirmação de custo
  - `POLLINATIONS_API_KEY` — necessário para o vendor pollinations (cadastro gratuito)
  - `GEMINI_API_KEY` — necessário quando o vendor gemini cai para a API direta
  - `OMA_IMAGE_GEMINI_STRATEGIES` — ordem de escalonamento separada por vírgula para gemini (`mcp,stream,api`)

---

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Exit code `5` (auth-required) | Vendor selecionado não está autenticado | Execute `oma image doctor` para ver qual vendor precisa de login. Depois `codex login` / defina `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Exit code `4` em `--reference` | `pollinations` rejeita referências, ou arquivo muito grande / formato errado | Mude para `--vendor codex` ou `--vendor gemini`. Cada referência precisa ser ≤ 5 MB e PNG/JPEG/GIF/WebP. |
| `--reference` não reconhecido | CLI local desatualizada | Execute `oma update` e tente novamente. Não recorra a uma descrição em prosa. |
| Confirmação de custo bloqueia automação | Execução estimada em ≥ `$0.20` | Passe `-y` ou defina `OMA_IMAGE_YES=1`. Melhor ainda: mude para `pollinations` gratuito. |
| `--vendor all` aborta imediatamente | Um dos vendors solicitados não está autenticado (modo strict) | Autentique o vendor que falta, ou escolha um `--vendor` específico. |
| Saída escrita em um diretório inesperado | O padrão é `.agents/results/images/{timestamp}/` | Passe `--out <dir>`. Caminhos fora de `$PWD` precisam de `--allow-external-out`. |
| Gemini não retorna bytes de imagem | O loop agêntico do Gemini CLI não emite `inlineData` bruto no stdout (na versão 0.38) | O provider faz fallback automático para a API direta. Defina `GEMINI_API_KEY` e garanta o billing. |

---

## Relacionados

- [Skills](/docs/core-concepts/skills) — a arquitetura de skills em duas camadas que sustenta o `oma-image`
- [Comandos da CLI](/docs/cli-interfaces/commands) — referência completa do comando `oma image`
- [Opções da CLI](/docs/cli-interfaces/options) — matriz global de opções
