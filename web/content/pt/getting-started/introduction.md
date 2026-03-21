---
title: Introdução
description: O que é o oh-my-agent e como funciona a colaboração multi-agente.
---

# Introdução

oh-my-agent é um orquestrador multi-agente para o Antigravity IDE. Ele roteia solicitações para skills especializadas e coordena agentes por meio das memórias do Serena.

## O Que Você Obtém

- Roteamento de skills baseado na solicitação
- Execução baseada em workflows para planejamento/revisão/depuração
- Orquestração CLI para execuções paralelas de agentes
- Dashboards em tempo real para monitoramento de sessões

## Papéis dos Agentes

| Agente | Responsabilidade |
|---|---|
| oma-coordination | Coordena projetos complexos de múltiplos domínios |
| oma-pm | Planejamento e decomposição de arquitetura |
| oma-frontend | Implementação React/Next.js |
| oma-backend | Implementação de API/banco de dados/autenticação |
| oma-mobile | Implementação Flutter/mobile |
| oma-brainstorm | Ideação design-first e exploração de conceitos |
| oma-db | Modelagem de banco de dados, design de esquemas e ajuste de consultas |
| oma-dev-workflow | Otimização de fluxo de trabalho de desenvolvimento e CI/CD |
| oma-tf-infra | Provisionamento de infraestrutura como código com Terraform |
| oma-translator | Tradução multilíngue consciente do contexto |
| oma-qa | Revisão de segurança/performance/acessibilidade |
| oma-debug | Análise de causa raiz e correções seguras contra regressão |
| oma-orchestrator | Orquestração de sub-agentes via CLI |
| oma-commit | Workflow de commit convencional |

## Estrutura do Projeto

- `.agents/skills/`: definições de skills e recursos
- `.agents/workflows/`: comandos de workflow explícitos
- `.serena/memories/`: estado de orquestração em tempo de execução
- `cli/cli.ts`: fonte da verdade para interfaces de comando

## Divulgação Progressiva

1. Identificar a intenção da solicitação
2. Carregar apenas os recursos necessários da skill
3. Executar com agentes especializados
4. Verificar e iterar por meio de loops de QA/depuração
