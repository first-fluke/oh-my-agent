---
title: "Guia: Agentes agendados"
sidebar_label: Agentes agendados
description: Execute qualquer agente em um agendamento recorrente ou único usando o agendador do sistema operacional (macOS launchd, Linux systemd, Windows Task Scheduler), sem manter um runtime de vendor aberto.
---

# Agentes agendados

`oma schedule` permite executar qualquer agente em um horário definido, independentemente de qual runtime de vendor de IA (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode ou pi) esteja aberto. O agendador do sistema operacional dispara o job, que chama `oma agent spawn` em modo headless usando as credenciais do vendor já armazenadas no disco.

---

## Como funciona

Ao executar `oma schedule create`, o oma:

1. Grava um registro de job no manifesto global em `~/.agents/schedule/schedules.json`.
2. Registra o job no agendador do sistema operacional (launchd no macOS, systemd --user no Linux ou Windows Task Scheduler). O job do sistema chama `oma schedule run <id>` no intervalo cron configurado.
3. No momento do disparo, `oma schedule run` procura o job, injeta as variáveis de ambiente capturadas, chama `oma agent spawn` e grava o log da execução em `~/.agents/schedule/runs/<id>/<timestamp>.md`.

O manifesto é a única fonte da verdade (SSOT). O agendador do sistema operacional é apenas um executor. Todo o estado — definições de jobs, logs de execução e timestamps do último disparo — fica em `~/.agents/schedule/`.

### Somente global por design

`oma schedule` é intencionalmente global para o usuário, não específico de um projeto. Como o agendador do sistema executa jobs independentemente do diretório de trabalho atual, um registro central é a única SSOT prática. Cada job registra o projeto ao qual pertence por meio de `workspace` e `projectLabel`, para que `schedule list` possa agrupar jobs por projeto mesmo com o registro compartilhado.

Não existe a flag `--global`; os comandos de agendamento sempre leem e gravam em `~/.agents/schedule/`.

### Backends do sistema operacional

| Plataforma | Backend principal | Fallback |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | `crontab` do usuário |
| Linux | timer systemd --user | `crontab` do usuário |
| Windows | Task Scheduler (`schtasks`) | — |

O oma seleciona automaticamente o backend disponível. Você não precisa configurá-lo manualmente.

---

## Comparação: schedule, ralph e Claude /loop

Esses três recursos às vezes são confundidos porque todos envolvem "executar novamente mais tarde". São conceitos diferentes.

| Recurso | Gatilho | Escopo | Sobrevive à reinicialização do vendor? |
|---|---|---|---|
| `oma schedule` | Baseado em horário (cron) | Entre vendors, no nível do sistema | Sim — o agendador dispara mesmo quando nenhum runtime de vendor está aberto |
| `ralph` | Baseado em conclusão (loop de Stop hook) | Entre vendors | Somente enquanto a sessão atual está ativa; ralph é um loop de "continuar até terminar", não um timer |
| Claude Code `/loop` | Baseado em horário (cron no processo) | Somente o runtime do Claude | Não — dispara apenas enquanto o Claude Code está em execução |

Use `schedule` quando quiser executar um job às 9h em todos os dias úteis. Use `ralph` quando quiser que um agente continue iterando até atingir um padrão de qualidade. Use `/loop` somente quando já estiver dentro do Claude Code e não precisar de portabilidade entre vendors.

---

## Início rápido

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Comandos

### schedule create

Registre um job de agente agendado.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|---|---|---|
| `agent-id` | Sim | Tipo de agente a criar: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sim | Descrição da tarefa passada ao agente no momento da execução |

**Opções:**

| Flag | Descrição |
|---|---|
| `--cron "<expr>"` | Expressão cron de 5 campos (por exemplo, `"0 9 * * *"` para 9h todos os dias). Mutuamente exclusiva com `--every`. |
| `--every "<phrase>"` | Intervalo em linguagem natural (consulte a tabela abaixo). Mutuamente exclusivo com `--cron`. |
| `--vendor <vendor>` | Substituição do vendor de CLI passada a `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. O padrão é detectar automaticamente a partir de `oma-config.yaml`. |
| `-w, --workspace <path>` | Diretório de trabalho do agente no momento da execução. O padrão é o diretório de trabalho atual no momento do registro. |
| `--once` | Modo único: o job dispara uma vez e se remove. O padrão é recorrente. |
| `--expires-after <duration>` | Expira automaticamente um job recorrente após uma duração como 30d. `0` significa sem prazo (padrão). |
| `--env <KEY1,KEY2>` | Captura as variáveis de ambiente nomeadas (somente as listadas) em `~/.agents/schedule/env/<id>` (permissões 0600) para injeção no momento da execução. Segredos nunca são gravados no manifesto. |
| `--dry-run` | Imprime o cron resolvido e qualquer observação de arredondamento sem gravar um job no agendador, uma entrada no manifesto ou um arquivo de ambiente. |
| `--accept-rounded` | Necessário para registrar um intervalo em linguagem natural depois que o OMA o arredonda para um passo representável por cron. Faça uma prévia primeiro com `--dry-run`. |

Exatamente uma entre `--cron` e `--every` é obrigatória.

#### --every: intervalos em linguagem natural

`--every` aceita as seguintes formas. O oma as converte em uma expressão cron de 5 campos e imprime uma observação quando o intervalo solicitado é arredondado para o passo representável por cron mais próximo.

| Forma | Exemplo | Observações |
|---|---|---|
| Unidade compacta | `5m`, `2h`, `1d` | Minuto, hora, dia |
| Every + compacto | `every 20m`, `every 2h` | |
| Every + palavra | `every 5 minutes`, `every 2 hours` | Palavras de unidade no plural são aceitas |
| Segundos | `30s` | Arredondado para o mínimo de 1 minuto; cron não representa intervalos menores que um minuto |

Intervalos não divisíveis são arredondados para o passo regular mais próximo e uma observação é impressa. Por exemplo, `--every 7m` é arredondado para `6m` (`*/6`), porque 7 não divide 60.

Faça uma prévia de um intervalo arredondado antes de registrá-lo:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Se a prévia for omitida, o comando se recusa a registrar um intervalo arredondado. Os agendamentos usam as regras de horário locais do agendador do sistema operacional selecionado.

**Exemplos:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Liste todos os jobs agendados em todos os projetos, agrupados por projeto, com o estado de drift do sistema operacional.

```
oma schedule list [--json]
```

**Opções:**

| Flag | Descrição |
|---|---|
| `--json` | Saída JSON legível por máquina |

**Estados de drift:**

| Estado | Significado |
|---|---|
| `synced` | O job existe tanto no manifesto quanto no agendador do sistema |
| `stale` | O job está registrado, mas o registro no agendador do sistema invoca um comando que a CLI atual não aceita mais (por exemplo, `schedule:run <id>` gravado antes da padronização do caminho de comando). Execute `schedule sync` para reescrevê-lo; o `oma update` faz isso automaticamente. |
| `missing-in-os` | O job está no manifesto, mas falta no agendador do sistema. Execute `schedule sync` para corrigir. |
| `orphan-in-os` | O job existe no agendador do sistema, mas não no manifesto. Execute `schedule sync --prune` para remover. |

**Saída (texto):**

Os jobs são agrupados pelo rótulo do projeto. Cada linha mostra: ID, expressão cron, agente, vendor, backend do sistema operacional, se é recorrente e estado de drift.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Exemplos:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Remova um job agendado do manifesto e do agendador do sistema operacional.

```
oma schedule delete <id>
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|---|---|---|
| `id` | Sim | ID do job obtido de `schedule list` (formato: `sch_<base32-12>`) |

Se a remoção no agendador do sistema falhar (por exemplo, porque o backend está temporariamente indisponível), um aviso é impresso, mas a entrada do manifesto ainda é removida.

**Exemplo:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

Execute um job agendado pelo ID. O agendador do sistema chama este comando no momento do disparo; normalmente ele não é chamado manualmente.

```
oma schedule run <id>
```

O wrapper:

1. Procura o ID do job no manifesto. Sai com código diferente de zero se não o encontrar.
2. Carrega as variáveis de ambiente capturadas de `~/.agents/schedule/env/<id>` (se presente) e as injeta no processo criado.
3. Chama `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Grava o resultado da execução em `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Atualiza `lastFiredAt` no manifesto.
6. Se `--once` tiver sido definido, remove o job (manifesto + agendador do sistema).

**Falhas de autenticação são explícitas:** se as credenciais do vendor expirarem, o job sai com código diferente de zero e imprime `re-auth required: <vendor>` em stderr. Ele não termina silenciosamente com sucesso. Uma notificação opcional do `oma-voice` pode ser configurada.

Você pode chamar `schedule run` manualmente para depuração:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

Ressincronize o manifesto com o agendador do sistema operacional. Use depois de migrações de sistema, redefinições do agendador ou para corrigir drift.

```
oma schedule sync [--prune]
```

**Opções:**

| Flag | Descrição |
|---|---|
| `--prune` | Também remove jobs que estão no agendador do sistema, mas não no manifesto (estado orphan-in-os). Sem `--prune`, os órfãos são informados, mas não removidos. |

**Exemplos:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

O `oma update` executa a mesma reconciliação (sem `--prune`) após cada atualização; assim, uma versão da CLI que altere a grafia do comando `oma schedule run` não pode deixar registros existentes no sistema operacional apontando para um comando que o novo binário rejeita. Os registros gravados por versões anteriores com `oma schedule:run <id>` também continuam funcionando: essa grafia legada continua aceita para jobs invocados pelo sistema operacional.

---

## Layout de armazenamento

Todo o estado dos agendamentos fica em `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Permissões:
- Diretório `~/.agents/schedule/`: `0700`
- Arquivos `schedules.json` e `env/<id>`: `0600`

**Segredos nunca são gravados em `schedules.json`.** A flag `--env` grava somente as chaves nomeadas em um arquivo `0600` separado em `env/`. Somente as chaves explicitamente listadas são capturadas; um dump completo do ambiente nunca é armazenado.

---

## Notas de segurança

- `schedule create` é uma operação em caminho confiável: somente o usuário autenticado pode registrar jobs. Não exponha `schedule create` a entradas externas ou não confiáveis. Um prompt agendado é código arbitrário que será executado no futuro.
- `schedule run` executa somente jobs cujo ID existe no manifesto. Não é possível injetar argv arbitrário.
- As credenciais de vendor armazenadas no disco (por exemplo, `~/.codex/auth.json` e `~/.grok/auth.json`) são usadas como estão para o dispatch headless. Nenhuma verificação adicional de autenticação é aplicada. Se as credenciais expirarem, o job falha explicitamente.

---

## Dicas e solução de problemas

**Verificar logs de execução:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**O job mostra `missing-in-os` depois de uma reinicialização do sistema:**

Execute `oma schedule sync` para registrar novamente todos os jobs do manifesto no agendador do sistema.

**O job foi disparado, mas as credenciais do vendor expiraram:**

Verifique no log da execução se aparece `re-auth required: <vendor>`. Autentique-se novamente com a CLI do vendor (por exemplo, `claude login`, `codex login`) e execute manualmente `oma schedule run <id>` para verificar antes do próximo disparo.

**`--every` arredondou meu intervalo:**

Quando o oma arredonda seu intervalo, ele imprime uma observação explicando a alteração. Se precisar de um intervalo preciso que não divida exatamente 60 minutos ou 24 horas, use `--cron` com uma expressão explícita de 5 campos.

**Remover todos os jobs de um projeto:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Suporte ao Windows:**

No Windows, o oma usa `schtasks` para registrar jobs. A detecção de drift de `schedule list` e os comandos `schedule sync` funcionam da mesma forma em todas as plataformas.

Observe que `schtasks` não consegue representar todas as formas de cron. As formas aceitas são: `*/N * * * *` (a cada N minutos), `M * * * *` (a cada hora em :M), `M H * * *` (diário), `M H * * D` (semanal; `D` pode ser um único dia, um intervalo como `1-5` ou uma lista separada por vírgulas como `1,3,5`) e `M H D * *` (mensal). Outras expressões (por exemplo, uma lista de minutos separada por vírgulas) são rejeitadas no momento de `schedule create` no Windows.
