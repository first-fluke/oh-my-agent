---
title: Escolher uma configuração
description: Carregue uma skill do OMA para uma tarefa, selecione um preset de domínio ou instale o plugin do Claude Code com suas dependências de runtime.
---

# Escolher uma configuração

Escolha o ponto de entrada da tarefa que você quer concluir.

| Necessidade | Ponto de entrada | O que configura |
|---|---|---|
| Uma tarefa focada no seu agente atual | [Carregar uma skill](#load-one-skill) | Instruções e arquivos de apoio em um diretório temporário |
| Hooks de projeto, agentes especialistas e workflows | [Instalar um preset de skills](#install-a-skill-preset) | Integração do runtime OMA com as skills selecionadas |
| Instalação pelo marketplace do Claude Code | [Instalar o plugin](#install-the-claude-code-plugin) | O plugin OMA e o bootstrap do projeto |
| Instalação de pacote para Copilot CLI, Kiro, Qwen Code, Hermes ou Codex | [Pacote Agent Plugins](../guide/vendor-capabilities.md#agent-plugins-package) | Skills e servidores MCP para todos os hosts; o Copilot também recebe agentes, comandos, regras e o hook de bootstrap |

## Carregar uma skill

Peça ao seu agente de código para executar o comando da sua tarefa e ler as
instruções retornadas. `skills use` imprime as instruções e o caminho do
diretório de apoio. Ele não inicia outro agente nem executa o instalador do OMA.

| Tarefa | Comando | Primeiro pedido |
|---|---|---|
| Design de UI de admin ou revisão de uma UI existente | `bunx skills use first-fluke/oh-my-agent@oma-design` | Review our admin page's hierarchy, table density, and empty states. |
| Um bug reproduzível | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduce this failure, fix its cause, and run the relevant check. |
| Uma decisão de arquitetura | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare keeping this job in the API with moving it to a worker. |

A pasta selecionada inclui suas referências de instrução compartilhadas. Dependências
fora dessa pasta continuam explícitas: outra skill de domínio, regras do projeto, operações
de CLI, ferramentas de navegador ou um engine externo ainda podem ser necessários. Leia
as dependências da skill selecionada para a operação pedida. Instale o
runtime quando a tarefa exigir seus hooks ou a execução gerenciada.

Para trabalho de design, `oma-design` seleciona Interface Design para direção de interfaces
de admin e de produto, Taste para as demais direções de arte web e Impeccable para
crítica, auditoria e polimento de uma UI existente. A stack do projeto e o `DESIGN.md`
continuam sendo os contratos de implementação e de design.

## Instalar um preset de skills

Instale a CLI uma vez e depois selecione as skills do projeto:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Uma instalação de CLI já existente pode começar pelo segundo comando. Use
`oma install --help` para os nomes dos presets e as opções de provider. O
[instalador de bootstrap](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) também prepara
as dependências do runtime antes da configuração interativa.

| Preset | Primeira tarefa | Exemplos de workflows aplicáveis |
|---|---|---|
| `frontend` | Planejar uma página de configurações e depois implementar o formulário | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Planejar um endpoint de API autenticado | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Encontrar artigos e comparar suas evidências | Peça uma busca de literatura com citações |
| `all` | Coordenar uma funcionalidade entre UI, API e dados | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

Os [presets nomeados](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) são aceitos por `--preset`.
Um nome desconhecido, um valor vazio ou `custom` é rejeitado antes da instalação.
Para selecionar skills individuais, execute `oma install` de forma interativa e escolha Custom.
Sem `--preset`, a configuração sem supervisão com `--yes`/CI seleciona `all`.

O preset frontend seleciona oito skills. Os presets selecionam o conteúdo das skills; o
instalador ainda configura arquivos compartilhados, todas as definições de workflows e agentes, hooks
e providers. Alguns workflows precisam de skills fora de um preset de domínio. Confira as
[dependências dos workflows](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset)
antes de usá-los, ou selecione `all` para todos os workflows. Um preset menor em uma
instalação existente não remove as outras skills.

As escolhas de provider são independentes dos presets. Por exemplo, acrescente
`--semantic-memory none` quando o projeto não precisar de um serviço de memória
semântica. Consulte os [efeitos da instalação](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default)
para os outros arquivos e integrações que o runtime configura.

O resumo da instalação lista as skills selecionadas e verifica os manifestos de skills presentes,
incluindo as skills mantidas. Ele reporta referências estáticas de workflows e agentes,
incluindo ramos condicionais, como manifestos de skills referenciados. Execute `oma doctor`
para reparar entradas ausentes ou ilegíveis necessárias à sua tarefa. Essas verificações não
conferem o conteúdo dos recursos, as ferramentas, os providers, as credenciais nem a execução.

## Instalar o plugin do Claude Code

Execute estes comandos dentro do Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Escolha `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` ou
`oma-research@oh-my-agent` para um plugin de domínio. A entrada completa `oma` mantém a
seleção completa de skills. As entradas de domínio fazem o bootstrap do preset correspondente.

O hook de início de sessão do plugin provisiona a CLI quando necessário e executa
`oma install --yes` no projeto atual. Esse caminho faz a configuração do runtime.
O recibo de sucesso pertence a esse projeto, e os hooks de evento do plugin usam
a CLI instalada. Os hooks do plugin exigem Bash, inclusive no Windows. O bootstrap
tem timeout de 600 segundos; as falhas reportam os passos de configuração manual e preservam o
log do projeto em `.agents/state/plugin-bootstrap.last-error.log`. Um recibo só é
reutilizado depois que as verificações de versão da CLI, de configuração do projeto e de hooks passam.
Reinicie a sessão depois que o bootstrap reportar a conclusão.

Para as escolhas de configuração e de dependências durante a instalação, use
`oma install` diretamente. O bootstrap sem supervisão do plugin completo usa o preset
de skills `all`; cada plugin de domínio passa o preset que selecionou. Um preset menor
mantém as outras skills já instaladas no projeto.

## Verificar o resultado

Para uma skill carregada, confirme que o agente leu as instruções selecionadas e
reporte as verificações reais da tarefa. Para uma instalação do runtime, execute `oma doctor`
e experimente o primeiro pedido do seu preset. Os avisos de provider do doctor importam
quando a tarefa pedida usa esse provider.
