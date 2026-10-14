---
title: "Guia: Instalação global"
sidebar_label: Instalação global
description: "Instale o oh-my-agent no home global do OMA (~/.oma/) em vez de por projeto, para aplicar as mesmas skills, workflows e regras a todos os projetos. Abrange oma install --global, oma update --global, oma uninstall --global, a substituição OMA_HOME, a detecção de instalações duplicadas por oma doctor e as particularidades de plataforma (recusa de sudo, CI, WSL e proteção de cwd=HOME)."
---

## O que é uma instalação global?

Por padrão, `oma install` limita tudo ao diretório do projeto atual: o SSOT fica em `<cwd>/.agents/` e as configurações dos vendors são gravadas em `<cwd>/.claude/`, `<cwd>/.codex/` etc. Uma **instalação global** (`oma install --global`) instala o oh-my-agent no home global do OMA, para que as mesmas skills, workflows e regras estejam disponíveis em cada projeto aberto sem repetir a instalação. O SSOT fica em `~/.oma/.agents/`; as configurações dos vendors continuam em `~/.claude/`, `~/.codex/` etc.

## Comparação entre projeto e global

| Aspecto | Projeto (`oma install`) | Global (`oma install --global`, home padrão do OMA) |
|--------|------------------------|--------------------------------|
| Localização do SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Configurações dos vendors | `<cwd>/.claude/`, `<cwd>/.codex/` etc. | `~/.claude/`, `~/.codex/` etc. |
| Arquivo de lock | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadados | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Caso de uso | Personalização por projeto | Padrão pessoal para todos os projetos |
| Escopo de oma-config.yaml | Específico do projeto | Base em todo o usuário |

Os dois modos podem coexistir. `oma doctor` informa as duas instalações quando ambas estão presentes e sinaliza divergências entre elas.

Depois de uma instalação global bem-sucedida, verifique os arquivos no HOME do usuário e o perfil resolvido:

```bash
oma doctor --global --json
oma doctor --global --profile
```

O primeiro comando informa a saúde da instalação e dos vendors; o comando de perfil mostra o plano de modelos usado pelos agentes. Mantenha `--global` (ou `-g`): sem ele, os dois comandos inspecionam o projeto no diretório atual, com a configuração desse projeto sobreposta aos padrões globais.

## Configuração da primeira execução

Na primeira vez que você executa `oma install --global` em uma máquina, a instalação exibe uma nota explicativa antes de continuar:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirme para continuar. A instalação segue então o mesmo fluxo interativo de uma instalação de projeto (idioma, preset de modelo, tipo de projeto e seleção de vendors).

Depois de uma instalação bem-sucedida, as próximas etapas exibidas são:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularidades

### Sudo recusado

`oma install` (em qualquer modo) termina imediatamente quando é executado sob `sudo`:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Execute o comando como seu usuário normal, sem `sudo`.

### Ambientes de CI

Executar `oma install --global` dentro de um pipeline de CI modifica o diretório HOME do runner de CI. Em geral, isso é indesejável. Se você realmente precisar fazer isso (por exemplo, em um pipeline de bootstrap), o oma emite um aviso:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

O aviso aparece quando `CI` é `true` ou `1`. Esses valores já tornam a instalação não interativa, então ela prossegue com os padrões e não espera entrada. Fora de CI, `--yes` ou `OMA_YES=1` produz o mesmo comportamento não interativo.

### WSL: HOME do Linux versus USERPROFILE do Windows

Quando o oma detecta que está rodando dentro do Windows Subsystem for Linux, ele imprime:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Uma instalação no WSL e uma instalação no PowerShell são independentes. Para ter cobertura global nos dois lados, execute `oma install --global` uma vez no WSL e outra no PowerShell.

### Proteção cwd = HOME (modo de projeto)

`oma link` e `oma update` (sem `--global`) se recusam a executar enquanto o diretório atual for o seu HOME. No modo de projeto, `<cwd>/.claude/settings.json` seria `~/.claude/settings.json` — as suas configurações globais do Claude Code — e a renderização com escopo de projeto reescreveria os comandos `$HOME/.claude/hooks/...` dele para `$CLAUDE_PROJECT_DIR/...`, quebrando todos os hooks e a statusline em projetos sem `.claude/hooks/` próprio. Use `oma link --global` / `oma update --global` para a instalação global, ou entre em um projeto com `cd` antes.

Se você executar `oma install` (sem `--global`) enquanto o diretório atual for o HOME, o oma avisa:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

No modo não interativo ou de CI, isso aborta automaticamente. Use `--global` se a intenção for uma instalação para todo o usuário.

## Relink de uma instalação global

`oma link` regenera os arquivos nativos dos vendors a partir do SSOT sem reinstalar. Assim como `install` e `update`, ele resolve o alvo a partir do contexto da instalação; passe `--global` para reconciliar `~/.oma/.agents/` — funciona em qualquer diretório, não apenas em `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Sem `--global`, `oma link` aponta para `<cwd>/.agents/`; portanto, executá-lo dentro de um projeto quando a instalação é global informa que não encontrou o diretório `.agents/` ali.

## Desinstalação

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

O comando de desinstalação separa arquivos pertencentes ao oma de arquivos pertencentes ao usuário. Ele remove apenas as skills registradas como gerenciadas pelo OMA em `managed-skills.json`, em `.agents/state/`; o marcador `<!-- oma:generated -->` identifica os arquivos de prompt do Copilot gerados. Conteúdo do usuário (`oma-config.yaml`, `mcp.json` e skills não registradas como gerenciadas) nunca é apagado. Execute `--dry-run` primeiro para ver a lista exata.

Para desinstalar uma instalação de projeto, omita `--global`:

```bash
oma uninstall [--dry-run]
```

## Substituição OMA_HOME

Defina `OMA_HOME` como um caminho absoluto para realocar os dados globais pertencentes ao OMA:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` é a raiz do armazenamento global, não um destino de instalação de projeto. Com o valor acima, as definições globais ficam em `/tmp/oma-test/.agents/`; a instalação e o link de projeto continuam usando `<cwd>/.agents/`. As configurações nativas dos vendors e a autenticação ficam fora de `OMA_HOME`. Os arquivos de integração global do OpenCode são gravados em `~/.config/opencode/`, no diretório HOME real.

`OMA_STATE_HOME` é uma exceção explícita para o armazenamento de perfis, L1 e runtime de projeto: deve ser absoluto e contém `u/`. Quando não está definido, os perfis seguem `OMA_HOME`. `XDG_CONFIG_HOME` não realoca mais o estado do OMA e não altera o caminho de saída do OpenCode no OMA. Os segredos do Keychain do sistema operacional, os dados de AgentMemory/Honcho e os caches de toolchains gerenciados continuam com seus donos atuais.

## Layout do armazenamento global

Os dados globais ficam em `~/.oma` por padrão. Quando `OMA_HOME` está definido, substitua `~/.oma` pelo valor dele:

| Dados | Localização |
|---|---|
| Definições globais, configuração, metadados de instalação | `~/.oma/.agents/` |
| Manifesto de agendamentos, ambiente capturado, logs de execução | `~/.oma/schedule/` |
| Backups globais | `~/.oma/backup/` |
| Registro, locks e logs do Serena | `~/.oma/state/serena/` |
| Índice de nomes de chaves do vault | `~/.oma/state/vault-index.json` |
| Perfis, sessões L1, runtime de projeto | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/` quando `OMA_STATE_HOME` está definido) |

A configuração global fornece os padrões. O `.agents/oma-config.*` do projeto mais próximo e
sua sobreposição local os substituem; raízes de projeto ancestrais diferentes não são mescladas.
Consulte [Carregamento da configuração](./oma-config-semantics.md#precedence-table) para a ordem completa.
Um projeto que seleciona `semantic_memory: none` mantém a memória desativada mesmo quando a
configuração global seleciona AgentMemory.

## Instalações existentes

A migração do home copia os dados pertencentes ao OMA de `~/.agents/` e `~/.config/oma/`
para o novo layout. Os originais permanecem, exceto os diretórios de skills verificados como pertencentes ao OMA
e convertidos em links de descoberta: o conteúdo original deles é arquivado em
`~/.oma/backup/legacy-global-skills/` antes que o caminho antigo se torne um link para a skill
migrada. Arquivos de destino existentes não são sobrescritos; conflitos e dados em uso
são reportados para nova tentativa. Os índices do vault
mesclam nomes de chaves, sem tirar os valores secretos do keychain do sistema operacional. As skills
do usuário e os links externos permanecem no lugar; os arquivos de autenticação dos vendors não são
movidos. Os leitores em runtime usam apenas
os novos caminhos.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

A instalação e a atualização globais executam a migração antes de gravar seus arquivos globais.
A instalação e a atualização de projeto usam as raízes unificadas sem migrar dados globais
não relacionados. A migração não altera os registros de jobs do sistema operacional; execute `oma schedule sync`
após a migração se houver agendamentos. Serviços ou runners ativos podem adiar dados;
encerre esses processos e execute a migração novamente.

## Veja também

- [Carregamento da configuração](./oma-config-semantics.md): como os arquivos de configuração global, de projeto e local são mesclados
- [Integração com projeto existente](./integration.md): instalação no modo de projeto, verificação e rollback
- [Atualizações automáticas](./automated-updates.md): execute `oma update` a partir de CI
