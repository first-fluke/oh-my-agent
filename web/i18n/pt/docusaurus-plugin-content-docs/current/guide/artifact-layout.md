---
title: Layout dos artefatos
sidebar_label: Layout dos artefatos
description: Onde o OMA guarda documentos mantidos, relatórios de execução e estado de runtime, e como migrar locais legados.
---

# Layout dos artefatos

O OMA usa três locais: `docs/` para documentos mantidos do projeto, `.agents/results/` para relatórios de execução legíveis por pessoas e `.agents/state/` para coordenação e evidência de execução. Os caminhos abaixo são relativos à raiz do projeto.

## Documentos mantidos

| Local | Conteúdo |
|----------|---------|
| `docs/decisions/` | Propostas de abordagem, trade-offs e registros de decisão de arquitetura (ADRs) |
| `docs/plans/work/` | Planos de trabalho, progresso, logs de decisão e o rastreador de dívida técnica |
| `docs/plans/contracts/` | Contratos de API adotados |
| `DESIGN.md` | Sistema de design de UI: tipografia, cor, espaçamento, movimento e componentes |

Use um campo `Status` nos documentos de decisão para registrar `draft`, `accepted` ou `superseded`. Mantenha uma decisão substituída e aponte para a substituta, para que o raciocínio continue disponível. Em OMA, `design` se refere ao design de UI; propostas técnicas e ADRs compartilham `docs/decisions/`.

Use um índice de documentos do projeto, como `docs/README.md`, para apontar para os documentos mantidos. A migração de artefatos move os arquivos existentes; ela não cria um índice nem muda o status de um documento.

## Relatórios de execução e estado de runtime

| Local | Conteúdo |
|----------|---------|
| `.agents/results/result-*.md` | Relatórios de resultado de agentes e workflows, legíveis por pessoas |
| `.agents/results/architecture/` | Análise e recomendações de arquitetura |
| `.agents/results/bugs/` | Relatórios de bugs |
| `.agents/results/refactor/` | Planos e relatórios de refatoração |
| `.agents/results/security/` | Relatórios de varredura de segurança |
| `.agents/results/market/` | Briefings de pesquisa de mercado |
| `.agents/results/recap/` | Recapitulações de trabalho |
| `.agents/results/explain/` | Explicações em HTML |
| `.agents/results/api-contracts/` | Rascunhos de contratos de API |
| `.agents/results/plan-{sessionId}.json` | Plano de tarefas atual |
| `.agents/state/memories/` | Resumos de sessão, quadros de tarefas, progresso, lições e registros de experimentos |
| `agent-runs/` de runtime | Recibos estruturados, claims e evidência de verificação |
| `agent-plans/` de runtime | Planos de execução congelados |

Os subdiretórios de relatório permanecem separados por domínio. Os relatórios legíveis por pessoas complementam a evidência estruturada; sozinhos, eles não estabelecem uma conclusão verificada. Consulte [Resultados e retomada](../agent-results-and-resume/).

Os recibos atuais e os planos congelados ficam no diretório de estado do projeto do perfil ativo. Projetos mais antigos podem mantê-los em `.agents/state/`. O armazenamento e as ligações de verificação não mudam com esta migração.

## Promover um documento mantido

Quando um artefato de execução passa a ser uma referência do projeto, mova-o para o local mantido correspondente. Por exemplo, mova um contrato adotado de `.agents/results/api-contracts/` para `docs/plans/contracts/`, ou transforme uma recomendação de arquitetura em um registro de decisão em `docs/decisions/`. Deixe um link no local antigo e atualize o índice de documentos.

Se a evidência estruturada de execução registra o arquivo original ou o hash dele, mantenha esse arquivo intacto e crie uma versão mantida. Aponte para o documento mantido a partir do índice do projeto.

Install, update e link ignoram `.agents/results/`, `.agents/state/` e `docs/plans/` no Git por padrão. `docs/decisions/` fica fora desse ignore padrão. Revise o `.gitignore` do projeto ao adotar um contrato ou um plano de trabalho que a equipe deva versionar.

## Migrar um projeto existente

Faça um preview da migração primeiro:

```bash
oma docs migrate --dry-run
```

Para saída estruturada, acrescente `--json`. Aplique a mesma migração explicitamente quando estiver pronto:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` e `oma update` também executam esta migração. Ela consolida estes locais legados:

<!-- oma-docs:ignore-start -->
| Local legado | Destino |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` e os sidecars de diagrama de autoria | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Os documentos de decisão mantêm a estrutura de subdiretórios. ADRs de arquitetura legados se movem com os sidecars `.archify.json` e `.archify.html` de autoria. Revisões, recomendações e logs de validação específicos de uma execução permanecem no diretório de resultados. A migração de resultados cobre os arquivos `result-*.md` de nível superior nos dois diretórios de memória; os outros arquivos de memória ficam no lugar.

A migração preserva os arquivos de destino existentes. Se um arquivo diferente tiver o mesmo nome, ela acrescenta um sufixo da origem, como `001-cache--from-plan-designs.md`, e reporta o caminho escolhido. Se esse nome estiver ocupado, ela acrescenta um hash estável do conteúdo. Executar a migração de novo não cria cópias duplicadas nem renomeia arquivos que já migraram.

Ela atualiza links Markdown e referências de caminho suportados nos documentos movidos, nas notas de coordenação em Markdown, em `docs/**/*.md` e nos arquivos `README*.md` e `AGENTS.md` da raiz. Revise essas mudanças com o relatório da migração e o diff do Git. A evidência estruturada de runtime e os arquivos `DESIGN.md` de UI ficam de fora da reescrita de referências. Os blocos existentes `oma-docs:ignore-start` / `oma-docs:ignore-end` preservam exemplos de caminhos legados.

Revise o relatório em busca de arquivos adiados. Um relatório de resultado referenciado por evidência estruturada de execução permanece no caminho original, para que o recibo e o hash registrados continuem válidos. Recibos, claims, planos de execução congelados e outras evidências de runtime ficam no lugar. A migração não promove rascunhos de contrato, não aceita decisões e não altera o sistema de design de UI.
