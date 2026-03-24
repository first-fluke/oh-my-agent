---
title: "Guia: Monitoramento com Dashboard"
description: "Guia abrangente de dashboard cobrindo dashboards de terminal e web, fontes de dados, layout de 3 terminais, solução de problemas e detalhes técnicos de implementação."
---

# Guia: Monitoramento com Dashboard

## Dois Comandos de Dashboard

oh-my-agent fornece dois dashboards em tempo real para monitorar atividade de agentes durante workflows multi-agente.

| Comando | Interface | URL | Tecnologia |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/A — renderiza no seu terminal | chokidar file watcher, picocolors rendering |
| `oma dashboard:web` | Browser | `http://localhost:9847` | HTTP server, WebSocket, chokidar file watcher |

Ambos os dashboards observam a mesma fonte de dados: diretório `.serena/memories/`.

### Dashboard no Terminal

```bash
oma dashboard
```

Renderiza uma UI com box-drawing diretamente no terminal. Atualiza automaticamente quando arquivos de memória mudam. Pressione `Ctrl+C` para sair.

```
╔════════════════════════════════════════════════════════╗
║  Serena Memory Dashboard                              ║
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
- `●` (verde) — executando
- `✓` (cyan) — completado
- `✗` (vermelho) — falhou
- `○` (amarelo) — bloqueado
- `◌` (dim) — pendente

### Dashboard Web

```bash
oma dashboard:web
```

Abre um servidor web na porta 9847 (configurável via variável de ambiente `DASHBOARD_PORT`). A UI do browser conecta via WebSocket e recebe atualizações ao vivo.

```bash
# Porta customizada
DASHBOARD_PORT=8080 oma dashboard:web

# Diretório de memories customizado
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

O dashboard web mostra a mesma informação que o dashboard de terminal mas com UI estilizada em tema escuro apresentando:
- Badge de status de conexão (Connected / Disconnected / Connecting com auto-reconnect)
- ID de sessão e barra de status
- Tabela de status de agentes com dots de status animados
- Feed de atividade mais recente
- Timestamps com atualização automática

---

## Layout Recomendado de 3 Terminais

Para workflows multi-agente, o setup recomendado usa três painéis de terminal:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Agente Principal │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Comandos ad-hoc                                   │
│                                                                 │
│   $ oma agent:status session-20260324-143052 backend frontend   │
│   $ oma stats                                                   │
│   $ oma verify backend -w ./api                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** executa sua sessão primária de agente (Gemini CLI, Claude Code, Codex, etc.) onde você interage com workflows como `/orchestrate` ou `/coordinate`.

**Terminal 2** executa o dashboard para monitoramento passivo. Atualiza automaticamente — sem interação necessária.

**Terminal 3** é para comandos ad-hoc: verificar status de agentes, executar verificações, visualizar stats ou debugar problemas.

---

## Fontes de Dados em .serena/memories/

Os dashboards leem do diretório `.serena/memories/`. Este diretório é populado por agentes e workflows usando ferramentas de memória MCP durante execução.

### Tipos de Arquivo e Seus Conteúdos

| Padrão de Arquivo | Criado Por | Conteúdos |
|:-----------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | ID da sessão, hora de início, status (RUNNING/COMPLETED/FAILED), versão do workflow |
| `session-{workflow}.md` | `/coordinate`, `/ultrawork` | Metadados de sessão, progresso de fases, resumo da requisição do usuário |
| `task-board.md` | Workflows de orquestração | Tabela markdown com atribuições de agentes, status e tarefas |
| `progress-{agent}.md` | Cada agente spawnado | Número do turno atual, no que o agente está trabalhando, resultados intermediários |
| `result-{agent}.md` | Cada agente completado | Status final (COMPLETED/FAILED), arquivos alterados, problemas encontrados, entregáveis |
| `debug-{id}.md` | Workflow `/debug` | Diagnóstico do bug, causa raiz, correção aplicada, localização do teste de regressão |
| `experiment-ledger.md` | Sistema Quality Score | Rastreamento de experimentos: scores baseline, deltas, decisões keep/discard |
| `lessons-learned.md` | Auto-gerado no fim da sessão | Lições de experimentos descartados (delta <= -5) |

### Como o Dashboard os Lê

O dashboard usa múltiplas estratégias para extrair informação:

1. **Detecção de sessão** — Procura `orchestrator-session.md` primeiro, depois recorre ao arquivo `session-*.md` mais recentemente modificado.
2. **Parsing do task board** — Lê `task-board.md` como tabela Markdown. Extrai nome do agente, status e descrição da tarefa das colunas.
3. **Descoberta de agentes** — Se não existe task board, descobre agentes escaneando todos os arquivos `.md` por padrões `**Agent**: {name}`.
4. **Contagem de turnos** — Para cada agente descoberto, lê arquivos `progress-{agent}.md` e extrai número do turno de padrões `turn: N`.
5. **Feed de atividade** — Lista os 5 arquivos `.md` mais recentemente modificados, extrai a última linha significativa como mensagem de atividade.

---

## O Que Cada Dashboard Mostra

### Status da Sessão

A seção superior exibe:
- **ID da sessão** — Extraído de arquivos de sessão (formato: `session-YYYYMMDD-HHMMSS`).
- **Status** — Codificado por cor: verde para RUNNING, cyan para COMPLETED, vermelho para FAILED, amarelo para UNKNOWN.

### Task Board

A tabela de agentes mostra cada agente detectado com:
- **Nome do agente** — O identificador de domínio (backend, frontend, mobile, qa, debug, pm).
- **Status** — Estado atual com indicador visual (running/completed/failed/blocked/pending).
- **Turno** — Número do turno atual do agente (quantas iterações completou).
- **Tarefa** — Descrição breve do que o agente está trabalhando (truncada para caber).

### Progresso dos Agentes

Progresso é rastreado através de arquivos `progress-{agent}.md`. Cada arquivo é atualizado pelo agente conforme trabalha.

### Resultados

Quando um agente completa, escreve `result-{agent}.md` com:
- Status final (COMPLETED ou FAILED).
- Lista de arquivos alterados.
- Problemas encontrados.
- Entregáveis produzidos.

---

## Runbook de Solução de Problemas

### Sinal 1: Agente Mostra "running" mas Sem Progresso de Turno

**Sintoma:** O dashboard mostra um agente como running, mas o número do turno não mudou por vários minutos.

**Possíveis causas:**
- O agente está preso em uma operação longa (varredura de codebase grande, chamada de API lenta).
- O agente crashou mas o arquivo PID ainda existe.
- O agente está esperando entrada do usuário (não deveria acontecer em modo auto-approve).

**Ações:**
1. Verificar arquivo de log do agente: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Verificar se o processo está realmente executando: `oma agent:status {session-id} {agent-id}`
3. Se o processo não está executando mas status mostra "running", o agente crashou. Re-spawne com contexto do erro.

### Sinal 2: Agente Mostra "crashed"

**Sintoma:** `oma agent:status` retorna `crashed` para um agente.

**Ações:**
1. Verificar arquivo de log para detalhes do erro.
2. Verificar instalação do CLI: `oma doctor`
3. Verificar autenticação: `oma auth:status`
4. Re-spawnar o agente com a mesma tarefa.

### Sinal 3: Dashboard Mostra "No agents detected yet"

**Sintoma:** O dashboard está executando mas não mostra agentes.

**Ações:**
1. Verificar diretório de memories: `ls -la .serena/memories/`
2. Verificar se o workflow ainda está na fase de planejamento (agentes ainda não foram spawnados).
3. Garantir que o dashboard está observando o diretório de projeto correto.

### Sinal 4: Dashboard Web Mostra "Disconnected"

**Ações:**
1. Verificar se o processo do dashboard está executando.
2. Tentar porta diferente: `DASHBOARD_PORT=8080 oma dashboard:web`
3. O dashboard web faz auto-reconnect com backoff exponencial (1s inicial, 1.5x multiplicador, 10s máximo).

---

## Checklist de Monitoramento Pré-Merge

Antes de considerar uma sessão multi-agente completa, verifique através do dashboard:

- [ ] **Todos os agentes mostram "completed"** — Nenhum agente preso em "running" ou "blocked".
- [ ] **Nenhum agente mostra "failed"** — Se algum falhou, verificar logs e re-spawnar.
- [ ] **Agente QA completou sua revisão** — Procurar `result-qa-agent.md` ou `result-qa.md`.
- [ ] **Zero achados CRITICAL/HIGH** — Verificar arquivo de resultado QA para contagens de severidade.
- [ ] **Status da sessão é COMPLETED** — O arquivo de sessão deve mostrar status final.
- [ ] **Feed de atividade mostra relatório final** — A última atividade deve ser o relatório resumo.

---

## Detalhes Técnicos

### Dashboard de Terminal (oma dashboard)

- **Observação de arquivos:** Usa [chokidar](https://github.com/paulmillr/chokidar) com `awaitWriteFinish` (limiar de estabilidade de 200ms, intervalo de poll de 50ms) para evitar renderizar escritas parciais de arquivo.
- **Renderização:** Limpa e redesenha o terminal inteiro em cada evento de mudança de arquivo. Usa `picocolors` para saída de cor ANSI e caracteres Unicode box-drawing para a borda.
- **Diretório de memória:** Resolvido de variável env `MEMORIES_DIR`, argumento CLI, ou `{cwd}/.serena/memories`.
- **Shutdown gracioso:** Captura `SIGINT` e `SIGTERM`, fecha o watcher chokidar e sai limpo.

### Dashboard Web (oma dashboard:web)

- **Servidor HTTP:** Node.js `createServer` serve a página HTML em `/` e o estado JSON em `/api/state`.
- **WebSocket:** Usa a biblioteca `ws`. Um `WebSocketServer` é anexado ao servidor HTTP. Na conexão, o cliente recebe o estado completo imediatamente. Atualizações subsequentes são enviadas como mensagens `{ type: "update", event, file, data }`.
- **Observação de arquivos:** Mesmo setup chokidar do dashboard de terminal.
- **Debouncing:** Atualizações são debounced a 100ms para evitar inundar clientes durante escritas rápidas de arquivo.
- **Auto-reconnect:** O cliente do browser reconecta com backoff exponencial (1s inicial, multiplicador 1.5x, 10s máximo) quando a conexão WebSocket cai.
- **Porta:** Padrão 9847, configurável via variável de ambiente `DASHBOARD_PORT`.
