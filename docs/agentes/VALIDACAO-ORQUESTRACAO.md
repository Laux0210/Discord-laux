# Validação da orquestração — 2026-10-14

Estado: configuração aplicada com autorização do usuário (`pode aplicar`) e aceite após verificação estática, teste nativo somente de leitura e revisão independente. Não representa desenvolvimento ou validação do aplicativo Discord.

## Alterações e preservação

- Criados `ORQUESTRACAO.md` e `CONTRATO-TAREFA.md`; vinculados pela configuração do principal, pelos 15 perfis, README e catálogo.
- Esclarecida a autorização específica para redelegação, inclusive para orquestrador subordinado.
- Definidos dono nominal por tarefa, dependências, seleção de especialistas, transferência de arquivos e aceite sobre estado compartilhado.
- Ampliado `scripts/validar_agentes.py`; acrescentados resultados históricos e protocolo proposto em `docs/memoria/VALIDACAO.md`.
- Backup anterior às alterações: `.codex/backups/20261014-010125-orquestracao/`.
- Comparações com o backup confirmaram nomes, descrições, missões, entradas, entregas, limites e skills dos 15 perfis preservados; `AGENTS.md` e manifesto idênticos.
- Nenhum perfil novo, aplicação, worker externo, hook, configuração global ou arquivo `.planning/task.md` criado ou alterado por este trabalho. Alethe permaneceu fora da implementação.

## Verificações executadas pelo principal

1. `python scripts/validar_agentes.py`: código 0, confirmando TOMLs, nomes, skills, contratos, regra de delegação, limite de três especialistas, marcador e hash do AGENTS.md.
2. Comparação programática dos 15 perfis com o backup: preservação dos blocos de papel e referências de skills, com código 0 nas comparações concluídas.
3. Harness executado na conversa sobre cópia temporária do projeto: quatro casos negativos rejeitados — limite alterado para quatro especialistas, regra de redelegação removida, contrato sem campo de arquivos de escrita e matriz sem perfil dados. Fixture válida passou antes e depois. O primeiro ensaio do harness introduziu CR duplicado no TOML temporário; o harness foi corrigido para escrever bytes preservando quebras de linha e a execução final passou com código 0. Não foi defeito nem alteração do TOML real.
4. Comparação de hashes do estado estável antes/depois dos retornos: registrada pelo principal antes do aceite. Logs e backups são excluídos da comparação de conteúdo ativo.

## Teste nativo após aplicação

O principal selecionou especialistas compatíveis com a tarefa e reutilizou instâncias dos perfis existentes. Cada tarefa recebeu ID, objetivo, fontes, restrição de escrita, critérios, destino e próximo responsável. Nenhum especialista recebeu permissão para redelegar.

| Tarefa | Instância/perfil | Responsabilidade | Retorno |
| --- | --- | --- | --- |
| ORQ-ACEITE-ARQ | `/root/contratos_arquiteto` — arquiteto | Competências, fronteiras, dependências e roteamento | Concluída; aprovado documentalmente |
| ORQ-ACEITE-QA | `/root/validacao_qa` — qa | Validador, memória, links e limites das evidências | Concluída; aprovado para configuração estática/documentação |
| ORQ-ACEITE-REV | `/root/validacao_revisor` — revisor | Comparação independente com backup e contrato operacional | Concluída; aprovado; nenhum achado material |

`collaboration.list_agents` registrou principal, arquiteto, QA e revisor com status `running` simultaneamente: três especialistas, quatro agentes no total. O principal enviou a liberação para finalizar após esse snapshot, aguardou os três retornos e consolidou os pareceres. Os especialistas relataram nenhum arquivo alterado.

QA executou o validador com código 0, verificou oito links locais sem destinos ausentes e comparou hashes de oito arquivos sem mudança. Revisor comparou os 15 perfis, AGENTS.md e manifesto com o backup e executou o validador com código 0. Arquiteto confirmou o fluxo e fez seleção hipotética de papéis para requisitos incertos e reconstrução autorizada; essas seleções foram documentais, sem iniciar esses outros perfis.

## Aceite e limitações

O principal aceita a configuração e os contratos com base nos três pareceres e nas verificações realizadas. As regras escritas não bloqueiam tecnicamente ferramentas nem oferecem isolamento do diretório compartilhado.

A sessão atual recebeu os contratos explicitamente nas delegações. Uma nova sessão deverá confirmar carregamento das instruções locais; isso não foi demonstrado por este teste. Não foram executados todos os 15 perfis, engines REA ou testes de aplicação.

O protocolo de hooks continua proposto em `docs/memoria/VALIDACAO.md`. Consulta e contadores de captura não comprovam ciclo de vida completo nem captura individual dos subagentes. Nenhuma automação nova foi ativada. O próximo passo de memória é uma sessão controlada autorizada com verificação por ID e encerramento normal.

## Repetição somente de leitura

Abra uma sessão no diretório do projeto, leia os contratos e execute o validador. Delegue aos perfis adequados até três tarefas independentes com `Arquivos de escrita: nenhum`. Registre estados nativos e retornos; compare hashes antes/depois. Se ferramentas nativas ou papéis estiverem indisponíveis, registre o impedimento sem simular execução. Não use um agendador externo para contornar o limite.
