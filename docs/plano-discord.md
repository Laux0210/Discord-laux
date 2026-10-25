# Plano: persistência, servidor único, canais, cargos, amigos e voz

Data: 2026-10-25. Decisões aprovadas pelo usuário ("sim para tudo").

## Decisões

| Tema | Decisão |
| --- | --- |
| Banco | Supabase (Postgres) com as migrações existentes em `supabase/migrations/` |
| Login | Supabase Auth (e-mail/senha e Google), substitui contas do `localStorage` |
| Servidor único | Uma guilda fixa; trigger insere todo perfil novo em `guild_members` com `@everyone`; dono = primeiro usuário |
| Tempo real | Supabase Realtime (postgres_changes + presence), substitui o broker MQTT público |
| Voz | WebRTC P2P (PeerJS) mantido; sinalização via Realtime; limite prático 4 a 6 por canal |
| Amigos | Pedido, aceitar, recusar, remover, bloquear e DM (tabelas `friendships`, `blocks`, `dm_*`) |
| Cargos | Bitflags de `src/common/permissions.ts`; hierarquia por `roles.position`; cor em `roles.color` |
| REA | Base: documentação pública da API do Discord + `docs/rea/discord/*`; sem runtime do webapp |
| Retenção | 10 dias (`src/data/retention.ts`, `20261014000003_retention_purge.sql`) |

## Bloqueio atual

`list_projects` do Supabase retornou nenhum projeto. Criar um projeto pode ter custo e precisa de confirmação do usuário.
Alternativa sem custo: Supabase local (`supabase start`, exige Docker) para desenvolvimento e testes.

## Fases

Cada fase termina com `npm run lint`, `npm test`, verificação manual descrita e commit.

1. **Persistência + login**
   - Cliente `@supabase/supabase-js`; config por `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (nunca a service key).
   - `StorageService` vira adaptador: Supabase quando configurado, `localStorage` só como cache.
   - Verificar: enviar mensagem, recarregar, mensagem continua (vinda do banco).
2. **Servidor único + canais**
   - Migração: guilda padrão, trigger de entrada automática, cargo `@everyone`.
   - Criar canais `text` e `voice`; RLS exige `MANAGE_CHANNELS`.
3. **Cargos**
   - CRUD de cargos, atribuição, ordem por posição; RLS e checagem no cliente via `computePermissions`.
   - Verificar: usuário sem permissão é bloqueado pelo banco ao criar canal.
4. **Amigos e DM**
   - Fluxo pedido/aceite/recusa/remoção/bloqueio; DM só entre amigos.
   - Verificar: dois usuários se adicionam.
5. **Voz**
   - Presença por canal de voz no Realtime; mesh PeerJS entre participantes.
   - Verificar: dois usuários no mesmo canal (precisa de dois navegadores e microfone; pode ficar parcialmente manual).

## Testes

- Unitários (Vitest): permissões, regras de amizade, adaptador de storage com cliente simulado.
- Banco: testes de RLS com dois usuários (exigem Supabase local ou projeto de teste).

## Fora do escopo

Múltiplas guildas, SFU, convites públicos, cobrança.
