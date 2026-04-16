---
title: "Guia: Execução com Skill Única"
description: "Guia detalhado para tarefas de domínio único no oh-my-agent — quando usar, checklist de preflight, template de prompt com explicação, exemplos reais para tarefas de frontend, backend, mobile e banco de dados, fluxo de execução esperado, checklist do portão de qualidade e sinais de escalação."
---

# Execução com Skill Única

A execução com skill única é o caminho rápido — um agente, um domínio, uma tarefa focada. Sem overhead de orquestração, sem coordenação multi-agente. A skill ativa automaticamente a partir do seu prompt em linguagem natural.

---

## Quando Usar Skill Única

Use quando sua tarefa atende a TODOS estes critérios:

- **Pertence a um domínio** — toda a tarefa pertence a frontend, backend, mobile, banco de dados, design, infraestrutura ou outro domínio único
- **Autocontida** — sem mudanças de contrato de API entre domínios, sem mudanças de backend necessárias para uma tarefa de frontend
- **Escopo claro** — você sabe qual deve ser a saída (um componente, um endpoint, um schema, uma correção)
- **Sem coordenação** — outros agentes não precisam executar antes ou depois

**Exemplos de tarefas de skill única:**
- Construir um componente de UI
- Adicionar um endpoint de API
- Corrigir um bug em uma camada
- Projetar uma tabela de banco de dados
- Escrever um módulo Terraform
- Traduzir um conjunto de strings i18n
- Criar uma seção do design system

**Mude para multi-agente** (`/work` ou `/orchestrate`) quando:
- Trabalho de UI precisa de um novo contrato de API (frontend + backend)
- Uma correção se propaga entre camadas (debug + agentes de implementação)
- A funcionalidade abrange frontend, backend e banco de dados
- O escopo cresce além de um domínio após a primeira iteração

---

## Checklist de Preflight

Antes de fazer o prompt, responda estas quatro perguntas (elas mapeiam para os quatro elementos da [Estrutura de Prompt](/docs/core-concepts/skills)):

| Elemento | Pergunta | Por Que Importa |
|----------|----------|-----------------|
| **Goal** | Que artefato específico deve ser criado ou alterado? | Previne ambiguidade — "adicionar um botão" vs "adicionar um formulário com validação" |
| **Context** | Qual stack, framework e convenções se aplicam? | O agente detecta dos arquivos do projeto, mas explícito é melhor |
| **Constraints** | Quais regras devem ser seguidas? (estilo, segurança, performance, compatibilidade) | Sem restrições, agentes usam padrões que podem não corresponder ao seu projeto |
| **Done When** | Quais critérios de aceitação você verificará? | Dá ao agente um alvo e a você um checklist de verificação |

Se qualquer elemento estiver faltando no seu prompt, o agente irá:
- **LOW uncertainty:** Aplicar padrões e listar suposições
- **MEDIUM uncertainty:** Apresentar 2-3 opções e prosseguir com a mais provável
- **HIGH uncertainty:** Bloquear e fazer perguntas (não escreverá código)

---

## Template de Prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Detalhamento do Template

| Parte | Propósito | Exemplo |
|-------|---------|---------|
| `Build <specific artifact>` | O Goal — o que criar | "Build a user registration form component" |
| `using <stack/framework>` | O Context — stack tecnológico | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Regras que o agente deve seguir | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Done When — resultados verificáveis | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Requisitos de teste | "valid/invalid submit paths, edge cases for email validation" |

---

## Exemplos Reais

### Frontend: Formulário de Login

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

1. **Ativação da skill:** `oma-frontend` ativa (palavras-chave: "form", "component", "Tailwind CSS", "React")
2. **Avaliação de dificuldade:** Média (2-3 arquivos, algumas decisões de design sobre UX de validação)
3. **Recursos carregados:**
   - `execution-protocol.md` (sempre)
   - `snippets.md` (padrões de form + Zod)
   - `component-template.tsx` (estrutura React)
4. **Saída CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **Implementação:**
   - Cria `src/features/auth/components/login-form.tsx` (Client Component com `"use client"`)
   - Cria `src/features/auth/utils/login-schema.ts` (schema Zod)
   - Cria `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Usa shadcn/ui `<Button>`, `<Input>`, `<Label>` (somente leitura, sem modificações)
   - Formulário gerenciado por `@tanstack/react-form` com validação Zod
   - Imports absolutos com `@/`
   - Um componente por arquivo
6. **Verificação:**
   - Checklist: labels ARIA presentes, headings semânticos, navegação por teclado funciona
   - Mobile: renderiza corretamente em viewport de 320px
   - Performance: sem CLS
   - Testes: arquivo de teste Vitest em `src/features/auth/utils/__tests__/login-schema.test.ts`

---

### Backend: Endpoint de API REST

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

1. **Ativação da skill:** `oma-backend` ativa (palavras-chave: "API", "endpoint", "REST")
2. **Detecção de stack:** Lê `pyproject.toml` ou `package.json` para determinar linguagem/framework. Se `stack/` existe, carrega convenções de lá.
3. **Avaliação de dificuldade:** Média (2-3 arquivos: route, service, repository, mais teste)
4. **Recursos carregados:**
   - `execution-protocol.md` (sempre)
   - `stack/snippets.md` se disponível (route, padrões de query paginada)
   - `stack/tech-stack.md` se disponível (API específica do framework)
5. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementação:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` com query parametrizada
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` — wrapper de lógica de negócio
   - Router: `GET /api/tasks` com middleware de auth JWT, validação de entrada, formatação de resposta
   - Testes: auth obrigatória retorna 401, paginação retorna cursor correto, filtro funciona, vazio retorna 200 com array vazio

---

### Mobile: Tela de Configurações

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

1. **Ativação da skill:** `oma-mobile` ativa (palavras-chave: "Flutter", "screen", "mobile")
2. **Avaliação de dificuldade:** Média (tela de configurações + gerenciamento de estado + tratamento offline)
3. **Recursos carregados:**
   - `execution-protocol.md`
   - `snippets.md` (template de tela, padrão de provider Riverpod)
   - `screen-template.dart`
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **Implementação:**
   - Tela: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget com Riverpod)
   - Providers: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Tratamento offline: interceptor Dio captura `SocketException`, recorre a dados em cache
   - Todos os controllers dispostos no método `dispose()`

---

### Banco de Dados: Design de Schema

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

1. **Ativação da skill:** `oma-db` ativa (palavras-chave: "database", "schema", "ERD", "migration")
2. **Avaliação de dificuldade:** Complexa (decisões de arquitetura, múltiplas entidades, planejamento de capacidade)
3. **Recursos carregados:**
   - `execution-protocol.md`
   - `document-templates.md` (estrutura de entregáveis)
   - `examples.md`
   - `anti-patterns.md` (revisão durante otimização)
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Explorar (entidades, relacionamentos, padrões de acesso, estimativas de volume) -> Projetar (schemas externo/conceitual/interno, restrições, campos de lifecycle) -> Otimizar (índices para padrões de query, estratégia de particionamento, plano de backup, revisão de anti-padrões)
6. **Entregáveis:**
   - Resumo do schema externo (views por papel: admin, gerente de projeto, membro da equipe)
   - Schema conceitual com ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.)
   - Schema interno com DDL físico, índices, particionamento
   - Tabela de padrões de dados (regras de nomenclatura de campos, convenções de tipo)
   - Glossário (tenant, workspace, assignee, etc.)
   - Planilha de estimativa de capacidade
   - Estratégia de backup (full diário + incremental horário, retenção de 30 dias)
   - Script de migração

---

## Checklist do Portão de Qualidade

Após o agente entregar sua saída, verifique estes itens antes de aceitar:

### Verificações Universais (Todos os Agentes)

- [ ] **Comportamento corresponde aos critérios de aceitação** — cada critério do seu prompt é satisfeito
- [ ] **Testes cobrem caminho feliz e casos de borda** — não apenas o caminho feliz
- [ ] **Sem alterações de arquivo não relacionadas** — apenas arquivos relevantes para a tarefa foram modificados
- [ ] **Módulos compartilhados não quebrados** — imports, tipos e interfaces usados por outro código ainda funcionam
- [ ] **Charter foi seguido** — as restrições "Must NOT do" foram respeitadas
- [ ] **Lint, typecheck, build passam** — execute as verificações padrão do seu projeto

### Específico de Frontend

- [ ] Acessibilidade: elementos interativos têm `aria-label`, headings semânticos, navegação por teclado funciona
- [ ] Mobile: renderiza corretamente em breakpoints 320px, 768px, 1024px, 1440px
- [ ] Performance: sem CLS, meta de FCP atingida
- [ ] Error boundaries e loading skeletons implementados
- [ ] Componentes shadcn/ui não modificados diretamente (wrappers usados)
- [ ] Imports absolutos com `@/` (sem `../../` relativos)

### Específico de Backend

- [ ] Arquitetura limpa mantida: sem lógica de negócio em route handlers
- [ ] Todas as entradas validadas (sem confiar em entrada do usuário)
- [ ] Apenas queries parametrizadas (sem interpolação de string em SQL)
- [ ] Exceções customizadas via módulo centralizado de erros (sem exceções HTTP brutas)
- [ ] Endpoints de auth com rate limiting

### Específico de Mobile

- [ ] Todos os controllers dispostos no método `dispose()`
- [ ] Offline tratado graciosamente
- [ ] Meta de 60fps mantida (sem jank)
- [ ] Testado em iOS e Android

### Específico de Banco de Dados

- [ ] Pelo menos 3NF (ou justificativa documentada para desnormalização)
- [ ] Todas as três camadas de schema documentadas (externa, conceitual, interna)
- [ ] Restrições de integridade explícitas (entidade, domínio, referencial, regra de negócio)
- [ ] Revisão de anti-padrões completada

---

## Sinais de Escalação

Observe estes sinais que indicam que você deve mudar de skill única para execução multi-agente:

| Sinal | O Que Significa | Ação |
|-------|----------------|------|
| Agente diz "this requires a backend change" | Tarefa tem dependências cross-domínio | Mude para `/work` — adicione agente backend |
| CHARTER_CHECK do agente mostra itens "Must NOT do" que são realmente necessários | Escopo excede um domínio | Planeje a funcionalidade completa com `/plan` primeiro |
| Correção se propaga em 3+ arquivos em diferentes camadas | Uma correção afeta múltiplos domínios | Use `/debug` com escopo mais amplo, ou `/work` |
| Agente descobre incompatibilidade de contrato de API | Desacordo frontend/backend | Execute `/plan` para definir contratos, depois re-spawne ambos os agentes |
| Portão de qualidade falha em pontos de integração | Componentes não conectam corretamente | Adicione etapa de revisão QA: `oma agent:spawn qa "Review integration"` |
| Tarefa cresce de "um componente" para "três componentes + nova rota + API" | Desvio de escopo durante execução | Pare, execute `/plan` para decompor, depois `/orchestrate` |
| Agente bloqueia com HIGH clarification | Requisitos fundamentalmente ambíguos | Responda as perguntas do agente ou execute `/brainstorm` para clarificar abordagem |

### A Regra Geral

Se você se encontrar re-spawnando o mesmo agente mais de duas vezes com refinamentos, a tarefa é provavelmente multi-domínio e precisa de `/work` ou no mínimo uma etapa de `/plan` para decompô-la adequadamente.
