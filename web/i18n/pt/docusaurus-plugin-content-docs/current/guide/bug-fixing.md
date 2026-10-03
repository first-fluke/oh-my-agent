---
title: "Guia: Correção de Bugs"
sidebar_label: Correção de Bugs
description: Workflow estruturado de debugging em sete etapas, com triagem de severidade, sinais de escalação, diagnóstico respaldado pela fonte e validação pós-correção.
---

# Guia: Correção de Bugs

## Quando usar o workflow de debug

Use `/debug` (ou diga "fix bug", "fix error" ou "debug" em linguagem natural) quando tiver um bug específico para diagnosticar e corrigir. O workflow fornece uma abordagem estruturada e reproduzível para debugging que evita a armadilha comum de corrigir sintomas em vez de causas raiz.

O workflow de debug é compatível com todos os vendors configurados. As etapas 1-5 executam inline. A etapa 6 (varredura de padrões similares) pode delegar a um subagente `debug-investigator` quando o escopo da varredura for amplo (10+ arquivos ou erros de vários domínios), seguida do registro em memória da etapa 7.

---

## Template de relatório de bug

Ao relatar um bug, forneça o máximo possível das informações a seguir. Cada campo ajuda o workflow de debug a restringir a busca mais rapidamente.

### Campos obrigatórios

| Campo | Descrição | Exemplo |
|:------|:-----------|:--------|
| **Mensagem de erro** | O texto exato do erro ou stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Passos para reproduzir** | Ações ordenadas que acionam o bug | 1. Faça login como admin. 2. Navegue até /users. 3. Clique em "Delete" em qualquer usuário. |
| **Comportamento esperado** | O que deveria acontecer | O usuário é excluído e removido da lista. |
| **Comportamento atual** | O que realmente acontece | A página quebra e mostra uma tela branca. |

### Campos opcionais (altamente recomendados)

<!-- oma-docs:ignore-start -->
| Campo | Descrição | Exemplo |
|:------|:-----------|:--------|
| **Ambiente** | Navegador, sistema operacional, versão do Node, dispositivo | Chrome 124, macOS 15.3, Node 22.1 |
| **Frequência** | Sempre, às vezes, somente na primeira vez | Sempre reproduzível |
| **Mudanças recentes** | O que mudou antes de o bug aparecer | PR #142 mesclado (funcionalidade de exclusão de usuário) |
| **Código relacionado** | Arquivos ou funções suspeitos | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Logs do servidor, saída do console | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Screenshots/gravações** | Evidência visual | Screenshot da tela de erro |
<!-- oma-docs:ignore-end -->

Quanto mais contexto você fornecer de início, menos perguntas de ida e volta o workflow de debug precisará fazer.

---

## Triagem de severidade (P0-P3)

A severidade determina como o bug é tratado e com que rapidez deve ser corrigido.

### P0: crítico (resposta imediata)

**Definição:** A produção está fora do ar, dados estão sendo perdidos ou corrompidos, ou uma violação de segurança está ativa.

**Expectativa de resposta:** Pare tudo. Esta é a única tarefa até ser resolvida.

**Exemplos:**
- O sistema de autenticação foi contornado; todos os usuários podem acessar endpoints de admin.
- Uma migração de banco corrompeu a tabela de usuários; as contas estão inacessíveis.
- O processamento de pagamentos está cobrando clientes em dobro.
- Um endpoint de API retorna dados pessoais de outros usuários.

**Abordagem de debug:** Pule o template completo. Forneça a mensagem de erro e qualquer stack trace. O workflow começa imediatamente na Etapa 2 (Reproduzir).

### P1: alto (mesma sessão)

**Definição:** Uma funcionalidade central está quebrada para um número significativo de usuários. Pode existir um workaround, mas ele não é aceitável a longo prazo.

**Expectativa de resposta:** Corrija na sessão de trabalho atual. Não inicie novas funcionalidades até resolver o problema.

**Exemplos:**
- A busca não retorna resultados para queries que contêm caracteres especiais.
- O upload de arquivo falha para arquivos maiores que 5MB (o limite deveria ser 50MB).
- O app mobile quebra ao iniciar em dispositivos Android 14.
- Emails de redefinição de senha não são enviados (a integração do serviço de email está quebrada).

**Abordagem de debug:** Loop completo de sete etapas. Recomenda-se revisão QA após a correção.

### P2: médio (este sprint)

**Definição:** Uma funcionalidade funciona, mas com comportamento degradado. Afeta a usabilidade, mas não a funcionalidade.

**Expectativa de resposta:** Agende para o sprint atual. Corrija antes do próximo release.

**Exemplos:**
- A ordenação da tabela diferencia maiúsculas de minúsculas ("apple" fica depois de "Zebra").
- O dark mode tem texto ilegível no painel de configurações.
- O tempo de resposta da API para o endpoint /users é de 8 segundos (deveria ser inferior a 1s).
- A paginação mostra "Page 1 of 0" quando a lista está vazia.

**Abordagem de debug:** Loop completo de sete etapas. Inclua na suíte de regressão QA.

### P3: baixo (backlog)

**Definição:** Problema cosmético, caso de borda ou pequena inconveniência.

**Expectativa de resposta:** Adicione ao backlog. Corrija quando conveniente ou agrupe com mudanças relacionadas.

**Exemplos:**
- O tooltip tem um erro de digitação: "Delet" em vez de "Delete".
- Há um aviso no console sobre um método de lifecycle do React obsoleto.
- O alinhamento do footer está deslocado 2 pixels em viewports entre 768-800px.
- O spinner de carregamento continua por 200ms depois que o conteúdo fica visível.

**Abordagem de debug:** Talvez não seja necessário o loop completo de debug. Uma correção direta com teste de regressão é suficiente.

---

## O loop de debug de sete etapas em detalhe

O workflow `/debug` executa estas etapas em ordem. Usa o provedor de inteligência de código configurado. A busca nativa é usada apenas para caminhos fora do projeto ou caminhos ignorados quando esse provedor está indisponível ou sofre timeout.

### Etapa 1: coletar informações do erro

O workflow pede (ou recebe do usuário):
- Mensagem de erro e stack trace
- Passos para reproduzir
- Comportamento esperado e atual
- Detalhes do ambiente

Se a mensagem de erro já foi fornecida no prompt, o workflow prossegue imediatamente para a Etapa 2.

### Etapa 2: reproduzir o bug

**Ferramentas usadas:** as ferramentas configuradas de busca e símbolos, ou `rg` nativo e leituras com escopo quando as ferramentas configuradas estão indisponíveis.

O objetivo é localizar o erro no codebase: encontrar a linha exata onde a exceção é lançada, a função exata que produz a saída incorreta ou a condição exata que causa o comportamento inesperado.

Esta etapa transforma um sintoma relatado pelo usuário ("a página quebra") em uma localização no codebase (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Etapa 3: diagnosticar a causa raiz

**Ferramentas usadas:** navegação de referências e símbolos quando disponível, seguida de leituras nativas direcionadas quando não estiver.

O workflow rastreia para trás a partir da localização do erro para encontrar a causa real. Verifica estes padrões comuns:

| Padrão | O que procurar |
|:--------|:----------------|
| **Acesso null/undefined** | Checks de null ausentes, optional chaining necessário, variáveis não inicializadas |
| **Race conditions** | Operações assíncronas concluindo fora de ordem, await ausente, estado mutável compartilhado |
| **Tratamento de erros ausente** | try/catch ausente, rejeição de promise não tratada, error boundary ausente |
| **Tipos de dados incorretos** | String onde se espera número, coerção de tipo ausente, schema incorreto |
| **Estado obsoleto** | Estado React não atualiza, valores em cache não invalidados, closure capturando valor antigo |
| **Validação ausente** | Entrada do usuário não sanitizada, corpo da requisição de API não validado, condições de fronteira não verificadas |

Diagnostique a causa raiz, não o sintoma. Se `user.id` estiver undefined, pergunte por que user está undefined nesse ponto do caminho de execução, e não como proteger o acesso contra undefined.

### Etapa 4: propor uma correção mínima

O workflow apresenta:
1. A causa raiz identificada (com evidência do rastreamento de código).
2. A correção proposta (alterando somente o necessário).
3. Uma explicação de por que isso corrige a causa raiz, e não apenas o sintoma.

O workflow apresenta a proposta antes de editar. Aguarda confirmação quando a mudança ainda não está autorizada pela solicitação ou pela política de execução; uma autorização existente permite continuar sem um segundo prompt.

**Princípio da correção mínima:** Altere o menor número de linhas possível. Não refatore, não melhore o estilo do código e não adicione funcionalidades não relacionadas. A correção deve ser revisável em menos de 2 minutos.

### Etapa 5: aplicar a correção e escrever o teste de regressão

Duas ações acontecem nesta etapa:

1. **Implementar a correção:** A mudança mínima aprovada é aplicada.
2. **Escrever um teste de regressão:** Um teste que:
   - Reproduz o bug original (o teste deve falhar sem a correção)
   - Verifica que a correção funciona (o teste deve passar com a correção)
   - Impede que o mesmo bug volte em mudanças futuras

O teste de regressão é a saída mais importante do workflow de debug. Sem ele, qualquer mudança futura pode reintroduzir o mesmo bug.

### Etapa 6: procurar padrões similares

Depois de aplicar a correção, o workflow procura em todo o codebase o mesmo padrão que causou o bug.

**Ferramentas usadas:** a busca de padrões configurada ou uma busca nativa com escopo usando o padrão identificado como causa raiz.

Por exemplo, se o bug foi causado por acessar `user.organization.id` sem verificar se `organization` é null, a busca procura todas as outras instâncias de acesso a `organization.id` sem verificações de null.

**Critérios de delegação de subagente:** O workflow inicia um subagente `debug-investigator` quando:
- O erro abrange vários domínios (por exemplo, frontend e backend são afetados).
- O escopo da busca de padrões similares cobre 10+ arquivos.
- É necessário rastreamento profundo de dependências para diagnosticar o problema por completo.

Métodos de criação específicos do vendor:

| Vendor | Método de criação |
|:-------|:------------|
| Claude Code | Ferramenta Agent com `.claude/agents/debug-investigator.md` |
| Codex CLI | Solicitação de subagente mediada pelo modelo, resultados como JSON |
| Gemini CLI | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |

Todas as localizações vulneráveis similares são relatadas. Instâncias confirmadas são corrigidas na mesma sessão.

### Etapa 7: documentar o bug

O workflow escreve um arquivo de memória com:
- Sintoma e causa raiz
- Correção aplicada e arquivos alterados
- Localização do teste de regressão
- Padrões similares encontrados no codebase

---

## Template de prompt para /debug

Ao acionar o workflow de debug, você pode fornecer um prompt estruturado:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Por que essa estrutura funciona:**

- **Erro + stack trace** permite que a Etapa 2 localize imediatamente o código (`search_for_pattern` com "deleteUser" encontra a função; `find_symbol` aponta a localização exata).
- **Passos para reproduzir** com a condição de acionamento específica ("user whose organization was deleted") dão uma pista da causa raiz (foreign key nula).
- **Ambiente** elimina falsos alvos específicos de versão.

Para bugs mais simples, um prompt mais curto funciona:

```
/debug The login page shows "Invalid credentials" even with correct password
```

O workflow solicitará detalhes adicionais conforme necessário.

---

## Sinais de escalação

Estes sinais indicam que o bug precisa de escalação além do loop padrão de debug:

### Sinal 1: a mesma correção foi tentada duas vezes

Se o workflow propõe uma correção, aplica-a e o mesmo erro retorna, o problema é mais profundo que o diagnóstico inicial. Reavalie a causa. Se houver alternativas que mereçam ser testadas e o orçamento de recuperação existente permitir, use o **Exploration Loop** no workflow ativo (ultrawork, orchestrate, work):

- Gere 2-3 hipóteses alternativas para a causa raiz.
- Isole cada experimento e preserve seu baseline, as evidências e o trabalho não relacionado.
- Escolha uma abordagem que atenda ao comportamento exigido e a critérios de medição comparáveis; depois, verifique o resultado integrado.

### Sinal 2: causa raiz em vários domínios

O erro no frontend é causado por uma mudança no backend, que por sua vez é causada por uma migração de schema do banco. Quando a causa raiz cruza fronteiras de domínio, escale para `/work` ou `/orchestrate` para envolver os agentes de domínio relevantes.

**Exemplo:** O frontend exibe "undefined" para o nome do usuário. O backend retorna null para `user.display_name`. Uma migração de banco adicionou a coluna, mas as linhas existentes têm valores NULL. A correção exige: migração de banco (backfill), tratamento de null no backend e fallback de exibição no frontend.

### Sinal 3: ambiente de reprodução ausente

O bug só ocorre em produção e você não consegue reproduzi-lo localmente. Os sinais incluem:
- Diferenças de configuração específicas do ambiente.
- Race conditions que só aparecem sob carga de produção.
- Diferenças de comportamento de serviços de terceiros entre staging e produção.

**Ação:** Colete logs de produção, solicite acesso ao monitoramento de produção e considere adicionar instrumentação/logging antes de tentar uma correção.

### Sinal 4: falha da infraestrutura de testes

O teste de regressão não pode ser escrito porque a infraestrutura de testes está quebrada, ausente ou inadequada.

**Ação:** Corrija primeiro a infraestrutura de testes (ou use `oma install` para configurá-la) e depois retorne ao workflow de debug. Se uma verificação executável não for aplicável, registre o motivo no contrato de resultado em vez de inventar uma verificação aprovada.

---

## Checklist de validação pós-correção

Depois de aplicar a correção e o teste de regressão, verifique:

- [ ] **O teste de regressão falha sem a correção:** reverta temporariamente a correção e confirme que o teste detecta o bug.
- [ ] **O teste de regressão passa com a correção:** aplique a correção e confirme que o teste passa.
- [ ] **As verificações existentes relevantes continuam passando:** execute as verificações do projeto que cobrem o comportamento alterado. Execute um build somente quando a tarefa exigir explicitamente.
- [ ] **Os padrões similares foram procurados:** a Etapa 6 foi concluída e todas as instâncias encontradas foram corrigidas ou documentadas.
- [ ] **A correção é mínima:** somente as linhas necessárias foram alteradas. Nenhuma refatoração não relacionada foi incluída.
- [ ] **A causa raiz foi documentada:** o arquivo de memória registra sintoma, causa raiz, correção aplicada, arquivos alterados, localização do teste de regressão e padrões similares encontrados.

---

## Critérios de conclusão

O workflow de debug está concluído quando:

1. A causa raiz está identificada e documentada (não apenas o sintoma).
2. Uma correção mínima é aplicada dentro da autorização da tarefa.
3. Existe um teste de regressão que falha sem a correção e passa com ela.
4. O codebase foi procurado por padrões similares, e todas as instâncias confirmadas foram tratadas.
5. Um relatório de bug está registrado na memória com sintoma, causa raiz, correção aplicada, arquivos alterados, localização do teste de regressão e padrões similares encontrados.
6. Todos os testes existentes continuam passando após a correção.
