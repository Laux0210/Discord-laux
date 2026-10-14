# E0-01 — Gate financeiro da arquitetura candidata

Data: 2026-10-14. Responsável: devops. Destino: orquestrador.

**Decisão: BLOQUEADO para ativação, prova de mídia e aplicação completa.** A pesquisa pública e a projeção foram concluídas; condições reais das contas e prevenção de cobrança não foram comprovadas. Ausência de acesso não significa ausência de conta, serviços ou consumo. Nenhum serviço foi ativado, conta/projeto criado, billing alterado, CLI instalado ou mídia transmitida.

## Evidência recente do ambiente e da memória

- Lidos AGENTS.md, README.md, perfil devops, ORQUESTRACAO.md, CONTRATO-TAREFA.md e INTEGRACAO.md. Aplicadas as skills Supabase e verification-before-completion.
- Obsidian: read_note de Discord/00-INDICE.md retornou o índice; search_notes com pathPrefix Discord e query Cloudflare retornou `[]`. ai-memory 2.6.3: search 'Cloudflare custo gratuidade' --workspace discord --project discord --limit 3 --json, saída `[]`, código 0. Não foi encontrada memória financeira nessas buscas.
- Inventário ALL_TOOLS: não encontrado conector Cloudflare/billing. Há conectores GitHub de conteúdo e Supabase. Nenhuma API de billing autenticada da conta destinada ao app foi identificada.
- Get-Command wrangler, gh e supabase: Found=False para os três. Não foi usado npx nem instalada ferramenta.
- Get-ChildItem Env:, filtrando apenas nomes CLOUDFLARE ou CF_: zero nomes no processo atual. Nenhum valor de variável foi impresso. Isso não pesquisa credenciais persistidas nem comprova ausência de credenciais no computador.
- Supabase list_projects({}): sucesso, isError=false, projects=[]. Nenhum projeto Discord foi identificado no contexto acessível; não foram consultados schemas, dados ou projetos alheios. Uma lista vazia não comprova o plano ou billing de uma organização.
- Evidência comunicada pelo principal: cua.getBrowser({url:'https://dash.cloudflare.com'}) retornou 'No browser is available'. Não há painel Cloudflare por esse mecanismo. A identidade da conta destinada ao aplicativo permanece desconhecida.

## Matriz de condições

| Serviço | Regra pública verificada | Evidência da conta destinada ao app | Resultado |
| --- | --- | --- | --- |
| Cloudflare Realtime SFU/TURN | Egress a US$0,05/GB; primeiros 1.000 GB/mês compartilhados. Workers e DO têm preço separado | Conta, elegibilidade, pagamento, ciclo, consumo agregado, métricas e corte desconhecidos | BLOQUEADO |
| Cloudflare Workers | Free: 100.000 requests/dia e 10 ms CPU/invocação | Plano Free e utilização da conta não comprovados | BLOQUEADO |
| Durable Objects SQLite | Free disponível; excedentes falham. Limites diários separados de compute/storage | Plano, namespaces, consumo e adequação do controlador não comprovados | BLOQUEADO |
| Supabase | Free sem cobrança; duas instâncias ativas, pausa por inatividade, quotas e restrições | Nenhum projeto identificado; organização/plano/ciclo/consumo desconhecidos | BLOQUEADO |
| GitHub privado/Actions | Quota depende do plano; sem pagamento válido bloqueia excedente; com pagamento há orçamento/configuração a verificar | Proprietário/repositório, plano, consumo compartilhado e budgets desconhecidos | BLOQUEADO para CI; build local é alternativa posterior |

O status global é BLOQUEADO, e não NO-GO definitivo: faltam evidências que permitam avaliar a candidata. **Usar somente budget alerts como proteção recebe NO-GO**, pois alertas Cloudflare não interrompem nem limitam uso. Não foi demonstrado um hard cap nativo de SFU/TURN nesta inspeção; também não foi demonstrada a inexistência desse recurso para todos os planos/contas.

## Fontes oficiais atuais

Links consultados em 2026-10-14; não representam evidência de configuração da conta.

- [Realtime SFU pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/): franquia SFU/TURN compartilhada e cobrança de egress. Entrada no SFU é gratuita; estatística bytesProcessed do adaptador não é total faturado autoritativo.
- [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/): notificações informativas; não suspendem uso; fatura é fonte autoritativa.
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): quota diária/CPU do Free. Logs possuem tabela própria e mudança anunciada para dezembro de 2026; revalidar antes do piloto.
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/): Free somente SQLite; 100.000 requests e 13.000 GB-s/dia, 5 milhões de linhas lidas e 100.000 escritas/dia, 5 GB armazenados. Excedentes Free falham e limites diários reiniciam 00:00 UTC. Hibernação afeta duração; WebSockets/alarmes entram no cálculo.
- [Supabase pricing](https://supabase.com/pricing): Free inclui 500 MB de banco, 5 GB egress, 5 GB cached egress, 1 GB storage, 50.000 MAU, 200 conexões Realtime e 2 milhões de mensagens/mês. Backup automático não incluído; pausa após uma semana inativa. Quantidade de usuários não demonstra consumo de fan-out/histórico.
- [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control): Free sem cobrança; Spend Cap é recurso Pro e não abrange todo item. Não migrar para Pro para tentar garantir R$0.
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions): GitHub Free publica 2.000 minutos/mês, 500 MB de artefatos e 10 GB de cache/repositório. Artefatos compartilham quota com Packages; Windows tem custo distinto. Larger runners são pagos. Sem pagamento válido excedente é bloqueado; com pagamento exige verificar budgets.
- [GitHub budgets](https://docs.github.com/en/billing/how-tos/set-up-budgets): referência para inspeção do bloqueio aplicável ao proprietário escolhido, sem alteração nesta tarefa.

Falhas de consulta: supabase.com/changelog.md retornou Internal Error pelo web; a referência TURN overview também retornou Internal Error. Não houve implementação Supabase nem inferência a partir dessas páginas indisponíveis; billing TURN foi confirmado na página SFU.

## Projeção reproduzida — hipótese, não medição

Unidades decimais: kbps=1.000 bits/s, Mbps=1.000.000 bits/s, GB=1.000.000.000 bytes. Voz: dez publicadores, cada qual recebido por nove participantes durante 120 horas de chamada. Tela e som: um publicador para nove espectadores por 60 horas, contidas nessas 120 horas.

```text
voz = 10 × 9 × 32.000 × 120 × 3.600 ÷ 8 ÷ 1.000.000.000 = 155,52 GB
tela/som = 9 × (1.500.000 + 96.000) × 60 × 3.600 ÷ 8 ÷ 1.000.000.000 = 387,828 GB
payload = 543,348 GB
payload × 1,30 = 706,3524 GB
```

Executado em PowerShell com aritmética e ConvertTo-Json; código 0, resultados iguais aos acima. A margem de 30% é hipótese: TURN, retransmissões, bitrate variável, redes ruins e outros produtos/consumos da conta não foram medidos. R$0 não deriva dessa conta aritmética.

O orçamento candidato de 800 GB deixa 93,6476 GB sobre a projeção com margem e 200 GB até a franquia publicada, apenas se não existir consumo adicional. Não adotar 800 GB sem conhecer o consumo agregado do ciclo e uma reserva de segurança baseada em latência de medição/corte. Reinício de contador deve acompanhar o ciclo real verificado, não presumir mês civil.

## Próximo pré-requisito concreto e critérios de liberação

Responsável seguinte: principal identifica a conta Cloudflare destinada ao app e disponibiliza acesso autenticado de leitura ao painel/relatório de billing; nunca pedir tokens/senhas na conversa. Devops então registra plano, elegibilidade Realtime, ciclo, pagamento, consumo SFU/TURN agregado e métricas/latência, com evidência sem segredos.

Antes de GO para o experimento:

1. Identificar contas/proprietários dos quatro serviços; comprovar Free onde exigido, ciclo, consumo agregado e ausência de itens pagos necessários. Identificar Supabase Discord sem reutilizar projeto alheio.
2. Demonstrar uma proteção real de não cobrança adequada à conta SFU/TURN. Alertas, estimativa e contadores do cliente não satisfazem. Se depender do aplicativo, especificar e demonstrar admissão fechada em falha, reserva conservadora de bytes, término remoto confiável, falha do controlador, cliente que ignora expulsão e reconciliação com consumo autoritativo; estimativa de bitrate não é hard cap comprovado.
3. Definir orçamento remanescente específico para a prova de 15 minutos e condições de cancelamento; ensaio não pode provocar excedente real para testar billing.
4. Confirmar quotas/controladores Workers/DO e Supabase; GitHub Actions somente após comprovar bloqueio de gasto e margem, ou optar pelo build local no momento adequado.
5. Principal ratifica GO com revisão independente deste relatório e evidências novas. Até lá, documentação pode avançar; a prova de mídia e a aplicação completa ficam suspensas conforme plano aprovado.

## Estado da entrega

Relatório produzido; gate bloqueado. Apenas docs/validacao/e0-financeiro.md alterado. Sem testes/build de aplicativo: aplicação não é objeto desta tarefa. Memória não foi escrita pelo especialista. Arquivo liberado para revisão do principal; qualquer mudança posterior exige verificar trechos afetados.
