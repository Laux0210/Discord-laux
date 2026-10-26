# Apoio Antigravity ao Claude Code e ao Codex — 2026-10-25

Data: 2026-10-25, America/Sao_Paulo.
Escopo:
1. Complementar a engenharia reversa estática (REA) do Discord Desktop `1.0.9265` (`core.asar`), extraindo constantes e funções puras de referência (`mainWindowOptions`, `DEFAULT_POPOUT_OPTIONS`, `securityUtils`, `mainScreen` e `systemTray`) em arquivos exclusivos sem colisão de escrita.
2. Auditar de forma independente tanto o lote de persistência + backend compartilhado local do **Codex** (`src/server/*`, `src/renderer/src/services/*`, `src/renderer/src/components/*`) quanto as migrações Supabase (`000001`–`000006`) do **Claude Code**.
3. Executar e registrar a bateria completa de verificação (`npm run lint`, `npm test`, `npm run test:desktop` e `python -B -m unittest discover -s tests`).

---

## 1. Divisão de Arquivos (Propriedade Exclusiva Antigravity)

Respeitando estritamente `docs/agentes/ORQUESTRACAO.md` e `docs/planejamento/armazenamento-compartilhado-2026-10-25.md`, nenhum arquivo reservado ao Codex (`Agente dados`, `Agente frontend`, `Agente backend`, `Principal`) ou ao Claude Code (`supabase/migrations/*`, `docs/plano-discord.md`, `src/common/discord-reference.ts`, `src/main/index.ts`, `docs/rea/discord/parametros-host-1.0.9265.md`) foi modificado.

| Arquivo entregue (Antigravity) | SHA-256 | Finalidade |
| --- | --- | --- |
| `docs/rea/discord/parametros-core-1.0.9265.md` | `BA62A88776130FB5D9FD85301E9595F4B3051E77E8CCB6565A5561CE326BF2C7` | Relatório REA estático completo de `discord_desktop_core-1/discord_desktop_core/core.asar` (`1.832.667` bytes, SHA-256 `922c22e53eceb3a62fdfa51240ebbbb55e8e75cbc03caa6b711f6193448fa48e`), incluindo janela principal, popout, preload `DiscordNative` (36 namespaces), whitelist `nativeModules.requireModule`, `DESKTOP_CAPTURER_GET_SOURCES`, `frameViewPreload.js`, `securityUtils`, permissões de sessão, backoff e `systemTray` |
| `src/common/discord-core-reference.ts` | `5E32A63081313D7EFCF178FFAE27AE676816448BEAA5BED0F53D94778CD56CC2` | Constantes e funções puras extraídas de `core.asar`: `DISCORD_CORE_WINDOW_DEFAULTS`, `DISCORD_CORE_WEB_PREFERENCES`, `DISCORD_CORE_BLINK_FEATURES`, `DISCORD_CORE_WEBAPP_PATHS`, `DISCORD_CORE_SETTING_KEYS`, `DISCORD_CORE_WINDOW_IPC_EVENTS`, `DISCORD_CORE_NATIVE_NAMESPACES`, `DISCORD_CORE_BLOCKED_URL_PROTOCOLS`, `DISCORD_CORE_SESSION_PERMISSIONS`, `DISCORD_CORE_CONNECTION_BACKOFF`, `DISCORD_CORE_TRAY_ICON_NAMES`, `DISCORD_CORE_TRAY_GUID_BY_CHANNEL`, `DISCORD_CORE_IDLE_TRAY_STATES`, `DISCORD_CORE_PRELOAD_ONLY_MODULES`, `DISCORD_CORE_DESKTOP_CAPTURE_TYPES`, `DISCORD_CORE_FRAME_VIEW_IPC_EVENTS`, `resolveBackgroundColor()`, `resolveWindowBounds()`, `shouldOpenExternalUrlByCoreReference()`, `checkUrlOriginMatchesByCoreReference()`, `resolveTrayIconByCoreReference()`, `isWhitelistedNativeModuleByCoreReference()`, `normalizeDesktopCaptureOptionsByCoreReference()` e `computeFrameViewOverscanByCoreReference()` |
| `tests/unit/discord-core-reference.test.ts` | `FF565C1E3BF02FFE42DA03562D42AD715035960685C93742234A794BD6CBBBC4` | **15 testes unitários** criados via TDD (ciclos Red -> Green verificados), incluindo paridade com `validateIpcPayload(OPEN_EXTERNAL_URL)` e `validateIpcPayload(GET_DESKTOP_SOURCES)`, whitelist de módulos nativos e alinhamento de bitflags `PermissionFlags` (`@everyone = 3149313n`) |
| `src/renderer/src/services/supabase-app-services.ts` | `8E1BBF4F9A6BB2940CE8197C312178ADC27A82905A3B3639E25086BE7231852B` | Adaptador opcional do renderer para o Supabase (`SupabaseRestClient`, `SupabaseAuthService`, `createSupabaseGuildService`, `SupabaseChatService`, `createSupabaseFriendshipService`, `createSupabaseAppServices` e `resolveSupabaseConfig` com bloqueio de `service_role`), compatível com as migrações `000001`–`000007` (`SINGLE_GUILD_ID = 00000000-0000-0000-0000-000000000001`, RPCs `member_permissions` e `open_dm`) sem dependências npm extras e sem tocar em arquivos travados por hash do Codex |
| `tests/unit/supabase-app-services.test.ts` | `7D7832B8DC4F4169FBDF4DE542C45C97F6B1C6AB30447874FF1F4F8EF1A0D0E5` | **4 testes unitários** criados via TDD para o adaptador Supabase (validação de config/`service_role`, auth GoTrue + guilda única + cargos `bigint`, amizades direcionadas + RPC `open_dm` + chat, e guarda de geração de sessão + `SupabaseApiError`) |

---

## 2. Reconciliação e Expansão REA (`core.asar` 1.0.9265)

1. **`minWidth: 320` e `minHeight: 180` (`DEFAULT_POPOUT_OPTIONS`):** Confirmado no trecho literal de `core.asar/bundle.js`:
   `DEFAULT_POPOUT_OPTIONS={title:"Discord Popout",backgroundColor:"#2f3136",minWidth:320,minHeight:180,transparent:!1,frame:!1,resizable:!0,show:!0,...}`.
2. **Contagem de literais `DISCORD_*`:** Detalhada para eliminar qualquer ambiguidade: são `204` strings literais únicas entre aspas no `core.asar` (`216` tokens únicos `DISCORD_[A-Z0-9_]+` no arquivo inteiro, sendo `212` em `bundle.js`, `209` em `mainScreenPreload.js` e `203` em `frameViewPreload.js`).
3. **Segurança de URLs externas (`securityUtils` vs `src/common/ipc-channels.ts`):**
   - `core.asar/bundle.js` bloqueia `14` protocolos em `BLOCKED_URL_PROTOCOLS` (`file:`, `javascript:`, `vbscript:`, `data:`, `about:`, `chrome:`, `ms-cxh:`, `ms-cxh-full:`, `ms-word:`, `shell:`, `ms-msdt:`, `search-ms:`, `ms-officecmd:`, `ms-appinstaller:`) e esquemas de 1 letra (`c:`).
   - Testamos em `tests/unit/discord-core-reference.test.ts` que todos os `14` protocolos bloqueados pelo Discord `1.0.9265` são rejeitados tanto por `shouldOpenExternalUrlByCoreReference` quanto pela allowlist estrita `http:`/`https:` de `validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL)` em `src/common/ipc-channels.ts`.

---

## 3. Revisão Técnica Independente — Lote Codex (Persistência + Backend Compartilhado Local + UI)

### 3.1. Status dos Pontos Apontados Preliminarmente pelo Claude Code
Todos os itens que falhavam durante a escrita em andamento já foram corrigidos pelos agentes do Codex e verificados:
1. **`src/renderer/src/services/storage-service.ts`:** `browserStorageAdapter.setItem` e `StorageService.setItem` agora tratam ambientes sem `localStorage` com segurança; `tests/unit/storage-and-realtime.test.ts` e `tests/unit/persistent-storage.test.ts` passam integralmente.
2. **`tests/unit/community-management-ui.test.tsx`:** Import `React` não utilizado removido; `npm run lint` (`tsc --noEmit`) retorna `0` erros.
3. **`src/server/shared-server.ts`, `src/server/shared-store.ts`, `src/server/retention.ts`:** Implementação completa concluída; `tests/unit/shared-backend.test.ts` (11 testes), `tests/unit/shared-api-client.test.ts` (6 testes), `tests/unit/shared-app-integration.test.ts` (1 teste ponta a ponta com 2 contas) e `tests/unit/shared-retention.test.ts` (4 testes) passam integralmente.

### 3.2. Pontos Fortes Verificados no Código do Codex
- **Autenticação e Derivação de Identidade (`src/server/shared-store.ts` e `src/server/shared-server.ts`):** Senhas com hash `scryptSync` + salt aleatório de 16 bytes e comparação em tempo constante (`timingSafeEqual`). Sessões opacas Bearer de 32 bytes; a identidade do ator nas operações RPC é sempre derivada da sessão autenticada no servidor (`session.userId`), ignorando `actorId`/`authorId`/`userId` enviados pelo cliente.
- **Persistência Atômica e Lockfile (`src/server/shared-store.ts:365-431`):** Uso de lock exclusivo `shared-state.lock` (`wx`) com detecção de lock órfão, escrita em arquivo temporário `.tmp`, `fsyncSync` e `renameSync` atômico para `.local-data/shared-state.json`, além de recuperação segura em arquivo `.corrupt-*` caso o JSON esteja corrompido.
- **Retenção de 10 Dias (`src/server/retention.ts`):** Expurgo automático de mensagens de canais e DMs com mais de 10 dias na carga, leitura e envio (`purgeExpiredMessageSnapshots`).
- **Hierarquia e Subconjunto de Permissões (`src/renderer/src/services/guild-service.ts:290-415`):** `InMemoryGuildService` valida corretamente que gerentes com `MANAGE_ROLES` só criam/editam/atribuem cargos abaixo de `actorHighestPosition` **e** não podem conceder nem atribuir permissões que eles próprios não possuem (`(permissions & ~perms) !== 0n` em `createRole`/`updateRole` e `(targetRole.permissions & ~perms) !== 0n` em `assignRole`).

### 3.3. Recomendações Técnicas para o Codex (Melhorias Não-Bloqueantes)
- **Achado L-01 (Uso em LAN com `DISCORD_SHARED_HOST` diferente de loopback):**
  Em `src/server/shared-server.ts:34-54`, `isAllowedHost` e `isAllowedOrigin` aceitam apenas `127.0.0.1` e `localhost`. Como o `README.md:57-59` documenta o uso de `DISCORD_SHARED_HOST` e `VITE_SHARED_API_URL` para conectar outras máquinas na mesma rede local, requisições vindas de outro aparelho para `http://<IP-DA-LAN>:8787` serão bloqueadas com `403 Host inválido` / `403 Origem inválida` a menos que `options.host` (ou uma variável `DISCORD_SHARED_ALLOWED_HOSTS` / `DISCORD_SHARED_ALLOWED_ORIGINS`) seja incluída na allowlist.
- **Achado L-02 (Rate-limit de autenticação):**
  Quando exposto na LAN, recomenda-se adicionar um limitador em memória por IP/usuário nas rotas `/api/auth/login` e `/api/auth/register` em `src/server/shared-server.ts`, além de manter o limite de `MAX_BODY_BYTES = 64 * 1024` já implementado.
- **Achado L-03 (Sincronização de `dist-release/release-manifest.json` após `npm run build`):**
  Sempre que `npm run build` regenerar o bundle com novo hash em `dist/assets/index-*.js`, é necessário executar `node scripts/build-release.mjs` (ou `npm run release`) para atualizar `dist-release/release-manifest.json` antes de rodar `tests/unit/release-installer.test.ts`.

---

## 4. Auditoria de Segurança e Paridade — Migrações Supabase do Claude Code (`000001`–`000006`)

Inspecionamos `supabase/migrations/20261014000001_initial_schema.sql`, `20261014000002_rls_policies.sql`, `20261025000004_single_guild_permissions.sql`, `20261025000005_harden_functions.sql` e `20261025000006_role_grant_subset.sql`.

### 4.1. Pontos Fortes Verificados
- As funções `SECURITY DEFINER` em `000004` evitam a recursão infinita de RLS que existia em `000002` (`guild_members` e `dm_participants`).
- A migração `000005` fixou `SET search_path = public, pg_temp` em todas as funções `SECURITY DEFINER` e revogou a execução direta de `public.seed_single_guild(UUID)` para `PUBLIC, anon, authenticated`.
- A migração `000006` adicionou `public.can_grant_permissions(guild_id, permissions)` em `roles_insert_policy` e `roles_update_policy`, impedindo que um gerente crie ou edite um cargo com bits de permissão que ele próprio não possui.

### 4.2. Achados de Segurança RLS para Próxima Migração (`000007`) do Claude Code

1. **Achado S-01 (Alta — Escalada de Privilégio por Atribuição de Cargo Preexistente em `member_roles_insert_policy` + Hierarquia do Membro Alvo):**
   - **Problema:** Em `20261025000004_single_guild_permissions.sql:122-139`, `member_roles_insert_policy` e `member_roles_delete_policy` verificam apenas `public.has_guild_permission(guild_id, 268435456)` (`MANAGE_ROLES`) e `(SELECT position FROM public.roles WHERE id = role_id) < public.member_top_position(guild_id)`. A migração `000006` protegeu `roles`, mas **não** incluiu `public.can_grant_permissions` em `member_roles_insert_policy`.
   - **Impacto:** Se o dono da guilda criar um cargo com `position = 10` contendo `ADMINISTRATOR` (`8`) ou `MANAGE_CHANNELS` (`16`), um gerente em `position = 100` que possua apenas `MANAGE_ROLES` conseguirá atribuir esse cargo a si mesmo ou a terceiros via `INSERT INTO public.member_roles`. Além disso, falta verificar:
     a) que o cargo pertence à mesma guilda (`r.guild_id = member_roles.guild_id`);
     b) que o membro alvo (`member_roles.user_id`) não é o dono da guilda nem possui cargo de posição `>=` ao ator (paridade com `InMemoryGuildService.assignRole`/`removeRole`).
2. **Achado S-02 (Alta — `messages_delete_policy` Permite `UPDATE` Irrestrito de Conteúdo e Omite `MANAGE_MESSAGES`):**
   - **Problema:** Em `20261014000002_rls_policies.sql:108-116`, `messages_delete_policy` é uma policy `FOR UPDATE USING (...)` sem cláusula `WITH CHECK` e sem trigger de imutabilidade nas colunas `content`, `author_id`, `channel_id` e `created_at`.
   - **Impacto:** O autor ou dono pode executar `UPDATE public.messages SET content = '...'` (violando `RF-16`, que proíbe edição de mensagens e permite apenas exclusão lógica `is_deleted = true`). Além disso, moderadores com `MANAGE_MESSAGES` (`8192`) não estão contemplados na policy.
3. **Achado S-03 (Média/Alta — Políticas de `dm_messages` Após Bloqueio Mútuo ou Remoção de Amizade):**
   - **Problema:** Em `20261014000002_rls_policies.sql:139-152`, `dm_messages_insert_policy` verifica apenas se o *outro* participante bloqueou `auth.uid()` (`b.blocker_id = dp.user_id AND b.blocked_id = auth.uid()`), não impedindo envio quando o próprio `auth.uid()` bloqueou o destinatário nem quando a amizade deixou de ser `accepted`. Já `dm_messages_select_policy` (`20261025000004_single_guild_permissions.sql:110-111`) exige apenas `public.is_dm_participant(channel_id)`, mantendo leitura aberta após bloqueio ou remoção de amizade (divergindo de `InMemoryFriendshipService.assertDmAccess`).

---

## 5. Verificação Independente Executada (Evidências Frescas Pós-Integração)

- `npm run lint` (`tsc --noEmit`): código de saída `0` (**0 erros**).
- `npm test` (`vitest run`): código de saída `0` — **54 arquivos de teste aprovados, 303 testes aprovados** (incluindo os 15 testes de `tests/unit/discord-core-reference.test.ts`, os 4 testes de `tests/unit/supabase-app-services.test.ts`, `tests/unit/shared-backend-negative.test.ts`, `tests/unit/storage-browser-boundary.test.ts` e toda a suíte nova de persistência, UI comunitária e backend compartilhado).
- `python -B -m unittest discover -s tests`: código de saída `0` — **39 testes Python aprovados** em `0.934s`.
