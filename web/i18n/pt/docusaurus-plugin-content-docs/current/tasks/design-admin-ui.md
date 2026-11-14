---
title: Projetar uma UI de admin em torno das tarefas reais
description: Defina a hierarquia, a densidade da tabela, os estados e o handoff de design de uma tela de admin, mantendo a stack e o contrato visual do projeto.
---

# Projetar uma UI de admin em torno das tarefas reais

Use `oma-design` para decidir como uma tela de admin deve apoiar seus usuários antes de alterar o código da aplicação.

## Carregar a skill

Peça ao seu agente de código para executar este comando e ler as instruções retornadas e o diretório de apoio:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Fornecer a entrada

- Uma tela em execução, capturas de tela ou os componentes relevantes.
- Quem usa a tela e as ações que precisa concluir.
- O `DESIGN.md` existente, tokens, componentes, idiomas e requisitos de responsividade e acessibilidade.

## Dar a tarefa

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Verificar o resultado

Espere decisões de hierarquia e densidade específicas da tela, o comportamento dos estados, o mapeamento de tokens semânticos e um handoff de implementação. Mudanças aceitas no sistema ficam no `DESIGN.md` canônico do projeto.

Confira a proposta contra a tarefa de triagem: a pessoa consegue identificar o próximo ticket, mudar os filtros, abrir os detalhes e se recuperar de erros? Inspecione o foco do teclado, o texto legível em coreano e inglês e o comportamento em tela estreita quando houver um espécime renderizado. Um handoff apenas em documento deixa a execução no navegador e a acessibilidade sem verificação.

## Dependências e próximo passo

Para uma direção nova de interface de admin ou de produto, o [contrato de roteamento](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) seleciona Interface Design. Crítica, auditoria e polimento de uma UI existente selecionam Impeccable; as demais direções de arte web usam Taste. Um único fornecedor é carregado para a operação atual.

Essas instruções externas podem precisar dos próprios downloads ou ferramentas de runtime. A stack existente, a marca, a cobertura CJK, a meta WCAG e os requisitos de movimento reduzido continuam sendo restrições. Carregar as instruções não renderiza nem verifica a UI.

Use o especialista de frontend do projeto para a implementação. Para hooks e workflows de projeto, [escolha uma configuração de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que inclua `oma-design`.
