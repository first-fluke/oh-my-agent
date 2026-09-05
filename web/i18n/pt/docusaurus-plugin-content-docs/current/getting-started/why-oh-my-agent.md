---
title: Por que oh-my-agent
description: Posicionamento do oh-my-agent numa categoria saturada de multi-agent CLI. O custo migrou da implementacao para teste e manutencao; oh-my-agent oferece quality gates, verificacao independente, multi-vendor dispatch e personalizacao repo-native para responder a essa migracao.
---

# Por que oh-my-agent

A categoria multi-agent CLI esta saturada. So no ultimo trimestre surgiram mais de vinte multi-agent orchestrators: Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy e outros. A maioria otimiza o mesmo eixo: fazer agentes escreverem codigo mais rapido.

oh-my-agent otimiza outro eixo. A hipotese de partida e que, com modelos suficientemente capazes, o custo de analise, design e implementacao no SDLC tende a zero. A parte cara do desenvolvimento de software sempre foi testar e manter: manter um sistema funcionando, seguro e compreensivel depois do primeiro commit. E sobre esse eixo que oh-my-agent foi desenhado.

Esta pagina concretiza esse posicionamento. Para a discussao longa que originou esse enquadramento, ver [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## O custo migrou

Quando um unico modelo capaz produz uma feature funcionando em minutos, o gargalo deixa de ser throughput de implementacao. O gargalo passa a ser verificar se o codigo produzido faz mesmo o que afirma, capturar regressoes silenciosas entre iteracoes, manter segredos fora de prompts e logs, e expor o gasto de tokens antes de surpreender o time.

Um harness que apenas spawna agentes mais rapido nao resolve nada disso. Um harness desenhado para a fase pos-implementacao, sim.

---

## O que oh-my-agent entrega no centro de custo real

Cada capacidade abaixo responde a um modo de falha especifico reportado na categoria multi-agent CLI.

### Verificacao independente, nao autoavaliacao por LLM

`oma verify <agent>` executa quatorze checagens deterministicas por tipo de agente. Sao checagens mecanicas: exit code do comando de testes, TypeScript strict passa, deteccao de padroes raw SQL, varredura de segredos hardcoded, Flutter analyze, varredura de inline styles, violacao de scope contra o charter do agente. Nenhum LLM julga se o trabalho "parece correto". Uma checagem passa se e somente se o comando subjacente reportar sucesso.

Isso responde a queixa mais comum da categoria, resumida num post comunitario como "agents lie - they say tests pass when tests do not". Ver `cli/commands/verify/verify.ts` para a lista de checagens.

### Re-verificacao entre iteracoes

O workflow `ralph` envolve `ultrawork` com uma fase JUDGE independente. Apos cada iteracao, JUDGE re-verifica cada criterion, inclusive os que ja passaram em iteracoes anteriores. Isso captura o caso em que consertar C2 silenciosamente quebra C1, que e o mecanismo real por tras da maioria das regressoes em sessoes longas de agentes.

Verificacoes pesadas (mais de trinta segundos) sao cacheadas contra os caminhos de arquivo afetados, mantendo o custo de re-verificacao baixo. Ver `.agents/workflows/ralph/resources/judge-protocol.md` para o protocolo completo.

### Quota caps que bloqueiam antes do dano

Cada chamada de `oma agent spawn` registra a estimativa de tokens daquele spawn em `.serena/memories/session-cost-{sessionId}.md`. Antes do proximo spawn, `checkCap` consulta o quota cap configurado e recusa o lancamento se qualquer dimensao for excedida. Tres dimensoes sao impostas: total de tokens, total de spawns, orcamento de tokens por vendor.

Essa e a diferenca entre descobrir depois que gastou quarenta mil dolares e ser avisado no spawn quinze de que sobra um spawn no orcamento. Ver `cli/io/session-cost.ts` e configurar sob `session.quota_cap` em `.agents/oma-config.yaml`.

### Retry e depois explorar, nao retry para sempre

Quando `orchestrate` Step 5 detecta falha de verificacao, repete o agente ate duas vezes com contexto do erro. Se a segunda tentativa ainda falhar e o cap de custo nao foi excedido, o workflow troca para o Exploration Loop: spawna em paralelo duas ou tres variantes alternativas de hipotese em workspaces separados e mantem apenas o resultado de maior pontuacao. As abordagens falhas sao descartadas com o custo registrado.

E uma resposta estruturada ao caso em que uma abordagem e fundamentalmente errada. Tentar de novo a mesma nunca converge; tentar abordagens diferentes em paralelo converge.

### Roteamento de workspace consciente de monorepo

`detectWorkspace` le configuracoes de pnpm, nx, turbo e lerna e roteia cada agente para seu sub-workspace correspondente automaticamente. O backend agent roda contra `apps/api/`, o frontend agent contra `apps/web/`, sem o orchestrator ter que compor caminhos manualmente. Ver `cli/io/workspaces.ts`.

---

## Multi-vendor nao e opcional

A segunda hipotese de design e que qualquer time fazendo desenvolvimento assistido por IA de verdade usa mais de um provider. Hoje isso significa Claude, Codex, Gemini, Copilot, Qwen, Kimi e o que vier no proximo trimestre. Trocar de vendor e fato, nao edge case: Anthropic moveu funcoes de agente para um plano pago separado, OpenAI lancou Codex CLI na mesma semana em que os modelos da Anthropic degradaram, GitHub Copilot passou a cobrar por consumo.

oh-my-agent trata a selecao de vendor como configuracao per-agent via `model_preset` e `agents.<id>.model` em `.agents/oma-config.yaml`. O diretorio portatil `.agents/` e a single source of truth; cada runtime suportado projeta a partir dele. Nao e necessario lock-in de vendor para usar oh-my-agent, nem migracao quando se troca de vendor.

---

## Personalizacao repo-native

A terceira hipotese e que nao existem dois times com a mesma definicao de "done". Um time exige scans OWASP Top 10 em cada mudanca de backend. Outro exige relatorio de QA em coreano. Um terceiro exige que toda migration seja revista por um database agent antes do merge.

Como `.agents/` sao apenas arquivos no seu repositorio, cada time pode adicionar ou modificar agentes, skills, workflows e quality gates para se ajustar ao proprio codigo de conduta e postura de compliance. Personalizar e um `git commit`, nao um ticket de suporte ao vendor.

---

## O que isso significa na pratica

Se sua prioridade e "spawnar agentes em paralelo rapido", varias ferramentas cobrem essa superficie. Se sua prioridade e "entregar codigo que continua funcionando depois que os agentes saem da sala", oh-my-agent foi feito para esse objetivo especifico. `oma verify`, JUDGE, Exploration Loop, quota cap e o roteamento de monorepo nao sao extras opcionais: sao a razao de o projeto existir.

Para detalhes de cada capacidade, ver a secao Core Concepts (Agents, Parallel Execution) na barra lateral.
