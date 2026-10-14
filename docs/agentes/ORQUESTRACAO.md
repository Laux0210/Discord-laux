# Orquestração nativa do Codex

Estado: configuração autorizada pelo usuário em 2026-10-14. Esta equipe prepara projetos de software; os requisitos do aplicativo Discord ainda serão definidos.

## Autoridade e execução

O agente principal assume a coordenação do perfil `orquestrador`, mantém a comunicação com o usuário, seleciona especialistas e decide o aceite. O planejador propõe tarefas e responsáveis; o principal ratifica as atribuições. Não é necessário iniciar um subagente orquestrador para cada pedido.

Use somente os 15 perfis existentes em `.codex/agents/`. As skills de cada perfil continuam disponíveis e devem ser lidas quando pertinentes. Skills e notas históricas não ampliam a autorização do pedido. Uma tarefa somente de leitura entrega seu resultado na conversa, mesmo que o perfil normalmente indique um arquivo de saída.

Nenhum subagente pode iniciar novas delegações sem autorização específica do principal dentro do escopo autorizado pelo usuário. Isso inclui um subagente com perfil `orquestrador`: a identidade do perfil não concede a exceção. Toda necessidade de outro especialista deve voltar ao principal.

## Limite e mecanismos

O limite é de **três especialistas simultâneos, além do principal**. A configuração local mantém `max_concurrent_threads_per_session = 3`; a capacidade real também depende do runtime.

Quando disponíveis, os mecanismos nativos desta sessão são:

- `collaboration.spawn_agent`: iniciar uma tarefa com `agent_type` igual ao nome do perfil existente e mensagem autocontida conforme o contrato. O `task_name` identifica a tarefa, não cria um novo perfil.
- `collaboration.list_agents`: conferir os agentes e seus estados antes e depois de despachar um lote.
- `collaboration.followup_task`: reutilizar um especialista existente para novo trabalho compatível, sem duplicar sua função.
- `collaboration.send_message`: encaminhar ajustes e dependências; não substitui o retorno final.
- `collaboration.wait_agent`: aguardar retornos; o principal mantém atualizações ao usuário.
- `collaboration.interrupt_agent`: interromper uma tarefa quando houver conflito ou mudança de escopo, sem encerrar processos alheios.

Conte como ocupados os especialistas que ainda não concluíram, incluindo bloqueados ou aguardando resposta. Perfis cadastrados e tarefas concluídas não são execuções simultâneas. Se faltarem slots, mantenha as próximas tarefas em espera; não contorne o limite com processos externos. Nenhum worker do Alethe integra este fluxo.

Não presuma que arquivos recém-editados foram recarregados pelo cliente. Na sessão atual, envie as regras explicitamente nas tarefas. Uma nova sessão nesta pasta deve confirmar descoberta dos perfis e carregamento da configuração.

## Competências e fronteiras

Esta matriz define o dono da competência. A propriedade de arquivos é concedida por tarefa, nunca automaticamente pelo papel.

| Perfil | Competência e saída | Fronteira exclusiva |
| --- | --- | --- |
| `orquestrador` | Distribuição, acompanhamento, síntese e aceite pelo principal | Ratifica donos, transferências e escopo; subordinado apenas recomenda |
| `planejador` | Plano com sequência, dependências e critérios | Propõe atribuições; não altera implementação nem ratifica sua própria proposta |
| `analista` | Descoberta com fatos, hipóteses e fontes | Investiga; não define sozinho o MVP nem inventa pesquisa |
| `produto` | Requisitos, prioridades e critérios de aceite | Define escopo conforme o pedido; não escolhe arquitetura nem implementa |
| `arquiteto` | Contratos, interfaces e decisões técnicas | Define fronteiras; não modifica módulos atribuídos a implementadores |
| `ux_ui` | Fluxos, estados, responsividade e acessibilidade | Especifica experiência; componentes pertencem ao frontend atribuído |
| `frontend` | Interface implementada e checks de interação | Edita apenas arquivos de interface atribuídos e seus testes autorizados |
| `backend` | APIs, validações e regras de negócio | Schema e contratos compartilhados exigem coordenação; testes têm dono explícito |
| `dados` | Schema, migrations, constraints e consultas | Persistência atribuída; operações destrutivas exigem autorização aplicável |
| `qa` | Testes e relatório comportamental | Testes atribuídos; não corrige silenciosamente a implementação de outro agente |
| `seguranca` | Achados de autorização, confiança e segredos | Revisão; correção de código precisa de tarefa específica |
| `devops` | Execução, ambiente, CI, entrega e rollback | Configuração operacional atribuída; infraestrutura externa exige autorização |
| `revisor` | Parecer independente sobre estado estável | Não revisa sua própria alteração nem edita implementação durante o parecer |
| `producao_rea` | Identidade do alvo, evidências e contrato REA | Investiga alvo autorizado; não implementa a reconstrução |
| `construcao_rea` | Implementação rastreável ao contrato REA | Destino e arquivos atribuídos; não divide os mesmos módulos com outro implementador |

## Seleção conforme a tarefa

O principal identifica o resultado esperado, as lacunas e os arquivos envolvidos antes de escolher especialistas. Tarefas pequenas podem ser resolvidas pelo próprio principal. Nunca inicie todos os perfis por padrão.

| Necessidade | Seleção inicial | Condição de avanço |
| --- | --- | --- |
| Pedido com requisitos incertos | `analista`, depois `produto`; `planejador` se houver várias etapas | Escopo e hipóteses identificados |
| Contratos ou estrutura técnica | `arquiteto`; `dados` se houver persistência | Interfaces aceitas antes de implementar |
| Experiência e interface | `ux_ui`, depois `frontend` | Fluxos e contratos suficientes |
| Serviços e persistência | `backend` e `dados` | Responsabilidades e schema acordados |
| Reconstrução de alvo autorizado | `producao_rea`, depois `construcao_rea` | Evidências e contrato aceitos |
| Defeito ou verificação de comportamento | Dono do módulo e `qa`; `revisor` sobre correção estável | Reprodução e checks apropriados |
| Autorização, autenticação ou segredos | `seguranca`, dono do módulo e `qa` conforme necessidade | Correção e verificação dos limites de confiança |
| Execução e entrega | `devops`, depois verificadores pertinentes | Destino e ação autorizados |
| Configuração da equipe e memória | `arquiteto`, `qa`, `revisor` | Contratos, evidências de captura e consistência revisados |

## Dependências e paralelismo

1. Descoberta e pesquisas independentes podem ocorrer em paralelo. Produto usa as descobertas suficientes; o principal resolve decisões pendentes.
2. Arquitetura e UX podem avançar juntas após requisitos suficientes. Planejamento incorpora seus contratos; o principal ratifica o lote seguinte.
3. Frontend, backend e dados podem trabalhar em paralelo somente com contratos aceitos e arquivos disjuntos. Um contrato compartilhado muda antes do lote ou depois de interromper os consumidores afetados.
4. Produção REA precede construção REA. Construção e implementadores comuns não recebem os mesmos módulos simultaneamente.
5. QA, segurança e revisor podem avaliar em paralelo um estado estável. Revisão independente não pode ser feita pelo autor do trecho avaliado.
6. O principal consolida o retorno de cada lote, resolve bloqueios e só então libera dependências satisfeitas. Três vagas são teto, não meta.

## Propriedade e aceite do estado compartilhado

Use [CONTRATO-TAREFA.md](CONTRATO-TAREFA.md) em cada delegação. Liste caminhos concretos de escrita e leitura; documentos, testes, schemas, lockfiles e configurações também precisam de um único dono. Evite permissões amplas que se sobreponham entre tarefas.

O dono mantém a posse até retornar resultado e liberar seus arquivos. Para transferir, o principal registra o estado atual, encerra a escrita do dono anterior e comunica a nova atribuição. Um agente que precisar editar fora da lista devolve a dependência ao principal antes de fazê-lo.

Os agentes compartilham o diretório: suas mudanças ficam visíveis imediatamente. Este fluxo oferece aceite lógico, não isolamento nem merge automático. Antes do aceite:

1. Cessar escritas no conjunto avaliado e registrar arquivos e estado por hash ou diff disponível.
2. Executar checks pertinentes aos critérios. Em código, exigir testes relevantes; em configuração, verificar sintaxe, consistência e comportamento suportado. Documentar checks não executados.
3. Obter revisão independente, com parecer separado do estado da tarefa: uma revisão concluída pode reprovar a alteração.
4. Corrigir achados materiais e repetir checks e revisão dos trechos afetados. Qualquer mudança no estado avaliado invalida o parecer desses trechos.
5. O principal aceita apenas o conjunto com evidências suficientes; limitações restantes ficam explícitas.

## Memória e limites de garantia

Todos consultam primeiro o índice e notas relevantes de `E:\Memoria\Discord`; depois ai-memory no escopo `discord/discord`. Somente o principal consolida decisões e resultados relevantes no Obsidian, com data, fonte, estado e limitações. Especialistas retornam descobertas sem escritas concorrentes de memória. Acrescente registros; não substitua notas existentes nem grave segredos.

Consulte [a integração](../memoria/INTEGRACAO.md) e [a validação](../memoria/VALIDACAO.md). Captura dos hooks e recuperação por sessão precisam de validação antes de novas automações. Não há sincronização bidirecional automática.

O validador local comprova contratos e configuração estática. As proibições de redelegação e escrita são instruções: não constituem bloqueio técnico das ferramentas. O teste nativo comprova execução apenas dos perfis efetivamente iniciados. Nesta etapa, não iniciar aplicativo, workers externos ou tarefas do agendador Alethe; `.planning/task.md` permanece fora deste fluxo.
