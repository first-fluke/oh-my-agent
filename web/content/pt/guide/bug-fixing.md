---
title: "Caso de Uso: Correção de Bugs"
description: Loop estruturado de reproduzir-diagnosticar-corrigir-regredir com escalação baseada em severidade.
---

# Caso de Uso: Correção de Bugs

## Formato de entrada

Comece com um relatório reproduzível:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Triagem de severidade

Classifique cedo para escolher a velocidade de resposta:

- `P0`: perda de dados, bypass de autenticação, indisponibilidade em produção
- `P1`: fluxo principal do usuário quebrado
- `P2`: comportamento degradado com solução alternativa
- `P3`: menor/não-bloqueante

`P0/P1` devem sempre envolver revisão de QA/segurança.

## Loop de execução

1. Reproduza exatamente em um ambiente mínimo.
2. Isole a causa raiz (não apenas correção de sintoma).
3. Implemente a menor correção segura.
4. Adicione testes de regressão para o caminho com falha.
5. Verifique novamente caminhos adjacentes que provavelmente compartilham o mesmo modo de falha.

## Template de prompt para oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Sinais comuns de escalação

Escale para QA ou segurança quando o bug envolver:

- autenticação/sessão/renovação de token
- limites de permissão
- consistência de pagamentos/transações
- regressões de performance sob carga

## Validação pós-correção

- a reprodução original não falha mais
- nenhum erro novo em fluxos relacionados
- os testes falham antes da correção e passam depois da correção
- o caminho de rollback está claro caso seja necessário um hotfix

## Critérios de conclusão

A correção de bugs está concluída quando:

- a causa raiz é identificada e documentada
- a correção é verificada por meio de verificações reproduzíveis
- a cobertura de regressão está implementada
