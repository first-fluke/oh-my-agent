---
title: Guia de Uso
description: Guia completo de uso incluindo exemplos, fluxos de trabalho, operações de dashboard e solução de problemas.
---

# Como Usar Habilidades Multi-Agente do Antigravity

## Início Rápido

1. **Abrir no Antigravity IDE**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Habilidades são detectadas automaticamente.** O Antigravity escaneia `.agents/skills/` e indexa todas as habilidades disponíveis.

3. **Converse no IDE.** Descreva o que você quer construir.

---

## Exemplos de Uso

### Exemplo 1: Tarefa Simples de Domínio Único

**Você digita:**
```
"Criar um componente de formulário de login com campos de email e senha usando Tailwind CSS"
```

**O que acontece:**
- Antigravity detecta que isso corresponde ao `oma-frontend`
- A habilidade carrega automaticamente (Divulgação Progressiva)
- Você recebe um componente React com TypeScript, Tailwind, validação de formulário

### Exemplo 2: Projeto Multi-Domínio Complexo

**Você digita:**
```
"Construir um app TODO com autenticação de usuário"
```

**O que acontece:**

1. **Workflow Guide ativa** — detecta complexidade multi-domínio
2. **PM Agent planeja** — cria divisão de tarefas com prioridades
3. **Você cria agentes via CLI**:
   ```bash
   oma agent:spawn backend "API de autenticação JWT" session-01 &
   oma agent:spawn frontend "UI de Login e TODO" session-01 &
   wait
   ```
4. **Agentes trabalham em paralelo** — salvam saídas na Base de Conhecimento
5. **Você coordena** — revisa `.agents/brain/` para consistência
6. **QA Agent revisa** — auditoria de segurança/performance
7. **Corrige e itera** — re-cria agentes com correções

### Exemplo 3: Correção de Bugs

**Você digita:**
```
"Há um bug — ao clicar em login aparece 'Cannot read property map of undefined'"
```

**O que acontece:**

1. **oma-debug ativa** — analisa o erro
2. **Causa raiz encontrada** — componente faz map sobre `todos` antes dos dados carregarem
3. **Correção fornecida** — estados de carregamento e verificações de null adicionados
4. **Teste de regressão escrito** — garante que o bug não retornará
5. **Padrões similares encontrados** — corrige proativamente 3 outros componentes

### Exemplo 4: Execução Paralela Baseada em CLI

```bash
# Agente único (workspace detectado automaticamente)
oma agent:spawn backend "Implementar API de autenticação JWT" session-01

# Agentes paralelos
oma agent:spawn backend "Implementar API de autenticação" session-01 &
oma agent:spawn frontend "Criar formulário de login" session-01 &
oma agent:spawn mobile "Construir telas de autenticação" session-01 &
wait
```

**Monitore em tempo real:**
```bash
# Terminal (janela de terminal separada)
bunx oh-my-agent dashboard

# Ou navegador
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Dashboards em Tempo Real

### Dashboard de Terminal

```bash
bunx oh-my-agent dashboard
```

Observa `.serena/memories/` usando `fswatch` (macOS) ou `inotifywait` (Linux). Exibe uma tabela ao vivo com status da sessão, estados dos agentes, turnos e atividade mais recente. Atualiza automaticamente quando arquivos de memória mudam.

**Requisitos:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Dashboard Web

```bash
npm install          # primeira vez apenas
bunx oh-my-agent dashboard:web
```

Abra `http://localhost:9847` no seu navegador. Recursos:

- **Atualizações em tempo real** via WebSocket (orientado a eventos, não polling)
- **Auto-reconexão** se a conexão cair
- **Interface temática Serena** com cores de destaque roxas
- **Status da sessão** — ID e estado em execução/concluído/falhou
- **Tabela de agentes** — nome, status (com pontos coloridos), contagem de turnos, descrição da tarefa
- **Log de atividades** — mudanças mais recentes de arquivos de progresso e resultado

O servidor observa `.serena/memories/` usando chokidar com debounce (100ms). Apenas arquivos alterados acionam leituras — sem re-escaneamento completo.

---

## Conceitos Chave

### Divulgação Progressiva
O Antigravity combina automaticamente solicitações com habilidades. Você nunca seleciona uma habilidade manualmente. Apenas a habilidade necessária carrega no contexto.

### Design de Habilidade Otimizado para Tokens
Cada habilidade usa uma arquitetura de duas camadas para máxima eficiência de tokens:
- **SKILL.md** (~40 linhas): Identidade, roteamento, regras principais — carregado imediatamente
- **resources/**: Protocolos de execução, exemplos, checklists, playbooks de erro — carregado sob demanda

Recursos compartilhados ficam em `_shared/` (não é uma habilidade) e são referenciados por todos os agentes:
- Protocolos de execução chain-of-thought com fluxo de trabalho de 4 etapas
- Exemplos few-shot de entrada/saída para orientação de modelos de nível médio
- Playbooks de recuperação de erros com escalonamento "3 tentativas"
- Templates de raciocínio para análise estruturada multi-etapa
- Gestão de orçamento de contexto para níveis de modelo Flash/Pro
- Verificação automatizada via `verify.sh`
- Acumulação de lições aprendidas entre sessões

### Criação de Agentes via CLI
Use `oma agent:spawn` para executar agentes via CLI. Respeita `agent_cli_mapping` em `user-preferences.yaml` para selecionar a CLI apropriada (gemini, claude, codex, qwen) por tipo de agente. Workspace é detectado automaticamente de convenções de monorepo comuns, ou pode ser definido explicitamente com `-w`.

### Base de Conhecimento
Saídas de agentes armazenadas em `.agents/brain/`. Contém planos, código, relatórios e notas de coordenação.

### Serena Memory
Estado de runtime estruturado em `.serena/memories/`. O orchestrator escreve informações de sessão, quadros de tarefas, progresso por agente e resultados. Dashboards observam esses arquivos para monitoramento.

### Workspaces
Agentes podem trabalhar em diretórios separados para evitar conflitos. Workspace é detectado automaticamente de convenções de monorepo comuns:
```
./apps/api   ou ./backend   → Workspace do Backend Agent
./apps/web   ou ./frontend  → Workspace do Frontend Agent
./apps/mobile ou ./mobile   → Workspace do Mobile Agent
```

---

## Habilidades Disponíveis

| Habilidade | Auto-ativa para | Saída |
|-------|-------------------|--------|
| oma-coordination | Projetos multi-domínio complexos | Coordenação de agentes passo a passo |
| oma-pm | "planejar isso", "dividir" | `.agents/plan.json` |
| oma-frontend | UI, componentes, estilo | Componentes React, testes |
| oma-backend | APIs, bancos de dados, autenticação | Endpoints de API, modelos, testes |
| oma-mobile | Apps mobile, iOS/Android | Telas Flutter, gestão de estado |
| oma-brainstorm | Ideação, exploração de conceitos | Documento de design |
| oma-db | Banco de dados, esquema, ERD, migração | Design de esquema, ajuste de consultas |
| oma-dev-workflow | CI/CD, git hooks, configuração monorepo | Configurações de fluxo, automação |
| oma-tf-infra | Terraform, infraestrutura cloud | Módulos IaC, gestão de estado |
| oma-translator | Tradução, conteúdo multilíngue | Texto traduzido preservando o tom |
| oma-qa | "revisar segurança", "auditoria" | Relatório QA com correções priorizadas |
| oma-debug | Relatórios de bug, mensagens de erro | Código corrigido, testes de regressão |
| oma-orchestrator | Execução de sub-agente CLI | Resultados em `.agents/results/` |
| oma-commit | "commit", "커밋해줘" | Commits Git (auto-divide por feature) |

---

## Comandos de Fluxo de Trabalho

Digite estes no chat do Antigravity IDE para acionar fluxos de trabalho passo a passo:

| Comando | Descrição |
|---------|-------------|
| `/brainstorm` | Ideação design-first e exploração de conceitos |
| `/coordinate` | Orquestração multi-agente via CLI com orientação passo a passo |
| `/deepinit` | Inicialização profunda do projeto com AGENTS.md hierárquico |
| `/exec-plan` | Execução e gerenciamento de plano existente |
| `/orchestrate` | Execução paralela de agentes automatizada via CLI |
| `/plan` | Decomposição de tarefas PM com contratos de API |
| `/review` | Pipeline QA completo (segurança, performance, acessibilidade, qualidade de código) |
| `/debug` | Correção estruturada de bugs (reproduzir → diagnosticar → corrigir → teste de regressão) |
| `/setup` | Configuração de CLI e ferramentas MCP |
| `/tools` | Gestão de ferramentas MCP |
| `/ultrawork` | Execução de máximo paralelismo com orquestração de agentes paralelos |

Estes são separados de **habilidades** (que auto-ativam). Fluxos de trabalho dão controle explícito sobre processos multi-etapa.

---

## Fluxos de Trabalho Típicos

### Fluxo A: Habilidade Única

```
Você: "Criar um componente de botão"
  → Antigravity carrega oma-frontend
  → Recebe componente imediatamente
```

### Fluxo B: Projeto Multi-Agente (Auto)

```
Você: "Construir um app TODO com autenticação"
  → oma-coordination ativa automaticamente
  → PM Agent cria plano
  → Você cria agentes via CLI (oma agent:spawn)
  → Agentes trabalham em paralelo
  → QA Agent revisa
  → Corrige problemas, itera
```

### Fluxo B-2: Projeto Multi-Agente (Explícito)

```
Você: /coordinate
  → Fluxo de trabalho guiado passo a passo
  → Planejamento PM → revisão de plano → criação de agentes → monitoramento → revisão QA
```

### Fluxo C: Correção de Bugs

```
Você: "Botão de login lança TypeError"
  → oma-debug ativa
  → Análise de causa raiz
  → Correção + teste de regressão
  → Padrões similares verificados
```

### Fluxo D: Orquestração CLI com Dashboard

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "tarefa" session-01 &
            oma agent:spawn frontend "tarefa" session-01 &
Navegador:  http://localhost:9847 → status em tempo real
```

---

## Dicas

1. **Seja específico** — "Construir um app TODO com autenticação JWT, frontend React, backend FastAPI" é melhor que "fazer um app"
2. **Use criação CLI** para projetos multi-domínio — não tente fazer tudo em um chat
3. **Revise a Base de Conhecimento** — verifique `.agents/brain/` para consistência de API
4. **Itere com re-criações** — refine instruções, não recomece
5. **Use dashboards** — `bunx oh-my-agent dashboard` ou `bunx oh-my-agent dashboard:web` para monitorar sessões do orchestrator
6. **Workspaces separados** — atribua a cada agente seu próprio diretório

---

## Solução de Problemas

| Problema | Solução |
|---------|----------|
| Habilidades não carregam | `antigravity open .`, verificar `.agents/skills/`, reiniciar IDE |
| CLI não encontrado | Verificar `which gemini` / `which claude`, instalar CLIs faltantes |
| Saídas de agentes incompatíveis | Revisar ambos na Base de Conhecimento, re-criar com correções |
| Dashboard: "No agents" | Arquivos de memória ainda não criados, executar orchestrator primeiro |
| Dashboard web não inicia | Executar `npm install` para instalar chokidar e ws |
| fswatch não encontrado | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| Relatório QA tem 50+ problemas | Focar em CRITICAL/HIGH primeiro, documentar resto para depois |

---

## Comandos CLI

```bash
bunx oh-my-agent                # Instalador interativo de habilidades
bunx oh-my-agent doctor         # Verificar configuração e reparar habilidades faltantes
bunx oh-my-agent doctor --json  # Saída JSON para CI/CD
bunx oh-my-agent update         # Atualizar habilidades para a versão mais recente
bunx oh-my-agent stats          # Ver métricas de produtividade
bunx oh-my-agent stats --reset  # Resetar métricas
bunx oh-my-agent retro          # Retrospectiva de sessão (aprendizados e próximos passos)
bunx oh-my-agent dashboard      # Dashboard em tempo real no terminal
bunx oh-my-agent dashboard:web  # Dashboard web (http://localhost:9847)
bunx oh-my-agent help           # Mostrar ajuda
```

---

## Para Desenvolvedores (Guia de Integração)

Se você deseja integrar essas habilidades em seu projeto Antigravity existente, veja [AGENT_GUIDE.md](../AGENT_GUIDE.md) para:
- Integração rápida em 3 passos
- Integração completa de dashboard
- Personalização de habilidades para sua tech stack
- Solução de problemas e melhores práticas

---

**Apenas converse no Antigravity IDE.** Para monitoramento, use os dashboards. Para execução CLI, use os scripts do orchestrator. Para integrar em seu projeto existente, veja [AGENT_GUIDE.md](../AGENT_GUIDE.md).
