---
title: "Guia: Correção de Bugs"
description: "Guia completo de debugging cobrindo o loop de debug estruturado em 5 etapas, triagem de severidade, sinais de escalação e validação pós-correção."
---

# Guia: Correção de Bugs

## Quando Usar o Workflow de Debug

Use `/debug` (ou diga "fix bug", "fix error", "debug" em linguagem natural) quando você tem um bug específico para diagnosticar e corrigir. O workflow fornece uma abordagem estruturada e reproduzível para debugging que evita a armadilha comum de corrigir sintomas em vez de causas raiz.

O workflow de debug suporta todos os vendors (Gemini, Claude, Codex, Qwen). Steps 1-5 executam inline. Step 6 (varredura de padrões similares) pode delegar a um subagente `debug-investigator` quando o escopo de varredura é amplo (10+ arquivos ou erros multi-domínio).

---

## Template de Relatório de Bug

Ao reportar um bug, forneça o máximo possível das informações a seguir. Cada campo ajuda o workflow de debug a restringir a busca mais rapidamente.

### Campos Obrigatórios

| Campo | Descrição | Exemplo |
|:------|:----------|:--------|
| **Mensagem de erro** | O texto exato do erro ou stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Passos para reproduzir** | Ações ordenadas que acionam o bug | 1. Logar como admin. 2. Navegar para /users. 3. Clicar "Delete" em qualquer usuário. |
| **Comportamento esperado** | O que deveria acontecer | Usuário é deletado e removido da lista. |
| **Comportamento atual** | O que realmente acontece | Página crasha com tela branca. |

### Campos Opcionais (Altamente Recomendados)

| Campo | Descrição | Exemplo |
|:------|:----------|:--------|
| **Ambiente** | Browser, OS, versão do Node, dispositivo | Chrome 124, macOS 15.3, Node 22.1 |
| **Frequência** | Sempre, às vezes, apenas primeira vez | Sempre reproduzível |
| **Mudanças recentes** | O que mudou antes do bug aparecer | Merge do PR #142 (feature de deleção de usuário) |
| **Código relacionado** | Arquivos ou funções que você suspeita | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Logs do servidor, saída do console | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Screenshots/gravações** | Evidência visual | Screenshot da tela de erro |

Quanto mais contexto você fornecer antecipadamente, menos perguntas de ida e volta o workflow de debug precisa.

---

## Triagem de Severidade (P0-P3)

A severidade determina como o bug é tratado e quão rapidamente deve ser corrigido.

### P0 — Crítico (Resposta Imediata)

**Definição:** Produção está fora do ar, dados estão sendo perdidos ou corrompidos, brecha de segurança está ativa.

**Expectativa de resposta:** Largue tudo. Esta é a única tarefa até ser resolvida.

**Exemplos:**
- Sistema de autenticação está sendo contornado — todos os usuários podem acessar endpoints de admin.
- Migração de banco de dados corrompeu a tabela de usuários — contas estão inacessíveis.
- Processamento de pagamento está cobrando clientes em dobro.
- Endpoint de API retorna dados pessoais de outros usuários.

**Abordagem de debug:** Pule o template completo. Forneça a mensagem de erro e qualquer stack trace. O workflow começa imediatamente no Step 2 (Reproduzir).

### P1 — Alto (Mesma Sessão)

**Definição:** Uma funcionalidade central está quebrada para um número significativo de usuários. Workaround pode existir mas não é aceitável a longo prazo.

**Expectativa de resposta:** Corrigir dentro da sessão de trabalho atual. Não iniciar novas funcionalidades até ser resolvido.

**Exemplos:**
- Busca não retorna resultados para queries contendo caracteres especiais.
- Upload de arquivo falha para arquivos maiores que 5MB (limite deveria ser 50MB).
- App mobile crasha ao iniciar em dispositivos Android 14.
- Emails de reset de senha não estão sendo enviados (integração com serviço de email quebrada).

**Abordagem de debug:** Loop completo de 5 etapas. Revisão QA recomendada após correção.

### P2 — Médio (Este Sprint)

**Definição:** Uma funcionalidade funciona mas com comportamento degradado. Afeta usabilidade mas não funcionalidade.

**Expectativa de resposta:** Agendar para o sprint atual. Corrigir antes do próximo release.

**Exemplos:**
- Ordenação de tabela é case-sensitive ("apple" ordena depois de "Zebra").
- Dark mode tem texto ilegível no painel de configurações.
- Tempo de resposta da API para endpoint /users é 8 segundos (deveria ser abaixo de 1s).
- Paginação mostra "Page 1 of 0" quando a lista está vazia.

**Abordagem de debug:** Loop completo de 5 etapas. Incluir na suite de regressão QA.

### P3 — Baixo (Backlog)

**Definição:** Problema cosmético, caso de borda ou inconveniência menor.

**Expectativa de resposta:** Adicionar ao backlog. Corrigir quando conveniente, ou agrupar com mudanças relacionadas.

**Exemplos:**
- Texto de tooltip tem um typo: "Delet" em vez de "Delete".
- Warning no console sobre método de lifecycle React deprecado.
- Alinhamento do footer está deslocado 2 pixels em viewports entre 768-800px.
- Loading spinner continua por 200ms após conteúdo ser visível.

**Abordagem de debug:** Pode não precisar do loop completo de debug. Correção direta com teste de regressão é suficiente.

---

## O Loop de Debug em 5 Etapas em Detalhe

O workflow `/debug` executa estas etapas em ordem estrita. Usa ferramentas de análise de código MCP ao longo — nunca leituras brutas de arquivo ou grep.

### Step 1: Coletar Informações do Erro

O workflow pede (ou recebe do usuário):
- Mensagem de erro e stack trace
- Passos para reproduzir
- Comportamento esperado vs atual
- Detalhes do ambiente

Se uma mensagem de erro já foi fornecida no prompt, o workflow prossegue imediatamente para o Step 2.

### Step 2: Reproduzir o Bug

**Ferramentas usadas:** `search_for_pattern` com a mensagem de erro ou palavras-chave do stack trace, `find_symbol` para localizar a função e arquivo exatos.

O objetivo é localizar o erro no codebase — encontrar a linha exata onde a exceção é lançada, a função exata que produz saída errada, ou a condição exata que causa o comportamento inesperado.

Esta etapa transforma um sintoma reportado pelo usuário ("a página crasha") em uma localização no codebase (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Step 3: Diagnosticar Causa Raiz

**Ferramentas usadas:** `find_referencing_symbols` para rastrear o caminho de execução para trás a partir do ponto de erro.

O workflow rastreia para trás a partir da localização do erro para encontrar a causa real. Verifica estes padrões comuns de causa raiz:

| Padrão | O Que Procurar |
|:-------|:--------------|
| **Acesso null/undefined** | Verificações de null ausentes, optional chaining necessário, variáveis não inicializadas |
| **Race conditions** | Operações async completando fora de ordem, await ausente, estado mutável compartilhado |
| **Tratamento de erros ausente** | try/catch ausente, rejeição de promise não tratada, error boundary ausente |
| **Tipos de dados errados** | String onde número esperado, coerção de tipo ausente, schema incorreto |
| **Estado stale** | Estado React não atualizando, valores em cache não invalidados, closure capturando valor antigo |
| **Validação ausente** | Entrada de usuário não sanitizada, corpo de requisição de API não validado, condições de boundary não verificadas |

A disciplina-chave: diagnosticar a **causa raiz**, não o sintoma. Se `user.id` é undefined, a questão não é "como verifico undefined?" mas "por que user é undefined neste ponto do caminho de execução?"

### Step 4: Propor Correção Mínima

O workflow apresenta:
1. A causa raiz identificada (com evidência do rastreamento de código).
2. A correção proposta (alterando apenas o necessário).
3. Uma explicação de por que isso corrige a causa raiz, não apenas o sintoma.

**O workflow bloqueia aqui até o usuário confirmar.** Isso previne o agente de debug de fazer mudanças sem aprovação.

**Princípio de correção mínima:** Altere o menor número de linhas possível. Não refatore, não melhore estilo de código, não adicione funcionalidades não relacionadas. A correção deve ser revisável em menos de 2 minutos.

### Step 5: Aplicar Correção e Escrever Teste de Regressão

Duas ações acontecem nesta etapa:

1. **Implementar a correção** — A mudança mínima aprovada é aplicada.
2. **Escrever teste de regressão** — Um teste que:
   - Reproduz o bug original (o teste deve falhar sem a correção)
   - Verifica que a correção funciona (o teste deve passar com a correção)
   - Previne o mesmo bug de recorrer em mudanças futuras

O teste de regressão é a saída mais importante do workflow de debug. Sem ele, o mesmo bug pode ser reintroduzido por qualquer mudança futura.

### Step 6: Varredura de Padrões Similares

Após a correção ser aplicada, o workflow escaneia todo o codebase pelo mesmo padrão que causou o bug.

**Ferramentas usadas:** `search_for_pattern` com o padrão identificado como causa raiz.

Por exemplo, se o bug foi causado por acessar `user.organization.id` sem verificar se `organization` é null, a varredura procura todas as outras instâncias de acesso a `organization.id` sem verificações de null.

**Critérios de delegação para subagente** — O workflow spawna um subagente `debug-investigator` quando:
- O erro abrange múltiplos domínios (ex: tanto frontend quanto backend afetados).
- O escopo de varredura de padrões similares cobre 10+ arquivos.
- Rastreamento profundo de dependências é necessário para diagnosticar completamente o problema.

Todas as localizações vulneráveis similares são reportadas. Instâncias confirmadas são corrigidas como parte da mesma sessão.

### Step 7: Documentar o Bug

O workflow escreve um arquivo de memória com:
- Sintoma e causa raiz
- Correção aplicada e arquivos alterados
- Localização do teste de regressão
- Padrões similares encontrados no codebase

---

## Sinais de Escalação

Estes sinais indicam que o bug requer escalação além do loop padrão de debug:

### Sinal 1: Mesma Correção Tentada Duas Vezes

Se o workflow propõe uma correção, aplica-a, e o mesmo erro recorre, o problema é mais profundo que o diagnóstico inicial. Isso aciona o **Exploration Loop** em workflows que o suportam (ultrawork, orchestrate, coordinate):

- Gerar 2-3 hipóteses alternativas para a causa raiz.
- Testar cada hipótese em workspace separado (git stash por tentativa).
- Pontuar resultados e adotar a melhor abordagem.

### Sinal 2: Causa Raiz Multi-Domínio

O erro no frontend é causado por uma mudança no backend que é causada por uma migração de schema de banco de dados. Quando a causa raiz cruza fronteiras de domínio, escale para `/coordinate` ou `/orchestrate` para envolver os agentes de domínio relevantes.

### Sinal 3: Ambiente de Reprodução Ausente

O bug só ocorre em produção, e você não consegue reproduzi-lo localmente.

**Ação:** Coletar logs de produção, solicitar acesso a monitoramento de produção, e considerar adicionar instrumentação/logging antes de tentar uma correção.

### Sinal 4: Falha de Infraestrutura de Testes

O teste de regressão não pode ser escrito porque a infraestrutura de testes está quebrada, ausente ou inadequada.

**Ação:** Corrigir a infraestrutura de testes primeiro (ou usar `/setup` para configurá-la), depois retornar ao workflow de debug.

---

## Checklist de Validação Pós-Correção

Após aplicar a correção e teste de regressão, verifique:

- [ ] **Teste de regressão falha sem a correção** — Reverta a correção temporariamente e confirme que o teste detecta o bug.
- [ ] **Teste de regressão passa com a correção** — Aplique a correção e confirme que o teste passa.
- [ ] **Testes existentes ainda passam** — Execute a suite completa de testes para verificar sem regressões.
- [ ] **Build tem sucesso** — Compile/builde o projeto para detectar erros de tipo ou problemas de import.
- [ ] **Padrões similares escaneados** — Step 6 foi completado e todas as instâncias encontradas estão corrigidas ou documentadas.
- [ ] **Correção é mínima** — Apenas as linhas necessárias foram alteradas. Nenhuma refatoração não relacionada foi incluída.
- [ ] **Causa raiz documentada** — O arquivo de memória registra: sintoma, causa raiz, correção aplicada, arquivos alterados, localização do teste de regressão e padrões similares encontrados.

---

## Critérios de Conclusão

O workflow de debug está completo quando:

1. A causa raiz está identificada e documentada (não apenas o sintoma).
2. Uma correção mínima é aplicada com aprovação do usuário.
3. Um teste de regressão existe que falha sem a correção e passa com ela.
4. O codebase foi escaneado para padrões similares, e todas as instâncias confirmadas foram tratadas.
5. Um relatório de bug está registrado na memória com: sintoma, causa raiz, correção aplicada, arquivos alterados, localização do teste de regressão e padrões similares encontrados.
6. Todos os testes existentes continuam passando após a correção.
