# Memória do projeto Discord

Projeto: `C:\Users\jv883\Documents\Codex\Discord`.

## Consulta obrigatória

Para questões que dependem de histórico, decisões ou estado do projeto, leia este índice e pesquise primeiro na pasta `Discord` deste vault. Leia apenas as notas relevantes. Em seguida consulte ai-memory com workspace `discord` e project `discord`. Valide informações que possam ter mudado no código ou ambiente atual. Não trate notas antigas como fatos atuais.

## Notas

- [[Discord/01-ESTADO|Estado verificado]]
- [[Discord/02-AGENTES|Equipe de 15 agentes]]
- [[Discord/03-DECISOES|Decisões e preferências]]

O Obsidian guarda a memória curada do projeto; ai-memory complementa com captura e busca. Não existe sincronização automática bidirecional configurada. Não registre segredos, transcrições privadas ou suposições como decisões.

## Orquestração aplicada em 2026-10-14

- [[Discord/04-ORQUESTRACAO-2026-10-14|Contratos, teste nativo e limitações verificadas]]


## Documentos do aplicativo publicados em 2026-10-14

Pacote DOC-03: revisão documental aprovada; E0 financeiro bloqueado. As decisões desta sessão estão na nota 10 e o estado de execução na nota 11.

- [[Discord/04-CONTEXTO-MESTRE|Contexto mestre histórico preservado]]
- [[Discord/05-PLANO-DE-EXECUCAO|Plano de doze etapas]]
- [[Discord/06-REQUISITOS-E-ACEITE|Requisitos e critérios de aceite]]
- [[Discord/07-ARQUITETURA-E-CONTRATOS|Arquitetura candidata e contratos]]
- [[Discord/08-BACKLOG-E-DEPENDENCIAS|Backlog e dependências]]
- [[Discord/09-VALIDACAO-E-CUSTOS|Validação financeira E0 e custos]]
- [[Discord/10-DECISOES-DO-APP|Decisões autorizadas do aplicativo]]
- [[Discord/11-REGISTRO-DE-EXECUCAO|Registro da execução e evidências]]

Fonte original preservada: `Discord/fontes/contexto-mestre.docx`. Sem aplicação ou integração implementadas nesta etapa.


## REA do Discord e verificação local — 2026-10-14

O plano foi atualizado por pedido do usuário para reproduzir funções, modos e interface do Discord com REA. REA-REF investiga a referência; REA-APP permanece para o instalador próprio. RF-17/AC-17 e D-15 estão registrados nas notas 05/06/08/10.

- [[Discord/12-REA-DISCORD-REFERENCIA|Plano de investigação e reprodução]]
- [[Discord/13-E0-VERIFICACAO-LOCAL|Ferramenta E0, 35 testes e revisão independente]]
- [[Discord/14-REA-DISCORD-IDENTIDADE|Instalação identificada e análise estática parcial]]
- [[Discord/15-E0-RETOMADA|Inspeção financeira e limites de avanço]]

Estado atual: base mock local com 23 testes/tipagem/build do renderer verificados; entrada desktop compilada ausente e aceite integral BASE pendente. E0 continua BLOQUEADO; runtime/interface do Discord e reprodução não estão concluídos. As declarações históricas anteriores de BASE concluída ficam preservadas, com este estado atual como referência.

## Desktop local e catálogo REA — atualização de 2026-10-14

Data: 2026-10-14. Fonte: autorização “pode seguir”, BASE-LOCAL-02 e revisões BASE-REV-02C/REA-REV-02A/DOC-REV-BASE-02. Curadoria: orquestrador principal. O snapshot dos checks globais é de 13:36; alterações posteriores exigem nova verificação.

- [[Discord/16-REA-DISCORD-CATALOGO|Catálogo estático parcial revisado]]
- [[Discord/17-MATRIZ-REPRODUCAO|Matriz inicial de reprodução e adaptação]]
- [[Discord/18-BASE-DESKTOP-LOCAL|Desktop local: build, CSP, testes e limites]]

BASE-LOCAL-02 aceito no escopo mock Windows 10: build renderer/main ESM/preload CJS, interface Electron real, ponte IPC, sandbox/isolamento, captura recusada e CSP de conexão efetiva. `npm test` passou em 60 testes/13 arquivos; `npm run lint` e `npm run test:desktop` passaram. Relatório e limites: [[Discord/18-BASE-DESKTOP-LOCAL]].

REA-REF-02A/03A permanecem parciais: catálogo de bootstrap/splash e matriz RF-01–17 revisados. A ledger histórica não estava retida; a leitura estática local foi identificada como método distinto, sem novos Evidence IDs. UI principal, runtime, medidas, contratos finais e fidelidade permanecem pendentes. Veja [[Discord/16-REA-DISCORD-CATALOGO]] e [[Discord/17-MATRIZ-REPRODUCAO]].

E0 continua BLOQUEADO; E1/E2, OAuth/provedores/mídia reais, instalação limpa, Windows 11, instalador e piloto não foram aceitos. Código de autenticação/comunidades/convites foi acrescentado por trabalho paralelo; este lote não o audita nem aprova DATA/IDENTITY integrais. AGENTS.md foi preservado. Não houve implantação, contratação ou alteração de billing.
