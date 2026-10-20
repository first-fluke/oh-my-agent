---
title: "Guia: Execução com Skill Única"
sidebar_label: Skill Única
description: Guia detalhado para tarefas de domínio único no oh-my-agent, cobrindo quando usar, checklist de preflight, template de prompt com explicação, exemplos reais para tarefas de frontend, backend, mobile e banco de dados, fluxo de execução esperado, checklist do portão de qualidade e sinais de escalação.
---

# Execução com Skill Única

Uma única skill atende a uma tarefa focada em um domínio, executada por um agente. Esse fluxo evita a sobrecarga de orquestração e coordenação entre agentes. Um host ou workflow selecionado pode encaminhar um prompt em linguagem natural para a skill; o próprio sistema de hooks detecta workflows, e o comportamento de roteamento depende do runtime selecionado.

## Caminho rápido

1. Execute `oma doctor` uma vez para confirmar a integração do host selecionado. Avisos opcionais de providers não bloqueiam uma tarefa que não use esses providers.
2. Descreva uma mudança autocontida com **Goal**, **Context**, **Constraints** e uma condição **Done When** clara.
3. Espere que a skill selecionada inspecione o repositório, declare seu escopo quando o contrato de execução ativo exigir um `CHARTER_CHECK` e informe quais verificações realmente foram executadas.
4. Se a tarefa crescer entre limites de API, UI, banco de dados ou mobile, pare a execução com uma skill única e mude para `/work` ou `/orchestrate`.

Para execuções gerenciadas paradas, use `oma agent status <session-id> [agent-id]`; depois inspecione os recibos em `.agents/state/agent-runs/` e o caminho de claim injetado antes de tentar novamente. Consulte [Padrões importantes](../getting-started/important-defaults.md) para o comportamento de providers e recuperação.

---

## Quando usar uma skill única

Use este fluxo quando sua tarefa atender a TODOS estes critérios:

- **Pertencer a um domínio**: toda a tarefa pertence a frontend, backend, mobile, banco de dados, design, infraestrutura ou outro domínio único
- **Ser autocontida**: não há mudanças de contrato de API entre domínios nem mudanças de backend necessárias para uma tarefa de frontend
- **Ter escopo claro**: você sabe qual deve ser a saída (um componente, endpoint, schema ou correção)
- **Não exigir coordenação**: outros agentes não precisam executar antes ou depois

**Exemplos de tarefas com uma skill:**
- Criar um componente de UI
- Adicionar um endpoint de API
- Corrigir um bug em uma camada
- Projetar uma tabela de banco de dados
- Escrever um módulo Terraform
- Traduzir um conjunto de strings i18n
- Criar uma seção de um design system

**Mude para multi-agente** (`/work` ou `/orchestrate`) quando:
- O trabalho de UI precisar de um novo contrato de API (frontend + backend)
- Uma correção se propagar entre camadas (agentes de debug + implementação)
- A funcionalidade abranger frontend, backend e banco de dados
- O escopo crescer além de um domínio após a primeira iteração

Testes e critérios de aceitação também fazem parte do trabalho com uma skill única; por si só, não exigem `/ralph`. Para coordenação entre domínios ou um processo de qualidade solicitado explicitamente, consulte o [guia de seleção de skills e workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Checklist de preflight

Antes de criar o prompt, responda a estas quatro perguntas:

| Elemento | Pergunta | Por que isso importa |
|----------|----------|----------------------|
| **Goal** | Qual artefato específico deve ser criado ou alterado? | Evita ambiguidade (por exemplo, "adicionar um botão" em vez de "adicionar um formulário com validação") |
| **Context** | Qual stack, framework e convenções se aplicam? | O agente detecta isso nos arquivos do projeto, mas explicitar é melhor |
| **Constraints** | Quais regras devem ser seguidas? (estilo, segurança, performance, compatibilidade) | Sem restrições, os agentes usam padrões que podem não corresponder ao seu projeto |
| **Done When** | Quais critérios de aceitação você verificará? | Dá ao agente um objetivo e a você um checklist de verificação |

Se algum elemento faltar no seu prompt, o agente:
- **LOW uncertainty:** aplica padrões e lista suposições
- **MEDIUM uncertainty:** apresenta 2-3 opções e prossegue com a mais provável
- **HIGH uncertainty:** bloqueia e faz perguntas (não escreverá código)

---

## Template de prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Detalhamento do template

| Parte | Finalidade | Exemplo |
|------|------------|---------|
| `Build <specific artifact>` | O Goal (o que criar) | "Build a user registration form component" |
| `using <stack/framework>` | O Context (stack tecnológico) | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Regras que o agente deve seguir | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Done When (resultados verificáveis) | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Requisitos de testes | "valid/invalid submit paths, edge cases for email validation" |

---

## Exemplos reais

### Frontend: formulário de login

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Fluxo de execução esperado:**

1. **Roteamento da skill:** O host ou workflow seleciona `oma-frontend` (palavras-chave como "form", "component", "Tailwind CSS" e "React" são sinais de roteamento)
2. **Avaliação de dificuldade:** Média (2-3 arquivos, algumas decisões de design sobre UX de validação)
3. **Recursos carregados:**
   - `execution-protocol.md` (sempre)
   - `snippets.md` (padrões de formulário e Zod, além dos padrões de componentes existentes quando a skill os fornece)
4. **Contrato de execução (quando habilitado) pode emitir `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Implementação:**
   - Cria `src/features/auth/components/login-form.tsx` (Client Component com `"use client"`)
   - Cria `src/features/auth/utils/login-schema.ts` (schema Zod)
   - Cria `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Usa shadcn/ui `<Button>`, `<Input>`, `<Label>` (somente leitura, sem modificações)
   - O formulário é gerenciado por `@tanstack/react-form` com validação Zod
   - Usa imports absolutos com `@/`
   - Um componente por arquivo
6. **Verificação:**
   - Checklist: labels ARIA presentes, headings semânticos, navegação por teclado funciona
   - Mobile: renderiza corretamente em viewport de 320px
   - Performance: sem CLS
   - Testes: arquivo de teste Vitest em `src/features/auth/utils/__tests__/login-schema.test.ts`
<!-- oma-docs:ignore-end -->

---

### Backend: endpoint de API REST

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Fluxo de execução esperado:**

1. **Roteamento da skill:** O host ou workflow seleciona `oma-backend` (palavras-chave como "API", "endpoint" e "REST" são sinais de roteamento)
2. **Detecção da stack:** Lê `pyproject.toml` ou `package.json` para determinar linguagem e framework. Se referências geradas em `stack/` ou `variants/` fornecidas existirem, carrega as convenções correspondentes.
3. **Avaliação de dificuldade:** Média (2-3 arquivos: rota, serviço, repositório e teste)
4. **Recursos carregados:**
   - `execution-protocol.md` (sempre)
<!-- oma-docs:ignore-start -->
   - `stack/snippets.md` correspondente ou `variants/{node,python,rust}/snippets.md` quando disponível
   - `stack/tech-stack.md` correspondente ou referências de tech-stack da variante quando disponíveis
<!-- oma-docs:ignore-end -->
5. **Contrato de execução (quando habilitado) pode emitir `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementação:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` com query parametrizada
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` (wrapper da lógica de negócio)
   - Router: `GET /api/tasks` com middleware de autenticação JWT, validação de entrada e formatação de resposta
   - Testes: auth obrigatória retorna 401, paginação retorna cursor correto, filtro funciona, vazio retorna 200 com array vazio

---

### Mobile: tela de configurações

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Fluxo de execução esperado:**

1. **Roteamento da skill:** O host ou workflow seleciona `oma-mobile` (palavras-chave como "Flutter", "screen" e "mobile" são sinais de roteamento)
2. **Avaliação de dificuldade:** Média (tela de configurações + gerenciamento de estado + tratamento offline)
3. **Recursos carregados:**
   - `execution-protocol.md`
   - `snippets.md` (template de tela, padrão de provider Riverpod)
   - `screen-template.dart`
4. **Contrato de execução (quando habilitado) pode emitir `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Implementação:**
   - Tela: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget com Riverpod)
   - Providers: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Tratamento offline: interceptor Dio captura `SocketException` e recorre a dados em cache
   - Todos os controllers são liberados no método `dispose()`
<!-- oma-docs:ignore-end -->

---

### Banco de dados: design de schema

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Fluxo de execução esperado:**

1. **Roteamento da skill:** O host ou workflow seleciona `oma-db` (palavras-chave como "database", "schema", "ERD" e "migration" são sinais de roteamento)
2. **Avaliação de dificuldade:** Complexa (decisões de arquitetura, múltiplas entidades e planejamento de capacidade)
3. **Recursos carregados:**
   - `execution-protocol.md`
   - `document-templates.md` (estrutura dos entregáveis)
   - `examples.md`
   - `anti-patterns.md` (revisão durante a otimização)
4. **Contrato de execução (quando habilitado) pode emitir `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Explorar (entidades, relacionamentos, padrões de acesso, estimativas de volume) -> Projetar (schemas externo/conceitual/interno, restrições, campos de ciclo de vida) -> Otimizar (índices para padrões de consulta, estratégia de particionamento, plano de backup, revisão de anti-padrões)
6. **Entregáveis:**
   - Resumo do schema externo (views por papel: admin, gerente de projeto, membro da equipe)
   - Schema conceitual com ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership etc.)
   - Schema interno com DDL físico, índices e particionamento
   - Tabela de padrões de dados (regras de nomenclatura de campos, convenções de tipo)
   - Glossário (tenant, workspace, assignee etc.)
   - Planilha de estimativa de capacidade
   - Estratégia de backup (full diário + incremental horário, retenção de 30 dias)
   - Script de migração

---

## Checklist do portão de qualidade

Depois que o agente entregar sua saída, verifique estes itens antes de aceitar:

### Verificações universais (todos os agentes)

- [ ] **O comportamento corresponde aos critérios de aceitação:** todos os critérios do prompt são satisfeitos
- [ ] **Os testes cobrem o caminho feliz e casos de borda importantes:** não apenas o caminho feliz
- [ ] **Nenhuma alteração de arquivo não relacionada:** somente arquivos relevantes para a tarefa foram modificados
- [ ] **Módulos compartilhados não foram quebrados:** imports, tipos e interfaces usados por outro código continuam funcionando
- [ ] **O charter foi seguido:** as restrições de "Must NOT do" foram respeitadas
- [ ] **Lint, typecheck, build passam:** execute as verificações padrão do projeto

### Específico de frontend

- [ ] Acessibilidade: elementos interativos têm `aria-label`, headings semânticos e navegação por teclado funciona
- [ ] Mobile: renderiza corretamente nos breakpoints de 320px, 768px, 1024px e 1440px
- [ ] Performance: sem CLS, meta de FCP atingida
- [ ] Error boundaries e loading skeletons implementados
- [ ] Componentes shadcn/ui não são modificados diretamente (use wrappers)
- [ ] Imports absolutos com `@/` (sem `../../` relativo)

### Específico de backend

- [ ] Arquitetura limpa mantida: nenhuma lógica de negócio nos route handlers
- [ ] Todas as entradas validadas (sem confiar na entrada do usuário)
- [ ] Somente queries parametrizadas (sem interpolação de string em SQL)
- [ ] Exceções customizadas via módulo centralizado de erros (sem exceções HTTP brutas)
- [ ] Endpoints de auth com rate limiting

### Específico de mobile

- [ ] Todos os controllers são liberados no método `dispose()`
- [ ] Offline tratado com elegância
- [ ] Meta de 60fps mantida (sem jank)
- [ ] Testado em iOS e Android

### Específico de banco de dados

- [ ] Pelo menos 3NF (ou justificativa documentada para desnormalização)
- [ ] As três camadas de schema documentadas (externa, conceitual, interna)
- [ ] Restrições de integridade explícitas (entidade, domínio, referencial, regra de negócio)
- [ ] Revisão de anti-padrões concluída

---

## Sinais de escalação

Observe estes sinais de que você deve mudar da execução com uma skill única para a execução multi-agente:

| Sinal | O que significa | Ação |
|-------|-----------------|------|
| O agente diz "this requires a backend change" | A tarefa tem dependências entre domínios | Mude para `/work` e adicione um agente backend |
| O CHARTER_CHECK do agente mostra itens "Must NOT do" que são realmente necessários | O escopo excede um domínio | Planeje a funcionalidade completa com `/plan` primeiro |
| A correção se propaga para 3+ arquivos em camadas diferentes | Uma correção afeta vários domínios | Use `/debug` com escopo mais amplo ou `/work` |
| O agente descobre uma incompatibilidade de contrato de API | Há desacordo entre frontend e backend | Execute `/plan` para definir contratos e depois crie ambos novamente |
| O portão de qualidade falha em pontos de integração | Os componentes não se conectam corretamente | Execute `/review` ou adicione uma passada de QA: `oma agent spawn qa "Review the integration" SESSION_ID --read-only` |
| A tarefa cresce de "um componente" para "três componentes + nova rota + API" | O escopo aumentou durante a execução | Pare, execute `/plan` para decompor e depois use `/orchestrate` |
| O agente bloqueia com esclarecimento HIGH | Os requisitos são fundamentalmente ambíguos | Responda às perguntas do agente ou execute `/brainstorm` para esclarecer a abordagem |

### Regra de bolso

Se você recriar o mesmo agente mais de duas vezes com refinamentos, a tarefa provavelmente abrange vários domínios. Execute `/work`, ou pelo menos `/plan`, para decompô-la.

---

## Próximos passos

- A tarefa abrange vários domínios: [Projetos Multi-Agente](./multi-agent-project.md)
- A tarefa é um bug: [Correção de Bugs](./bug-fixing.md)
- Audite ou retome uma execução: [Resultados e retomada](./agent-results-and-resume.md)
- Algo falhou: [Solução de problemas](./troubleshooting.md)
- Escolha entre uma skill e um workflow: [Workflows](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
