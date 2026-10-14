# Validação em 2026-10-14

- Obsidian MCP: escrita de quatro notas em `Discord`, leitura do índice e busca por `orquestrador` dentro dessa pasta confirmadas.
- Destino do MCP conferido: `E:\Memoria`; nenhuma configuração de outro vault foi alterada.
- ai-memory 2.6.3: servidor iniciado em `127.0.0.1:49374`, status respondeu.
- Página `notes/integracao-obsidian.md` gravada em `discord/discord` e encontrada pela busca por `Obsidian`.
- `doctor` reconheceu o projeto exato, mas encontrou quatro sessões locais e zero capturadas no novo escopo. Captura automática permanece pendente de validação em nova sessão; não foi importado histórico antigo.
- Hooks globais e MCP existentes foram preservados. O marcador local define o roteamento futuro para `discord/discord`.
- Política de memória aplicada à sessão principal e a todos os 15 perfis; backups anteriores em `.codex/backups/20261014-002854`.
- Sintaxe TOML, nomes únicos, referências de skills e hash do `AGENTS.md` validados. A cópia REA permanece intacta.

Não foi executada uma nova sessão real de cada perfil. Não existe sincronização automática entre Obsidian e ai-memory. O processo do servidor iniciado nesta configuração não constitui um serviço de inicialização automática do Windows.


## Evidências posteriores em 2026-10-14 — orquestração

Fonte: retornos dos especialistas e consultas executadas nas etapas de diagnóstico e teste anteriores à aplicação autorizada. O registro inicial acima permanece como retrato histórico.

- Primeiro teste: principal, analista, revisor e QA tiveram status `running` simultaneamente via mecanismo nativo; três especialistas concluíram e retornaram ao principal. Somente leitura, sem workers Alethe.
- Segundo teste: principal, arquiteto, QA e revisor tiveram status `running` simultaneamente; os especialistas concluíram a avaliação de contratos, memória e consistência. O principal selecionou papéis pertinentes ao pedido.
- QA executou `doctor` com e sem escopo explícito: 13 sessões locais e duas capturadas naquele momento. Sem escopo explícito, marcador `valid` e resolução `discord/discord`; com escopo explícito, `bypassed_explicit_scope`. Contadores são snapshots e não comprovam captura integral.
- QA inspecionou sete hooks configurados e confiança registrada: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, Stop e SessionEnd. SubagentStart/SubagentStop não estavam configurados. Configuração e confiança não provam execução de cada evento.
- A sessão `01a13862-f371-7b01-bef2-0cda2d845c48` apresentou 14 observações visíveis no escopo: 13 de ferramentas e uma de Stop. O recorte não mostrou todos os eventos de ciclo de vida e informou dados omitidos de outro escopo. Não foi consultada memória de outro projeto nem concluída a causa dessa atribuição.
- Captura individual dos filhos, encerramento e recuperação por ID continuam pendentes. Nenhum hook foi invocado manualmente, alterado ou ativado nesta configuração.

## Protocolo de validação controlada dos hooks — proposto

Antes de novas automações, realizar uma sessão controlada autorizada:

1. Registrar cliente/versão, diretório, horário UTC, ID real, marcador e confiança dos hooks. Guardar somente metadados necessários, sem credenciais.
2. Enviar um prompt inofensivo e executar uma ferramenta somente de leitura; registrar o ID da chamada e término normal do turno.
3. Encerrar a sessão pelo cliente e consultar observações pelo mesmo ID em `discord/discord`. Conferir SessionStart, prompt, ferramenta, Stop e SessionEnd conforme suporte efetivo do cliente.
4. Comparar IDs e horários com o transcript local dessa sessão. Distinguir atraso de ingestão, evento ausente e atribuição a escopo diferente; não ampliar a consulta a outros projetos sem relevância e autorização explícitas.
5. Em teste separado, autorizado, registrar IDs de principal e filho e verificar captura/atribuição de ambos. A falta de hooks próprios para subagentes não prova, sozinha, que filhos sejam ou não capturados como sessões comuns.
6. Reabrir uma sessão e verificar recuperação de uma informação inofensiva do teste. Registrar resultado e limitações antes de propor correções ou automações.

Esta configuração não executa o protocolo, não importa históricos e não modifica hooks globais, inicialização do servidor, marcador ou Alethe. Especialistas retornam descobertas; o principal acrescenta resultados datados à memória curada, preservando notas existentes.
