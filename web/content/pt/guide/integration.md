---
title: "Guia: Integração em Projeto Existente"
description: "Guia completo para adicionar oh-my-agent a um projeto existente — caminho CLI, caminho manual, verificação, estrutura de symlinks SSOT e o que o instalador faz por baixo dos panos."
---

# Guia: Integração em Projeto Existente

## Dois Caminhos de Integração

Existem duas formas de adicionar oh-my-agent a um projeto existente:

1. **Caminho CLI** — Execute `oma` (ou `npx oh-my-agent`) e siga os prompts interativos. Recomendado para a maioria dos usuários.
2. **Caminho manual** — Copie arquivos e configure symlinks você mesmo. Útil para ambientes restritos ou setups customizados.

Ambos os caminhos produzem o mesmo resultado: um diretório `.agents/` (o SSOT) com symlinks apontando diretórios específicos de IDE para ele.

---

## Caminho CLI: Passo a Passo

### 1. Instalar o CLI

```bash
# Instalação global (recomendado)
bun install --global oh-my-agent

# Ou use npx para execuções únicas
npx oh-my-agent
```

Após instalação global, dois aliases ficam disponíveis: `oma` e `oh-my-ag`.

### 2. Navegar até a Raiz do Projeto

```bash
cd /path/to/your/project
```

O instalador espera executar da raiz do projeto (onde `.git/` reside).

### 3. Executar o Instalador

```bash
oma
```

O comando padrão (sem subcomando) lança o instalador interativo.

### 4. Selecionar Tipo de Projeto

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

### 5. Escolher Linguagem Backend (se aplicável)

Se você selecionou um preset que inclui a skill backend, você é questionado sobre a variante de linguagem:

- **Python** — FastAPI/SQLAlchemy (padrão)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Other / Auto-detect** — Configurar depois com `/stack-set`

### 6. Configurar Symlinks de IDE

O instalador sempre cria symlinks para Claude Code (`.claude/skills/`). Se um diretório `.github/` existe, também cria symlinks para GitHub Copilot automaticamente. Caso contrário, pergunta:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Setup do Git Rerere

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

## Caminho Manual

Para ambientes onde o CLI interativo não está disponível (pipelines CI, shells restritos, máquinas corporativas).

### Step 1: Download e Extração

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

### Step 2: Copiar Arquivos para Seu Projeto

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

### Step 3: Configurar Preferências do Usuário

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/config/user-preferences.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini

agent_cli_mapping:
  frontend: gemini
  backend: gemini
  mobile: gemini
  qa: gemini
  debug: gemini
  pm: gemini
EOF
```

### Step 4: Inicializar Diretório de Memória

```bash
oma memory:init
# Ou manualmente:
mkdir -p /path/to/your/project/.serena/memories
```

---

## Checklist de Verificação

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
| **Instalações CLI** | gemini, claude, codex, qwen — versão e disponibilidade |
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
cat .agents/config/user-preferences.yaml

# Verificar diretório de memória
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# Verificar versão
cat .agents/skills/_version.json 2>/dev/null
```

---

## Estrutura de Symlinks Multi-IDE (Conceito SSOT)

oh-my-agent usa uma arquitetura de Única Fonte de Verdade (SSOT). O diretório `.agents/` é o único lugar onde skills, workflows, configs e definições de agentes residem. Todos os diretórios específicos de IDE contêm apenas symlinks apontando de volta para `.agents/`.

### Layout de Diretórios

```
your-project/
  .agents/                          # SSOT — os arquivos reais residem aqui
    agents/                         # Arquivos de definição de agentes
    config/                         # Configuração
    mcp.json                        # Configuração do servidor MCP
    plan.json                       # Plano atual (gerado por /plan)
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

### Por Que Symlinks?

- **Uma atualização, todos os IDEs se beneficiam.** Quando `oma update` atualiza `.agents/`, cada IDE recebe as mudanças automaticamente.
- **Sem duplicação.** Skills são armazenadas uma vez, não copiadas por IDE.
- **Remoção segura.** Deletar `.claude/` não destrói suas skills. O SSOT em `.agents/` permanece intacto.
- **Git-friendly.** Symlinks são pequenos e fazem diff limpo.

---

## Dicas de Segurança e Estratégia de Rollback

### Antes da Instalação

1. **Commit seu trabalho atual.** O instalador cria novos diretórios e arquivos. Ter um estado git limpo significa que você pode `git checkout .` para desfazer tudo.
2. **Verifique se existe um diretório `.agents/`.** Se existir de outra ferramenta, faça backup primeiro. O instalador irá sobrescrevê-lo.

### Após Instalação

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

## Configuração de Dashboard

Após instalação, você pode configurar monitoramento em tempo real. Veja o [guia de Monitoramento com Dashboard](/guide/dashboard-monitoring) para detalhes completos.

Setup rápido:

```bash
# Dashboard no terminal (observa .serena/memories/ para mudanças)
oma dashboard

# Dashboard web (baseado em browser, http://localhost:9847)
oma dashboard:web
```

---

## O que o Instalador Faz por Baixo dos Panos

Quando você executa `oma` (o comando de instalação), aqui está exatamente o que acontece:

### 1. Migração Legada

O instalador verifica a existência do diretório antigo `.agent/` (singular) e migra para `.agents/` (plural) se encontrado. Esta é uma migração única para usuários atualizando de versões anteriores.

### 2. Detecção de Concorrentes

O instalador escaneia ferramentas concorrentes e oferece removê-las para evitar conflitos.

### 3. Download do Tarball

O instalador baixa o tarball de release mais recente dos releases do GitHub do oh-my-agent. Este tarball contém o diretório `.agents/` completo com todas as skills, recursos compartilhados, workflows, configs e definições de agentes.

### 4-11. Instalação de Recursos, Workflows, Configs, Skills, Adaptações de Vendor, Symlinks CLI, Workflows Globais, Configuração Git Rerere + MCP

Cada etapa instala um aspecto específico do framework, preservando configs existentes a menos que `--force` seja usado.
