---
title: "Guia: Integração com projeto existente"
sidebar_label: Projetos existentes
description: "Guia completo para adicionar o oh-my-agent a um projeto existente, cobrindo o caminho pela CLI, o caminho manual, a verificação, a estrutura de symlinks do SSOT e o funcionamento interno do instalador."
---

# Guia: Integração com projeto existente

## Dois caminhos de integração

Há duas formas de adicionar o oh-my-agent a um projeto existente:

1. **Caminho pela CLI:** execute `oma` (ou `npx oh-my-agent`) e siga os prompts interativos. É o caminho recomendado para a maioria das pessoas.
2. **Caminho manual:** copie os arquivos e configure os symlinks por conta própria. É útil em ambientes restritos ou configurações personalizadas.

Os dois caminhos produzem o mesmo resultado: um diretório `.agents/` (o SSOT) e arquivos nativos gerados pelos vendors, como `.claude/agents/`, `.codex/agents/` e `.qwen/agents/`.

---

## Caminho pela CLI: passo a passo

### 1. Instale a CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

Depois da instalação global, o comando `oma` (ou `oh-my-agent`) fica disponível.

### 2. Vá para a raiz do projeto

```bash
cd /path/to/your/project
```

Execute o instalador a partir do diretório do projeto que você quer configurar. O OMA grava o SSOT relativo à raiz da instalação; recomenda-se um repositório Git para revisão e rollback, mas o instalador não exige um.

### 3. Execute o instalador

```bash
oma
```

O comando padrão (sem subcomando) inicia o instalador interativo.

### 4. Selecione o tipo de projeto

O instalador pergunta **What type of project?** e oferece um [preset de skills](../getting-started/glossary.md#skill-preset): All, Fullstack, Fullstack Web, Fullstack Mobile, Frontend, Backend, Mobile, DevOps, Research, Content ou Custom (escolha skills individuais). Execuções não interativas usam All. As skills de cada preset estão listadas em [Instalação → Presets](../getting-started/installation.md#presets).

### 5. Escolha a linguagem do backend (se aplicável)

Se você selecionou um preset que inclui a skill de backend, será solicitado que escolha uma variante de linguagem:

- **Python:** FastAPI/SQLAlchemy (padrão)
- **Node.js:** NestJS/Hono + Prisma/Drizzle
- **Rust:** Axum/Actix-web
- **Other / Auto-detect:** configure mais tarde com `/stack-set`

### 6. Configure os symlinks da IDE

O instalador pergunta **CLI tools to configure (deselect all to skip):** e oferece Claude Code, Codex, Command Code, GitHub Copilot, Cursor, Grok, Kiro CLI, OpenCode, pi (Earendil), Antigravity CLI (agy), Hermes Agent, Kimi Code CLI, Qwen Code e ZCode. Antigravity CLI, Hermes Agent e Kimi Code CLI não são oferecidos no Windows nem quando `CI` está definido.

Para cada ferramenta selecionada, ele cria symlinks de skills (por exemplo, `.claude/skills/` para o Claude Code) e gera os arquivos nativos de agente, hooks, configurações e arquivos de integração do vendor. pi e OpenCode são caminhos de extensão. Quando você seleciona **ZCode**, ele expõe workflows como slash commands por meio de symlinks `.zcode/commands/*.md` (somente workflows, sem arquivos de agentes ou hooks).

### 7. Configuração global de git recomendada

Perto do fim de `oma install` e `oma update`, a CLI inspeciona duas configurações **globais** do git que ajudam em workflows multiagente:

| Chave | Valor desejado | Motivo |
|:------|:---------------|:-------|
| `rerere.enabled` | `true` | Reutiliza resoluções registradas: merges multiagente frequentemente encontram os mesmos conflitos, e o rerere reaplica a correção anterior |
| `init.defaultBranch` | `main` | Mantém um nome de branch padrão consistente para novos repositórios |

Se um valor estiver ausente ou diferente, a CLI oferece uma confirmação interativa (padrão **sim**):

```text
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

Aceitar executa o equivalente a:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

Os caminhos **não interativos** (`--yes`, `--ci`, `CI=true`) nunca escrevem a configuração global do git. Eles apenas exibem uma nota de que a ação foi ignorada, com os comandos para corrigi-la manualmente.

`oma doctor` informa as mesmas verificações em **Git Config**, conta divergências como problemas, expõe-as como `gitRecommended` na saída `--json` e pode aplicar correções de modo interativo.

### 8. Configuração do MCP

Não há um prompt separado para o MCP. Quando o Serena é o provider de inteligência de código (o padrão), install e update gravam a entrada MCP do Serena para os vendors selecionados. Em uma instalação de projeto, a entrada fica assim:

```json
{
  "mcpServers": {
    "serena": {
      "command": "oma",
      "args": ["bridge", "--context", "oma"],
      "env": { "SERENA_LOG_LEVEL": "info" }
    }
  }
}
```

`oma bridge` inicia ou reutiliza o próprio servidor Serena. Uma instalação global adiciona `--oma-home <OMA_HOME>` a `args`. Não copie trechos antigos que executam `npx -y oh-my-agent@latest bridge http://localhost:12341/mcp`: essa porta pertencia a um daemon que pode ter encerrado, então os clientes podiam ficar esperando por ela indefinidamente. A migração 027 reescreve essa entrada aposentada na configuração do Antigravity Desktop.

### 9. Conclusão

O instalador exibe um resumo de tudo o que foi instalado:
- lista de skills instaladas;
- localização do diretório de skills;
- symlinks criados;
- itens ignorados (se houver).

---

## Caminho manual

Para ambientes em que o instalador interativo não pode ser executado (pipelines de CI, shells restritos ou máquinas corporativas). Você ainda precisa da CLI `oma` para `oma link` e `oma memory init`; apenas o download da release e os prompts são manuais.

### Etapa 1: baixe e extraia

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Etapa 2: copie os arquivos para o projeto

```bash
# Copy the contents of the core .agents/ directory (works whether or not the target exists)
mkdir -p /path/to/your/project/.agents
cp -R .agents/. /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` regenera `.claude/`, `.codex/`, `.qwen/` e outros arquivos nativos de vendors a partir de `.agents/agents/`. Em runtime, o OMA usa dispatch nativo somente quando o vendor do runtime atual coincide com o vendor-alvo daquele agente. Configurações com vários vendors continuam funcionando, mas agentes que não coincidem recorrem ao `oma agent spawn` externo.

Para o Qwen Code, as definições Markdown geradas ficam em `.qwen/agents/`. Selecione um papel do OMA por meio do `subagent_type` da ferramenta Agent, por exemplo `backend-engineer`. Confira as definições disponíveis com `/agents manage` no Qwen Code. Os agentes nativos usam o mesmo [ciclo de vida do resultado](./agent-results-and-resume.md) dos spawns pela CLI: `oma agent begin`, `oma agent verify` e `oma agent finish`. Com `model_preset: free`, use `oma agent spawn` para que o processo filho receba a configuração do gateway.

O Qwen Code usa o mesmo `code-intelligence-primer` dos outros vendors. Assim como o Claude Code, ele registra o primer compartilhado em `SessionStart` e `UserPromptSubmit`: a orientação é injetada uma vez por sessão e novamente após a compactação. O primer segue o provider configurado (Serena ou Gortex), inclui orientação sobre deferred tools e permite fallback nativo quando o provider está indisponível ou sofre timeout. O Qwen não adiciona um bloqueio separado de busca de código nem rastreamento de resultados do provider.

Depois de atualizar a CLI, execute `oma link qwen` para regenerar as configurações de hook e o wrapper e, em seguida, inicie uma nova sessão do Qwen. Os testes de saída dos hooks verificam o contrato de integração; eles não garantem qual ferramenta um modelo vai escolher.

### Etapa 3: configure as preferências do usuário

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: auto
EOF
```

Se o `.agents/` copiado também contiver `oma-config.cue`, cada chave definida nele substitui a mesma chave neste arquivo YAML. Edite o arquivo CUE para essas chaves ou consulte [Carregamento da configuração](./oma-config-semantics.md#precedence-table).

### Etapa 4: inicialize o diretório de memória

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Checklist de verificação

Depois da instalação (por qualquer caminho), verifique se tudo foi configurado corretamente:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

O comando doctor verifica, entre outras coisas:

| Verificação | O que confirma |
|:------------|:---------------|
| **Instalações de CLI** | agy, claude, codex, qwen (versão e disponibilidade) |
| **Autenticação** | Status da chave de API ou OAuth de cada CLI |
| **Configuração MCP** | Configuração do servidor MCP do Serena em cada ambiente de CLI |
| **Status das skills** | Quais skills estão instaladas e se estão atualizadas |

Comandos de verificação manual:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists (CUE, YAML, or both)
ls .agents/oma-config.*

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Estrutura de symlinks para várias IDEs (conceito SSOT)

O oh-my-agent usa uma arquitetura de Single Source of Truth (SSOT). O diretório `.agents/` é o único lugar onde vivem skills, workflows, configurações e definições de agentes. Todos os diretórios específicos de IDE contêm apenas symlinks que apontam de volta para `.agents/`.

### Layout de diretórios

```text
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### Por que usar symlinks?

Quando `oma update` atualiza `.agents/`, toda IDE que aponta para ele recebe a mudança. As skills ficam armazenadas uma vez, em vez de serem copiadas para cada IDE. Apagar `.claude/` não remove suas skills: o SSOT em `.agents/` permanece intacto. Symlinks também são pequenos e produzem diffs limpos no git.

---

## Dicas de segurança e estratégia de rollback

### Antes da instalação

1. **Faça commit do seu trabalho atual.** O instalador cria novos diretórios e arquivos. Um estado limpo do git permite usar `git checkout .` para desfazer tudo.
2. **Verifique se já existe um diretório `.agents/`.** Se ele veio de outra ferramenta, faça backup antes. O instalador o sobrescreverá.

### Depois da instalação

1. **Revise o que foi criado.** Execute `git status` para ver todos os arquivos novos. O instalador só cria arquivos em `.agents/`, `.claude/` e, opcionalmente, `.github/`.
2. **Confira o `.gitignore`.** Em um repositório git, install/update/link acrescentam automaticamente ao `.gitignore` da raiz as entradas de runtime (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`); verifique se elas foram adicionadas. A maioria das equipes versiona `.agents/` e `.claude/` para compartilhar a configuração. A entrada que fica a seu critério é `.serena/`: o Serena administra seu próprio cache por meio de um `.serena/.gitignore` interno, então você pode versionar `.serena/project.yml` (configuração compartilhada do projeto) ou ignorar o diretório inteiro:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Rollback

Primeiro, visualize e remova os arquivos gerenciados pelo OMA com o desinstalador:

```bash
oma uninstall --dry-run
oma uninstall
```

Ele mantém `oma-config.yaml`, `mcp.json` e as skills que não instalou. Para remover o restante manualmente:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

Ou simplesmente reverta com o git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Configuração do dashboard

Depois da instalação, você pode configurar o monitoramento em tempo real. Consulte o [guia de Monitoramento do dashboard](/docs/guide/dashboard-monitoring) para obter todos os detalhes.

Configuração rápida:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## O que o instalador faz internamente

Ao executar `oma` (o comando de instalação), isto é exatamente o que acontece:

### 1. Migração legada

O instalador procura o diretório antigo `.agent/` (singular) e o migra para `.agents/` (plural), se encontrá-lo. Essa migração ocorre uma única vez para quem está atualizando de versões anteriores.

### 2. Detecção de concorrentes

O instalador procura ferramentas concorrentes e oferece removê-las para evitar conflitos.

### 3. Download do tarball

O instalador baixa o tarball da versão mais recente das releases do GitHub do oh-my-agent. Esse tarball contém o diretório `.agents/` completo, com todas as skills, recursos compartilhados, workflows, configurações e definições de agentes.

### 4. Instalação de recursos compartilhados

`installShared()` copia o diretório `_shared/` para `.agents/skills/_shared/`. Ele inclui:

- `core/`: roteamento de skills, carregamento de contexto, estrutura de prompts, princípios de qualidade, detecção de vendor e contratos de API.
- `runtime/`: protocolo de memória e protocolos de execução por vendor.
- `conditional/`: recursos carregados somente quando condições específicas são atendidas (quality score, exploration loop).

### 5. Instalação de workflows

`installWorkflows()` copia todos os arquivos de workflow para `.agents/workflows/`, como as definições de `/orchestrate`, `/work`, `/ultrawork` e `/plan`. Consulte [Workflows](../core-concepts/workflows.md) para ver a lista completa. Junto com ele, `installHooks()`, `installAgents()` e `installRules()` copiam as fontes de hooks, definições de agentes e regras para `.agents/`.

### 6. Instalação da configuração

`installConfigs()` copia arquivos auxiliares para `.agents/config/`, cria `.agents/mcp.json` e inicializa a configuração pertencente ao usuário em `.agents/oma-config.yaml` ou `.agents/oma-config.cue`. Arquivos do usuário existentes são preservados, a menos que `--force` seja usado; `oma update` também mantém a configuração do usuário e acrescenta novas chaves de nível superior do template quando necessário.

### 7. Instalação de skills

Para cada skill selecionada, `installSkill()` copia o diretório da skill para `.agents/skills/{skill-name}/`. Se uma variante for selecionada (por exemplo, Python para backend), também configura o diretório `stack/` com recursos específicos da linguagem.

### 8. Adaptações dos vendors

`installVendorAdaptations()` instala arquivos específicos da IDE para os vendors suportados selecionados:

- Definições de agentes (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.qwen/agents/*.md`)
- Configurações de hooks (`.claude/hooks/`, `.codex/hooks.json`)
- Arquivos de configuração e o documento de integração compartilhado do vendor (somente `AGENTS.md`, inclusive para o Claude Code ≥ 2.1.277). `CLAUDE.md` e `GEMINI.md` nunca recebem um bloco do OMA; um `CLAUDE.md` já existente e pertencente ao usuário recebe apenas uma linha de importação `@AGENTS.md`, para que o Claude Code não ignore o `AGENTS.md`

O Codex protege seus hooks por uma etapa única de confiança; portanto, `.codex/hooks.json` não é executado até que você o revise uma vez pelo navegador de `/hooks` do Codex. Consulte [Confiança nos hooks do Codex](/docs/guide/codex-hook-trust) para obter detalhes.

### 9. Symlinks da CLI

`createVendorSymlinks()` e `createVendorWorkflowSymlinks()` criam symlinks dos diretórios específicos da IDE para o SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}/SKILL.md` -> `../../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (se o Copilot estiver selecionado)

Os arquivos de agentes nativos dos vendors são gerados a partir de `.agents/agents/` por `oma link`, `oma install` ou `oma update`, em vez de serem ligados diretamente.

### 10. Workflows globais

`installGlobalWorkflows()` instala arquivos de workflow que podem ser necessários globalmente (fora do diretório do projeto).

### 11. Configuração de git + MCP recomendada

Como descrito acima no caminho pela CLI, install/update configura opcionalmente as configurações **globais** de git recomendadas (`rerere.enabled`, `init.defaultBranch`) mediante consentimento interativo e pode configurar as definições de MCP quando aplicável.

---

## Veja também

- [Instalação global](./global-install.md): instale uma vez para todos os projetos
- [Carregamento da configuração](./oma-config-semantics.md): como CUE, YAML e overlays locais se combinam
- [Configuração de modelos por agente](./per-agent-models.md): escolha o modelo e a CLI de cada agente
- [Confiança nos hooks do Codex](./codex-hook-trust.md): a etapa única de `/hooks` do Codex
- [Atualizações automáticas](./automated-updates.md): mantenha a instalação atualizada a partir do CI
