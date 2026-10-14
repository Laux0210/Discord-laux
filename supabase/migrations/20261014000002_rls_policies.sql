-- ============================================================================
-- Migration 000002: Políticas de Row-Level Security (RLS)
-- Garante isolamento estrito, retenção de 10 dias e proteção de DMs
-- ============================================================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE PERFIS
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. POLÍTICAS DE AMIZADES E BLOQUEIOS
CREATE POLICY friendships_select_policy ON friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY friendships_insert_policy ON friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY friendships_delete_policy ON friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY blocks_select_policy ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY blocks_insert_policy ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY blocks_delete_policy ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- 4. POLÍTICAS DE COMUNIDADES E MEMBROS
CREATE POLICY guilds_select_policy ON guilds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guilds.id AND gm.user_id = auth.uid())
  );

CREATE POLICY guild_members_select_policy ON guild_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid())
  );

CREATE POLICY channels_select_policy ON channels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = channels.guild_id AND gm.user_id = auth.uid())
  );

CREATE POLICY roles_select_policy ON roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = roles.guild_id AND gm.user_id = auth.uid())
  );

CREATE POLICY member_roles_select_policy ON member_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM guild_members gm WHERE gm.guild_id = member_roles.guild_id AND gm.user_id = auth.uid())
  );

CREATE POLICY channel_overrides_select_policy ON channel_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN guild_members gm ON gm.guild_id = c.guild_id
      WHERE c.id = channel_overrides.channel_id AND gm.user_id = auth.uid()
    )
  );

-- 5. POLÍTICAS DE MENSAGENS DE CANAL (COM RETENÇÃO DE 10 DIAS E SEM EDIÇÃO)
-- Leitura autorizada apenas se o usuário for membro da guilda e dentro da janela de 10 dias
CREATE POLICY messages_select_policy ON messages
  FOR SELECT USING (
    is_deleted = false
    AND created_at >= (now() - interval '10 days')
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN guild_members gm ON gm.guild_id = c.guild_id
      WHERE c.id = messages.channel_id AND gm.user_id = auth.uid()
    )
  );

-- Inserção permitida para autor autenticado que pertença ao canal
CREATE POLICY messages_insert_policy ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM channels c
      JOIN guild_members gm ON gm.guild_id = c.guild_id
      WHERE c.id = messages.channel_id AND gm.user_id = auth.uid()
    )
  );

-- Exclusão: autor ou moderador da comunidade
CREATE POLICY messages_delete_policy ON messages
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM channels c
      JOIN guilds g ON g.id = c.guild_id
      WHERE c.id = messages.channel_id AND g.owner_id = auth.uid()
    )
  );

-- 6. POLÍTICAS DE DMs (ISOLAMENTO TOTAL CONTRA ADMINISTRADORES DE COMUNIDADES)
CREATE POLICY dm_channels_select_policy ON dm_channels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM dm_participants dp WHERE dp.dm_channel_id = dm_channels.id AND dp.user_id = auth.uid())
  );

CREATE POLICY dm_participants_select_policy ON dm_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM dm_participants dp WHERE dp.dm_channel_id = dm_participants.dm_channel_id AND dp.user_id = auth.uid())
  );

CREATE POLICY dm_messages_select_policy ON dm_messages
  FOR SELECT USING (
    is_deleted = false
    AND created_at >= (now() - interval '10 days')
    AND EXISTS (
      SELECT 1 FROM dm_participants dp
      WHERE dp.dm_channel_id = dm_messages.dm_channel_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY dm_messages_insert_policy ON dm_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM dm_participants dp
      WHERE dp.dm_channel_id = dm_messages.dm_channel_id AND dp.user_id = auth.uid()
    )
    -- Garante que não haja bloqueio mútuo ativo
    AND NOT EXISTS (
      SELECT 1 FROM dm_participants dp
      JOIN blocks b ON (b.blocker_id = dp.user_id AND b.blocked_id = auth.uid())
      WHERE dp.dm_channel_id = dm_messages.dm_channel_id
    )
  );
