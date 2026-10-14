# Requisitos e critérios de aceite

Data: 2026-10-14. Fonte normativa: plano final da conversa, autorizado por “Implement the plan”; consolidação DOC-02. Estado: requisitos documentados, implementação e validação pendentes. Contexto de origem: C:/Users/jv883/Downloads/Contexto_Mestre_Aplicativo_Desktop_de_Comunicacao.docx; sua conversão fiel pertence a outra tarefa.

| ID | Requisito autorizado | Critério de aceite (AC) |
| --- | --- | --- |
| RF-01 | Desktop Windows 10/11 x64, PT-BR | AC-01: instalar e operar nos dois sistemas; interface em português; teclado, foco e leitor de tela verificados |
| RF-02 | Conta Google via Supabase Auth | AC-02: login real pelo navegador externo, retorno seguro ao app, sessão protegida, recuperação e logout demonstrados |
| RF-03 | Comunidades, membros, convites e canais | AC-03: criação/associação funcionam; convite inválido recusado; terceiros sem acesso não leem nem administram |
| RF-04 | Permissões Discord para ações do MVP | AC-04: avaliação no backend/RLS: base @everyone/cargos → exceções @everyone do canal → exceções de cargos → exceções individuais. Entre exceções de cargos, concessão pode superar negação independentemente da posição; dono/Administrador ignoram exceções de canal; hierarquia limita administração. Testar conflitos e tentativa de elevar privilégios |
| RF-05 | Histórico acompanha acesso ao canal | AC-05: membro com acesso lê histórico não vencido; revogação impede novas leituras; não introduzir READ_MESSAGE_HISTORY separado |
| RF-06 | Texto simples, envio e exclusão | AC-06: histórico paginado; estados de envio; reenvio/reconexão sem duplicação; autor e moderador autorizado excluem; outro usuário não exclui; sem edição |
| RF-07 | Amizades, DM individual só entre amigos e bloqueio | AC-07: pedido/aceite demonstrados; não amigo e terceiro não iniciam/acessam DM; bloqueio impede novos pedidos e DMs |
| RF-08 | Presença efêmera | AC-08: presença demonstra conexão e expira após desconexão, sem tratá-la como histórico permanente |
| RF-09 | 20 online; uma chamada global, até 10 participantes | AC-09: cenário de 20 online; uma chamada global; reservas concorrentes não criam segunda chamada; décimo primeiro participante recusado |
| RF-10 | Voz, dispositivos e mute | AC-10: seleção/troca de dispositivo, entrada/saída, mute e reconexão; áudio utilizável em redes distintas; expulsão encerra mídia remota em até 5 segundos mesmo se cliente ignorar comando |
| RF-11 | Uma tela, 720p/30 fps e som do sistema | AC-11: captura escolhida pelo usuário; disputa não duplica transmissão; 9 espectadores aderem; tela legível e sem eco digital da própria chamada; cancelamento/saída liberam recursos |
| RF-12 | Prioridade R$0, até 120h voz incluindo até 60h tela/mês; corte preventivo | AC-12: horas contabilizadas como tempo de chamada/transmissão, não participante-hora; relatório comprova condições/consumo/ciclo; 800GB iniciais descontam outros consumos; simulação bloqueia novas entradas e encerra mídia remotamente; falha do controlador e métricas indisponíveis testadas sem excedente real. Alertas isolados não aprovam gate |
| RF-13 | Mensagens disponíveis exatamente por 10 dias | AC-13: leitura indisponível na fronteira de expiração mesmo com limpeza física atrasada; limpeza periódica; não recuperar vencidas por reconexão |
| RF-14 | Backup de contas, comunidades e permissões sem texto | AC-14: lista explícita de tabelas permitidas exclui mensagens; restauração recupera configuração/acessos e não contém nem recupera texto |
| RF-15 | Código/releases privados, atualização manual | AC-15: instalador privado; instalação, atualização manual, desinstalação e retorno à versão anterior testados; nenhum segredo no cliente |
| RF-16 | MVP sem edição, anexos, webcam, gravação e voz por DM | AC-16: fluxos e serviços da versão não oferecem essas capacidades; não ampliar escopo para satisfazer uma limitação técnica |
| RF-17 | Reproduzir funções, modos e interface do Discord a partir de engenharia reversa com REA | AC-17: registrar versão/hash da referência, evidência por função/estado/tela e matriz de rastreabilidade; implementar os fluxos selecionados do MVP com testes e comparação visual/comportamental independente; documentar diferenças e manter funções adicionais em backlog separado |

RF-17 foi acrescentado em 2026-10-14 pelo pedido posterior de usar REA no aplicativo Discord. O pacote DOC-02 anterior continha 16 requisitos; seu aceite histórico não valida este acréscimo nem a engenharia reversa. Consulte [o plano de referência REA](../rea/plano-discord-referencia.md).

## Critérios técnicos transversais

- Autorização canônica no backend; não confiar na interface nem em cliente expulso. Revalidar durante a chamada e interromper publicações/recepções em revogação ou corte.
- RLS e constraints protegem persistência; conteúdo privado não é entregue por autorização Realtime desatualizada em cache.
- Electron com isolamento, sandbox, CSP e ponte IPC restrita para sessão, captura e dispositivos.
- Dependências fixadas, lockfile consistente e build reproduzível; comandos só documentados após configuração e execução reais.
- Nenhum achado bloqueador de QA, segurança ou revisão antes do piloto. Verificar estado estável; mudança posterior invalida o parecer do trecho.

## Ensaios e metas propostas

1. E0: verificação financeira sem mídia e sem provocar excedente; decide avanço explicitamente.
2. E1: dois PCs Win10/11, até 15 minutos; captura, som, cancelamento, reconexão e expulsão.
3. E2: dez participantes em redes distintas, 60 minutos, uma tela/som para nove espectadores; medir tráfego, CPU/memória e qualidade; simular corte sem esgotar franquia.
4. PILOT: 30 dias privados, uso representativo, consumo/falhas, recuperação/rollback e consolidação documental.

Metas iniciais de ensaio: texto p95 ≤ 1 segundo, entrada de voz p95 ≤ 5 segundos, reconexão ≤ 15 segundos. Estes números são critérios propostos do plano, não medições obtidas. A projeção 543GB/706GB e orçamento inicial 800GB são hipóteses operacionais a verificar, não garantia de custo zero.

## Limites da consolidação

Não fechar neste documento novos nomes de APIs, schemas, versões de dependência, limites de tamanho de texto, política de edição ou funcionalidades além das escolhas autorizadas. Arquitetura e contratos finais são entrega DESIGN após os portões. O principal ratifica aceite e propriedades por tarefa. Referência: [plano](../planejamento/plano.md) e [backlog](../planejamento/backlog.md).
