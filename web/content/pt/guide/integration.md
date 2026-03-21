---
title: Integração com Projeto Existente
description: Fluxo de integração seguro e não-destrutivo para adicionar skills do oh-my-agent a um projeto Antigravity existente.
---

# Integrar em um Projeto Existente

Este guia substitui o fluxo legado do `AGENT_GUIDE.md` na raiz e reflete a estrutura atual de workspace (`cli` + `web`) e o comportamento da CLI.

## Objetivo

Adicionar skills do `oh-my-agent` a um projeto existente sem sobrescrever os assets atuais.

## Caminho Recomendado (CLI)

Execute isto na raiz do projeto alvo:

```bash
bunx oh-my-agent
```

O que ele faz:

- Instala ou atualiza `.agents/skills/*`
- Instala recursos compartilhados em `.agents/skills/_shared`
- Instala `.agents/workflows/*`
- Instala `.agents/config/user-preferences.yaml`
- Opcionalmente instala workflows globais em `~/.gemini/antigravity/global_workflows`

## Caminho Manual Seguro

Use quando precisar de controle total sobre cada diretório copiado.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Copiar apenas diretórios de skills ausentes (exemplo)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copiar recursos compartilhados se ausentes
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Copiar workflows se ausentes
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copiar preferências de usuário padrão apenas se ausentes
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Checklist de Verificação

```bash
# 9 skills instaláveis (excluindo _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Recursos compartilhados
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Verificação básica de saúde dos comandos
bunx oh-my-agent doctor
```

## Dashboards Opcionais

Os dashboards são opcionais e utilizam a CLI instalada:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

URL padrão do dashboard web: `http://localhost:9847`

## Estratégia de Rollback

Antes da integração, crie um commit de checkpoint no seu projeto:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Se precisar desfazer, reverta esse commit com o processo normal da sua equipe.

## Suporte a Symlinks Multi-CLI

Quando você executar `bunx oh-my-agent`, verá este prompt após selecionar as skills:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Selecione quaisquer ferramentas CLI adicionais que você utiliza junto com o Antigravity. O instalador irá:

1. Instalar skills em `.agents/skills/` (localização nativa do Antigravity)
2. Criar symlinks do diretório de skills de cada CLI selecionada para `.agents/skills/`

Isso garante uma fonte única da verdade enquanto permite que as skills funcionem em múltiplas ferramentas CLI.

### Estrutura de Symlinks

```
.agents/skills/oma-frontend/      <- Fonte (SSOT)
.claude/skills/oma-frontend/     -> ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     -> ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

O instalador ignora symlinks existentes e alerta se um diretório real existir no local de destino.

## Observações

- Não sobrescreva pastas existentes em `.agents/skills/*` a menos que pretenda substituir skills personalizadas.
- Mantenha arquivos de política específicos do projeto (`.agents/config/*`) sob a propriedade do seu repositório.
- Para padrões de orquestração multi-agente, continue com o [`Guia de Uso`](./usage.md).
