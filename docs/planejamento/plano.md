# Plano de execução do aplicativo desktop de comunicação

Data: 2026-10-14. Fonte: plano final da conversa, autorizado pelo pedido “Implement the plan”. Responsável documental: planejador, tarefa DOC-02; aceite e execução: orquestrador principal.

**Objetivo:** criar um aplicativo próprio para o grupo de amigos a partir do Contexto Mestre fornecido e da equipe existente.

**Arquitetura candidata:** Electron + React + TypeScript no desktop; Supabase Free para Auth, PostgreSQL, RLS, texto e presença; Cloudflare Worker + Durable Object SQLite para coordenar chamadas; Cloudflare Realtime SFU para mídia; GitHub privado para código, verificações e releases. A candidatura depende dos portões financeiros e da prova de mídia; documentação não comprova integração.

**Especificação:** [requisitos e aceite](../produto/requisitos-e-aceite.md). **Execução rastreável:** [backlog](backlog.md). **Decisões:** [registro](decisoes.md).

## Restrições globais

- Windows 10/11 x64, português do Brasil, login Google integrado ao Supabase Auth.
- 20 pessoas online; uma chamada global ativa com até 10 participantes; uma tela por chamada, 720p/30 fps com som do sistema.
- Até 120 horas mensais de chamada de voz, incluindo até 60 horas mensais de transmissão de tela. São horas de chamada/transmissão, não horas multiplicadas pelos participantes.
- Comunidades, canais, texto, DMs individuais entre amigos e presença. Histórico acompanha o acesso ao canal, sem permissão READ_MESSAGE_HISTORY separada.
- Mensagens disponíveis por 10 dias. Backups de contas, comunidades e permissões excluem texto de mensagens.
- Prioridade R$0, com interrupção preventiva da mídia. Código e releases privados, atualização manual.
- Texto simples sem edição; exclusão pelo autor e moderação autorizada. Bloqueios impedem novos pedidos de amizade e DMs. Sem anexos, webcam, gravação e voz por DM nesta versão.

## Portões e riscos

O primeiro portão é financeiro: conferir contas, condições de pagamento, consumo existente e suspensão verificável. A projeção do plano, ainda não medida, é de cerca de 543 GB de payload mensal e 706 GB com margem estimada de 30%, para dez participantes, nove espectadores, microfone a 32 kbps, vídeo a 1,5 Mbps e som a 96 kbps. O orçamento operacional inicial é 800 GB, descontando outros consumos da conta. A franquia publicada de 1.000 GB SFU/TURN e todos os demais limites devem ser reconfirmados no E0. Alertas não equivalem a bloqueio. Sem preservar a prioridade R$0, não ativar mídia nem piloto.

O segundo portão é a prova pequena; o terceiro é o ensaio de dez participantes. Falha material interrompe o desenvolvimento completo até revisão da proposta. Riscos centrais: cobrança por atraso de métricas/corte; cliente expulso mantendo mídia; autorização privada em cache; eco digital; restauração recuperando mensagens excluídas. Cada risco possui aceite no backlog.

Fontes publicadas citadas no plano aprovado, sem revalidação por esta tarefa documental: [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/), [SFU](https://developers.cloudflare.com/realtime/sfu/platform/pricing/), [alertas](https://developers.cloudflare.com/billing/manage/budget-alerts/), [permissões Discord](https://docs.discord.com/developers/topics/permissions), [captura Electron](https://www.electronjs.org/docs/latest/api/session#sessetdisplaymediarequesthandlerhandler-opts), [Realtime Supabase](https://supabase.com/docs/guides/realtime/authorization), [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Etapas ordenadas

### 1. Consolidar contexto, decisões e documentos — DOC

Responsáveis: analista, produto e planejador; publicação pelo orquestrador.

- [x] Converter fielmente o DOCX para Markdown, preservando seções, listas, tabelas e referências.
- [x] Registrar separadamente as decisões da conversa, requisitos, aceite e tarefas.
- [x] Publicar e verificar o pacote inicial no Obsidian.

Aceite: cada funcionalidade confirmada possui tarefa e verificação; propostas e fatos estão identificados. Etapa 1 concluída em 2026-10-14: DOC-01/DOC-02 revisados por QA e publicação DOC-03 verificada pelo principal. O pacote inclui oito notas, índice/estado/decisões atualizados e cópia intacta do DOCX. Essa conclusão não aprova os portões técnicos seguintes.

### 2. Verificar as condições reais de gratuidade — E0

Responsáveis: devops e arquiteto. Inspecionar planos, franquias, consumo existente, pagamento, ciclo de cobrança e suspensão nas contas escolhidas; incluir Supabase, Workers, Durable Objects e GitHub Actions privado.

- [ ] Produzir relatório financeiro com evidências e decisão explícita de avanço.

Aceite: mecanismo verificável preserva prioridade R$0. Não transmitir mídia nem provocar excedentes reais nesta verificação.

Estado da execução em 2026-10-14: relatório [E0 financeiro](../validacao/e0-financeiro.md) entregue e revisado; gate **BLOQUEADO**. Faltam conta Cloudflare identificada, acesso de leitura e evidências de ciclo/consumo/prevenção de cobrança. O checkbox de aceite permanece pendente; produzir o relatório não aprova o portão.

### 3. Executar uma prova pequena de mídia — E1

Responsáveis: backend, devops e qa. Após E0 aprovado, criar experimento isolado com dois computadores, um Windows 10 e um Windows 11, por até 15 minutos.

- [ ] Testar microfone, tela, som do sistema, cancelamento, reconexão e expulsão de cliente que ignora a ordem de sair.

Aceite: captura correta, ausência de eco digital da própria chamada e encerramento remoto da mídia em até cinco segundos. Suporte documentado da API não substitui teste nesses computadores.

### 4. Validar o cenário de dez participantes — E2

Responsáveis: backend, devops e qa. Após E1 aprovado, executar chamada de 60 minutos em redes distintas com uma tela e som para nove espectadores.

- [ ] Medir qualidade, tráfego, entrada, reconexão, CPU e memória.
- [ ] Simular limite operacional sem esgotar franquia real.

Aceite: áudio utilizável, tela legível, corte preventivo funcionando e projeção mensal dentro da margem. Falha impede desenvolvimento completo até revisão.

### 5. Documentar experiência e contratos — DESIGN

Responsáveis: ux_ui, arquiteto e produto; consolidação do planejador.

- [ ] Especificar comunidades, canais, DMs, controles de voz, captura, administração, erros e indisponibilidade.
- [ ] Formalizar contratos compartilhados de capacidades, operações autorizadas, entrada/publicação/assinatura/negociação/saída de mídia, reserva exclusiva, orçamento e IPC restrito.

Aceite: frontend, backend e dados recebem interfaces consistentes, fluxos completos e exemplos de autorização. Não inventar contratos de API nesta fase documental.

### 6. Preparar a base reproduzível — BASE

Responsáveis: devops e frontend.

- [ ] Inicializar Git local e estrutura por responsabilidade, dependências fixadas, lockfile, exemplo de configuração e verificações.
- [ ] Criar shell Electron com isolamento, sandbox, CSP e IPC mínimo.
- [ ] Documentar comandos somente depois de executados com sucesso.

Aceite: instalação, execução e build reproduzidos; AGENTS.md preservado; nenhum segredo no cliente.

### 7. Implementar dados, permissões e retenção — DATA

Responsável: dados; revisão: seguranca.

- [ ] Criar migrations para perfis, comunidades, membros, canais, cargos, exceções, convites, mensagens, amizades, bloqueios e DMs; aplicar RLS e constraints.
- [ ] Usar avaliação canônica de permissões nas consultas e controle de mídia.
- [ ] Tornar mensagens indisponíveis exatamente após dez dias, mesmo com limpeza física atrasada; remover fisicamente periodicamente.
- [ ] Fazer backup por lista explícita de tabelas permitidas, excluindo mensagens.

Aceite: isolamento, integridade de cargos, expiração e restauração sem recuperar texto.

### 8. Integrar identidade e comunidades — IDENTITY

Responsáveis: backend, frontend e qa.

- [ ] Implementar login Google pelo navegador externo, retorno seguro, persistência protegida de sessão e logout.
- [ ] Entregar comunidades, convites, associação de membros, canais e administração de cargos.

Aceite: login real e recuperação de sessão; recusa de convites inválidos; administração respeita permissões e hierarquia.

### 9. Entregar texto, amizades, DMs e presença — TEXT

Responsáveis: backend, frontend e qa.

- [ ] Implementar histórico paginado, envio idempotente, estados de envio, exclusão autorizada, amizade, bloqueio e DM individual.
- [ ] Implementar presença efêmera que expire após desconexão.
- [ ] Impedir entrega de conteúdo privado por autorização desatualizada em conexões Realtime.

Aceite: reenvio/reconexão não duplicam mensagens; terceiros não acessam DMs; revogação impede novas leituras.

### 10. Integrar voz, tela e som ao produto — MEDIA

Responsáveis: backend, frontend e devops.

- [ ] Reutilizar integração aprovada no experimento; entregar dispositivos, mute, entrada/saída, captura escolhida e adesão de espectadores.
- [ ] Controlar no servidor chamada global, dez participantes e uma transmissão; revalidar permissões e encerrar publicações/recepções em revogação ou corte.

Aceite: concorrência não duplica reservas; décimo primeiro participante recusado; saída, expulsão e encerramento liberam recursos remotos.

### 11. Revisar e produzir instalador candidato — RELEASE

Responsáveis: qa, seguranca e revisor; empacotamento: devops.

- [ ] Testar integração e revisar IPC, RLS, permissões, limpeza de mídia e distribuição; devolver correções aos donos dos módulos.
- [ ] Após existir instalador/ASAR próprio, producao_rea investiga pergunta concreta; construcao_rea corrige achados rastreáveis, com ferramentas comprovadamente disponíveis.

Aceite: nenhum achado bloqueador; instalação, atualização manual, desinstalação e rollback testados nos dois Windows. REA não inicia antes de existir alvo autorizado.

### 12. Realizar piloto e consolidar entrega — PILOT

Responsáveis: orquestrador, devops e qa.

- [ ] Distribuir versão privada ao grupo autorizado e executar piloto de 30 dias com uso representativo.
- [ ] Acompanhar consumo/falhas; manter interrupção, recuperação e rollback; usar builds locais se Actions privado não tiver margem segura.
- [ ] Atualizar Obsidian com resultados e limitações.

Aceite: funcionalidades aprovadas, consumo registrado, operação documentada e memória atualizada.

## Validação transversal

Metas iniciais propostas para ensaio, ainda não demonstradas: texto p95 até 1 segundo; entrada na voz p95 até 5 segundos; reconexão até 15 segundos. Conferir permissões conflitantes, isolamento de DMs, fronteira dos dez dias, concorrência de mídia, redes distintas, acessibilidade, instalação e restauração sem mensagens. Ver [critérios](../produto/requisitos-e-aceite.md).

## Coordenação e publicação

Máximo três especialistas simultâneos além do principal. Frontend possui interface/estado; backend possui Worker/mídia/regras; dados possui migrations/RLS; devops possui main/preload/captura/build/infra; arquiteto possui contratos compartilhados; verificadores possuem testes/pareceres atribuídos; orquestrador integra e escreve Obsidian. Cada delegação ratifica caminhos exclusivos, dependências, aceite e evidências; especialistas não redelegam.

O orquestrador publicará em E:/Memoria/Discord as notas 04-CONTEXTO-MESTRE, 05-PLANO-DE-EXECUCAO, 06-REQUISITOS-E-ACEITE, 07-ARQUITETURA-E-CONTRATOS, 08-BACKLOG-E-DEPENDENCIAS e 09-VALIDACAO-E-CUSTOS; atualizará 00-INDICE, 01-ESTADO e 03-DECISOES preservando histórico. Cada registro inclui data, fonte, estado e limitações; leitura, busca e links devem ser verificados. Contratos técnicos e validação financeira pendentes devem continuar identificados como pendentes.

Estado de execução: fase DOC/E0. Nenhuma etapa técnica 2–12 está concluída por este documento; nenhum portão foi aprovado por DOC-02. Próximo responsável: orquestrador para revisão documental e aceite explícito do E0.
