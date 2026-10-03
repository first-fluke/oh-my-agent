---
title: "Guia: Monitoramento do dashboard"
sidebar_label: Monitoramento do dashboard
description: "Monitore sessões do OMA pelo terminal ou por um dashboard web em loopback, escolha o diretório de estado e resolva problemas comuns de conexão e descoberta."
---

# Guia: Monitoramento do dashboard

## Dois comandos de dashboard

oh-my-agent oferece dois dashboards em tempo real para monitorar a atividade dos agentes durante workflows multiagente.

| Comando | Interface | URL | Tecnologia |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (renderiza no seu terminal) | chokidar file watcher, picocolors rendering |
| `oma dashboard web` | Navegador | `http://127.0.0.1:9847` (token impresso na inicialização) | HTTP server, WebSocket, chokidar file watcher |

Por padrão, os dois dashboards observam `.agents/state/memories/`. Defina `MEMORIES_DIR` quando os arquivos de coordenação estiverem em outro lugar. O dashboard não recorre automaticamente a `.serena/memories/`.

### Dashboard no terminal

```bash
oma dashboard terminal
```

Renderiza uma interface com caracteres de moldura diretamente no terminal. As atualizações são automáticas quando os arquivos de memória mudam. Pressione `Ctrl+C` para sair.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Símbolos de status:**
- `●` (verde): em execução
- `✓` (ciano): concluído
- `✗` (vermelho): falhou
- `○` (amarelo): bloqueado
- `◌` (esmaecido): pendente

### Dashboard web

```bash
oma dashboard web
```

Inicia um servidor web limitado ao loopback na porta 9847 (configurável por `DASHBOARD_PORT`). O OMA imprime uma URL que contém `127.0.0.1`; abra a URL exata e guarde o token. A página usa o token para `/api/state`, `/api/recap` e as atualizações do WebSocket. Requisições sem esse token retornam `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

O dashboard web exibe as mesmas informações do dashboard de terminal, em uma interface estilizada com tema escuro e:
- selo do estado da conexão (Connected / Disconnected / Connecting com reconexão automática);
- barra com o ID e o estado da sessão;
- tabela de status dos agentes com pontos de estado animados;
- feed da atividade mais recente;
- carimbos de data e hora atualizados automaticamente.

---

## Layout recomendado de 3 terminais

Para workflows multiagente, a configuração recomendada usa três painéis de terminal:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** executa a sessão principal do seu agente (Gemini CLI, Claude Code, Codex etc.), na qual você interage com workflows como `/orchestrate` ou `/work`.

**Terminal 2** executa o dashboard para monitoramento passivo. Ele se atualiza automaticamente, sem exigir interação.

**Terminal 3** serve para comandos ad hoc: conferir o status dos agentes, executar verificações, consultar estatísticas ou investigar problemas.

---

## Fontes de dados em .agents/state/memories/

Os dashboards leem o diretório `.agents/state/memories/`. Durante a execução, agentes e workflows que escrevem arquivos de coordenação populam esse diretório. Use `MEMORIES_DIR` para um projeto cujo estado esteja armazenado em outro local.

### Tipos de arquivo e seu conteúdo

| Padrão de arquivo | Criado por | Conteúdo |
|:------------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | ID da sessão, hora de início, status (RUNNING/COMPLETED/FAILED), versão do workflow |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Metadados da sessão, progresso das fases, resumo da solicitação do usuário |
| `task-board.md` | Workflows de orquestração | Tabela Markdown com atribuições dos agentes, status e tarefas |
| `progress-{agent}.md` | Cada agente iniciado | Número do turno atual, trabalho em andamento e resultados intermediários |
| `result-{agent}.md` | Cada agente concluído | Status final (COMPLETED/FAILED), arquivos alterados, problemas encontrados e entregáveis |
| `debug-{id}.md` | Workflow `/debug` | Diagnóstico do bug, causa raiz, correção aplicada e localização do teste de regressão |
| `experiment-ledger-{sessionId}.md` | Experimentos reais | Evidências comparáveis de baseline/candidato, verificações exigidas e decisões |
| `lessons-{sessionId}.md` | Quando uma causa reutilizável é sustentada por evidências | Lições com escopo de sessão; sem geração acionada por pontuação |

### Como o dashboard os lê

O dashboard usa várias estratégias para extrair informações:

1. **Detecção da sessão:** procura primeiro `orchestrator-session.md` e, na falta dele, usa o arquivo `session-*.md` modificado mais recentemente. Analisa o status a partir das palavras-chave `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED` e `ERROR`.
2. **Análise do quadro de tarefas:** lê `task-board.md` como uma tabela Markdown. Extrai das colunas o nome do agente, o status e a descrição da tarefa.
3. **Descoberta de agentes:** se não houver quadro de tarefas, procura em todos os arquivos `.md` os padrões `**Agent**: {name}`, linhas `Agent: {name}` ou nomes de arquivo que contenham `_agent` ou `-agent`.
4. **Contagem de turnos:** para cada agente descoberto, lê os arquivos `progress-{agent}.md` e extrai o número do turno dos padrões `turn: N`.
5. **Feed de atividade:** lista os 5 arquivos `.md` modificados mais recentemente e extrai a última linha significativa (cabeçalhos, linhas de status e itens de ação) como mensagem da atividade. O dashboard web também disponibiliza a visualização de recap em `/recap`.

---

## O que cada dashboard exibe

### Status da sessão

A seção superior exibe:
- **ID da sessão:** extraído dos arquivos de sessão (formato `session-YYYYMMDD-HHMMSS`).
- **Status:** indicado por cores: verde para RUNNING, ciano para COMPLETED, vermelho para FAILED e amarelo para UNKNOWN.

### Quadro de tarefas

A tabela de agentes mostra todos os agentes detectados, com:
- **Nome do agente:** identificador do domínio (backend, frontend, mobile, qa, debug, pm).
- **Status:** estado atual com indicador visual (running/completed/failed/blocked/pending).
- **Turno:** número do turno atual do agente (quantas iterações ele concluiu), extraído dos arquivos de progresso.
- **Tarefa:** descrição breve do trabalho em andamento, truncada para caber na tabela.

### Progresso do agente

O progresso é acompanhado por arquivos `progress-{agent}.md`. Cada arquivo é atualizado pelo agente enquanto ele trabalha. O dashboard consulta esses arquivos para obter:
- o número do turno (que aumenta à medida que o agente avança);
- a ação atual (o que o agente está fazendo naquele momento);
- resultados intermediários (conclusões parciais).

### Resultados

Ao concluir, um agente escreve `result-{agent}.md` contendo:
- status final (COMPLETED ou FAILED);
- lista de arquivos alterados;
- problemas encontrados;
- entregáveis produzidos.

A presença desse arquivo permite ao dashboard detectar a conclusão e atualizar o status do agente.

---

## Runbook de solução de problemas

### Sinal 1: o agente aparece como "running", mas o turno não avança

**Sintoma:** o dashboard mostra um agente como running, mas o número do turno não muda por vários minutos.

**Possíveis causas:**
- o agente está preso em uma operação demorada (varredura de uma base de código grande ou chamada de API lenta);
- o agente falhou, mas o arquivo PID ainda existe;
- o agente está esperando a entrada do usuário (isso não deveria ocorrer no modo auto-approve).

**Ações:**
1. Confira o arquivo de log do agente: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Confira se o processo está realmente em execução: `oma agent status {session-id} {agent-id}`
3. Se o processo não estiver em execução, mas o status mostrar "running", o agente falhou. Faça o spawn novamente com o contexto do erro.

### Sinal 2: o agente aparece como "crashed"

**Sintoma:** `oma agent status` retorna `crashed` para um agente.

**Possíveis causas:**
- o processo do vendor CLI terminou inesperadamente (falta de memória, cota da API excedida ou timeout de rede);
- o diretório do workspace foi removido ou as permissões foram alteradas;
- a CLI do vendor não está instalada ou autenticada.

**Ações:**
1. Confira o arquivo de log para obter os detalhes do erro: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Verifique a instalação da CLI: `oma doctor`
3. Verifique a autenticação: `oma auth status`
4. Faça o spawn do agente novamente com a mesma tarefa: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Sinal 3: o dashboard mostra "no agents detected yet"

**Sintoma:** o dashboard está em execução, mas não mostra agentes.

**Possíveis causas:**
- o workflow ainda não chegou à etapa de spawn dos agentes;
- o diretório `.agents/state/memories/` está vazio;
- o dashboard está observando o diretório errado.

**Ações:**
1. Verifique o diretório de memórias: `ls -la .agents/state/memories/`
2. Confira se o workflow ainda está na fase de planejamento (os agentes podem ainda não ter sido iniciados).
3. Garanta que o dashboard observa o projeto correto: ele resolve o caminho de memórias a partir do diretório de trabalho atual.
4. Se estiver usando um caminho personalizado: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Sinal 4: o dashboard web mostra "disconnected"

**Sintoma:** o selo de conexão do dashboard web mostra "Disconnected" em vermelho.

**Possíveis causas:**
- o processo `oma dashboard web` foi encerrado;
- o navegador está usando uma URL antiga ou sem o token de inicialização;
- a porta está sendo usada por outro processo.

**Ações:**
1. Verifique se o processo do dashboard está em execução: `ps aux | grep dashboard`
2. Reabra a URL exata com token impressa pelo processo; não remova o token.
3. Tente outra porta: `DASHBOARD_PORT=8080 oma dashboard web`
4. Verifique se a porta está disponível: `lsof -i :9847`
5. O dashboard web reconecta automaticamente com backoff exponencial (começando em 1s, no máximo 10s). Aguarde alguns segundos pela reconexão.

---

## Checklist de monitoramento pré-merge

Antes de considerar uma sessão multiagente concluída, confirme no dashboard:

- [ ] **Todos os agentes mostram "completed":** nenhum agente preso no estado "running" ou "blocked".
- [ ] **Nenhum agente mostra "failed":** se algum falhou, confira os logs e faça o spawn novamente.
- [ ] **O agente de QA concluiu a revisão:** procure `result-qa-agent.md` ou `result-qa.md`.
- [ ] **Zero achados CRITICAL/HIGH:** confira no arquivo de resultado do QA as contagens por severidade.
- [ ] **O status da sessão é COMPLETED:** o arquivo da sessão deve exibir o status final.
- [ ] **O feed de atividade exibe o relatório final:** a atividade mais recente deve ser o relatório de resumo.

---

## Critérios de conclusão

O monitoramento pelo dashboard termina quando:
1. todos os agentes iniciados chegam a um estado terminal (concluído ou falhou e foi tratado);
2. o ciclo de revisão de QA termina sem problemas bloqueadores;
3. o status da sessão reflete o resultado final;
4. os resultados ficam registrados na memória para referência futura.

---

## Detalhes técnicos

### Dashboard de terminal (oma dashboard terminal)

- **Observação de arquivos:** usa [chokidar](https://github.com/paulmillr/chokidar) com `awaitWriteFinish` (limiar de estabilidade de 200 ms, intervalo de polling de 50 ms) para evitar a renderização de escritas parciais.
- **Renderização:** limpa e redesenha o terminal inteiro a cada evento de alteração de arquivo. Usa `picocolors` para saída de cores ANSI e caracteres Unicode de moldura para a borda.
- **Diretório de memórias:** resolvido a partir de `MEMORIES_DIR`, depois do argumento da CLI do dashboard quando fornecido, e por fim de `{cwd}/.agents/state/memories`.
- **Encerramento gracioso:** captura `SIGINT` e `SIGTERM`, fecha o watcher chokidar e termina de forma limpa.

### Dashboard web (oma dashboard web)

- **Servidor HTTP:** o `createServer` do Node.js serve a página HTML em `/`, a página de recap em `/recap`, o estado JSON em `/api/state` e os dados de recap em `/api/recap`. O servidor se vincula a `127.0.0.1`.
- **WebSocket:** usa a biblioteca `ws`. Uma conexão de origem loopback deve incluir o token do processo na query string. Ao conectar, o cliente recebe imediatamente o estado completo. As atualizações seguintes são enviadas como mensagens `{ type: "update", event, file, data }`.
- **Observação de arquivos:** usa a mesma configuração do chokidar do dashboard de terminal. Alterações nos arquivos acionam uma função `broadcast()` que cria o estado atual e o envia a todos os clientes WebSocket conectados.
- **Debouncing:** as atualizações usam debounce de 100 ms para evitar inundar os clientes durante escritas rápidas de arquivos (por exemplo, quando vários agentes escrevem progresso ao mesmo tempo).
- **Reconexão automática:** o cliente do navegador reconecta com backoff exponencial (intervalo inicial de 1 s, multiplicador de 1,5x, máximo de 10 s) quando a conexão WebSocket cai.
- **Porta:** padrão 9847, configurável pela variável de ambiente `DASHBOARD_PORT`. As requisições à API aceitam `X-OMA-Dashboard-Token` ou `?token=...`; tokens ausentes ou inválidos retornam `401`.
- **Construção do estado:** a função `buildFullState()` agrega informações da sessão, quadro de tarefas, status dos agentes, contagens de turnos e feed de atividade em um único objeto JSON a cada atualização.
