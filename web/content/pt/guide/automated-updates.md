---
title: "Guia: Atualizações Automatizadas"
description: "Documentação completa da GitHub Action do oh-my-agent — setup, todos os inputs e outputs, exemplos detalhados, como funciona por baixo dos panos e comparação com o registro central."
---

# Guia: Atualizações Automatizadas

## Visão Geral

A GitHub Action do oh-my-agent (`first-fluke/oma-update-action@v1`) atualiza automaticamente as skills de agentes do seu projeto executando `oma update` no CI. Suporta dois modos: criar um pull request para revisão, ou commitar diretamente em uma branch.

---

## Setup Rápido

Adicione este arquivo ao seu projeto como `.github/workflows/update-oh-my-agent.yml`:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Toda segunda-feira às 9am UTC
  workflow_dispatch:        # Permitir trigger manual

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
```

Essa é a configuração mínima. Cria um PR com configurações padrão quando uma nova versão está disponível.

---

## Todos os Inputs da Action

| Input | Tipo | Obrigatório | Padrão | Descrição |
|:------|:-----|:-----------|:-------|:-----------|
| `mode` | string | Não | `"pr"` | Como aplicar mudanças. `"pr"` cria um pull request. `"commit"` faz push direto para a branch base. |
| `base-branch` | string | Não | `"main"` | Branch base para o PR (no modo `pr`) ou branch alvo para commits diretos (no modo `commit`). |
| `force` | string | Não | `"false"` | Passa `--force` para `oma update`. Quando `"true"`, sobrescreve arquivos de config customizados (`user-preferences.yaml`, `mcp.json`) e diretórios `stack/`. Normalmente estes são preservados. |
| `pr-title` | string | Não | `"chore(deps): update oh-my-agent skills"` | Título customizado para o pull request. Usado apenas no modo `pr`. |
| `pr-labels` | string | Não | `"dependencies,automated"` | Labels separadas por vírgula para adicionar ao PR. Usado apenas no modo `pr`. |
| `commit-message` | string | Não | `"chore(deps): update oh-my-agent skills"` | Mensagem de commit customizada. Usada em ambos os modos. |
| `token` | string | Não | `${{ github.token }}` | Token do GitHub para criar PRs. Use um Personal Access Token (PAT) se precisar que o PR acione outros workflows. |

---

## Todos os Outputs da Action

| Output | Tipo | Descrição | Disponível |
|:-------|:-----|:----------|:---------|
| `updated` | string | `"true"` se mudanças foram detectadas após executar `oma update`. `"false"` se já está atualizado. | Sempre |
| `version` | string | A versão do oh-my-agent após a atualização. Lida de `.agents/skills/_version.json`. | Quando `updated` é `"true"` |
| `pr-number` | string | O número do pull request. | Apenas no modo `pr` quando PR é criado |
| `pr-url` | string | A URL completa do pull request criado. | Apenas no modo `pr` quando PR é criado |

---

## Exemplos Detalhados

### Exemplo 1: Modo PR Padrão

O setup mais comum. Cria um PR toda segunda se atualizações estão disponíveis.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        id: update

      - name: Summary
        if: steps.update.outputs.updated == 'true'
        run: |
          echo "Updated to version ${{ steps.update.outputs.version }}"
          echo "PR: ${{ steps.update.outputs.pr-url }}"
```

### Exemplo 2: Modo Commit Direto com PAT

Para equipes que querem atualizações aplicadas imediatamente sem etapa de revisão via PR.

```yaml
name: Update oh-my-agent (Direct)

on:
  schedule:
    - cron: '0 6 * * *'  # Diariamente às 6am UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.OH_MY_AGENT_PAT }}

      - uses: first-fluke/oma-update-action@v1
        with:
          mode: commit
          token: ${{ secrets.OH_MY_AGENT_PAT }}
          commit-message: "chore: auto-update oh-my-agent skills"
          base-branch: develop
```

**Importante:** Use `secrets.OH_MY_AGENT_PAT` (um Fine-Grained PAT com permissão Contents: Write) em vez de `github.token`. O `GITHUB_TOKEN` padrão cria commits que não acionam outros workflows.

### Exemplo 3: Notificação Condicional

Atualizar com notificação Slack quando nova versão está disponível.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        id: update

      - name: Notify Slack
        if: steps.update.outputs.updated == 'true'
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "oh-my-agent updated to v${{ steps.update.outputs.version }}. PR: ${{ steps.update.outputs.pr-url }}"
            }
```

**Padrão-chave:** Use `steps.update.outputs.updated == 'true'` para executar condicionalmente etapas downstream apenas quando uma atualização real ocorreu.

### Exemplo 4: Modo Force com Labels Customizadas

Para projetos que querem resetar todos os arquivos de config para padrões na atualização.

```yaml
name: Update oh-my-agent (Force)

on:
  workflow_dispatch:  # Apenas trigger manual para atualizações force

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        with:
          force: 'true'
          pr-title: "chore(deps): force-update oh-my-agent skills (reset configs)"
          pr-labels: "dependencies,automated,force-update"
```

**Aviso:** Modo force sobrescreve `user-preferences.yaml`, `mcp.json` e diretórios `stack/`. Use apenas quando quiser resetar todas as customizações para padrões.

---

## Como Funciona por Baixo dos Panos

A action é uma [composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) definida em `action/action.yml`. Executa 4 etapas:

### Step 1: Setup Bun
Instala o runtime Bun, necessário para executar o CLI oh-my-agent.

### Step 2: Instalar oh-my-agent
```bash
bun install -g oh-my-agent
```

### Step 3: Executar oma update
```bash
oma update --ci
```
A flag `--ci` executa a atualização em modo não-interativo. A flag `--force`, quando habilitada, sobrescreve arquivos de config customizados pelo usuário.

O que `oma update --ci` faz internamente:
1. Busca `prompt-manifest.json` da branch main para obter o número da versão mais recente.
2. Compara com a versão local em `.agents/skills/_version.json`.
3. Se versões correspondem, sai com "Already up to date."
4. Se nova versão disponível, baixa e extrai o tarball mais recente.
5. Preserva arquivos customizados pelo usuário (a menos que `--force`).
6. Copia novos arquivos sobre o diretório `.agents/` existente.
7. Restaura arquivos preservados.
8. Atualiza adaptações de vendor e atualiza symlinks.

### Step 4: Verificar Mudanças
Verifica se `oma update` realmente alterou arquivos em `.agents/` ou `.claude/`. Define os outputs `updated` e `version` adequadamente.

Após isso, dependendo do input `mode`:
- **Modo `pr`:** Usa `peter-evans/create-pull-request@v8` para criar um PR.
- **Modo `commit`:** Configura git como `github-actions[bot]`, faz staging, commit e push.

---

## Comparação com Registro Central

| Aspecto | GitHub Action | Registro Central |
|:--------|:-------------|:----------------|
| **Arquivos para adicionar** | 1 arquivo de workflow | 3 arquivos |
| **Fonte de atualização** | Registro npm | Artefatos de GitHub Release |
| **Fixação de versão** | Não — sempre a mais recente | Sim — explícita em .agent-registry.yml |
| **Verificação de checksum** | Não | Sim — SHA256 |
| **Preservação de config** | Automática | Manual (configurar padrões de preservação) |
| **Opção de commit direto** | Sim (mode: commit) | Não integrada |
| **Melhor para** | Projetos simples, equipe única | Organizações multi-projeto, necessidades de conformidade |

Para a maioria das equipes, a GitHub Action é suficiente. Use o registro central quando precisar de fixação de versão, verificação de checksum ou atualizações coordenadas entre muitos projetos.
