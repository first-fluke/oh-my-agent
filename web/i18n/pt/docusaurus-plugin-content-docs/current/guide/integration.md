---
title: "Guia: Integração em Projeto Existente"
description: "Guia completo para adicionar oh-my-agent a um projeto existente — caminho CLI, caminho manual, verificação, estrutura de symlinks SSOT e o que o instalador faz por baixo dos panos."
---

# Guia: Integração em Projeto Existente

## Dois caminhos de integração

Existem duas formas de adicionar oh-my-agent a um projeto existente:

1. **Caminho CLI** — Execute `oma` (ou `npx oh-my-agent`) e siga os prompts interativos. Recomendado para a maioria dos usuários.
2. **Caminho manual** — Copie arquivos e configure symlinks você mesmo. Útil para ambientes restritos ou setups customizados.

Ambos os caminhos produzem o mesmo resultado: um diretório `.agents/` (o SSOT) com symlinks apontando diretórios específicos de IDE para ele.

---

## Caminho CLI: passo a passo

### 1. Instalar o CLI

```bash
# Instalação global (recomendado)
bun install --global oh-my-agent

# Ou use npx para execuções únicas
npx oh-my-agent
```

Após instalação global, o comando `oma` (ou `oh-my-agent`) fica disponível.

### 2. Navegar até a raiz do projeto

```bash
cd /path/to/your/project
```

O instalador espera executar da raiz do projeto (onde `.git/` reside).

### 3. Executar o instalador

```bash
oma
```

O comando padrão (sem subcomando) lança o instalador interativo.

### 4. Selecionar tipo de projeto

O instalador apresenta estes presets:

| Preset | Skills Incluídas |
|:-------|:---------------|
| **All** | Todas as skills disponíveis |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | Skills React/Next.js |
| **Backend** | Skills Python/Node.js/Rust backend |
| **Mobile** | Skills Flutter/Dart mobile |
| **DevOps** | Terraform + CI/CD + Workflow skills |
| **Custom** | Escolha skills individuais da lista completa |

### 5. Escolher linguagem backend (se aplicável)

Se você selecionou um preset que inclui a skill backend, você é questionado sobre a variante de linguagem:

- **Python** — FastAPI/SQLAlchemy (padrão)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Other / Auto-detect** — Configurar depois com `/stack-set`

### 6. Configurar symlinks de IDE

O instalador sempre cria symlinks para Claude Code (`.claude/skills/`). Também gera arquivos de agentes e hooks nativos de vendor para Antigravity, Claude, Codex e Qwen, e se um diretório `.github/` existe, também cria symlinks para GitHub Copilot automaticamente. Caso contrário, pergunta:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Setup do git rerere

O instalador verifica se `git rerere` (reuse recorded resolution) está habilitado. Se não, oferece habilitá-lo globalmente:

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse)
```

Isso é recomendado porque workflows multi-agente podem produzir conflitos de merge, e rerere lembra como você os resolveu para que a mesma resolução seja aplicada automaticamente na próxima vez.

### 8. Configuração MCP

Se existe uma config de MCP do Antigravity IDE (`~/.gemini/antigravity/mcp_config.json`), o instalador oferece configurar a bridge Serena MCP.

Similarmente, se existem configurações do Gemini CLI (`~/.gemini/settings.json`), oferece configurar Serena para Gemini CLI em modo HTTP.

### 9. Conclusão

O instalador exibe um resumo de tudo instalado:
- Lista de skills instaladas
- Localização do diretório de skills
- Symlinks criados
- Itens pulados (se houver)

---

## Caminho manual

Para ambientes onde o CLI interativo não está disponível (pipelines CI, shells restritos, máquinas corporativas).

### Step 1: download e extração

```bash
# Baixar o tarball mais recente do registro
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verificar checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extrair
tar -xzf agent-skills.tar.gz
```

### Step 2: copiar arquivos para seu projeto

```bash
# Copiar o diretório core .agents/
cp -r .agents/ /path/to/your/project/.agents/

# Criar symlinks para Claude Code
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# Symlink skills (exemplo para projeto fullstack)
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/oma-qa /path/to/your/project/.claude/skills/oma-qa
ln -sf ../../.agents/skills/oma-pm /path/to/your/project/.claude/skills/oma-pm

# Symlink recursos compartilhados
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared

# Symlink routers de workflow
for workflow in .agents/workflows/*.md; do
  name=$(basename "$workflow" .md)
  ln -sf ../../.agents/workflows/"$name".md /path/to/your/project/.claude/skills/"$name".md
done

# Symlink definições de agentes
for agent in .agents/agents/*.md; do
  name=$(basename "$agent")
  ln -sf ../../.agents/agents/"$name" /path/to/your/project/.claude/agents/"$name"
done
```

### Step 3: configurar preferências do usuário

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity

agents:
  qa:    { model: anthropic/claude-sonnet-4-6 }
EOF
```

### Step 4: inicializar diretório de memória

```bash
oma memory:init
# Ou manualmente:
mkdir -p /path/to/your/project/.serena/memories
```

---

## Checklist de verificação

Após instalação (qualquer caminho), verifique se tudo está configurado corretamente:

```bash
# Execute o comando doctor para verificação completa de saúde
oma doctor

# Verifique formato de saída para CI
oma doctor --json
```

O comando doctor verifica:

| Verificação | O Que Verifica |
|:-----------|:--------------|
| **Instalações CLI** | agy, claude, codex, qwen — versão e disponibilidade |
| **Autenticação** | Status de API key ou OAuth para cada CLI |
| **Configuração MCP** | Setup do servidor Serena MCP para cada ambiente CLI |
| **Status das skills** | Quais skills estão instaladas e se estão atualizadas |

Comandos de verificação manual:

```bash
# Verificar se diretório .agents/ existe
ls -la .agents/

# Verificar se skills estão instaladas
ls .agents/skills/

# Verificar se symlinks apontam para alvos corretos
ls -la .claude/skills/

# Verificar se config existe
cat .agents/oma-config.yaml

# Verificar diretório de memória
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# Verificar versão
cat .agents/skills/_version.json 2>/dev/null
```

---

## Estrutura de symlinks Multi-IDE (conceito SSOT)

oh-my-agent usa uma arquitetura de Única Fonte de Verdade (SSOT). O diretório `.agents/` é o único lugar onde skills, workflows, configs e definições de agentes residem. Todos os diretórios específicos de IDE contêm apenas symlinks apontando de volta para `.agents/`.

### Layout de diretórios

```
your-project/
  .agents/                          # SSOT — os arquivos reais residem aqui
    agents/                         # Arquivos de definição de agentes
    config/                         # Configuração
    mcp.json                        # Configuração do servidor MCP
    results/plan-{sessionId}.json                       # Plano atual (gerado por /plan)
    skills/                         # Skills instaladas
    workflows/                      # Definições de workflow
    results/                        # Resultados de execução de agentes
  .claude/                          # Claude Code — apenas symlinks
    skills/                         # -> .agents/skills/* e .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — apenas symlinks (opcional)
    skills/                         # -> .agents/skills/*
  .serena/                          # Armazenamento de memória MCP
    memories/                       # Arquivos de memória em runtime
```

### Por que symlinks?

- **Uma atualização, todos os IDEs se beneficiam.** Quando `oma update` atualiza `.agents/`, cada IDE recebe as mudanças automaticamente.
- **Sem duplicação.** Skills são armazenadas uma vez, não copiadas por IDE.
- **Remoção segura.** Deletar `.claude/` não destrói suas skills. O SSOT em `.agents/` permanece intacto.
- **Git-friendly.** Symlinks são pequenos e fazem diff limpo.

---

## Dicas de segurança e estratégia de rollback

### Antes da instalação

1. **Commit seu trabalho atual.** O instalador cria novos diretórios e arquivos. Ter um estado git limpo significa que você pode `git checkout .` para desfazer tudo.
2. **Verifique se existe um diretório `.agents/`.** Se existir de outra ferramenta, faça backup primeiro. O instalador irá sobrescrevê-lo.

### Após instalação

1. **Revise o que foi criado.** Execute `git status` para ver todos os novos arquivos. O instalador cria arquivos apenas em `.agents/`, `.claude/` e opcionalmente `.github/`.
2. **Adicione ao `.gitignore` seletivamente.** A maioria das equipes commita `.agents/` e `.claude/` para compartilhar o setup. Mas `.serena/` (memória em runtime) e `.agents/results/` (resultados de execução) devem ser ignorados pelo git:

```gitignore
# Arquivos de runtime do oh-my-agent
.serena/
.agents/results/
.agents/state/
```

### Rollback

Para remover completamente oh-my-agent de um projeto:

```bash
# Remover o diretório SSOT
rm -rf .agents/

# Remover symlinks de IDE
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # se criado

# Remover arquivos de runtime
rm -rf .serena/
```

Ou simplesmente reverta com git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Configuração de dashboard

Após instalação, você pode configurar monitoramento em tempo real. Veja o [guia de Monitoramento com Dashboard](/docs/guide/dashboard-monitoring) para detalhes completos.

Setup rápido:

```bash
# Dashboard no terminal (observa .serena/memories/ para mudanças)
oma dashboard

# Dashboard web (baseado em browser, http://localhost:9847)
oma dashboard:web
```

---

## O que o instalador faz por baixo dos panos

Quando você executa `oma` (o comando de instalação), aqui está exatamente o que acontece:

### 1. Migração legada

O instalador verifica a existência do diretório antigo `.agent/` (singular) e migra para `.agents/` (plural) se encontrado. Esta é uma migração única para usuários atualizando de versões anteriores.

### 2. Detecção de concorrentes

O instalador escaneia ferramentas concorrentes e oferece removê-las para evitar conflitos.

### 3. Download do tarball

O instalador baixa o tarball de release mais recente dos releases do GitHub do oh-my-agent. Este tarball contém o diretório `.agents/` completo com todas as skills, recursos compartilhados, workflows, configs e definições de agentes.

### 4. Instalação de recursos compartilhados

`installShared()` copia o diretório `_shared/` para `.agents/skills/_shared/`. Inclui:

- `core/` — Roteamento de skills, carregamento de contexto, estrutura de prompt, princípios de qualidade, detecção de vendor, contratos de API.
- `runtime/` — Protocolo de memória, protocolos de execução por vendor.
- `conditional/` — Recursos carregados apenas quando condições específicas são atendidas (quality score, exploration loop).

### 5. Instalação de workflows

`installWorkflows()` copia todos os arquivos de workflow para `.agents/workflows/`. Estas são as definições para `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` e `/stack-set`.

### 6. Instalação de configs

`installConfigs()` copia arquivos de configuração padrão para `.agents/config/`, incluindo `oma-config.yaml` e `mcp.json`. Se estes arquivos já existem, são preservados (não sobrescritos) a menos que `--force` seja usado.

### 7. Instalação de skills

Para cada skill selecionada, `installSkill()` copia o diretório da skill para `.agents/skills/{skill-name}/`. Se uma variante foi selecionada (ex: Python para backend), também configura o diretório `stack/` com recursos específicos da linguagem.

### 8. Adaptações de vendor

`installVendorAdaptations()` instala arquivos específicos de IDE para todos os vendors suportados (Antigravity, Claude, Codex, Qwen):

- Definições de agentes (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Configurações de hook (`.claude/hooks/`)
- Arquivos de settings e docs de integração de vendor (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`)

### 9. Symlinks CLI

`createCliSymlinks()` cria symlinks dos diretórios específicos de IDE para o SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (se Copilot habilitado)

Arquivos nativos de agente por vendor são gerados a partir de `.agents/agents/` por `oma link`, `oma install` ou `oma update`, em vez de symlinkados diretamente.

### 10. Workflows globais

`installGlobalWorkflows()` instala arquivos de workflow que podem ser necessários globalmente (fora do diretório do projeto).

### 11. Git rerere + configuração MCP

Conforme descrito no caminho CLI acima, o instalador opcionalmente configura git rerere e settings de MCP.
