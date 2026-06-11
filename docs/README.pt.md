# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Ja quis que seu assistente de IA tivesse colegas de trabalho? E isso que o oh-my-agent faz.

Em vez de uma unica IA fazendo tudo (e se perdendo no meio do caminho), o oh-my-agent divide o trabalho entre **agentes especializados**: frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design e mais. Cada um conhece bem o seu dominio, tem suas proprias ferramentas e checklists, e nao sai da sua area.

Funciona com todas as principais IDEs de IA: Pi, Claude Code, Cursor, Antigravity, Codex CLI, OpenCode e mais.

## Inicio Rapido

```bash
# macOS / Linux — instala bun, uv & serena automaticamente se nao tiver
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — instala bun, uv & serena automaticamente se nao tiver
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Ou manualmente (qualquer SO, requer bun + uv + serena)
bunx oh-my-agent@latest
```

### Instalacao via Agent Package Manager

<details>
<summary><a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) da Microsoft: distribuicao so com skills. Clique para expandir.</summary>

> Nao confunda com o APM (Application Performance Monitoring) do `oma-observability`.

```bash
# Todos os skills, instalados em cada runtime detectado
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Um unico skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

O APM so entrega os skills. Para workflows, regras, `oma-config.yaml`, hooks de deteccao de palavras-chave e a CLI `oma agent:spawn`, use `bunx oh-my-agent@latest`. Escolha so um modo de distribuicao por projeto, senao acaba dando ruim.

</details>

Escolha um preset e pronto:

| Preset | O Que Voce Ganha |
|--------|-------------|
| ✨ All | Todos os agentes e skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Funciona com Todos os Agentes

O `oh-my-agent` mantém `.agents/` como única fonte de verdade (SSOT) e o projeta no layout nativo de cada runtime. Assim, todas as ferramentas suportadas compartilham os mesmos skills, workflows e regras.

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>SSOT nativo</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>dispatch nativo</sub>
</td>
<td align="center">
<a href="https://github.com/esengine/DeepSeek-Reasonix"><img src="https://github.com/deepseek-ai.png?size=120" alt="Reasonix" width="48" height="48" /></a><br/>
<strong>Reasonix</strong><br/>
<sub>compatível nativamente</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>compatível nativamente</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>compatível nativamente</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>compatível nativamente</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills via symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok" width="48" height="48" /></a><br/>
<strong>Grok</strong><br/>
<sub>hooks nativos</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>hooks nativos + agentes</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& mais</a></sub></p>

## Seu Time de Agentes

| Agente | O Que Faz |
|-------|-------------|
| **oma-academic-writer** | Redige, revisa e audita prosa academica ate o nivel de publicacao |
| **oma-architecture** | Avalia trade-offs de arquitetura e define limites de modulos com analise ADR/ATAM/CBAM |
| **oma-backend** | Constroi e protege suas APIs em Python, Node.js ou Rust |
| **oma-brainstorm** | Explora ideias com voce antes de voce se comprometer a construir |
| **oma-db** | Projeta seu schema, migrations, indexes e vector stores |
| **oma-debug** | Encontra a causa raiz, corrige o bug e escreve um teste de regressao |
| **oma-deepsec** | Varre seu codigo em busca de falhas de seguranca e bloqueia pull requests arriscados |
| **oma-design** | Constroi design systems com tokens, acessibilidade e layouts responsivos |
| **oma-dev-workflow** | Automatiza seu CI/CD, releases e tarefas de monorepo |
| **oma-docs** | Verifica referencias quebradas na documentacao e sinaliza o que uma mudanca de codigo afetou |
| **oma-frontend** | Constroi sua UI com React/Next.js, TypeScript, Tailwind CSS v4 e shadcn/ui |
| **oma-hwp** | Converte arquivos HWP, HWPX e HWPML para Markdown |
| **oma-image** | Gera imagens por varios provedores de IA ao mesmo tempo |
| **oma-market** | Pesquisa seu mercado a partir de sinais de comunidade e estrutura os resultados com SWOT, Porter's 5F e PESTEL |
| **oma-mobile** | Constroi apps mobile cross-platform com Flutter |
| **oma-observability** | Roteia trabalho de observabilidade entre metricas, logs, traces, SLOs e forense de incidentes |
| **oma-orchestrator** | Executa multiplos agentes em paralelo via CLI |
| **oma-pdf** | Converte arquivos PDF para Markdown |
| **oma-pm** | Planeja tarefas, detalha requisitos e define contratos de API |
| **oma-qa** | Revisa seu codigo em busca de problemas de seguranca OWASP, performance e acessibilidade |
| **oma-recap** | Resume seu historico de conversas em resumos tematicos de trabalho |
| **oma-scholar** | Busca literatura academica e ajuda voce a conduzir revisoes por pares |
| **oma-scm** | Gerencia seus branches, merges, worktrees e Conventional Commits |
| **oma-search** | Roteia cada consulta para a melhor fonte e pontua o nivel de confianca do resultado |
| **oma-skill-creator** | Escreve e audita novos skills OMA no formato SSL-lite |
| **oma-slide** | Gera decks de apresentacao HTML distintos e ricos em animacoes e exporta para PDF/PNG/PPTX |
| **oma-tf-infra** | Provisiona infraestrutura multi-cloud com Terraform |
| **oma-translator** | Traduz entre idiomas de forma que parece escrito por um falante nativo |
| **oma-voice** | Gera voiceovers e transcreve audio localmente, sem precisar de nuvem |

## Como Funciona

So conversar. Descreva o que voce quer e o oh-my-agent descobre quais agentes usar.

```
Voce: "Cria um app de TODO com autenticacao de usuario"
→ PM planeja o trabalho
→ Backend constroi a API de auth
→ Frontend constroi a UI em React
→ DB desenha o schema
→ QA revisa tudo
→ Pronto: codigo coordenado e revisado
```

Ou use slash commands para workflows estruturados:

| Etapa | Comando | O Que Faz |
|-------|---------|-------------|
| 1 | `/brainstorm` | Ideacao livre |
| 2 | `/architecture` | Revisao de arquitetura, trade-offs, analise estilo ADR/ATAM/CBAM |
| 2 | `/design` | Workflow de design system em 7 fases |
| 2 | `/plan` | PM detalha sua feature em tarefas |
| 3 | `/work` | Execucao multi-agente passo a passo |
| 3 | `/orchestrate` | Spawn automatico e paralelo de agentes |
| 3 | `/ultrawork` | Workflow de qualidade em 5 fases com 11 gates de revisao |
| 4 | `/review` | Auditoria de seguranca + performance + acessibilidade |
| 4 | `/deepsec` | Varredura de seguranca profunda por agente |
| 5 | `/debug` | Debugging estruturado de causa raiz |
| 5 | `/docs` | Verificação e sincronização de drift de documentação via `oma-docs` |
| 6 | `/scm` | Workflow SCM e Git com suporte a Conventional Commits |

**Auto-deteccao**: Voce nem precisa dos slash commands. Palavras como "arquitetura", "plan", "review" e "debug" na sua mensagem (em 11 idiomas!) ativam automaticamente o workflow certo.

### Modelos por agente

Cada agente pode apontar para seu próprio modelo e `effort` a partir de `.agents/oma-config.yaml`. Os runtime profiles disponíveis: `antigravity`, `claude`, `codex`, `cursor`, `grok`, `mixed`, `qwen`. Confira a matriz de auth resolvida com `oma doctor --profile`. Guia completo: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## Por Que oh-my-agent?

> [Saiba mais →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portavel**: `.agents/` viaja com seu projeto, sem ficar preso a uma IDE
- **Baseado em papeis**: agentes modelados como um time de engenharia real, nao um amontoado de prompts
- **Eficiente em tokens**: design de skills em duas camadas economiza ~75% de tokens
- **Qualidade primeiro**: Charter preflight, quality gates e workflows de revisao integrados:
  - `oma verify <agent>` — 14 checagens deterministicas por tipo de agente (TypeScript strict, tests, raw SQL, segredos hardcoded, Flutter analyze, inline styles, scope violation, charter alignment …)
  - `session.quota_cap` — limites de tokens / spawn / por-vendor por sessao em `oma-config.yaml`; o Step 5 do `orchestrate` bloqueia o proximo spawn ao exceder
  - workflow `ralph` — JUDGE independente reverifica cada criterion a cada iteracao para detectar regressoes silenciosas; cache para tests >30s
  - Exploration Loop — apos 2 retries, `orchestrate` faz spawn paralelo de variantes de hipotese e mantem a de maior pontuacao
  - Auto-roteamento de monorepo — `detectWorkspace` le pnpm / nx / turbo / lerna e roteia cada agente para seu workspace
- **Multi-vendor**: misture Claude, Codex, Cursor e Qwen por tipo de agente
- **Observavel**: dashboards no terminal e na web para monitoramento em tempo real

## Arquitetura

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## Saiba Mais

- **[Documentacao Detalhada](./AGENTS_SPEC.md)**: spec tecnica completa e arquitetura
- **[Agentes Suportados](./SUPPORTED_AGENTS.md)**: matriz de suporte de agentes por IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)**: guias, tutoriais e referencia da CLI

## Sponsors

Este projeto e mantido gracas aos nossos generosos sponsors.

> **Curtiu o projeto?** Da uma estrela!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Experimente nosso template starter otimizado: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[Torne-se um sponsor →](https://github.com/sponsors/first-fluke)

Veja [SPONSORS.md](../SPONSORS.md) para a lista completa de apoiadores.


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Referências

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Yang, Y., Gong, Z., Huang, W., Yang, Q., Zhou, Z., Huang, Z., Li, Y., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, Y., Chen, D., Yang, X., & Luo, C. (2026). *SkillOpt: Executive strategy for self-evolving agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23904
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899


## Licenca

MIT
