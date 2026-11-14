---
title: Revisar código de IA antes do merge
description: Revise código escrito por IA em busca de bugs, verificações ausentes e regressões, usando um diff delimitado e achados reproduzíveis.
---

# Revisar código de IA antes do merge

Use `oma-qa` para revisar uma mudança contra o comportamento pretendido. Comece pelo diff e pelas verificações que o projeto já tem.

## Carregar a skill

Peça ao seu agente de código para executar este comando e depois ler as instruções retornadas e o diretório de apoio:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Fornecer a entrada

- A mudança ou uma ref local de comparação, como `origin/main`.
- O comportamento esperado, em especial permissões, mudanças de dados e tratamento de falhas.
- Os comandos existentes de lint e teste e quaisquer limites de ambiente.

## Dar a tarefa

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Verificar o resultado

Espere achados ordenados com uma reprodução ou evidência decisiva no código, uma correção sugerida e os comandos realmente executados. Se nenhum defeito for confirmado, o relatório ainda deve identificar o escopo inspecionado e as lacunas restantes.

Abra cada local citado e verifique se o gatilho chega até ele. Execute de novo a verificação estreita usada como evidência. Uma ferramenta ausente ou um caminho não testado é uma lacuna de verificação; um resumo de revisão sozinho não estabelece que a mudança pode ir para produção com segurança.

## Dependências e próximo passo

O agente precisa de acesso ao diff, ao código local e às ferramentas de verificação que o projeto já tem. Verificações de navegador, segurança e desempenho precisam do alvo e do ferramental correspondentes. Carregar a skill não provisiona essas dependências.

Para uma falha confirmada, continue com [depurar um teste que falha](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Se você quiser hooks de projeto ou workflows de equipe, [escolha uma configuração de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que inclua `oma-qa`.
