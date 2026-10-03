---
title: Skills
description: "Guia completo da arquitetura de duas camadas das 33 skills do OMA, incluindo roteamento por SKILL.md, recursos sob demanda, protocolos compartilhados e condicionais, execução por fornecedor, medições de tokens e mecânica de roteamento."
---

# Habilidades (Skills)

Skills são pacotes estruturados de conhecimento que fornecem a um papel de dispatch as orientações do seu domínio. Elas reúnem protocolos de execução, referências de stack, templates de código, playbooks de erros, checklists de qualidade e exemplos quando a skill os oferece, organizados em uma arquitetura de duas camadas criada para economizar tokens.

---

## O design em duas camadas

### Camada 1: SKILL.md (carregado quando a skill é roteada)

Toda skill tem um arquivo `SKILL.md` na raiz. Ele entra na janela de contexto quando a skill é roteada: o hook injetor transmite uma **referência de caminho**, não o corpo, então uma skill não roteada não custa nada além de sua `description`. O arquivo contém:

- **Frontmatter YAML** com `name` e `description` (usado para roteamento e exibição)
- **Quando usar / Quando NÃO usar** — condições explícitas de ativação
- **Regras principais** — as 5-15 restrições mais críticas para o domínio
- **Visão geral da arquitetura** — como o código deve ser estruturado
- **Lista de bibliotecas** — dependências aprovadas e seus propósitos
- **Referências** — ponteiros para recursos da Camada 2 (nunca carregados automaticamente)

Exemplo de frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

O campo description é fundamental porque contém as palavras-chave de roteamento que o sistema usa para associar tarefas a agentes.

### Camada 2: resources/ (carregado sob demanda)

O diretório `resources/` contém conhecimento de execução detalhado. Esses arquivos são carregados somente quando:
1. O host ou workflow selecionou a skill (por exemplo, por uma correspondência nativa ou comando explícito)
2. A tarefa atual atende à condição de carregamento da referência

Este carregamento sob demanda é governado pelo guia de context-loading (`.agents/skills/_shared/core/context-loading.md`), que distingue as instruções de entrada das referências selecionadas pela tarefa.

---

## Exemplo de estrutura de arquivos

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Tipos de recursos por skill

| Tipo de Recurso | Padrão de Nome | Propósito | Quando Carregado |
|-----------------|---------------|---------|-------------|
| **Protocolo de Execução** | `execution-protocol.md` | Workflow passo a passo: Analisar -> Planejar -> Implementar -> Verificar | A operação selecionada precisa dos detalhes de seu comando ou contrato |
| **Stack Tecnológico** | `tech-stack.md` | Specs detalhadas de tecnologia, versões, configuração | Decisão de framework ou stack selecionada |
| **Playbook de Erros** | `error-playbook.md` | Procedimentos de recuperação com escalação "3 strikes" | Apenas em erros |
| **Checklist** | `checklist.md` | Verificação de qualidade específica do domínio | Na etapa de Verificação |
| **Snippets** | `snippets.md` | Padrões de código prontos para copiar | Implementação ou formato de saída pouco familiar |
| **Exemplos** | `examples.md` ou `examples/` | Exemplos few-shot de entrada/saída para o LLM | Implementação ou formato de saída pouco familiar |
| **Variantes** | Diretório `variants/` | Referências específicas de linguagem/framework. O backend fornece seeds `node`, `python` e `rust`; o mobile fornece um schema e pode receber referências de plataforma geradas. | Quando existe uma stack correspondente |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Templates boilerplate de arquivo | Na criação de componentes |
| **Referência de Domínio** | `orm-reference.md`, `anti-patterns.md`, etc. | Conhecimento profundo de domínio para subtarefas específicas | Específico por tipo de tarefa |

---

## Recursos compartilhados (_shared/)

Todos os agentes compartilham fundamentos comuns de `.agents/skills/_shared/`. Estes são organizados em três categorias:

### Recursos core (`.agents/skills/_shared/core/`)

| Recurso | Finalidade | Quando carregado |
|---------|---------|------------------------|
| **`skill-routing.md`** | Roteia por resultado da tarefa, responsabilidade e dependências reais; sem cadeia obrigatória de agentes nem cota de turnos. | Referenciado por skills de orquestração e coordenação |
| **`context-loading.md`** | Entrada da skill responsável, referências condicionais e limites de carregamento em runtime. | Ao compor o contexto |
| **`prompt-structure.md`** | Orienta handoffs de tarefas pouco familiares com objetivo, contexto, restrições reais e evidências de aceitação; sem template obrigatório para tarefas diretas. | Referenciado pelo agente PM e por todos os workflows |
| **`clarification-protocol.md`** | Resolve detalhes rotineiros a partir do contexto e pede apenas informações relevantes ausentes ou autorização. | Quando os requisitos são ambíguos |
| **`context-budget.md`** | Estimativas de tamanho de arquivo, medição do prompt real, leituras delimitadas e checkpoints. | Tarefas longas ou diagnóstico de sobrecarga de contexto |
| **`difficulty-guide.md`** | Escolhe a profundidade do planejamento e os entregáveis com base nas dependências e nas necessidades de verificação. | Quando a decomposição precisa de uma estimativa de dificuldade |
| **`quality-principles.md`** | Orientações sobre escopo, manutenibilidade, evidências e verificação proporcional. | No início de workflows orientados à qualidade (ultrawork) |
| **`vendor-detection.md`** | Protocolo para detectar o runtime atual (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen e fallback CLI), usando marcadores do host e estado do fornecedor configurado. | No início do workflow |
| **`session-metrics.md`** | Evidências opcionais da sessão, sem pontuações de penalidade conversacional ou do avaliador. | Retrospectiva solicitada ou correção relevante |
| **`common-checklist.md`** | Verificações aplicáveis entre domínios; sem limites globais de contagem de linhas nem exigência generalizada de catch. | Revisão entre domínios, quando relevante |
| **`lessons-learned.md`** | Registra e aplica lições baseadas em evidências, com condições de versão/gatilho; sem limiar automático de RCA. | Consultado após erros e no fim da sessão |
| **`api-contracts/`** | Template de contrato opcional. Reutilize os schemas do projeto; os contratos gerados ficam fora do código-fonte da skill. | Quando o trabalho atravessa fronteiras |

### Recursos de runtime (`.agents/skills/_shared/runtime/`)

| Recurso | Finalidade |
|---------|---------|
| **`memory-protocol.md`** | Formato e operações de arquivos de memória para subagentes CLI. Define protocolos On Start, During Execution e On Completion usando ferramentas de memória configuráveis (leitura/escrita/edição), com extensão para rastrear experimentos. |
| **`execution-protocols/claude.md`** | Padrões de execução específicos do Claude Code, injetados por `oma agent spawn` quando o fornecedor é claude. |
| **`execution-protocols/antigravity.md`** | Padrões de execução da CLI Antigravity (`agy`). |
| **`execution-protocols/codex.md`** | Padrões de execução da CLI Codex. |
| **`execution-protocols/commandcode.md`** | Padrões de execução do CommandCode. |
| **`execution-protocols/grok.md`** | Padrões de execução do Grok. |
| **`execution-protocols/kimi.md`** | Padrões de execução do Kimi Code. |
| **`execution-protocols/kiro.md`** | Padrões de execução do Kiro. |
| **`execution-protocols/opencode.md`** | Padrões de execução da extensão OpenCode. |
| **`execution-protocols/pi.md`** | Padrões de execução do pi. |
| **`execution-protocols/qwen.md`** | Padrões de execução da CLI Qwen. |

Os protocolos específicos de fornecedor são injetados automaticamente em agentes iniciados pela CLI com `oma agent spawn`. Subagentes nativos usam as regras de integração do fornecedor selecionado.

### Recursos condicionais (`.agents/skills/_shared/conditional/`)

Estes são carregados apenas quando condições específicas são atendidas durante a execução:

| Recurso | Condição de Gatilho | Carregado Por |
|---------|---------------------|--------------|
| **`quality-score.md`** | É necessária uma baseline definida ou uma comparação de experimentos | Orquestrador (passa para prompt do agente QA) |
| **`experiment-ledger.md`** | Primeiro experimento registrado após estabelecer baseline IMPL | Orquestrador (inline, após medição de baseline) |
| **`exploration-loop.md`** | A recuperação falha repetidamente e alternativas merecem ser testadas dentro do orçamento | Orquestrador (inline, antes de spawnar agentes de hipótese) |

Esses recursos ficam adiados até que o gatilho de cada um se aplique. A dificuldade, por si só, não os injeta.

---

## Como habilidades roteiam via skill-routing.md

O mapa de roteamento de habilidades define como tarefas são correspondidas a agentes:

### Roteamento simples (domínio único)

Um prompt contendo "Build a login form with Tailwind CSS" corresponde às palavras-chave `UI`, `component`, `form`, `Tailwind` e roteia para **oma-frontend**.

### Roteamento de requisições complexas

Requisições multi-domínio seguem ordens de execução estabelecidas:

| Padrão da Requisição | Ordem de Execução |
|---------------------|------------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) paralelo -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) paralelo -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> agentes relevantes -> oma-qa |
| "Do everything automatically" | oma-orchestration (internamente: oma-pm -> agentes -> oma-qa) |

### Regras de dependência inter-agente

**Podem executar em paralelo (sem dependências):**
- oma-backend + oma-frontend (quando contrato de API é pré-definido)
- oma-backend + oma-mobile (quando contrato de API é pré-definido)
- oma-frontend + oma-mobile (independentes um do outro)

**Devem executar sequencialmente:**
- oma-brainstorm -> oma-pm (design vem antes do planejamento)
- oma-pm -> todos os outros agentes (planejamento vem primeiro)
- agente de implementação -> oma-qa (revisão após implementação)
- oma-backend -> oma-frontend/oma-mobile (quando não há contrato de API pré-definido)

**QA é sempre por último**, exceto quando o usuário solicita revisão de arquivos específicos apenas.

---

## Matemática de economia de tokens {#token-savings-math}

Meça antes de afirmar que há economia:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

O script informa estimativas (bytes UTF-8 / 4) para cenários de tamanho de arquivo. `routed` é apenas a entrada; `simple`, `medium` e `complex` acrescentam arquivos hipotéticos de protocolo, de exemplo e de stack para comparação. Os nomes são mantidos por compatibilidade com o script, e não como instruções de pré-carregamento. `all` é um teto de tamanho dos recursos, não uma configuração de runtime. Um checkout novo pode usar uma seed de plataforma como proxy de tamanho; ele não carrega todas as plataformas.

O comando de contexto exibe a injeção real de contexto da tarefa. Ele não inclui o restante da conversa nem todas as instruções do host/runtime. Use um prompt montado ou a telemetria de uso para medir o total de tokens de entrada, a latência e o custo em um modelo específico. Não infira esses valores a partir do tamanho do repositório nem das contagens de espelhos gerados.

## Carregamento de recursos por tarefa

Todo nível de dificuldade começa pela skill responsável. O grafo é um índice de referências; a adjacência não autoriza carregar outro especialista, um playbook de erros nem um workflow condicional de experimentos.

O loader usa orçamentos flexíveis de 1.500 / 4.000 / 8.000 tokens estimados para Simple / Medium / Complex. Uma entrada que excede o orçamento é mantida e o excesso é informado. As referências de apoio permanecem adiadas, a menos que sejam selecionadas explicitamente depois que o gatilho da tarefa correspondente for resolvido. Uma entrada obrigatória nunca é substituída por documentos menores e não relacionados.

A verificação segue o risco da tarefa e os requisitos do projeto. Um rótulo de dificuldade não exige uma suíte de testes completa, uma resposta de preflight fixa nem uma segunda aprovação de trabalho já autorizado.

## Mapas de tarefas de context-loading (por agente)

Estes são exemplos de referências a consultar quando a tarefa precisar delas. Use o índice atual da skill responsável e selecione apenas as seções aplicáveis:

### Agente backend

| Tipo de tarefa | Recursos obrigatórios |
|-----------|-------------------|
| Criação de API CRUD | `variants/{node,python,rust}/snippets.md` correspondente quando existir |
| Autenticação | `snippets.md` e `tech-stack.md` da variante correspondente quando existirem |
| Migração de DB | `snippets.md` da variante correspondente quando existir |
| Otimização de performance | `orm-reference.md` e exemplos correspondentes fornecidos pela skill |
| Modificação de código existente | provedor de inteligência de código do projeto e recursos de execução relevantes |

### Agente frontend

| Tipo de tarefa | Recursos obrigatórios |
|-----------|-------------------|
| Criação de componente | snippets.md + padrões de componentes existentes no projeto |
| Implementação de formulário | snippets.md (form + Zod) |
| Integração com API | snippets.md (TanStack Query) |
| Estilização | tailwind-rules.md |
| Layout de página | snippets.md (grid) |

### Agente de design

| Tipo de tarefa | Recursos obrigatórios |
|-----------|-------------------|
| Criação de sistema de design | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Design de landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md |
| Auditoria de design | checklist.md + anti-patterns.md |
| Exportação de design tokens | design-tokens.md |
| Efeitos 3D/shader | reference/shader-and-3d.md + reference/motion-design.md |
| Revisão de acessibilidade | reference/accessibility.md + checklist.md |

### Agente de QA

| Tipo de tarefa | Recursos obrigatórios |
|-----------|-------------------|
| Revisão de segurança | checklist.md (seção Security) |
| Revisão de performance | checklist.md (seção Performance) |
| Revisão de acessibilidade | checklist.md (seção Accessibility) |
| Auditoria completa | checklist.md (completo) + self-check.md |
| Comparação de métrica definida | quality-score.md (condicional) |

---

## Composição de prompt do orquestrador

Quando o orquestrador compõe prompts para subagentes, inclui somente recursos relevantes à tarefa:

1. Caminho do SKILL.md da skill responsável (o dispatch pela CLI já injeta o corpo)
2. A seção do execution-protocol de uma operação selecionada, quando necessária
3. Recursos correspondentes ao tipo de tarefa específico, a partir dos mapas acima
4. A seção relevante do error-playbook somente após uma falha observada
5. Memory Protocol (modo CLI)

Essa composição direcionada evita carregar recursos desnecessários e maximiza o contexto disponível do subagente para o trabalho real.

---

## Evidências de sessão e revisão retrospectiva

Os registros de sessão capturam correções relevantes, mudanças de escopo, retrabalho e achados de revisão julgados com evidências. A clarificação necessária não gera penalidade. As antigas pontuações ponderadas de CD e EA e as regras de RCA acionadas por limiares foram removidas; eram instruções de prompt, e não métricas calculadas pela CLI.

Use os resultados de tarefas existentes sempre que possível. Um arquivo `session-metrics-{sessionId}.md` separado é opcional no armazenamento de coordenação configurado. Uma falha repetida ou uma retrospectiva solicitada pode justificar uma lição, mas uma verificação comum com falha ou um achado contestado não estabelece uma automaticamente. Mantenha os logs históricos; não os reescreva no novo formato.

`oma stats` informa a produtividade e os resumos de uso/custo registrados. `oma retro` agrupa eventos reais de portão, bloqueio e decisão ausente em sugestões. Nenhum dos dois calcula pontuações de CD/EA a partir desses artefatos Markdown.

## Decomposição de tarefas e recuperação de contexto

Planeje em torno de dependências e de comportamentos verificáveis de forma independente. Contagens fixas de sprints e de arquivos, assim como estimativas de turnos, não determinam a profundidade da revisão nem a conclusão. Mantenha os testes e o tratamento de erros junto ao comportamento que eles verificam.

Diante de uma estagnação observada ou da perda de contexto útil, salve o trabalho concluído, os critérios restantes, os caminhos relevantes e as evidências de verificação antes de retomar ou de fazer um novo dispatch. Preserve o trabalho existente e evite duplicar uma tentativa em andamento. A proporção entre turnos e progresso, por si só, não exige um reset.

## Medição condicional e exploração

Uma baseline definida ou uma comparação de experimentos ativa a orientação de medição; ter apenas testes ou lint, não. Registre métricas comparáveis com unidades, método, revisão e evidências. As verificações obrigatórias de correção e de segurança permanecem independentes. O OMA não tem fórmula composta padrão, portão de nota por letra nem rollback acionado por pontuação.

Um experimento real registra sua hipótese, as evidências de baseline e do candidato, as verificações obrigatórias, a decisão e os arquivos sob sua responsabilidade. Falhas repetidas podem justificar testar outro mecanismo dentro do orçamento de recuperação existente. Isole as mudanças do experimento, preserve edições não relacionadas e verifique o candidato integrado antes de retomar o portão.
