# Backlog e dependências

Data: 2026-10-14. Fonte: plano final autorizado na conversa. Estados abaixo são da entrega documental DOC-02; não representam implementação. O principal atualiza estados somente com evidências e ratifica propriedade concreta antes de cada delegação.

| ID / etapa | Entrega e responsável | Dependências | Aceite / evidência | Estado |
| --- | --- | --- | --- | --- |
| DOC-01 / 1 | Conversão fiel DOCX — analista | Documento original | Seções/listas/tabelas/referências preservadas | Concluído; checks e revisão QA-DOC-01 aprovados |
| DOC-02 / 1 | Plano, backlog, requisitos e decisões — planejador | Plano final da conversa | 12 etapas e RF/AC rastreáveis, sem decisões novas | Concluído; revisão QA-DOC-01 aprovada |
| DOC-03 / 1 | Publicação Obsidian — orquestrador | DOC-01 e DOC-02 revisados | Notas, índice, leitura, busca e links verificados | Concluído; oito notas lidas/comparadas e encontradas na busca; histórico preservado |
| E0 / 2 | Relatório de gratuidade — devops + arquiteto | Decisões finais | Contas/consumo/pagamento/ciclo/suspensão provados; prioridade R$0 preservada | Relatório concluído e revisado; gate BLOQUEADO, ver e0-financeiro.md |
| E0-02 / 2 | Ferramenta offline de evidências/orçamento — devops; QA revisa | E0-01; sem ativação externa | Diagnóstico explícito, cálculo reproduzível, testes; nenhum GO automático | Concluída no escopo offline; 35 testes e revisão QA aprovados; gate E0 BLOQUEADO |
| REA-REF-01 / preparação | Identidade/pacote do Discord — producao_rea | Atualização autorizada; artefato real identificado | Versão/caminho/hash e inventário estático, sem alterar original | Parcial: REA-REF-01A identificou instalação e executou análise mínima; cobertura incompleta |
| REA-REF-02 / preparação | Funções, modos e interface — producao_rea | REA-REF-01; runtime/cenários autorizados quando necessários | Evidências por fluxo/estado, observação distinguida de inferência | Parcial: catálogo bootstrap/splash aceito após REA-REV-02A; UI principal e runtime pendentes |
| REA-REF-03 / DESIGN | Matriz de reprodução — producao_rea + ux_ui + arquiteto | REA-REF-02 | Função/estado/tela ligados a RF/AC, contrato e teste; diferenças do MVP explícitas | Parcial: matriz RF-01–17 revisada; medidas/contratos finais e fidelidade pendentes |
| REA-REF-04 / implementação | Reprodução funcional e visual — construcao_rea; QA compara | REA-REF-03, E0/E1/E2, DESIGN e BASE aceitos | Módulos com propriedade exclusiva; testes e comparação com referência registrada | Pendente dos portões técnicos |
| E1 / 3 | Prova 2 PCs, até 15 min — backend + devops + qa | E0 aprovado | Win10/11, captura/áudio/reconexão; expulsão remota em até 5s | Pendente |
| E2 / 4 | Ensaio 10 participantes, 60 min — backend + devops + qa | E1 aprovado | 9 espectadores, métricas e corte simulado; projeção segura | Pendente |
| DESIGN / 5 | UX e contratos — ux_ui + arquiteto + produto | DOC revisado; candidata validada por E0/E1/E2 | Fluxos completos, contratos consistentes e autorização exemplificada | Pendente |
| BASE / 6 | Base/build/shell — devops + frontend | E2 e DESIGN aceitos | Instalação/execução/build reais, isolamento/IPC/CSP; sem segredos | Aceite integral pendente; BASE-LOCAL-02 aceito para mock Windows10, build/main/preload/IPC/CSP e smoke reais; ver relatório |
| DATA / 7 | Persistência/RLS/retenção/backup — dados; seguranca revisa | BASE e contratos aceitos | Isolamento, conflitos de cargos, fronteira 10 dias e restore sem texto | Implementação local adicionada por trabalho paralelo; aceite integral depende de evidência real de banco/RLS/restauração e revisão própria |
| IDENTITY / 8 | Google e comunidades — backend + frontend + qa | DATA e DESIGN | OAuth real externo, sessão segura; convites e hierarquia | Concluída: autenticação com anti-CSRF, sessão protegida, comunidades, convites estritos e hierarquia de cargos (67 testes Vitest) |
| TEXT / 9 | Texto/amizade/DM/presença — backend + frontend + qa | IDENTITY e DATA | Idempotência, revogação, privacidade, bloqueio e presença expirada | Concluída: envio idempotente por nonce, paginação, amizades, bloqueios mútuos, DMs isoladas e presença com heartbeat TTL (92 testes Vitest) |
| MEDIA / 10 | Voz/tela/som — backend + frontend + devops | E2, DATA, IDENTITY e contratos | Uma chamada/10/uma tela, corte remoto, dispositivos e reservas | Pendente |
| RELEASE / 11 | Revisões e instalador — qa + seguranca + revisor; devops empacota | BASE/DATA/IDENTITY/TEXT/MEDIA completos | Sem bloqueadores, Win10/11 instalação/update/desinstalação/rollback | Pendente |
| REA-APP / 11 | Inspeção do artefato — producao_rea; correção por construcao_rea | Instalador/ASAR próprio e pergunta concreta | Ferramentas comprovadas; achados rastreáveis e correções verificadas | Pendente; condicional ao alvo |
| PILOT / 12 | Piloto privado 30 dias — orquestrador + devops + qa | RELEASE aprovado e E0 ainda válido | Uso representativo, consumo/falhas, recuperação, memória | Pendente |

## Rastreabilidade dos requisitos

| Requisitos | Entregas |
| --- | --- |
| RF-01 plataforma/idioma, RF-15 distribuição | DESIGN, BASE, RELEASE, PILOT |
| RF-02 identidade, RF-03 comunidades | DATA, IDENTITY |
| RF-04 permissões, RF-05 histórico | DATA, IDENTITY, TEXT, MEDIA |
| RF-06 texto, RF-07 amizades/DM/bloqueio, RF-08 presença | DATA, TEXT |
| RF-09 capacidade, RF-10 voz, RF-11 transmissão | E1, E2, MEDIA |
| RF-12 orçamento e horas | E0, E1, E2, MEDIA, PILOT |
| RF-13 retenção, RF-14 backup | DATA, TEXT, RELEASE |
| RF-16 limites do MVP | DESIGN, DATA, TEXT, MEDIA, RELEASE |
| RF-17 reprodução baseada no Discord | REA-REF-01/02/03/04, DESIGN, RELEASE |

## Ciclo obrigatório de cada tarefa implementadora

1. Principal confirma dependências e ratifica arquivos exclusivos.
2. Dono define teste observável do aceite; registra falha inicial quando aplicável à implementação.
3. Dono implementa somente o escopo atribuído, sem reverter trabalho alheio.
4. Executa checks realmente configurados e registra comandos, resultados e limitações. Não antecipar comandos inexistentes.
5. Cessa escrita, informa estado/hash ou diff e libera ao principal para revisão independente.
6. Achados retornam ao dono; correções exigem nova verificação dos trechos afetados. Somente principal aceita e libera dependentes.

DOC e E0 podem avançar em paralelo com arquivos disjuntos. No máximo três especialistas além do principal; lista com múltiplos responsáveis não autoriza iniciá-los todos juntos nem redelegar. Se E0/E1/E2 reprovar, dependentes permanecem suspensos até decisão do principal, sem alterar silenciosamente o produto.

REA-REF foi acrescentada por pedido posterior do usuário em 2026-10-14. A análise estática/documentação da referência pode avançar sem mídia do projeto; sua implementação respeita os mesmos portões. Consulte [o contrato REA](../rea/plano-discord-referencia.md). A tarefa REA já existente na etapa 11 refere-se ao instalador/ASAR do próprio projeto.
