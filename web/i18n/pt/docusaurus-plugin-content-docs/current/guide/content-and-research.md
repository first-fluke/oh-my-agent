---
title: "Guia: Workflows de conteúdo e pesquisa"
sidebar_label: Visão geral
description: Escolha o caminho certo do oh-my-agent, com seus pré-requisitos, para extração de PDF e HWP, voz, pesquisa acadêmica e na web, slides, imagens, vídeo, explicações de código, diagramas, pesquisa de mercado, recaps, tradução e escrita acadêmica.
---

# Workflows de conteúdo e pesquisa

Este guia encaminha tarefas de documentos, áudio, pesquisa, mídia e apresentação para o recurso responsável por elas. Comece pelo artefato de que precisa e use o menor comando ou ponto de entrada de skill que produza um resultado revisável. Os recursos que têm guia próprio apontam para ele na última coluna; os demais são cobertos nesta página.

| Necessidade | Ponto de entrada | Pré-requisitos | Primeiro resultado | Guia |
|---|---|---|---|---|
| Extrair um PDF | Skill `oma-pdf` ou os comandos `uvx opendataloader-pdf` abaixo | `uv` (para `uvx`) | Markdown, texto, JSON ou um breve relatório de extração | [abaixo](#extract-pdf-content) |
| Extrair HWP/HWPX/HWPML | Skill `oma-hwp` e `bunx kordoc@latest` | Bun | Markdown ou JSON/chunks estruturado | [abaixo](#extract-hwp-family-documents) |
| Falar ou transcrever áudio | `/oma-voice` | Aplicativo Voicebox em `127.0.0.1:17493` ou VoiceStudio em `127.0.0.1:3900` | Áudio com manifesto ou `transcript.md` com manifesto | [abaixo](#generate-speech-or-transcribe-audio) |
| Encontrar e validar artigos | `oma scholar` | nenhum; opcionalmente `S2_API_KEY`, `OPENALEX_EMAIL` | Resultados de busca, um sidecar obtido ou um relatório de lint | [abaixo](#search-and-validate-scholarly-material) |
| Pesquisar na web ou obter uma página | Skill `oma-search`, `oma search` | opcionalmente Chrome, `curl_cffi` do Python, `yt-dlp`, `gh` (verifique com `oma search doctor`) | JSON no stdout | [Comandos da CLI: search](../cli-interfaces/commands.md#search) |
| Criar uma apresentação | Skill `oma-slide` e `oma slide` | Chrome ou `OMA_CHROME_PATH` | Slides HTML validados e exportações opcionais | [abaixo](#slides-and-presentations) |
| Gerar imagens | Skill `oma-image`, `oma image generate` | um entre `POLLINATIONS_API_KEY`, `codex login` ou um `agy` autenticado | Imagens com `manifest.json` em `.agents/results/images/` | [Geração de imagens](./image-generation.md) |
| Criar um vídeo curto, explicativo ou de demonstração | `/video`, `oma video` | Node.js 22+, FFmpeg e depois `oma video doctor --install` | Um diretório de execução em `.agents/results/videos/`; um MP4 depois de `oma video render` | [Geração de vídeo](./video-generation.md) |
| Explicar uma alteração ou um tópico em uma página | `/explain`, `oma explain` | git para o modo de alteração; `gh` para referências de PR | HTML autocontido em `.agents/results/explain/` | [Explicador de código](./code-explainer.md) |
| Diagrama de arquitetura interativo | `/architecture`, `oma diagram` | nenhum; o archify é baixado no primeiro uso | Bloco Mermaid, mais `.archify.html` quando o archify é resolvido | [Motor de diagramas](./diagram-engine.md) |
| Pesquisa de mercado na comunidade | Skill `oma-market`, `oma market` | Python 3.12+ | Um brief em `.agents/results/market/` | [Pesquisa de mercado](./market-research.md) |
| Resumir conversas de agentes | `/recap`, `oma recap` | nenhum | JSON de recap pela CLI; um recap Markdown datado pelo `/recap` | [abaixo](#recap-agent-conversations) |
| Traduzir ou revisar prosa localizada | Skill `oma-translation` | nenhum | Texto no idioma-alvo ou revisão apoiada por evidências | [abaixo](#translate-or-review-localized-content) |
| Redigir ou auditar prosa acadêmica | Skill `oma-academic-writing` | nenhum | Rascunho, revisão ou relatório de conformidade com um Claim-Evidence Map | [abaixo](#draft-or-audit-academic-writing) |

Os nomes de comandos `oma` nesta página são comandos públicos registrados. `uvx`, `bunx` e `bun` são ferramentas externas de conversão documentadas por suas skills responsáveis. As demais [skills](../getting-started/glossary.md#skill) são pontos de entrada em linguagem natural ou slash commands; não existe um comando autônomo `oma pdf`, `oma hwp`, `oma voice`, `oma translation` ou `oma academic-writing`.

## Extrair conteúdo de PDF {#extract-pdf-content}

Use a skill `oma-pdf` quando a entrada for um PDF e a saída precisar de uma estrutura legível por uma pessoa, um LLM ou um pipeline de recuperação. A skill verifica a camada de texto antes de escolher extração padrão, marcada ou OCR híbrido.

Para uma verificação rápida da camada de texto, imprima um pequeno intervalo de páginas sem criar um arquivo de saída:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Para extração e normalização em Markdown:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Escolha um intervalo com `--pages` para documentos grandes. Se a camada de texto estiver legível, mantenha a extração padrão. Se houver estrutura marcada, mas a ordem de leitura estiver ruim, tente novamente com `--use-struct-tree`; para tabelas quebradas, tente `--table-method cluster` ou `--markdown-with-html` antes de mudar para OCR.

Para um PDF digitalizado ou baseado em imagens, inicie o servidor híbrido e depois execute o conversor híbrido:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

Em um segundo terminal, defina o diretório de saída e execute o conversor:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

O artefato bem-sucedido é o arquivo Markdown ou de texto no diretório de saída selecionado, acompanhado da contagem de páginas e de eventuais observações de qualidade. PDFs criptografados exigem uma cópia desbloqueada ou uma senha. Arquivos grandes podem precisar de intervalos de páginas e diretórios de saída separados para que execuções repetidas não sobrescrevam o mesmo basename. Não trate palpites do OCR como fatos da fonte; informe tabelas incertas ou ausentes.

## Extrair documentos da família HWP {#extract-hwp-family-documents}

Use `oma-hwp` para arquivos `.hwp`, `.hwpx` e `.hwpml`. Ele executa `kordoc` por meio do Bun e depois processa tabelas Markdown e glifos da Private Use Area quando necessário.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

Em um clone novo, o helper pode informar `Cannot find module "turndown"`; execute `bun install` no diretório `resources/` da skill `oma-hwp` e depois execute o helper novamente.

Use um diretório de saída explícito para um lote:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

A saída padrão é Markdown. Para uma AST estruturada, use `bunx kordoc@latest "<input.hwp>" --format json`; para chunks orientados à recuperação, use `--format chunks`. As opções de conversão `--dedupe-headers`, `--keep-empty-cols` e `--inline-images` controlam casos comuns de tabelas e imagens. Verifique títulos, tabelas aninhadas ou mescladas, listas, imagens, notas de rodapé e links no resultado antes de passá-lo a outra skill.

`bun` e `bunx` são pré-requisitos. Uma saída vazia pode indicar conteúdo de imagem digitalizada; encaminhe esse caso para um workflow com OCR. Material criptografado ou limitado por DRM pode continuar incompleto. Entradas PDF, DOCX e XLSX pertencem às skills correspondentes, mesmo que `kordoc` tenha outros subcomandos de autoria e análise.

## Gerar fala ou transcrever áudio {#generate-speech-or-transcribe-audio}

`oma-voice` é nativo de MCP e usa um servidor Voicebox local. Invoque-o em um agente com um slash command:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS aceita até 5.000 caracteres por chamada e precisa de um perfil de voz Voicebox. A transcrição não precisa de um perfil TTS e aceita áudio de até 30 minutos. Trabalho TTS e STT persistido grava em `.agents/results/voice/`; a transcrição produz `transcript.md` e `manifest.json`. O modo de notificação normalmente permanece em Voicebox Captures e não grava um arquivo de áudio local.

O endpoint MCP local é `http://127.0.0.1:17493/mcp`. Uma configuração de primeiro uso registra o Voicebox no agente, e o aplicativo desktop do Voicebox fornece perfis de voz. A skill descobre os nomes reais das ferramentas MCP com `tools/list` e então chama `voicebox_speak`, `voicebox_transcribe` ou `voicebox_list_profiles`. Se o TTS não tiver perfil, crie ou selecione um no Voicebox; dividir uma solicitação longa é uma decisão do usuário, pois a skill não a divide automaticamente. Se o servidor estiver indisponível, verifique o endpoint de saúde local e reinicie o Voicebox antes de tentar novamente.

Para usar o [VoiceStudio](https://github.com/debpalash/VoiceStudio), defina `voice.backend` como `voicestudio` em `.agents/oma-config.yaml`, ou mantenha `auto` para usar o VoiceStudio sempre que o Voicebox não estiver em execução. A skill carrega a skill upstream `voicestudio`, usa IDs de perfil do VoiceStudio e pede confirmação antes de clonar ou criar uma voz ou de baixar um modelo. A narração do `oma video` segue a mesma configuração.

## Pesquisar e validar material acadêmico {#search-and-validate-scholarly-material}

Use a CLI `oma scholar` para sidecars Knows e metadados de artigos. Search e resolve são operações de descoberta; `get` recupera um registro ou seção selecionada; `lint` é o gate de compartilhamento.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows é tentado primeiro, com fallbacks para OpenAlex e Semantic Scholar. `--section` pode solicitar `statements`, `evidence`, `relations`, `artifacts` ou `citation`. Use `--lenient` quando referências cruzadas pendentes forem esperadas durante uma montagem local; use `--fail-on-warning` para um gate estrito de CI. Um resultado de busca ou sidecar obtido é evidência de descoberta, não uma afirmação de que o artigo apoia cada conclusão. Gere ou revise um sidecar no agente e execute `oma scholar lint` antes de compartilhá-lo.

Se um serviço remoto atingir o tempo limite, tente uma consulta mais ampla ou permita o fallback da CLI; `--always-fallback` consulta OpenAlex e Semantic Scholar mesmo quando o Knows tem resultados. Um 429 do Semantic Scholar pode ser um limite do pool anônimo; tente mais tarde ou defina `S2_API_KEY`. Defina `OPENALEX_EMAIL` (e, opcionalmente, `OPENALEX_API_KEY`) para identificar suas requisições ao OpenAlex. Se um sidecar tiver um erro de enum de proveniência, use `tool`, `person` ou `org`; se os avisos de densidade de relações permanecerem, adicione relações de evidência suportadas somente onde a fonte as sustenta.

## Slides e apresentações {#slides-and-presentations}

Use `oma-slide` quando o entregável for uma apresentação em palco fixo. A skill de autoria escreve fragmentos HTML em 1920×1080; a CLI valida a geometria, empacota o deck e o exporta.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Exporte somente depois da validação:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Use `--slide <file>` para uma verificação de um único slide e `--report-file <path>` com saída JSON quando outro processo precisar dos achados. `slide import pptx <file>` inicia um workflow de importação; `slide asset fetch-video <url>` baixa um ativo de vídeo; `slide style list|preview|get <slug>` inspeciona estilos. A saída PPTX é baseada em raster, portanto não fornece camadas de texto ou formas editáveis. A validação e a exportação exigem Chrome/puppeteer; defina `OMA_CHROME_PATH` quando o executável não for encontrado. Se a validação não convergir após três iterações de correção automática, use os achados de geometria informados para editar o fragmento afetado.

## Fazer recap de conversas de agentes {#recap-agent-conversations}

Use `/recap` (ou peça um recap ao agente) para resumos de trabalho baseados em evidências; ele executa `oma recap` para coletar o histórico. Uma data do calendário e uma janela móvel são entradas diferentes:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Esses comandos imprimem o histórico coletado (texto no terminal por padrão, JSON com `--json` ou um gráfico de Gantt em Mermaid com `--mermaid`), e `--graph` abre um grafo interativo no navegador; a CLI em si não grava nenhum arquivo. O `/recap` salva o recap Markdown em `.agents/results/recap/`, normalmente como `{date}.md` para um recap diário ou `{start-date}~{end-date}.md` para um intervalo. O recap agrupa por conteúdo de trabalho, separa trabalho solicitado e em andamento de trabalho concluído e registra histórico ausente de ferramentas. Use `--top` ou `--sort` quando o relatório precisar de uma visão mais restrita. Se a CLI estiver indisponível, a skill pode usar o fallback documentado do histórico do Claude, mas a cobertura reduzida da fonte deve ser informada.

Use `oma retro` para uma retrospectiva de engenharia baseada em Git. Ela responde a uma pergunta diferente do recap de conversas e pode comparar janelas adjacentes com `--compare`.

## Traduzir ou revisar conteúdo localizado {#translate-or-review-localized-content}

Use `oma-translation` para strings de UI, documentação, relatórios, texto de marketing ou prosa acadêmica. Invoque-a em linguagem natural ou com o ponto de entrada da skill `/oma-translation`; não existe um comando público `oma translation`.

Forneça à skill a fonte, o locale de destino, o tipo de conteúdo e se a tarefa é tradução, revisão ou sincronização de diff da fonte. Ela carrega um perfil de idioma correspondente nos recursos da skill quando disponível, preserva placeholders, links, estrutura Markdown e sintaxe protegida e segue as traduções irmãs e o glossário do projeto. Para um documento longo ou uma revisão, também aplica a rubrica de tradução. Se não houver perfil para o destino, usa as regras compartilhadas e informa essa limitação uma vez.

Para documentação, traduza a página inglesa estável depois que seus anchors e exemplos de comando estiverem definidos. Mantenha nomes de CLI, flags, caminhos, variáveis de ambiente e blocos de código exatos; traduza a explicação ao redor e compare a estrutura da página-alvo com a inglesa. Um significado ambíguo da fonte deve ser sinalizado, não adivinhado silenciosamente.

## Redigir ou auditar escrita acadêmica {#draft-or-audit-academic-writing}

Use `oma-academic-writing` para ensaios, relatórios, revisões de literatura, análises, resumos executivos, conclusões e revisões em inglês. Selecione um modo e forneça a rubrica ou as restrições da fonte:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` retorna prosa, Writing Notes e um Claim-Evidence Map. `revise` retorna os blocos original e revisado com alterações concretas. `review` retorna achados PASS/FAIL sobre estrutura de frases, verbos, modalização, especificidade, padrões anti-IA, clareza de parágrafos, ritmo e alinhamento entre afirmações e evidências. A skill lê um rascunho existente inteiro para revise/review, enfraquece ou remove afirmações sem suporte e encaminha a saída não inglesa para `oma-translation` depois da etapa em inglês.

Use `oma scholar` para descoberta de fontes e evidências de sidecar antes de redigir. Se faltar uma citação ou rubrica, marque a afirmação como pendente ou peça a restrição ausente; não preencha a lacuna com uma fonte inventada. O artefato útil de conclusão é a prosa junto do mapa de evidências ou relatório de auditoria, em vez de um parágrafo genericamente “polido” sem suporte rastreável.

## Lista de recuperação {#recovery-checklist}

| Sintoma | Próxima ação |
|---|---|
| A saída está vazia ou estruturalmente corrompida | Verifique o tipo de entrada e escolha o modo tagged, table ou OCR para PDFs; para HWP, verifique o Bun e inspecione a fonte em busca de páginas apenas com imagens. |
| Uma skill local não consegue conectar | Verifique o serviço ou a CLI local responsável (`Voicebox`, `Chrome`, `uvx`, `bunx`) antes de alterar a solicitação de conteúdo. |
| Um resultado de pesquisa é superficial | Amplie a consulta, inspecione o estado do fallback/fonte e preserve a incerteza no relatório. |
| Uma exportação de slide falha | Execute `oma slide validate --workspace <dir> --output json`, corrija achados de geometria ou fonte e exporte novamente. |
| Um recap exagera a conclusão | Verifique novamente recibos e artefatos; um prompt ou uma chamada de ferramenta isolada não é evidência de conclusão. |
| Uma tradução altera a sintaxe do código | Restaure os nomes protegidos e execute novamente as verificações estruturais antes de revisar a qualidade da prosa. |
| A prosa acadêmica tem afirmações sem suporte | Remova ou modalize a afirmação, adicione evidência pelo caminho scholar e execute novamente o Claim-Evidence Map. |

## Próximos passos

- [Geração de imagens](./image-generation.md), [Geração de vídeo](./video-generation.md), [Explicador de código](./code-explainer.md), [Motor de diagramas](./diagram-engine.md) e [Pesquisa de mercado](./market-research.md) — os guias dos recursos da tabela acima
- [Comandos da CLI](../cli-interfaces/commands.md) e [Opções da CLI](../cli-interfaces/options.md) — os caminhos completos de CLI registrados e os aliases de opções
- [Referência de configuração](./configuration-reference.md) — as seções de configuração `pdf`, `hwp`, `voice` e `scholar`
