---
title: "Guia: Registro Central"
description: "Documentação detalhada do registro central — workflow release-please, commits convencionais, templates para consumidores, formato .agent-registry.yml e comparação com a abordagem GitHub Action."
---

# Guia: Registro Central

## Visão Geral

O modelo de registro central trata o repositório GitHub do oh-my-agent (`first-fluke/oh-my-agent`) como uma fonte de artefatos versionados. Projetos consumidores puxam versões específicas de skills e workflows deste registro, garantindo consistência entre equipes e projetos.

Esta é a abordagem de nível empresarial para organizações que precisam de:
- Fixação de versão entre múltiplos projetos.
- Trilhas de atualização auditáveis via pull requests.
- Verificação de checksum para artefatos baixados.
- Verificações automatizadas semanais de atualização.
- Revisão manual antes de qualquer atualização ser aplicada.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                  Registro Central                         │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────┐  │
│  │ release-      │   │ CHANGELOG.md    │   │ Releases  │  │
│  │ please        │──►│ .release-       │──►│  - tarball│  │
│  │ workflow      │   │  please-        │   │  - sha256 │  │
│  │              │   │  manifest.json  │   │  - manifest│  │
│  └──────────────┘   └────────────────┘   └─────┬─────┘  │
│                                                 │        │
└─────────────────────────────────────────────────┼────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
              ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
              │ Projeto A  │              │ Projeto B    │ │ Projeto C  │
              │ .agent-    │              │ .agent-      │ │ .agent-    │
              │ registry   │              │ registry     │ │ registry   │
              │ .yml       │              │ .yml         │ │ .yml       │
              └────────────┘              └──────────────┘ └────────────┘
```

---

## Para Mantenedores: Lançando Novas Versões

### Workflow Release-Please

oh-my-agent usa [release-please](https://github.com/googleapis/release-please) para automatizar releases. O fluxo é:

1. **Commits convencionais** chegam em `main`. Cada commit deve seguir o formato [Conventional Commits](https://www.conventionalcommits.org/):

   | Prefixo | Significado | Bump de Versão |
   |:--------|:-----------|:--------------|
   | `feat:` | Nova funcionalidade | Minor (1.x.0) |
   | `fix:` | Correção de bug | Patch (1.0.x) |
   | `feat!:` ou `BREAKING CHANGE:` | Mudança breaking | Major (x.0.0) |
   | `chore:` | Manutenção | Sem bump (a menos que configurado) |
   | `docs:` | Documentação | Sem bump |
   | `refactor:` | Reestruturação de código | Sem bump |
   | `perf:` | Melhoria de performance | Patch |

2. **Release-please cria um PR de release** que bumpa a versão e atualiza `CHANGELOG.md`.

3. **Quando o PR de release é merged**, release-please cria uma tag Git e um GitHub Release.

4. **Um workflow CI** então builda o tarball `agent-skills.tar.gz`, gera um checksum SHA256 e `prompt-manifest.json`, e anexa todos os artefatos ao GitHub Release.

### Artefatos de Release

Cada release produz três artefatos:

| Artefato | Descrição | Propósito |
|:---------|:----------|:--------|
| `agent-skills.tar.gz` | Tarball comprimido do diretório `.agents/` | Contém todas as skills, workflows, configs, agentes |
| `agent-skills.tar.gz.sha256` | Checksum SHA256 do tarball | Verificação de integridade antes da extração |
| `prompt-manifest.json` | JSON com versão, contagem de arquivos e metadados | Usado por `oma update` para verificar novas versões |

---

## Para Consumidores: Configurando Seu Projeto

### Arquivos Template

oh-my-agent fornece arquivos template em `docs/consumer-templates/` que você copia para seu projeto:

1. **`.agent-registry.yml`** — Arquivo de configuração colocado na raiz do projeto.
2. **`check-registry-updates.yml`** — Workflow GitHub Actions colocado em `.github/workflows/`.
3. **`sync-agent-registry.yml`** — Workflow GitHub Actions colocado em `.github/workflows/`.

### Formato do .agent-registry.yml

Este arquivo reside na raiz do seu projeto e controla como ele interage com o registro central.

```yaml
# Repositório do registro central
registry:
  repo: first-fluke/oh-my-agent

# Fixação de versão
version: "4.7.0"

# Configurações de auto-atualização
auto_update:
  enabled: true
  schedule: "0 9 * * 1"  # Toda segunda 9am UTC
  pr:
    auto_merge: false     # Desabilitado por design
    labels:
      - "dependencies"
      - "agent-registry"

# Configurações de sync
sync:
  target_dir: "."
  backup_existing: true
  preserve:
    - ".agent/oma-config.yaml"
    - ".agent/config/local-*"
```

**Campos-chave explicados:**

- **`version`** — Fixe em uma versão específica para reprodutibilidade. Use `"latest"` apenas para projetos experimentais.
- **`auto_update.enabled`** — Quando true, o workflow de verificação executa no schedule.
- **`auto_update.pr.auto_merge`** — Sempre `false` por design. Atualizações requerem revisão manual.
- **`sync.preserve`** — Padrões glob para arquivos que não devem ser sobrescritos durante sync.

### Papéis dos Workflows

#### check-registry-updates.yml

**Propósito:** Verifica novas versões e cria um PR se uma atualização está disponível.

**Trigger:** Schedule cron (padrão: semanal) ou dispatch manual.

**Fluxo:**
1. Lê a versão atual do `.agent-registry.yml`.
2. Busca a tag de release mais recente do repo do registro via API do GitHub.
3. Compara versões — sai se já está atualizado.
4. Se atualização disponível: cria branch, atualiza versão, cria PR com informações de changelog.

#### sync-agent-registry.yml

**Propósito:** Baixa e aplica os arquivos do registro quando a versão muda.

**Trigger:** Push para `main` que modifica `.agent-registry.yml`, ou dispatch manual.

**Fluxo:**
1. Lê a versão do `.agent-registry.yml`.
2. Baixa artefatos de release: tarball, checksum e manifest.
3. Verifica checksum SHA256.
4. Faz backup do diretório `.agents/` existente.
5. Extrai o tarball.
6. Restaura arquivos preservados do backup.
7. Commita os arquivos sincronizados.

---

## Comparação: Registro Central vs GitHub Action

| Aspecto | Registro Central | GitHub Action |
|:--------|:----------------|:-------------|
| **Complexidade de setup** | Maior — 3 arquivos para configurar | Menor — 1 arquivo de workflow |
| **Controle de versão** | Fixação explícita em `.agent-registry.yml` | Sempre atualiza para a mais recente |
| **Verificação de checksum** | Sim — SHA256 verificado antes da extração | Não — depende do registro npm |
| **Rollback** | Mudar versão em `.agent-registry.yml` | Reverter o commit de atualização |
| **Trilha de auditoria** | PRs com fixação de versão e labels | Histórico de commits |
| **Arquivos preservados** | Padrões glob configuráveis | Integrado: `oma-config.yaml`, `mcp.json`, `stack/` |
| **Fluxo de aprovação** | Revisão de PR obrigatória (auto-merge desabilitado) | Configurável (modo PR ou commit direto) |
| **Melhor para** | Organizações multi-projeto, necessidades de conformidade | Maioria dos projetos, setup simples |

---

## Quando Usar Qual

### Use o Registro Central Quando:

- Você gerencia múltiplos projetos que precisam ficar na mesma versão.
- Você precisa de PRs de atualização auditáveis e revisáveis com verificação de checksum.
- Sua política de segurança requer aprovação explícita para atualizações de dependência.
- Você precisa fixar versões específicas e atualizar projetos em schedules diferentes.

### Use a GitHub Action Quando:

- Você tem um projeto único ou poucos projetos independentes.
- Você quer o setup mais simples possível (um arquivo de workflow).
- Você está confortável com atualizações automáticas para a versão mais recente.
- Você prefere o mecanismo direto `oma update` sobre extração de tarball.
