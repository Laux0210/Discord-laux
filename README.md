# Equipe de agentes

## Memória no Obsidian e ai-memory

Os 15 agentes e a sessão principal consultam primeiro `E:\Memoria\Discord`, começando em `00-INDICE.md`, e depois ai-memory no escopo `discord/discord`. Consulte [a integração](docs/memoria/INTEGRACAO.md) e [os resultados da validação](docs/memoria/VALIDACAO.md). O marcador `.ai-memory.toml` mantém o projeto separado de outras memórias. O `AGENTS.md` original permanece intacto.

Esta pasta contém 15 perfis especializados e os documentos do aplicativo desktop de comunicação para amigos. O produto foi definido pelo Contexto Mestre e pelo plano aprovado: Windows 10/11 x64, texto, voz, tela com som do sistema, DMs, presença e permissões. O nome da pasta não significa integração ou bot do Discord.

## Execução do aplicativo

Existe uma base local executável com Electron, React 19, TypeScript e serviços mock. O build gera renderer, main ESM e preload CJS; o teste em Electron real confirmou interface, IPC, sandbox, isolamento e CSP. Veja [a validação BASE-LOCAL-02](docs/validacao/base-local-02.md), com checks e limites. Autenticação e mídia reais, instalador e aceite integral BASE continuam sujeitos aos contratos e portões E0/E1/E2.

- [Contexto mestre preservado](docs/contexto/contexto-mestre.md) e [proveniência da fonte](docs/contexto/fonte.json).
- [Plano de doze etapas](docs/planejamento/plano.md), [backlog](docs/planejamento/backlog.md) e [decisões](docs/planejamento/decisoes.md).
- [Especificação da Etapa 6 (BASE)](docs/superpowers/specs/2026-10-14-etapa6-base-electron-design.md) e [Plano de Implementação](docs/superpowers/plans/2026-10-14-etapa6-base-electron.md).
- [Requisitos e aceite](docs/produto/requisitos-e-aceite.md).
- [Arquitetura candidata e contratos](docs/arquitetura/arquitetura-e-contratos.md).
- [Gate financeiro E0](docs/validacao/e0-financeiro.md) e [registro de execução](docs/execucao/registro.md).
- [Engenharia reversa do Discord e reprodução de funções/modos/interface](docs/rea/plano-discord-referencia.md), acrescentada ao plano por pedido posterior. Produção REA gera evidências e contrato; construção REA implementa os módulos atribuídos; QA compara os resultados. A análise de referência é distinta da inspeção do nosso instalador.

## Verificação local de E0

A ferramenta abaixo organiza evidências locais sanitizadas e reproduz a projeção de tráfego do plano. Requer Python 3.11+ e usa somente a biblioteca padrão, sem rede ou ativação de provedores.

```powershell
python -B -m unittest discover -s tests -v
python -B scripts/verificar_e0.py docs/validacao/e0-evidencias.exemplo.json
```

O exemplo contém dados não verificados e deve retornar `BLOQUEADO`, com código de saída 1. Código 0 significa somente `CANDIDATO_A_REVISAO`; código 2 indica entrada ilegível/inválida. Nenhum resultado aprova E0 ou autoriza mídia. Hashes e campos preenchidos não comprovam autenticidade das contas nem eficácia de corte. A janela de atualidade de 24 horas é uma regra conservadora deste utilitário, não uma condição publicada do provedor. `--agora` permite repetir uma avaliação histórica e deve ser identificado como replay.

Veja [a retomada de E0](docs/validacao/e0-retomada.md) e o esquema de entrada em [e0-evidencias.exemplo.json](docs/validacao/e0-evidencias.exemplo.json). Para usar evidências reais, prepare um arquivo separado com referências locais relativas à sua pasta, sem tokens, senhas ou conteúdo privado; o exemplo não deve ser apresentado como prova real.

Resultados atuais: [E0-02 passou em 35 testes e revisão independente](docs/validacao/e0-02-verificacao-local.md); o gate financeiro continua bloqueado. A [identidade do Discord](docs/rea/discord/identidade.md), o [catálogo estático](docs/rea/discord/catalogo.md) e a [matriz RF-01–17](docs/rea/discord/matriz-reproducao.md) foram registrados. Catálogo e matriz iniciais passaram em revisão documental; interface principal, comportamento e fidelidade visual permanecem pendentes.

### Comandos de Desenvolvimento e Testes

Ambiente verificado nesta rodada: Node.js 26.9.0, npm 11.19.1 e Python 3.14.7.

```powershell
# Executar bateria completa de testes unitários locais com Vitest (125 testes em 27 arquivos)
npm test

# Verificação TypeScript, build do frontend com Vite e compilação desktop (main ESM + preload CJS)
npm run build

# Build e smoke em Electron real: interface, IPC, isolamento, CSP e recusa de captura
npm run test:desktop

# Abrir a base desktop local com mocks
npm run desktop

# Verificação estática de tipos
npm run lint

# Iniciar somente o frontend no Vite; não abre Electron
npm run dev

# Executar bateria completa de testes Python (39 testes: E0 e backup seguro)
python -m unittest discover -s tests

# Gerar comando de backup seguro por allowlist fechada (exclui estritamente mensagens - RF-14)
python scripts/backup_db.py --dry-run --db-url postgresql://user:pass@localhost:5432/discord
```

Para verificar novamente a conversão do DOCX, com Python 3.11 ou superior e sem dependências externas:

```powershell
python scripts/converter_contexto.py --source docs/contexto/fontes/contexto-mestre.docx --check
```

## Organização

- `.codex/agents/`: 15 perfis TOML com missão, entradas, entregas, limites e skills.
- `.codex/config.toml`: habilita agentes e limita a três subagentes simultâneos, além do principal.
- `.agents/skills/reverse-engineer-anything/`: cópia local da skill REA e suas referências.
- `src/main/`, `src/preload/`, `src/renderer/` e `src/common/`: processos Electron, interface React e contratos compartilhados.
- `tests/unit/`: testes Vitest; `tests/test_*.py`: verificações Python.
- `dist/` e `dist-electron/`: saídas geradas pelo build.
- `docs/agentes/catalogo.md`: responsabilidades, fluxo e contrato de delegação.
- `docs/agentes/manifesto.json`: inventário verificável e hash do AGENTS.md preservado.
- `scripts/validar_agentes.py`: verificação local de consistência.

## Uso no Codex

Abra uma nova sessão nesta pasta para carregar os perfis locais. Eles herdam modelo, permissões e MCP da sessão principal. A descoberta efetiva depende do cliente e da confiança concedida ao projeto; criar arquivos não inicia agentes.

Exemplo de pedido:

> Use o perfil orquestrador para coordenar este pedido. Peça ao planejador um plano e acione somente os especialistas necessários, com arquivos exclusivos. Para reconstrução de um artefato fornecido, use producao_rea e depois construcao_rea. Consolide as evidências de QA e revisão antes de concluir.

O agente principal também pode ler `.codex/agents/orquestrador.toml` e coordenar diretamente. Quinze perfis são um catálogo, não uma exigência de executar todos em cada tarefa.

## Coordenação operacional

O principal seleciona os especialistas conforme [a orquestração](docs/agentes/ORQUESTRACAO.md) e envia [o contrato de tarefa](docs/agentes/CONTRATO-TAREFA.md). O limite continua sendo três especialistas simultâneos, além do principal. Nenhum subordinado, inclusive orquestrador, redelega sem autorização específica do principal no escopo autorizado pelo usuário.

Arquivos têm um dono por tarefa. Antes do aceite do estado compartilhado, interrompa escritas no conjunto avaliado e obtenha checks pertinentes e revisão independente. Tarefas somente de leitura retornam na conversa. Essas regras são instruções operacionais; não bloqueiam tecnicamente ferramentas.

A configuração foi ampliada em 2026-10-14 com autorização do usuário e backup em `.codex/backups/20261014-010125-orquestracao/`. Uma nova sessão deve confirmar o carregamento das regras; os testes desta sessão recebem o contrato explicitamente. Consulte a validação de memória para as lacunas dos hooks, sem ativar novas automações.

## Validação

Em PowerShell, nesta pasta:

```powershell
python scripts/validar_agentes.py
```

Requer Python 3.11 ou superior, sem dependências externas. Valida sintaxe TOML, quantidade, nomes, skills, cópia REA, contratos de orquestração, instruções de delegação e preservação de AGENTS.md. Não comprova execução dos agentes nem disponibilidade de motores REA.

`scripts/criar_agentes.py` registra a geração inicial; recusa substituir destinos existentes. Não é necessário executá-lo para usar a equipe.

Formato baseado na [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents). As skills BMAD e Superpowers permanecem nas instalações locais, com caminhos indicados nos perfis.
