# Contexto Mestre — Aplicativo Desktop de Comunicação

Consolidação da conversa Apenas Desketop e base para o próximo planejamento

Versão 1.0 • 14 de outubro de 2026 • Português

### Conclusão e estado do projeto

O produto planejado é um aplicativo de comunicação para um grupo de amigos, inspirado nas funções de comunidade do Discord, exclusivamente desktop e inicialmente para Windows. O cenário confirmado é de 10–20 pessoas conectadas simultaneamente, com chamadas de voz frequentes de 7–10 participantes. A meta de infraestrutura é R$0 recorrente, sujeita à validação técnica e comercial.

Não há implementação aprovada. Este documento autoriza e entrega apenas a consolidação do contexto e o planejamento solicitado. A arquitetura, os serviços e as metas técnicas descritos como candidatos ou propostas não equivalem a aprovação de código, criação de contas, publicação, contratação ou ativação de cobrança.

### Como interpretar o documento

- Confirmado: requisito declarado pelo usuário na conversa recuperada ou neste pedido.

- Candidato ou proposta: detalhamento elaborado para orientar decisões futuras, ainda não escolhido em definitivo.

- Pendente: depende de evidência, teste, informação do responsável ou autorização específica.

A viabilidade de custo zero precisa ser validada com uso real, cotas disponíveis na conta, tráfego de mídia, condições de faturamento e controles contra excedentes. Um plano gratuito não significa capacidade ilimitada nem garantia de continuidade.

### Navegação

1 Fontes e histórico • 2 Visão e escopo • 3 Arquitetura • 4 Voz e alternativas • 5 Cotas e custos • 6 Requisitos funcionais • 7 Requisitos não funcionais • 8 Fluxos • 9 Dados • 10 Permissões e segurança • 11 Entrega e operação • 12 Roadmap • 13 Agentes • 14 Aceitação • 15 Pendências • 16 Prompt mestre • 17 Referências.

## 1 Fontes e histórico das decisões

Foi consultada a conversa Apenas Desketop, identificador 6acef317-6610-83e8-b16c-63651e34412e. A ferramenta devolveu dez turnos e indicou não haver páginas adicionais. Os textos do usuário estavam acessíveis; as respostas do assistente foram devolvidas como marcadores de referência, sem seu conteúdo textual. Portanto, não é possível reconstruir nem citar literalmente os argumentos anteriores do assistente.

| Etapa | Evidência acessível | Situação consolidada |
| --- | --- | --- |
| Ideia inicial | Aplicativo semelhante ao Discord para amigos; planejamento com REA. | Visão confirmada. |
| Plataforma | “apenas desketop”; depois Windows e 10–20 simultâneos. | Desktop exclusivo; Windows inicial. |
| Escopo | Servidores, texto, voz, tela, DMs, amigos/status, cargos/permissões. | MVP funcional confirmado. |
| Hospedagem inicial | “Quero hospedar o servidor do aplicativo em uma VPS.” | Escolha histórica confirmada. |
| Mudança de direção | Pergunta sobre hospedar no Git; depois arquitetura gratuita. | Direção atual de gratuidade. |
| Carga de voz | Chamadas frequentemente com 7 a 10 pessoas. | Premissa de dimensionamento. |
| Próximo passo | “pode seguir para o proximo passo”; pedido de documento. | Continuidade do planejamento. |
| Consolidação atual | Pedido atual explicita VPS substituída por serviços gratuitos e meta R$0. | Registrar a mudança, sem aprovação de implementação. |

Electron, React, TypeScript, GitHub Releases/Actions, Supabase Free, Cloudflare Workers e Cloudflare Realtime SFU entram como arquitetura candidata solicitada neste pedido. Não são atribuídos a uma resposta antiga inacessível.

A substituição da VPS representa uma mudança na estratégia de hospedagem. Não elimina a necessidade de um backend: autenticação, autorização, persistência, sinalização e mídia continuam existindo, distribuídos entre serviços. Git é controle de versão; GitHub pode distribuir instaladores e executar builds, mas não substitui um servidor permanente de voz.

## 2 Visão do produto e limites do MVP

### Problema e público

O grupo precisa de um espaço próprio para conversar por texto e voz, organizar assuntos em canais, acompanhar disponibilidade dos amigos e compartilhar a tela durante atividades. O objetivo inicial é atender um grupo pequeno, com administração simples e custos recorrentes controlados. Não há requisito confirmado de competição pública com o Discord ou de crescimento massivo.

### Decisões confirmadas

- Aplicativo exclusivamente desktop; Windows como primeira plataforma. macOS, Linux, web e mobile não integram o compromisso inicial.

- Capacidade esperada de 10–20 usuários online simultâneos; chamadas frequentes de 7–10 pessoas.

- MVP com servidores e canais de texto, voz em grupo, compartilhamento de tela, mensagens privadas, amigos/presença e cargos/permissões.

- Meta R$0 de infraestrutura recorrente. A VPS deixa de ser a opção principal em favor de serviços com faixas gratuitas.

### Definição de produto proposta

Cada servidor é uma comunidade lógica, não uma máquina virtual. Um usuário pode integrar servidores, receber cargos e acessar canais conforme permissões. A interface apresenta servidores, canais, histórico de mensagens, participantes e controles de voz. DMs e amizades existem fora do contexto de um servidor.

Para reduzir custo e complexidade, propor inicialmente uma transmissão de tela ativa por canal, sem gravação, webcam, transcrição ou streaming público. Esta restrição não foi confirmada pelo usuário: deve ser decidida antes do desenvolvimento. Tela e voz continuam pertencendo ao MVP; somente sua profundidade será delimitada.

### Fora do escopo proposto

Bots, loja, monetização, gravações, moderação automática, chamadas com dezenas de participantes, federação, descoberta pública de servidores e anexos grandes ficam para avaliação posterior. Anexos, busca avançada, notificações do Windows, push-to-talk e chamadas de voz por DM exigem decisão específica; não são inferidos a partir da existência de texto ou DMs.

### Sucesso do produto

O grupo consegue instalar o aplicativo, entrar, conversar e administrar o acesso sem assistência técnica rotineira. O piloto precisa demonstrar estabilidade em redes reais e consumo dentro do orçamento; o simples funcionamento de uma demonstração local não comprova esses objetivos.

## 3 Arquitetura candidata e responsabilidades

A candidata principal separa três planos: cliente desktop, controle e dados, e transporte de mídia. Essa divisão permite medir os custos separadamente e trocar o provedor de voz sem reescrever o domínio inteiro. A adoção depende dos testes do roadmap.

| Componente | Responsabilidade proposta | Limite de responsabilidade |
| --- | --- | --- |
| Electron + React + TypeScript | Interface, integração Windows, dispositivos e WebRTC. | Cliente não é autoridade de permissões. |
| Supabase Free | Auth, PostgreSQL, RLS e eventos/presença com Realtime. | Realtime de dados não transporta áudio e tela. |
| Cloudflare Workers | Validar identidade/acesso e intermediar sessões de mídia. | Não processar nem retransmitir áudio/vídeo no Worker. |
| Cloudflare Realtime SFU | Receber e encaminhar tracks WebRTC de voz/tela. | Não fornece sozinho domínio de servidores, cargos e DMs. |
| GitHub Actions | Verificações e build do instalador Windows. | Execução temporária; não é hospedagem de backend. |
| GitHub Releases | Instaladores versionados e metadados de atualização. | Distribuição não garante assinatura ou atualização segura. |

### Caminhos de comunicação

Texto: cliente → Supabase Auth → consulta ou escrita protegida por RLS → PostgreSQL → evento Realtime autorizado → demais clientes. A interface concilia o histórico persistido com os eventos e usa identificadores idempotentes para evitar duplicação.

Voz: cliente autenticado → Worker → verificação da participação e permissão no canal → criação ou alteração da sessão SFU → negociação WebRTC → mídia entre cliente e SFU. O Worker mantém o segredo do provedor; credenciais administrativas nunca entram no instalador.

Presença: sessão autenticada → canal Realtime permitido → estado efêmero com expiração e reconciliação. Não gravar cada heartbeat como linha permanente no banco.

### Fronteiras e desacoplamento

Propor módulos de identidade, comunidade, mensagens, amizades, permissões, mídia e distribuição. Um adaptador de mídia abstrai operações como entrar, publicar áudio, assinar tracks, transmitir tela e sair; detalhes SDP e identificadores do provedor permanecem nesse módulo. Evitar inicialmente microserviços e backend duplicado para operações já atendidas por RLS.

## 4 Voz em grupo e alternativas de mídia

### Por que avaliar SFU primeiro

Em uma malha P2P, cada participante envia áudio aos outros. Com 10 pessoas, cada cliente pode manter 9 destinos e o grupo tem 45 pares de conexão. A carga de upload, negociação e processamento cresce rapidamente. Isso torna a malha uma candidata fraca para a carga frequente confirmada, especialmente junto ao compartilhamento de tela. Esta conclusão é uma inferência arquitetural, ainda sujeita a testes.

Uma SFU encaminha streams sem exigir que cada emissor envie uma cópia por destinatário. Reduz o upload do cliente, mas o tráfego de saída do serviço continua crescendo com as assinaturas. A aplicação ainda precisa coordenar canais, associação de participantes, publicações, revogação, reconexão e limpeza das sessões.

| Opção | Vantagem | Condição ou risco |
| --- | --- | --- |
| Cloudflare Realtime SFU | Serviço gerenciado e franquia de tráfego publicada. | Integração de baixo nível; medir tráfego e confirmar cobrança. |
| LiveKit | Modelo de salas e ferramentas de mídia; opção self-hosted. | Cloud e self-hosting têm condições distintas; hospedagem não é gratuita por ser software aberto. |
| mediasoup | Controle sobre uma SFU integrada ao backend. | Exige servidor, operação e sinalização própria; pouca aderência imediata a R$0. |
| P2P WebRTC | Menor dependência de SFU para chamadas pequenas. | NAT/TURN e fan-out podem inviabilizar grupos de 7–10. |
| Servidor em casa ou VPS | Controle da infraestrutura e possibilidade de fallback. | Energia, rede, IP, disponibilidade e manutenção; VPS contraria a direção gratuita atual. |

### Hipótese inicial para compartilhamento

Começar avaliando uma tela por sala a 720p e 15–30 fps, com bitrate adaptativo e assinatura somente por quem estiver assistindo. Não fixar qualidade antes de testar leitura de texto, movimento e redes móveis. Som do sistema no Windows é uma capacidade separada da captura visual e precisa de teste no Electron escolhido.

### Teste discriminante

Comparar a candidata principal e uma alternativa com 10 participantes em redes diferentes, incluindo NAT restritivo, troca de dispositivo, perda de conexão e tela ativa. Registrar qualidade, CPU, memória, tráfego, tempo de entrada e comportamento de cobrança. Não escolher uma alternativa apenas pela existência de um plano grátis.

## 5 Cotas e validação da meta R$0

Consulta documental em 14/10/2026. As faixas abaixo são um retrato das páginas públicas, não garantias futuras nem comprovação da elegibilidade de uma conta. Conferir limites efetivos, requisitos de pagamento e políticas de excedente antes de ativar cada serviço. [F2–F5]

| Serviço | Retrato documental | O que validar |
| --- | --- | --- |
| Supabase Free | 500 MB de banco; 1 GB de arquivos; 5 GB egress e 5 GB cached egress; 50 mil MAU. | Medição por produto; não somar egress como franquia fungível. |
| Supabase Realtime | 200 conexões de pico; 2 milhões de mensagens/mês. | Fan-out, presença, múltiplas sessões e eventos contabilizados. |
| Supabase operação | Pausa após uma semana inativo; dois projetos ativos; backup automático não incluído. | Retomada, exportação própria e recuperação. |
| Workers Free | 100 mil requisições/dia; CPU e recursos também limitados. | Limite efetivo da conta e custo de recursos adicionais. |
| Realtime SFU/TURN | Primeiros 1.000 GB/mês gratuitos, compartilhados entre SFU e TURN; excedente publicado de US$0,05/GB. | Saldo agregado, egress real, ativação e controle de cobrança. |
| GitHub Actions | Runners padrão em repositórios públicos gratuitos; privados sujeitos à franquia do plano. | Windows, armazenamento, retenção e runners especiais. |

### Estimativa ilustrativa de mídia

Com N pessoas, bitrate de áudio b em kbps por emissor e todos assinando todos: saída ≈ N × (N−1) × b × 3.600 ÷ 8.000.000 GB por hora. Para 10 pessoas a 32 kbps, resulta em 1,296 GB/h; a 64 kbps, 2,592 GB/h. São valores de payload contínuo, sem overhead, retransmissões ou silêncio adaptativo.

Uma tela a 1,5 Mbps recebida por 9 espectadores adiciona aproximadamente 6,075 GB/h. A 3 Mbps, adiciona 12,15 GB/h. Com áudio a 32 kbps e tela a 1,5 Mbps durante 60 horas/mês, a ilustração soma cerca de 442 GB; em 120 horas, 885 GB. Overhead e outros usos podem consumir a margem. Duas salas de 10 pessoas aumentam a carga total.

As contas não são previsão de fatura. Medir estatísticas WebRTC e o painel do provedor. Propor alertas a 50%, 75% e 90%, limites por sala e bloqueio preventivo de novas telas. Alertas e bloqueios da aplicação não garantem teto financeiro: só afirmar R$0 após verificar mecanismos reais de faturamento e testar sua eficácia.

## 6 Requisitos funcionais propostos

As famílias de funcionalidades são confirmadas; os comportamentos abaixo detalham uma especificação proposta para aprovação. Cada requisito deve gerar uma história e um teste de aceitação antes de implementação.

| ID | Comportamento esperado | Tratamento de falha |
| --- | --- | --- |
| RF01 | Entrar, sair, recuperar acesso e manter sessão segura. | Sessão expirada exige renovação; não liberar operações offline por confiança no cliente. |
| RF02 | Criar servidor, aceitar convite, sair e administrar membros. | Convite expirado, revogado ou sem vagas é recusado. |
| RF03 | Criar e listar canais de texto e voz conforme acesso. | Canal inacessível não revela conteúdo nem participantes. |
| RF04 | Enviar texto, paginar histórico e mostrar estado de envio. | Falha fica visível; reenvio não duplica mensagem. |
| RF05 | Entrar/sair da voz, mutar e selecionar dispositivos. | Microfone negado ou rede instável tem orientação e estado explícito. |
| RF06 | Escolher tela/janela, publicar, assistir e encerrar transmissão. | Cancelamento não inicia captura; saída encerra publicação. |
| RF07 | Enviar DMs a destinatário permitido e manter histórico privado. | Bloqueio impede novos contatos conforme política a definir. |
| RF08 | Solicitar/aceitar/remover amizade e exibir presença. | Estados pendentes e expiração de presença são reconciliados. |
| RF09 | Criar cargos, atribuir membros e autorizar ações por canal. | Permissão é validada no backend, inclusive em chamadas diretas. |
| RF10 | Reconectar texto e voz e recuperar estado coerente. | Não criar participantes fantasmas nem tracks duplicadas. |

### Detalhes que precisam de decisão

Definir edição e exclusão de mensagens, histórico após saída do servidor, convites por link ou código, regras de bloqueio, presença invisível, poderes de moderadores e tratamento de exclusão de contas. Definir também se a amizade é obrigatória para DMs e se o MVP exige voz em DM. Não presumir esses comportamentos apenas por inspiração no Discord.

## 7 Requisitos não funcionais e metas de teste

As metas desta seção são sugestões de engenharia, não compromissos já aprovados. Devem ser calibradas no hardware dos amigos e nas regiões dos serviços. Registrar ambiente, versão, número de clientes e qualidade de rede em cada resultado.

| Área | Meta proposta | Como verificar |
| --- | --- | --- |
| Capacidade | 20 online; 10 em uma chamada; avaliar duas salas simultâneas. | Clientes reais e carga de texto/estado representativa. |
| Texto | Entrega percebida p95 até 1 s em rede estável. | Latência ponta a ponta e ausência de duplicação. |
| Entrada na voz | p95 até 5 s em condições normais. | Do clique à recepção de áudio; separar erros de permissão. |
| Áudio | Latência unidirecional alvo até 300 ms e conversa inteligível. | Teste de referência, perdas/jitter e avaliação humana. |
| Resiliência | Recompor estado após queda; alvo de até 15 s após a rede voltar. | Interromper internet, suspender PC e renovar sessão. |
| Desempenho | Orçamento CPU/RAM a definir após baseline. | Medir em repouso, voz e tela com equipamento de referência. |
| Acessibilidade | Teclado, foco visível, nomes acessíveis e contraste legível. | Navegação sem mouse e leitor de tela no Windows. |
| Segurança | Negar acesso entre servidores, canais restritos e DMs. | Testes negativos de API, banco, Realtime e mídia. |
| Custo | Zero cobrança no piloto e margem de cota acordada. | Painéis e mecanismos de bloqueio; revisão por serviço. |

### Disponibilidade e recuperação

Não prometer SLA de produção com faixas gratuitas. A interface deve distinguir serviço indisponível, sessão expirada, ausência de permissão e falta de rede. Mensagens persistidas devem sobreviver à reinicialização; presença e participantes de voz devem expirar. Propor backup/exportação diária no piloto, com alvo inicial de perda máxima de 24 h e teste de restauração em até 4 h; metas dependem do método aprovado.

### Privacidade e manutenção

Coletar apenas dados necessários; manter logs curtos e sem tokens, conteúdo de DMs ou capturas de tela. Fixar versões de dependências e atualizar Electron/Chromium regularmente. O instalador deve informar versão e permitir recuperação de uma atualização defeituosa. A matriz de Windows e arquitetura de CPU suportadas permanece pendente.

## 8 Fluxos principais e estados de interface

### Entrada e convite

Abrir aplicativo → autenticar → carregar perfil e comunidades permitidas → exibir presença. Ao aceitar convite, verificar validade e acesso no backend, criar associação de forma atômica e carregar canais visíveis. Se o convite falhar, explicar a causa sem revelar informações privadas do servidor. A recuperação de conta deve ser testada com o método de autenticação escolhido.

### Mensagens de canal e DMs

Selecionar conversa → carregar primeira página autorizada → assinar eventos permitidos → enviar com identificador gerado no cliente → confirmar persistência → conciliar evento e resposta. Exibir enviando, enviado e falhou. Depois da reconexão, buscar desde o último cursor e remover duplicatas por ID. Em DMs, validar participação e bloqueio em cada escrita; a interface não basta.

### Entrada e saída da voz

Selecionar canal → validar permissão → solicitar microfone → obter sessão de mídia autorizada → negociar conexão → publicar áudio → assinar participantes permitidos. Mostrar conectando, conectado, reconectando e erro. Mutar suspende envio audível; ensurdecer controla recepção e deve ter semântica definida. Ao sair ou trocar de canal, liberar tracks, captura, sessão e estado de presença da chamada.

### Compartilhamento de tela

Na chamada, clicar compartilhar → validar permissão e disponibilidade → escolher fonte → confirmar captura → publicar track → anunciar aos participantes → assistir por adesão. Exibir permanentemente que a tela está sendo compartilhada. Encerrar no botão, ao fechar a fonte, ao sair ou quando a permissão for revogada. Não capturar automaticamente na inicialização.

### Mudança de permissão e expulsão

Administrador altera cargo ou expulsa membro → operação autorizada e registrada → clientes recebem invalidação → consultas e novos eventos são negados → acesso à mídia é encerrado pelo controle de sessões. Tokens antigos e tracks já estabelecidas também precisam perder acesso; não basta ocultar o canal na interface.

### Falhas e limite de uso

Se a franquia atingir o limiar preventivo, informar a limitação e impedir novas publicações conforme política aprovada. Não degradar silenciosamente a qualidade nem contratar plano pago. Se o serviço suspender o projeto, manter uma tela de indisponibilidade e uma rotina documentada de retomada.

## 9 Modelo de dados inicial

Modelo lógico candidato em PostgreSQL. Usar UUIDs, timestamps UTC, chaves estrangeiras, índices das consultas reais e migrações versionadas. Identidade pode referenciar auth.users; perfil público não deve expor dados de autenticação. Não guardar áudio ou vídeo no banco.

| Entidade | Campos principais | Relações e restrições |
| --- | --- | --- |
| profiles | id, display_name, avatar_path, created_at | id vinculado à identidade; unicidade de nome a decidir. |
| servers | id, owner_id, name, created_at | Um dono; transferência antes de excluir conta. |
| server_members | server_id, user_id, joined_at | Único par servidor/usuário. |
| channels | id, server_id, name, kind, position | kind texto/voz; canal pertence a servidor. |
| roles / member_roles | role_id, server_id, name, priority; user_id | Cargo e membro precisam pertencer ao mesmo servidor. |
| role_permissions | role_id, permission_key | Catálogo de ações; não confiar em nomes de cargos. |
| channel_overrides | channel_id, role_id ou user_id, action, effect | Alvo exclusivo; allow/deny com precedência definida. |
| messages | id, channel_id, author_id, body, created_at, edited_at | Índice canal/tempo/ID; limite de tamanho. |
| dm_conversations / dm_members | id; conversation_id, user_id | MVP de duas pessoas; par normalizado único. |
| dm_messages | id, conversation_id, author_id, body, created_at | Somente participantes leem/escrevem. |
| friendships / user_blocks | requester_id, addressee_id, status; blocker_id, blocked_id | Sem autoamizade; deduplicar pares e transições. |
| invites | id, server_id, token_hash, expires_at, max_uses, uses | Token não armazenado em claro; consumo atômico. |
| media_sessions / audit_events | user_id, channel_id, provider_session_id, expires_at; actor/action | Referência de controle e trilha curta; sem segredo de mídia. |

Presença é efêmera. Sessões de mídia persistidas, se necessárias, têm TTL e limpeza. Validar por constraints, políticas e transações que referências cruzadas não associem cargos, canais ou membros de comunidades diferentes. Paginação de mensagens deve usar cursor estável, não carregar todo o histórico.

## 10 Permissões e segurança

### Modelo de autorização proposto

Negar por padrão. Exigir associação ao servidor antes de avaliar cargos. Definir ações explícitas: ver canal, enviar mensagem, conectar voz, falar, compartilhar tela, gerenciar canais, gerenciar cargos, remover membro e emitir convite. O dono tem poderes administrativos definidos; nenhum cargo pode atribuir poder superior ao permitido ao ator.

Proposta de precedência: restrições estruturais e bloqueios obrigatórios → poderes administrativos expressamente definidos → permissões de cargos → overrides do canal → override individual. A semântica de conflitos allow/deny deve ser aprovada, documentada e aplicada por uma única regra no backend. Não alegar equivalência exata à lógica do Discord.

### Proteção de dados e mídia

- Ativar RLS em todas as tabelas expostas; políticas de leitura e escrita incluem participação, canal e identidade. Testar também assinaturas Realtime e Storage, caso usado.

- No Worker, validar JWT por mecanismo oficial, emissor, audiência e expiração; consultar autorização atual antes de criar/alterar sessão SFU. Não aceitar user_id ou channel_id como prova de acesso.

- Manter service role e segredos Cloudflare somente em ambientes de backend protegidos. Chaves públicas do cliente não são controles de autorização; dependem das políticas.

- Usar TLS e transporte seguro WebRTC. Não prometer criptografia ponta a ponta de conteúdo com base apenas em HTTPS ou DTLS-SRTP; uma SFU e o banco exigem avaliação específica.

### Electron e cadeia de distribuição

Manter contextIsolation e sandbox, desabilitar nodeIntegration no renderer e expor uma ponte preload mínima. Validar remetente e argumentos de IPC, restringir navegação/janelas, aplicar CSP e abrir somente URLs externas permitidas. Conteúdo de mensagens deve ser escapado; HTML remoto não pode executar no contexto privilegiado. [F6]

Proteger workflows e segredos, restringir permissões do token de CI e não executar código de PRs não confiáveis com credenciais de publicação. Validar integridade e autenticidade das atualizações. Assinatura de código Windows tem condições e possível custo; avaliar compatibilidade com R$0 sem prometer ausência de alertas do SmartScreen.

## 11 Distribuição e operação

### GitHub Releases e Actions

Proposta: repositório versionado, verificações em cada alteração, build Windows e release por tag aprovada. Separar artefatos temporários de CI dos instaladores finais. Definir retenção curta, política de acesso ao repositório e uso de runners padrão. Repositório público pode reduzir custo de Actions, mas expõe código; essa escolha cabe ao responsável. [F5]

O fluxo de instalação deve informar versão, requisitos e origem. Atualização automática precisa de metadados autenticados, integridade e estratégia de rollback; inicialmente, atualização manual por release pode simplificar a operação, se aprovada. Não manter sessões de serviço em jobs de CI nem tratar GitHub Pages como backend de WebRTC.

### Observabilidade mínima

Medir logins, erros de autorização, envios malsucedidos, desconexões, tempo de entrada na voz e tráfego agregado. Correlacionar operações com IDs técnicos sem gravar texto privado. Estatísticas de WebRTC ajudam a distinguir perda de rede, dispositivo e falha de negociação. Painéis precisam separar uso de banco, Realtime, Workers, SFU/TURN e distribuição.

### Rotina operacional proposta

- Diariamente no piloto: revisar falhas críticas e consumo; semanalmente: conferir cotas, armazenamento e política de cobrança.

- Exportar dados por mecanismo aprovado, cifrar cópias e testar restauração. Exportação do banco não recupera automaticamente arquivos, credenciais e configuração de provedores.

- Manter registro de versões, migrações, configuração e procedimento de revogação de segredos. Preservar rollback do cliente e compatibilidade das migrações.

- Se um provedor mudar limites: suspender recursos de alto tráfego, comunicar a indisponibilidade no produto e revisar alternativas. Não ativar cobrança por conta própria.

### Custos que a meta precisa delimitar

Esclarecer se R$0 cobre apenas infraestrutura recorrente ou também domínio, certificado de assinatura, SMTP de autenticação, energia, internet doméstica e ferramentas. Usar endereços gratuitos de serviço quando viável. A autenticação por e-mail pode depender de configuração de envio e limites próprios, que precisam de teste; não presumir entrega de e-mails de produção incluída.

## 12 Roadmap com portões de decisão

Roadmap candidato, sem prazo prometido e sem autorização atual para construir. A ordem privilegia as incertezas que podem invalidar a arquitetura antes do restante do produto.

| Fase | Entregável | Condição para avançar |
| --- | --- | --- |
| 0 Contexto e decisões | Escopo fechado, matriz de pendências e inventário de fontes. | Responsável aprova próximos experimentos e limites. |
| 1 Viabilidade de mídia | Prova técnica com 7–10 pessoas, tela, NAT e consumo. | Áudio utilizável; evidência de cota e controle de cobrança. |
| 2 Identidade e autorização | Modelo de dados, migrações, RLS e testes negativos. | Nenhum vazamento entre comunidades/DMs. |
| 3 Comunidade e texto | Servidores, canais, convites e histórico idempotente. | Fluxos principais e recuperação após queda funcionam. |
| 4 Voz e tela integradas | Controle de mídia vinculado a permissões e estados. | Revogação real, reconexão e limpeza de tracks. |
| 5 Relações e administração | DMs, amigos, presença, cargos e administração. | Regras de bloqueio e conflitos aprovadas/testadas. |
| 6 Distribuição Windows | Instalador, pipeline, atualização e rollback. | Instalação limpa e recuperação verificadas. |
| 7 Piloto controlado | Uso representativo por grupo real e relatório de custos. | Critérios de aceitação e orçamento atendidos. |

### Critério de interrupção

Se não houver controle confiável de excedentes ou o uso representativo ultrapassar cotas, a arquitetura não atende à meta R$0. Apresentar opções concretas: reduzir transmissão, limitar duração/concorrência, trocar provedor ou revisar orçamento. Qualquer redução que retire uma função confirmada precisa de decisão do responsável.

### Evidência esperada

Para cada fase, registrar versão, ambiente, resultados, limitações e próximos passos. Testes locais não provam integração real. Provas com credenciais e serviços precisam ser explicitamente diferenciadas de mocks. Não marcar fase concluída enquanto seu portão tiver pendências essenciais.

## 13 Agentes e responsabilidades sugeridas

Esta seção propõe organização futura. Não foram executadas consultas especializadas nem delegadas implementações para este documento. A REA é uma skill e um conjunto de ferramentas de investigação, não um agente de produto nem uma plataforma de hospedagem.

| Responsável | Escopo próprio | Entrega e dependência |
| --- | --- | --- |
| Orquestrador | Manter contexto, decisões e integração dos resultados. | Checklist, registro de evidências e portões; não confundir proposta com aprovação. |
| Produto | Fechar regras e profundidade do MVP. | Histórias, prioridade e pendências; antes da implementação. |
| Arquitetura e custo | Contratos entre serviços e consumo. | ADRs e modelo de custos; depende da prova de mídia. |
| UX desktop | Fluxos, acessibilidade e estados de falha. | Protótipo e especificação Windows; usa regras de produto. |
| Dados e segurança | Schema, RLS, revogação e políticas. | Migrações e testes negativos; antes do cliente funcional. |
| Mídia | WebRTC, SFU, dispositivos e tela. | Integração e métricas; respeita contrato de autorização. |
| Cliente desktop | Electron, React, estado e integração Windows. | Interface funcional e IPC restrito; usa contratos aprovados. |
| QA e distribuição | Teste real, instalador e recuperação. | Matriz de validação, CI e relatório do piloto. |
| Investigação REA | Artefato ou runtime explicitamente selecionado. | Achados com Evidence IDs, limites e inferências. |

### Regras de colaboração futura

Se o responsável autorizar agentes, atribuir arquivos ou módulos exclusivos e contratos antes de paralelizar. Ninguém deve desfazer alterações de outro agente; mudanças em interfaces compartilhadas passam pelo orquestrador. Segurança e semântica de permissão são dependências comuns, não tarefas independentes a resolver em paralelo sem alinhamento.

Toda entrega deve informar o que foi feito, o que foi verificado e o que permanece desconhecido. Evidência documental sustenta possibilidades; somente execução observada sustenta alegações de funcionamento. Um agente consultado não equivale a uma funcionalidade implementada.

## 14 Critérios de aceitação do MVP

Critérios candidatos a serem aprovados antes do desenvolvimento. Nenhum foi validado nesta consolidação documental. A aceitação exige integração real, registros e execução no Windows suportado.

| ID | Cenário verificável | Resultado exigido |
| --- | --- | --- |
| AC01 | Instalar em Windows limpo e entrar com usuário autorizado. | Aplicativo abre, autentica e carrega somente dados permitidos. |
| AC02 | Manter 20 online e enviar mensagens em canais. | Sem duplicação ou vazamento; metas de latência aferidas. |
| AC03 | Chamada com 10 participantes por 60 minutos. | Áudio inteligível, controles de mute funcionais e métricas registradas. |
| AC04 | Transmitir tela para 9 espectadores na chamada. | Fonte escolhida correta; início/fim visíveis; voz continua utilizável. |
| AC05 | Perder rede, trocar dispositivo e reconectar. | Sem tracks duplicadas; estado e histórico reconciliados. |
| AC06 | Terceiro tenta consultar DM e canal restrito via API. | Leitura, escrita e assinatura negadas pelo backend. |
| AC07 | Revogar cargo ou expulsar durante voz/tela. | Sessão existente perde acesso; token antigo não restabelece acesso. |
| AC08 | Enviar pedido de amizade, aceitar e remover. | Transições consistentes; presença expira após desconexão. |
| AC09 | Atualizar cliente e restaurar versão anterior. | Instalação e dados preservados conforme política aprovada. |
| AC10 | Simular limiar de cota e executar piloto mensal representativo. | Controle preventivo funciona; conta sem cobrança e margem comprovada. |
| AC11 | Restaurar dados de exportação em ambiente autorizado. | Dados e acessos coerentes; perdas dentro da meta aprovada. |
| AC12 | Navegar sem mouse e revisar logs/distribuição. | Foco acessível; segredos e conteúdo privado ausentes dos logs. |

Sessenta minutos demonstram uma sessão, não disponibilidade contínua. O piloto deve incluir uso em horários e redes variadas e estimar o mês completo. Se duas salas simultâneas forem parte do uso esperado, repetir AC03 e AC04 com a concorrência real.

## 15 Pendências e registro de riscos

| Questão ou risco | Impacto | Próxima ação |
| --- | --- | --- |
| R$0 e cobrança por excedente | Cobrança inesperada ou suspensão. | Conferir conta, limiares e mecanismos reais de teto por serviço. |
| Horas de voz e tela por mês | Premissa central de tráfego desconhecida. | Coletar duração, frequência, espectadores e salas simultâneas. |
| Tela e áudio do sistema | Captura pode variar por versão/dispositivo. | Definir qualidade e testar Windows/Electron reais. |
| Login e recuperação | Entrega de e-mail pode exigir provedor/configuração. | Escolher autenticação e testar onboarding/recuperação. |
| Permissões e revogação | Acesso indevido ou sessão de mídia residual. | Aprovar precedência e testar invalidação de tracks/tokens. |
| Dados e histórico | Banco pequeno ou retenção indefinida. | Definir edição, exclusão, anexos, backup e retenção. |
| Plano gratuito muda | Perda de viabilidade sem aviso controlável. | Manter data das fontes, alertas e caminho de migração. |
| Distribuição Windows | Assinatura e confiança do instalador podem custar. | Avaliar assinatura, SmartScreen e método de atualização. |
| Privacidade do grupo | DMs e telas podem expor conteúdo sensível. | Minimização de logs e controles claros de captura. |
| Alvo REA | Não há artefato nem runtime selecionado. | Usar REA só quando houver alvo autorizado e pergunta concreta. |

### Decisões a solicitar antes de construir

Definir versões Windows e hardware mínimo; propriedade do repositório; público ou privado; quantidade de servidores; salas de voz simultâneas; limite de telas; autenticação; regra de DMs e bloqueios; precedência dos cargos; armazenamento de anexos; política de retenção; responsabilidade operacional e tolerância a indisponibilidade.

### Regra para o próximo passo

Entregar primeiro o plano de validação com experimentos, critérios e impacto nas contas. Obter autorização específica antes de implementação ou ativação de serviços. A autorização para este documento não deve ser reinterpretada como autorização geral para desenvolver o aplicativo.

## 16 Prompt mestre para Codex

Texto reutilizável. O prompt orienta planejamento e investigação conforme a skill real, sem alegar análise REA já realizada.

### Contexto e objetivo

Você é o orquestrador do planejamento de um aplicativo de comunicação para amigos. Use este Contexto Mestre como referência, separando decisões confirmadas, propostas e pendências. O aplicativo será exclusivamente desktop, inicialmente Windows, para 10–20 pessoas online e chamadas frequentes com 7–10. O MVP inclui servidores/canais de texto, voz, tela, DMs, amigos/presença e cargos/permissões. A meta é R$0 recorrente; a VPS foi uma escolha inicial e foi substituída como direção principal por serviços gratuitos. Não há implementação aprovada.

### Procedimento obrigatório

1. Leia as instruções aplicáveis do workspace e a skill reverse-engineer-anything instalada. Localize seu SKILL.md real; nesta preparação foi consultado C:/Users/jv883/.agents/skills/reverse-engineer-anything/SKILL.md, versão declarada 37. Em outro ambiente, descubra o caminho correto. Não suponha que skill instalada prova conexão ou disponibilidade dos mecanismos de análise.

2. Planeje com ferramentas normais de repositório e fontes oficiais. A REA deve ser usada quando a conclusão depender de binário, pacote distribuído, decompilação, runtime observado ou comportamento não estabelecido pelo código disponível. Não execute REA apenas para desenhar a arquitetura de um repositório-fonte completo.

3. Se houver investigação REA, selecione o alvo a partir da autorização e do contexto: ASAR/JavaScript com analyze_javascript_application; executável/pacote com open_binary e ferramentas focadas; Electron já aberto e autorizado com list_electron_targets. Confira schemas e disponibilidade reais antes de chamar ferramentas; não invente comandos, Evidence IDs ou resultados. Sem alvo definido, registre a pendência e peça sua identificação antes de procurar artefatos.

4. Reutilize sessão e evidências existentes. Formule perguntas estreitas, faça análises mínimas e cite Evidence IDs nos achados. Separe observação, inferência e desconhecido; análise estática não comprova execução. Não amplie o alvo ou execute runtime além do escopo autorizado. Se ferramentas faltarem ou uma chamada for bloqueada, leia references/connection-and-recovery.md e diagnostique a causa observada; não instale ou reconfigure componentes automaticamente.

## 16 Prompt mestre continuação

### Arquitetura e viabilidade

5. Avalie Electron + React + TypeScript, GitHub Releases/Actions, Supabase Free, Cloudflare Workers e Cloudflare Realtime SFU como candidatos. Separe texto/presença de transporte de mídia. Compare LiveKit, mediasoup, P2P e hospedagem própria com critérios de upload, NAT, operação, custos e migração. Não confunda GitHub com hospedagem de backend permanente ou Supabase Realtime com mídia WebRTC.

6. Consulte a documentação e preços oficiais na data da execução. Registre URLs, limites de banco, egress, Realtime, CPU/requisições, SFU/TURN, CI e armazenamento. Confirme regras de conta, pagamento, excedentes e suspensão. Não garanta gratuidade com base em preços antigos ou franquias divulgadas. Inclua custos de assinatura de código, domínio, SMTP e recursos adicionais quando aplicáveis.

7. Dimensione 10–20 online, chamadas frequentes de 7–10, uma e duas salas, telas e duração mensal. Diferencie bitrate de payload, overhead e tráfego faturado. Proponha medição real, margem de segurança e resposta ao esgotamento. Se R$0 não for viável, explique o motivo e apresente opções sem contratar ou remover funções confirmadas por iniciativa própria.

### Entregáveis de planejamento

8. Entregue diagnóstico, decisões arquiteturais propostas, fluxos, modelo de dados com RLS, regra de permissões e revogação, roadmap com portões, backlog inicial e matriz de aceitação. Para cada item, declare evidência, hipótese e pendência. Destaque os testes de 10 participantes com tela, redes distintas, reconexão, isolamento de DMs e bloqueio por cotas.

9. Se houver autorização específica para agentes, mantenha um orquestrador e atribua escopos exclusivos a produto, arquitetura/custo, UX, dados/segurança, mídia, cliente e QA. Respeite dependências; não trate consulta como implementação. Sem essa autorização, avance de forma sequencial.

10. Termine com uma proposta concreta do próximo experimento e seu escopo, critérios, destinos e efeitos nas contas. Não implemente, publique, ative cobrança, modifique configuração ou crie serviços sem aprovação específica. Este prompt autoriza planejamento; qualquer execução futura deve respeitar a autorização efetiva da sessão.

### Formato esperado da resposta

Apresente: decisões confirmadas; conclusões com fontes; arquitetura recomendada como proposta; viabilidade de custo zero com limitações; riscos; plano de validação; pendências; e próximo passo aguardando decisão. Não afirme que o produto, as integrações ou a análise REA foram realizados sem evidência.

## 17 Referências e rastreabilidade

Fontes consultadas em 14/10/2026. Links oficiais sustentam a consulta documental; limites e disponibilidade devem ser reconferidos no próximo planejamento. Fontes locais de skill descrevem instruções, não resultados de análise.

### F1 Conversa original

Apenas Desketop — 6acef317-6610-83e8-b16c-63651e34412e. Dez turnos recuperados; mensagens do usuário acessíveis; respostas do assistente retornadas como referências sem texto. Fonte adicional: pedido atual do responsável.

### F2 Supabase Free

https://supabase.com/pricing — limites de banco, armazenamento, egress, MAU, Realtime, pausa e backups.

### F3 Cloudflare Workers

https://developers.cloudflare.com/workers/platform/limits/ — limites de requisições e recursos do Worker.

### F4 Cloudflare Realtime SFU

https://developers.cloudflare.com/realtime/sfu/platform/pricing/ — egress, franquia mensal compartilhada SFU/TURN e tarifa publicada.

### F4a Cloudflare Realtime limites

https://developers.cloudflare.com/realtime/sfu/platform/limits/ — limites de API, tracks, codecs e transporte.

### F5 GitHub Actions

https://docs.github.com/en/billing/concepts/product-billing/github-actions — runners públicos, franquias, armazenamento e faturamento.

### F6 Electron segurança

https://www.electronjs.org/docs/latest/tutorial/security — isolamento, sandbox, IPC e navegação segura.

### F7 LiveKit

https://docs.livekit.io/transport/self-hosting/ — alternativa de hospedagem própria e responsabilidades operacionais.

### F8 mediasoup

https://mediasoup.org/documentation/ — SFU de baixo nível e documentação do projeto.

### F9 Skill REA consultada

C:/Users/jv883/.agents/skills/reverse-engineer-anything/SKILL.md — versão declarada 37; finalidade, seleção de alvo, disponibilidade, evidências e recuperação. Projeto referenciado pela skill: https://github.com/morluto/rea

As estimativas de tráfego, metas de desempenho, modelo de dados, controles, roadmap e responsabilidades são propostas elaboradas nesta consolidação. Nenhuma análise de aplicativo por REA, integração com contas ou teste de carga foi executado. A viabilidade de R$0 continua pendente de validação.
