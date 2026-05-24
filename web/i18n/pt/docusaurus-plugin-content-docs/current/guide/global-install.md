---
title: "Guia: Instalação Global"
description: Instale o oh-my-agent no HOME do seu usuário (~/.agents/) em vez de por projeto, para que as mesmas skills, workflows e regras se apliquem em todos os projetos. Cobre oma install --global, oma update --global, oma uninstall --global, override via OMA_HOME, detecção de instalação dupla com oma doctor e ressalvas de plataforma (recusa de sudo, CI, WSL, proteção cwd=HOME).
---

## O que é uma instalação global?

Por padrão, `oma install` limita tudo ao diretório do projeto atual: o SSOT fica em `<cwd>/.agents/` e as configurações de fornecedor são gravadas em `<cwd>/.claude/`, `<cwd>/.codex/`, etc. Uma **instalação global** (`oma install --global`) instala o oh-my-agent no HOME do seu usuário, de modo que as mesmas skills, workflows e regras fiquem disponíveis em todo projeto que você abrir sem repetir o passo de instalação. O SSOT fica em `~/.agents/` e as configurações de fornecedor em `~/.claude/`, `~/.codex/`, etc.

## Comparação entre projeto e global

| Aspecto | Projeto (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Local do SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Configurações de fornecedor | `<cwd>/.claude/`, `<cwd>/.codex/`, etc. | `~/.claude/`, `~/.codex/`, etc. |
| Lock file | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadados | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Caso de uso | Customização por projeto | Default pessoal em todos os projetos |
| Escopo do oma-config.yaml | Específico do projeto | Baseline em nível de usuário |

Ambos os modos podem coexistir. `oma doctor` reporta as duas instalações quando presentes e sinaliza divergências entre elas.

## Configuração na primeira execução

Na primeira vez que você roda `oma install --global` em uma máquina, a instalação mostra uma nota explicativa antes de prosseguir:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Confirme para continuar. A instalação então segue o mesmo fluxo interativo de uma instalação de projeto (idioma, preset de modelo, tipo de projeto, seleção de fornecedor).

Após uma instalação bem-sucedida, os próximos passos são exibidos:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Ressalvas

### Sudo recusado

`oma install` (em qualquer modo) encerra imediatamente quando executado sob `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Execute o comando como seu usuário normal, sem `sudo`.

### Ambientes de CI

Rodar `oma install --global` dentro de um pipeline de CI modifica o diretório HOME do runner de CI. Geralmente isso não é desejável. Se você realmente precisa (ex.: um pipeline de bootstrap), o oma emite um aviso:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

A instalação prossegue se `--yes` / `OMA_YES=1` estiver definido. Sem isso, o aviso é exibido e a instalação continua de forma interativa (o que vai travar na maioria dos setups de CI).

### WSL: HOME do Linux vs USERPROFILE do Windows

Quando o oma detecta que está rodando dentro do Windows Subsystem for Linux, ele imprime:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Uma instalação no WSL e uma no PowerShell são independentes. Se você quer cobertura global nos dois lados, rode `oma install --global` uma vez no WSL e outra no PowerShell.

### Aviso cwd = HOME (modo projeto)

Se você rodar `oma install` (sem `--global`) com seu diretório atual sendo o HOME, o oma avisa:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Em modo não interativo / CI, isso é abortado automaticamente. Use `--global` se a intenção for uma instalação em nível de usuário.

## Desinstalação

```bash
# Pré-visualiza o que seria removido (nunca apaga nada)
oma uninstall --global --dry-run

# Remove a instalação global
oma uninstall --global
```

O comando de desinstalação separa os arquivos gerenciados pelo oma dos arquivos do usuário. Conteúdo do usuário (oma-config.yaml, mcp.json, skills personalizadas sem o marcador `<!-- oma:generated -->`) nunca é apagado.

Para desinstalar uma instalação de projeto, omita `--global`:

```bash
oma uninstall [--dry-run]
```

## Override via OMA_HOME

Para fins de teste ou staging, você pode redirecionar todas as operações do oma para um diretório arbitrário:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` tem precedência sobre `--global` e `process.cwd()`. Caminhos de sistema proibidos (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) são rejeitados mesmo via `OMA_HOME`. O caminho precisa ser absoluto e gravável.
