---
title: "Guia: Instalação global"
sidebar_label: Instalação global
description: "Instale o oh-my-agent no HOME do usuário (~/.agents/) em vez de por projeto, para aplicar as mesmas skills, workflows e regras a todos os projetos. Abrange oma install --global, oma update --global, oma uninstall --global, a substituição OMA_HOME, a detecção de instalações duplicadas por oma doctor e as particularidades de plataforma (recusa de sudo, CI, WSL e proteção de cwd=HOME)."
---

## O que é uma instalação global?

Por padrão, `oma install` limita tudo ao diretório do projeto atual: o SSOT fica em `<cwd>/.agents/` e as configurações dos vendors são gravadas em `<cwd>/.claude/`, `<cwd>/.codex/` etc. Uma **instalação global** (`oma install --global`) instala o oh-my-agent no HOME do usuário, para que as mesmas skills, workflows e regras estejam disponíveis em cada projeto aberto sem repetir a instalação. O SSOT fica em `~/.agents/` e as configurações dos vendors em `~/.claude/`, `~/.codex/` etc.

## Comparação entre projeto e global

| Aspecto | Projeto (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Localização do SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configurações dos vendors | `<cwd>/.claude/`, `<cwd>/.codex/` etc. | `~/.claude/`, `~/.codex/` etc. |
| Arquivo de lock | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadados | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Caso de uso | Personalização por projeto | Padrão pessoal para todos os projetos |
| Escopo de oma-config.yaml | Específico do projeto | Base em todo o usuário |

Os dois modos podem coexistir. `oma doctor` informa as duas instalações quando ambas estão presentes e sinaliza divergências entre elas.

Depois de uma instalação global bem-sucedida, verifique os arquivos no HOME do usuário e o perfil resolvido:

```bash
oma doctor --json
oma doctor --profile
```

O primeiro comando informa a saúde da instalação e dos vendors; o comando de perfil mostra o plano de modelos usado pelos agentes. Execute-os em qualquer projeto quando a instalação global for a que você quer inspecionar.

## Configuração da primeira execução

Na primeira vez que você executa `oma install --global` em uma máquina, a instalação exibe uma nota explicativa antes de continuar:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirme para continuar. A instalação segue então o mesmo fluxo interativo de uma instalação de projeto (idioma, preset de modelo, tipo de projeto e seleção de vendors).

Depois de uma instalação bem-sucedida, as próximas etapas exibidas são:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Particularidades

### Sudo recusado

`oma install` (em qualquer modo) termina imediatamente quando é executado sob `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Execute o comando como seu usuário normal, sem `sudo`.

### Ambientes de CI

Executar `oma install --global` dentro de um pipeline de CI modifica o diretório HOME do runner de CI. Em geral, isso é indesejável. Se você realmente precisar fazer isso (por exemplo, em um pipeline de bootstrap), o oma emite um aviso:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

A instalação prossegue se `--yes` / `OMA_YES=1` estiver definido. Sem isso, o aviso é exibido e a instalação continua de forma interativa (o que fará a maioria das configurações de CI travar).

### WSL: HOME do Linux versus USERPROFILE do Windows

Quando o oma detecta que está rodando dentro do Windows Subsystem for Linux, ele imprime:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Uma instalação no WSL e uma instalação no PowerShell são independentes. Para ter cobertura global nos dois lados, execute `oma install --global` uma vez no WSL e outra no PowerShell.

### Proteção cwd = HOME (modo de projeto)

`oma link` e `oma update` (sem `--global`) se recusam a executar enquanto o diretório atual for o seu HOME. No modo de projeto, `<cwd>/.claude/settings.json` seria `~/.claude/settings.json` — as suas configurações globais do Claude Code — e a renderização com escopo de projeto reescreveria os comandos `$HOME/.claude/hooks/...` dele para `$CLAUDE_PROJECT_DIR/...`, quebrando todos os hooks e a statusline em projetos sem `.claude/hooks/` próprio. Use `oma link --global` / `oma update --global` para a instalação em HOME, ou entre em um projeto com `cd` antes.

Se você executar `oma install` (sem `--global`) enquanto o diretório atual for o HOME, o oma avisa:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

No modo não interativo ou de CI, isso aborta automaticamente. Use `--global` se a intenção for uma instalação para todo o usuário.

## Relink de uma instalação global

`oma link` regenera os arquivos nativos dos vendors a partir do SSOT sem reinstalar. Assim como `install` e `update`, ele resolve o alvo a partir do contexto da instalação; passe `--global` para reconciliar `~/.agents/` — funciona em qualquer diretório, não apenas em `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
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

O comando de desinstalação separa arquivos pertencentes ao oma de arquivos pertencentes ao usuário. Conteúdo do usuário (oma-config.yaml, mcp.json, skills personalizadas sem o marcador `<!-- oma:generated -->`) nunca é apagado.

Para desinstalar uma instalação de projeto, omita `--global`:

```bash
oma uninstall [--dry-run]
```

## Substituição OMA_HOME

Para testes ou staging, você pode redirecionar todas as operações do oma para um diretório arbitrário:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` tem precedência sobre `--global` e `process.cwd()`. Caminhos de sistema proibidos (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) são rejeitados até mesmo via `OMA_HOME`. O caminho deve ser absoluto e gravável.

Para um smoke test seguro, aponte `OMA_HOME` para um diretório vazio e gravável e execute `oma install --global --yes`; o resumo deve indicar esse diretório como raiz da instalação. Remova o diretório depois do teste e então execute a instalação real com o HOME pretendido.
