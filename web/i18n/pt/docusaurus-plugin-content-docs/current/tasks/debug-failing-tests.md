---
title: Depurar um teste que falha
description: Reproduza uma falha de teste, isole a causa, faça uma correção delimitada e verifique a regressão com o test runner existente do projeto.
---

# Depurar um teste que falha

Use `oma-debug` quando você tiver um comando que falha, um stack trace ou um resultado incorreto repetível.

## Carregar a skill

Peça ao seu agente de código para executar este comando e ler as instruções e o diretório de apoio:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Fornecer a entrada

- O comando exato que falha e a saída relevante completa da falha.
- O comportamento esperado, o checkout/ref, a versão do runtime e os serviços locais necessários.
- Os arquivos ou a mudança recente que você suspeita, além do escopo de edição permitido.

## Dar a tarefa

Este exemplo concreto usa as fixtures de regressão de bootstrap de plugin deste repositório. Use o seu próprio comando que falha em outro projeto.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Verificar o resultado

Espere a falha reproduzida, o caminho causal, o patch delimitado e um teste de regressão ligado a essa falha. O relatório deve separar um ambiente indisponível de um defeito de código diagnosticado.

Confira se a regressão falha no comportamento original e passa com a correção. Execute de novo o comando indicado no mesmo ambiente e depois inspecione os resultados dos testes relacionados. Se a reprodução continuar bloqueada, espere o bloqueio exato e a evidência mais fraca disponível.

## Dependências e próximo passo

O agente usa o test runner do seu projeto e as ferramentas de navegação de código configuradas. O exemplo exige o Bun e as dependências de desenvolvimento do repositório já existentes. Essas fixtures de plugin são ignoradas no Windows; use um teste que falha e que a sua plataforma suporte. Carregar a skill não instala dependências nem repara um serviço ausente.

Veja o [exemplo de reparo de hooks de plugin](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) para a mudança real de código e os limites das fixtures. Para execução gerenciada ou hooks de projeto, [escolha uma configuração de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que inclua `oma-debug`.
