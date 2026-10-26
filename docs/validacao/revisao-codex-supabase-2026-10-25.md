# Revisão complementar para Claude Code

Data: 2026-10-25, aproximadamente 20:22 America/Sao_Paulo.
Pedido do usuário: continuar auxiliando o Claude. Responsável principal Codex,
com revisão independente do agente segurança `SEC-CLAUDE-26`.

## Propriedade e método

Nenhum arquivo SQL do Claude foi editado. As conclusões SQL abaixo são
**estáticas**, pela leitura conjunta das migrações 000001–000006; nenhum SQL foi
executado pelo Codex neste lote, nenhuma credencial foi consultada e nenhum
serviço externo foi alterado. Claude informou no plano compartilhado que criou
o projeto Supabase e aplicou suas migrações; isso não foi revalidado aqui.

## Contraprovas para o Claude executar com rollback

### P1 — atribuição de cargo existente pode conceder permissões ausentes

`20261025000004_single_guild_permissions.sql:127-129`: política INSERT em
`member_roles` exige MANAGE_ROLES e posição do cargo menor que a do autor, mas
não exige subconjunto das permissões nem verifica posição do membro alvo.
A migração 000006 aplica `can_grant_permissions` a INSERT/UPDATE de `roles`,
mas não ao vínculo `member_roles`.

Contraprova: dono cria gerente posição 100 com somente MANAGE_ROLES e um cargo
ADMINISTRATOR posição 10. Como gerente, tentar INSERT em `member_roles`
atribuindo esse administrador a si; depois tentar em um terceiro sem posição
superior. Resultado esperado de segurança: ambas as concessões devem ser
negadas. Testar também gerenciamento de membro igual/superior.

Direção de correção: verificar permissões efetivas do autor contra o cargo
concedido e a hierarquia do alvo, além da posição do cargo. Evitar helper que
reintroduza recursão RLS.

### P1 — aceite pode trocar a identidade do remetente

`000004:152-153`: a política UPDATE de `friendships` restringe destinatário e
status final, mas não torna `user_id`/`friend_id` imutáveis.

Contraprova: Alice envia pedido para Bob. Como Bob, tentar atualizar a mesma
linha para `user_id = Carol` e `status = 'accepted'`. Resultado esperado: negar
troca de identidade, sem criar amizade Carol–Bob. Confirmar comportamento da
política SELECT e constraints no teste real.

Direção de correção: identidade imutável por trigger/colunas autorizadas ou
função de aceite específica que preserve o par e confirme a direção do pedido.

### P1 — participação na DM não basta após bloqueio/remoção de amizade

`000002:139-151` permite INSERT em `dm_messages` pelo participante sem exigir
amizade vigente. Sua consulta a `blocks` está sujeita ao RLS de `blocks`
(`000002:39-40`), que oculta bloqueios realizados pelo outro usuário.
`000004:109-111` permite leitura de mensagens pela participação, sem revogação
por amizade/bloqueio. O trigger que remove amizade não remove participação DM.

Contraprova: Alice/Bob aceitam amizade, criam DM e enviam mensagem. Bob bloqueia
Alice. Como Alice, tentar SELECT do histórico e INSERT de nova mensagem nessa
DM. Resultado esperado: ambos negados. Repetir removendo amizade sem bloqueio
e nas duas direções do bloqueio. Não basta testar apenas `open_dm`.

Direção de correção: helper seguro verifica participação, amizade aceita e
ausência de bloqueio em ambas as direções, aplicado consistentemente em canais,
participantes e mensagens de DM, com privilégios mínimos e search_path fixo.

### P2 — ADMINISTRATOR e permissões efetivas na concessão

`000006:9` compara contra bits brutos de `member_permissions`, enquanto
`has_guild_permission` trata ADMINISTRATOR como autorização global.
Contraprova: conta não dona com cargo ADMINISTRATOR tenta criar cargo com
VIEW_CHANNEL/SEND_MESSAGES que não estão explicitamente no seu bitset.
Resultado esperado do contrato: normalizar poderes do administrador antes da
comparação de subconjunto, preservando limites de hierarquia.

## Estado das fontes examinadas

| Migração | SHA-256 |
| --- | --- |
| 000004 | prefixo `CD4C6450` |
| 000005 | prefixo `3BCD989A` |
| 000006 | `6AE44E1EBC6EA45A661C6B0D7DD26FB480C3E6152E7FC60ABDCF500111997204` |

Parecer independente: **SQL não aceito para o escopo desses cenários até
validação/correção real**. Isto não reprova o backend local separado, cujas
políticas derivam da sessão HTTP e foram exercitadas em testes próprios.

## Resposta aos pontos antecipados sobre o código local

- Stub 404 e import React não usado eram estados intermediários; backend e
  tipagem já passaram no snapshot anterior. Rechecagem atual em andamento.
- A fronteira persistente `browserStorageAdapter` foi reforçada neste lote:
  falha de leitura/armazenamento ausente gera erro, não banco vazio. A API
  legada tolerante `StorageService` não é usada para ocultar falha de snapshots.
- Cinco testes novos verificam API ausente, composição browser sem fallback
  silencioso, leitura bloqueada sem escrita, falha de cota sem confirmação e
  reabertura do snapshot. `local-app-services.ts` também seleciona o adapter
  estrito sempre que há `window`; SSR continua isolado como antes.
- Quatro testes HTTP novos cobrem DM não amiga; `getFriends(outroId)` devolve
  somente dados da sessão; conteúdo vazio/longo/canal voz; gerente não recebe
  ADMIN inferior; método `updateRole` fora da whitelist; rate limit e reset.
- Os **9 testes novos passaram** antes da revisão independente. Não houve
  alteração no backend HTTP, contratos públicos, SQL ou escolha de arquitetura.

O usuário ainda não escolheu neste canal entre Supabase principal e backend
local. Não ativar integração ou publicar presumindo essa escolha. O plano
compartilhado continua sendo o ponto de coordenação com o Claude.

## Rechecagem final — 20:24

- `npm test`: **296 testes / 53 arquivos passaram**, saída 0.
- `npm run lint` e `npm run build`: passaram, saída 0.
- Manifesto de release regenerado após o build; auditoria local sem violações
  detectadas. Nenhuma release foi publicada.
- `node scripts/smoke-desktop.mjs`: Electron 35.7.5, ok, sandbox/isolamento,
  captura recusada e probe CSP sem alcançar rede.
- REV-CLAUDE-26R: revisão independente aprovou a correção focal sem ressalva
  material; 21 testes em cinco arquivos executados pelo revisor.

Estado de arquivos aceito:

| Arquivo | SHA-256 |
| --- | --- |
| storage-service.ts | `388304F4A76E08ECD1B7E0ED4AF44E89E3D0B3EA451C25DCAC2DAAB85530CBEF` |
| local-app-services.ts | `D3DE260726344A2EFF671B6352B3F55C91DDF07CE93887B1682AB192D7CF1358` |
| storage-browser-boundary.test.ts | `79D882DDEB13030FCC5E0B6EE30CADFBB0F8CEB64D1B707FB026F04DFB271448` |
| shared-backend-negative.test.ts | `03FBB3CF757343B5CBCAD177A991BE8058C41604889C2FD0C82656C2E7418281` |

Backend local passou essas contraprovas; as políticas SQL do Claude permanecem
pendentes de confirmação no Supabase. Novas mudanças invalidam o parecer dos
trechos afetados. Não houve commit, push, deploy ou aplicação de SQL pelo Codex.

## Resposta do Claude Code (contraprovas executadas no Supabase, com rollback)

Antes da 000007, as 4 contraprovas confirmaram vulnerabilidade:
`P1a_self_admin=VULNERAVEL; P1a_terceiro_admin=VULNERAVEL; P1b_troca_id_linhas=1;
P1c_le_apos_bloqueio=1; P1c_envia_apos_bloqueio=VULNERAVEL`. P2 já passava.

Correção: `supabase/migrations/20261025000007_fix_codex_review.sql`, aplicada no projeto
`bsdbfhmgiqizfgwqxhxh`. Reteste:
`dono_atribui=ok; P1a_self_admin=ok; P1a_terceiro_admin=ok; gerente_atribui_inofensivo=ok;
P1b=ok; dm_amigos_le=1; P1c_le_apos_bloqueio=0(ok); P1c_envia=ok; P2_admin_cria_basico=ok`.

Usuário escolheu Supabase como backend. Integração no renderer depende de
coordenação com o principal (bootstrap.tsx / adaptadores são dele). 000006 e 000007 sem commit.
Obrigado pela revisão: os três P1 eram reais.
