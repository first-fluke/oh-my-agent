---
title: Estrutura do projeto
description: "Mapa voltado ao leitor de uma instalação do oh-my-agent, com a SSOT em .agents/, recursos representativos de habilidades, workflows, definições de agentes versionadas, estado de runtime, camadas de integração dos fornecedores e a estrutura do repositório-fonte."
---

# Estrutura do projeto

Depois de instalar o oh-my-agent, o projeto ganha duas árvores de diretórios principais: `.agents/` (a única fonte de verdade, incluindo o armazenamento de coordenação `.agents/state/memories/`) e as camadas de integração do runtime (por exemplo, `.claude/`, `.cursor/` e `.codex/`). Se Serena for escolhido como provedor de inteligência de código, um diretório opcional `.serena/` também poderá existir para as memórias de onboarding do Serena. Esta página explica os arquivos compartilhados e os caminhos opcionais ou gerados relevantes na solução de problemas.

---

## Árvore de diretórios representativa

A árvore abaixo mostra em detalhe os recursos compartilhados e as habilidades de domínio representativas. O catálogo atual tem 33 diretórios de habilidades; as habilidades omitidas seguem o mesmo padrão de `SKILL.md` com `resources/`, `variants/` ou um diretório específico da habilidade opcional. Considere a árvore ativa de `.agents/` como autoridade quando um arquivo gerado ou opcional estiver ausente.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: a fonte de verdade

Este é o diretório central. Tudo de que os agentes precisam fica aqui. É o único diretório que importa para o comportamento dos agentes; todos os outros diretórios são derivados dele.

### oma-config.cue e oma-config.yaml

**`oma-config.yaml`**: arquivo central de configuração com:
- `language`: código do idioma de resposta (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: string do formato de timestamp (`ISO`, `US` ou `EU`; padrão `ISO`)
- `timezone`: identificador de fuso horário IANA; valores omitidos usam o fuso horário do sistema
- `model_preset`: chave do preset de modelo ativo (`auto` por padrão ou um preset fixo/personalizado)
- `providers`: provedores de capacidade para docs, web, inteligência de código e memória semântica
- `auto_update_cli`: verificação de atualização em segundo plano (padrão `true`, desative com `false`)
- `telemetry`: adesão à telemetria do fornecedor (padrão `false`)
- `mcp.devtools_browsers`: lista opcional de navegadores; quando omitida, preserva as entradas existentes
- `agents`: overrides opcionais por agente (somente o objeto `AgentSpec`)
- `models`: slugs de modelo definidos opcionalmente pelo usuário
- `custom_presets`: presets definidos pelo usuário, com `extends:` opcional

### skills/

É onde fica a expertise das habilidades. O catálogo atual tem 33 diretórios de habilidades mais os recursos `_shared`; o preset `all` é derivado dessa árvore ativa.

**`_shared/`**: recursos usados por todos os agentes:
- `core/`: roteamento, carregamento de contexto, estrutura de prompt, protocolo de clarificação, orçamento de contexto, avaliação de dificuldade, templates de raciocínio, princípios de qualidade, detecção de fornecedor, métricas de sessão, checklist comum, lições aprendidas e templates de contratos de API
- `runtime/`: protocolo de memória, especificação de eventos, contrato de resultados e protocolos de execução específicos de fornecedor
- `conditional/`: medição de pontuação de qualidade, acompanhamento de experimentos e protocolo de loop de exploração (carregados somente quando acionados)

**`oma-{skill}/`**: diretórios por habilidade. Cada um contém:
- `SKILL.md`: camada 1, carregada quando a habilidade é roteada; identidade, roteamento e regras principais.
- `resources/`: camada 2, carregada sob demanda; protocolos de execução, exemplos, checklists, playbooks de erros, stacks tecnológicos, snippets e templates.
- Algumas habilidades têm subdiretórios adicionais: `variants/` (sementes de backend/mobile), referências `stack/` geradas por `/stack-set`, `reference/` (oma-design) e scripts/configurações específicos da habilidade.

### workflows/

Há 21 arquivos Markdown que definem o comportamento dos comandos slash. Cada arquivo contém:
- frontmatter YAML com `description`
- seção de regras obrigatórias (idioma de resposta, ordem das etapas e requisitos de ferramentas MCP)
- instruções de detecção de fornecedor
- protocolo de execução passo a passo
- definições de gate (para workflows persistentes)

Workflows persistentes: `orchestrate.md`, `work.md`, `ultrawork.md` e `ralph.md`.
Workflows não persistentes incluem `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` e `video.md`.

### agents/

Há 12 arquivos de definição de subagentes, usados ao iniciar agentes pela ferramenta Task (Claude Code) ou pela CLI. Cada arquivo define:
- frontmatter: `name`, `description` e `skills` (qual habilidade carregar)
- referência ao protocolo de execução
- template de preflight do charter (CHARTER_CHECK)
- resumo da arquitetura
- regras específicas do domínio (10 regras)
- declaração: "Never modify `.agents/` files"

### plan-\{sessionId\}.json

Gerado pelo workflow `/plan`. Contém a decomposição estruturada da tarefa, com atribuições de agentes, prioridades, dependências e critérios de aceitação. É consumido por `/orchestrate` e `/work`. O tracker legível por humanos correspondente fica em `docs/plans/work/{NNN}-{name}.md` (ciclo de vida pelo campo `Status`). As referências de design permanentes ficam em `docs/plans/designs/{NNN}-{name}.md`.

### state/

Arquivos de estado de workflows persistentes. Esses arquivos JSON existem somente enquanto um workflow persistente está em execução. Deletá-los (ou dizer “workflow done”) desativa o workflow.

O subdiretório `state/memories/` é o armazenamento canônico do estado de coordenação: estado da sessão do orquestrador, quadro de tarefas, progresso, arquivos de resultado, métricas de sessão e telemetria de custo. É o caminho observado pelos dashboards e resolvido primeiro pela CLI; projetos criados antes da mudança usam o caminho legado `.serena/memories/`. Consulte [.agents/state/memories/: runtime state](#agentsstatememories-runtime-state) abaixo.

### results/

Arquivos de resultado dos agentes. São criados por agentes concluídos com status (completed/failed), resumo, arquivos alterados e checklist de critérios de aceitação. O orquestrador os lê durante a coleta, assim como os dashboards para monitoramento.

### mcp.json

Configuração do servidor MCP que inclui:
- definições de servidores (Serena etc.)
- configuração de memória: `memoryConfig.provider`, `memoryConfig.basePath` e `memoryConfig.tools` (nomes das ferramentas de leitura/escrita/edição)
- definições dos grupos de ferramentas para o gerenciamento de `/tools`

---

## .claude/: integração com a IDE

Este diretório conecta o oh-my-agent ao Claude Code e a outras IDEs.

### settings.json

Registra hooks e permissões do Claude Code. Cada entrada de evento de hook agora usa a ABI canônica `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

A entrada `statusLine` continua usando um caminho direto de `bun` (caminho de baixa latência, não roteado por `oma hook run`).

### hooks/

O diretório `hooks/` de um fornecedor contém **somente os arquivos que algo executa ou lê nesse diretório em runtime**. A cadeia de handlers (detecção de palavras-chave, modo persistente, injeção de habilidades e outros) é executada em processo dentro do binário `oma` por meio de `oma hook run`; os arquivos de handler `.ts` são agrupados na CLI durante o build e **NÃO** são materializados nos diretórios dos fornecedores.

**`oma-hook.sh`**: script wrapper gerado por `oma link`/`oma install`/`oma update`. Cada evento de hook do fornecedor passa por esse arquivo. A ordem de resolução em runtime é: `$OMA_BIN` (override explícito) → `command -v oma` (PATH) → diretórios de instalação conhecidos, como `$HOME/.bun/bin` e `$HOME/.local/share/mise/shims` (agentes iniciados pela GUI herdam um PATH mínimo) → `exit 0` (fail-open, nunca bloqueia o agente). Nada específico da máquina é gravado no script, então o arquivo é idêntico byte a byte para cada desenvolvedor e pode ser versionado com segurança. O script repassa `"$@"` literalmente, para que os argumentos `--vendor`, `--event` e `--matcher` cheguem a `oma hook run` sem alterações. Ele inclui o preâmbulo de autoduplicação que suprime disparos duplos quando uma instalação de projeto e uma global registram o mesmo evento.

**`hud.ts`**: renderiza o indicador `[OMA]` na barra de status, mostrando o nome do modelo, o uso de contexto (codificado por cor: verde/amarelo/vermelho) e o estado do workflow ativo. É registrado diretamente em `statusLine` (não roteado por `oma hook run`) para preservar a latência de renderização do caminho rápido. É materializado apenas para fornecedores cuja variante registra `statusLine` ou um evento exclusivo do HUD (por exemplo, claude, antigravity e qwen). O arquivo infere o dialeto do fornecedor a partir do próprio caminho instalado, por isso a cópia por fornecedor é necessária para o funcionamento.

**`filter-test-output.sh`**: filtro de shell que remove o ruído da saída dos executores de testes. O handler de filtro de testes em processo reescreve comandos de teste Bash detectados para passarem por `<hookDir>/filter-test-output.sh`; por isso, esse arquivo é materializado para todos os fornecedores cuja variante registra `test-filter.ts` (exceto cursor).

#### Onde a lógica dos handlers realmente fica

As fontes dos handlers são a SSOT em `.agents/hooks/core/` e são executadas em processo por meio de `oma hook run`:

**`keyword-detector.ts`**: handler puro (`run(input, ctx): HandlerResult | null`) para detecção de palavras-chave. Lógica:
1. Sanitiza a entrada (remove blocos de código, strings entre aspas e blocos de eco do sistema colados)
2. Examina a entrada limpa em busca de `keywords` (literais) e `patterns` (regex) de disparo
3. Verifica padrões informativos em uma janela de 60 caracteres ao redor de cada correspondência
4. Aplica uma guarda de reforço (suprime o evento se o mesmo workflow tiver sido acionado 2 ou mais vezes em 60 s)
5. Retorna um resultado `context` que injeta `[OMA WORKFLOW: ...]` ou `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**: handler puro (`run()`) que verifica arquivos de estado ativos em `.agents/state/` e reforça a execução de workflows persistentes. É chamado em processo por `oma hook run` em eventos `Stop`.

**`scm-guard.ts`**: handler puro (`run()`) em `PreToolUse` (ferramentas Bash/shell) que nega `git add` de arquivos provavelmente secretos. Aplica `forbidden_patterns` menos `allowed_exceptions` a partir de `.agents/skills/oma-scm/config/commit-config.yaml` (padrões integrados quando o arquivo está ausente). Executa antes de `test-filter` na cadeia de claude, codex, cursor, grok, kimi, kiro e qwen, no bridge do opencode (`tool.execute.before` lança uma exceção para bloquear) e no bridge do pi (`tool_call` retorna `{ block: true, reason }`); um comando prefixado com `OMA_SCM_ALLOW_SECRETS=1` contorna o guard depois da aprovação explícita do usuário. O staging amplo (`git add -A` / `git add .`) não é bloqueado de propósito: essa regra depende do consentimento do usuário, que o hook não consegue observar.

**`code-intelligence-guard.ts`**: handler puro (`run()`) em `PreToolUse` que aplica mecanicamente a regra "Code Search". Enquanto `providers.code_intelligence` resolve para `serena` (ou `gortex`) e `providers.code_intelligence_guard` não é `off`, ele nega as ferramentas nativas de busca (`Grep` e `Glob` no Claude Code) e os comandos de shell cujo binário inicial é uma busca recursiva de código (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`), e o motivo da negação indica a ferramenta do provedor a usar no lugar (`search_for_pattern`, `find_file`, `find_symbol`). `grep` não recursivo (filtros de pipe, arquivos únicos), `find` sem predicado de nome e leituras nunca são afetados. É registrado logo depois de `scm-guard` para claude, codex, cursor, grok, kimi, kiro e qwen; o instalador faz a união dos matchers da cadeia, então a entrada `PreToolUse` do Claude passa a ser `Bash|Grep|Glob`. Um comando de shell que contenha `OMA_CI_ALLOW_NATIVE=1` ainda contorna o guard, mas apenas como válvula de escape do operador para buscas em recursos fora do projeto ou em caminhos ignorados que o guard não reconheceu. O motivo da negação não cita esse prefixo, e ele não é um fallback para o código-fonte do projeto.

**`triggers.json`**: mapeamento de palavras-chave para workflows, incorporado estaticamente ao binário `oma` no build (fonte: `.agents/hooks/core/triggers.json`). Define:
- `workflows`: mapa do nome do workflow para `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` são frases literais; `patterns` são strings de regex brutas (compiladas com flags `iu`). `explicit` (somente workflows persistentes) lista as palavras-chave que contam como invocação explícita: somente elas ativam o modo persistente; qualquer outra correspondência é injetada como sugestão.
- `informationalPatterns`: frases que indicam perguntas (filtradas da detecção automática)
- `excludedWorkflows`: workflows que exigem invocação explícita com `/command`

As seções de idioma em `keywords`, `patterns` e `informationalPatterns` seguem esta convenção:
- `*`: universal/inglês.
- `en`: funcionalmente equivalente a `*`.
- `ko`/`ja`/`zh`/etc.: formulações específicas do idioma.

Todas as seções são sempre carregadas; a configuração `language` em `.agents/oma-config.yaml` controla apenas o idioma das respostas. Os limites de palavra dependem da própria palavra-chave: palavras-chave ASCII correspondem a palavras inteiras, e palavras-chave com texto não ASCII correspondem como substrings.

#### Materialização por fornecedor: antes → depois

Instalações antigas copiavam o conjunto **inteiro** de `.agents/hooks/core/` (cerca de 20 arquivos) para o diretório de hooks de cada fornecedor, embora o despacho em processo tornasse a maioria deles arquivos sem uso:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Agora o instalador deriva uma lista de permissões do JSON da variante do fornecedor (`requiredVariantScripts` em `cli/platform/hooks-composer.ts`) e materializa apenas o que esse fornecedor executa ou lê:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Fornecedor | Arquivos materializados | Motivo |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + filtro de testes |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | filtro de testes, sem statusLine |
| cursor | `oma-hook.sh` | sem statusLine e sem filtro de testes |
| commandcode | `oma-hook.sh` | somente Stop — o Command Code não tem evento de prompt e PreToolUse não pode reescrever a entrada ([referência de hooks](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | nenhum (projeto) — `hud.ts` + hooks centrais copiados para `~/.gemini/antigravity-cli/hooks/` | agy lê configurações apenas do HOME e hooks do workspace de `.agents/hooks.json`, que executa handlers diretamente de `.agents/hooks/core/`; um projeto `.gemini/antigravity-cli/` nunca é carregado (flag de variante `homeOnly`) |
| pi | conjunto completo de `.agents/hooks/core/` em `.pi/extensions/oma/` | o bridge do pi inicia handlers como subprocessos em vez de usar hooks de configurações |

O diretório de destino é limpo antes da cópia. Assim, executar novamente `oma install`/`oma update`/`oma link` em uma instalação antiga também remove automaticamente os arquivos obsoletos da cópia completa.

#### Depuração de uma cadeia de handlers isolada

Você pode executar qualquer cadeia de handlers com um payload real sem acionar a sessão ativa do agente:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` sempre sai com código 0 (fail-open). A saída vazia significa que a cadeia não produziu nenhuma operação para o evento. O JSON no dialeto do fornecedor (ou texto simples para prompts do kiro) é escrito em stdout quando um handler é acionado.

#### Migração de instalações anteriores à pre-019

Instalações existentes que tenham as entradas antigas `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` são migradas automaticamente na próxima execução de `oma install`, `oma update` ou `oma link`. O instalador usa substituição baseada em marcadores: somente grupos de hooks gerenciados pelo OMA (identificados pelos padrões de `name`/`command`) são substituídos; quaisquer grupos de hooks adicionados por você permanecem na ordem original. O caminho de `statusLine`/HUD não muda. O bridge em processo do pi não é afetado. Consulte `cli/commands/hook/command.ts` para a implementação do roteador (chamada internamente de “design 019”) e `cli/platform/hooks-composer/` para a lógica de materialização por fornecedor.

### skills/

Symlinks que apontam para `.agents/skills/`. Isso torna as habilidades visíveis para IDEs que leem `.claude/skills/`, mantendo `.agents/` como a única fonte de verdade.

### agents/

Definições de subagentes formatadas para a ferramenta Agent do Claude Code. Elas referenciam os arquivos de habilidades e incluem o template CHARTER_CHECK.

---

## .agents/state/memories/: estado em tempo de execução {#agentsstatememories-runtime-state}

É onde os agentes escrevem o progresso durante as sessões de orquestração. Esse é o armazenamento canônico de coordenação; a CLI o resolve primeiro e recorre ao legado `.serena/memories/` em projetos criados antes da mudança. Os arquivos da sessão e do quadro de tarefas incluem o ID da sessão; os arquivos de progresso e resultados incluem o agente, a tarefa, a execução e os IDs da sessão. Dashboards observam esse diretório para obter atualizações em tempo real.

| Arquivo | Proprietário | Finalidade |
|---------|-------------|-----------|
| `orchestrator-session-{sessionId}.md` | Orquestrador | Metadados da sessão: ID, status, hora de início e fase atual |
| `task-board-{sessionId}.md` | Orquestrador | Atribuições de tarefas: agente, tarefa, prioridade e dependências |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Essa execução | Atualizações passo a passo: arquivos lidos/modificados e status atual |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Essa execução | Saída passo a passo: status atual, resumo, arquivos alterados e critérios de aceitação |
| `session-metrics.md` | Orquestrador | Correções relevantes e evidências de experimentos |
| `experiment-ledger.md` | Orquestrador/QA | Linhas de evidência de experimentos reais |
| `session-work.md` | Workflow Work | Estado específico da sessão do workflow Work |
| `session-ultrawork.md` | Workflow Ultrawork | Estado específico da sessão do workflow Ultrawork |
| `session-cost-{sessionId}.md` | Sistema | Telemetria de custo por sessão |
| `archive/metrics-{date}.md` | Sistema | Métricas arquivadas (retenção de 30 dias) |

Os caminhos dos arquivos de memória e os nomes das ferramentas são configuráveis em `.agents/mcp.json` por meio de `memoryConfig`.

As memórias de onboarding próprias do Serena (`code_style.md`, `project_purpose.md` e arquivos semelhantes) permanecem em `.serena/memories/` e são separadas desses artefatos de coordenação.

---

## Estrutura do repositório-fonte do oh-my-agent

Se você está trabalhando no próprio oh-my-agent (e não apenas usando-o), o repositório é um monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

No repositório-fonte, alterações em `.agents/` são permitidas (essa é a exceção de SSOT para o próprio repositório). As regras de `.agents/` sobre não modificar esse diretório se aplicam a projetos consumidores, e não ao repositório do oh-my-agent.

Comandos de desenvolvimento (executados na raiz do repositório):
- `bun run test`: testes da CLI (vitest)
- `bun run lint`: lint dos workspaces da CLI e web
- `bun run build`: build da CLI
- `bun run typecheck`: verificação de tipos da CLI e web
- Commits devem seguir o formato convencional de commit (commitlint aplicado)
