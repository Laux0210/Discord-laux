-- ============================================================================
-- Migration 000004: Servidor único, permissões por cargo e correção de RLS
-- - Corrige recursão de RLS em guild_members e dm_participants (helpers SECURITY DEFINER)
-- - Guilda única: todo perfil novo entra com @everyone; primeiro perfil vira dono
-- - Escrita de canais, cargos e mensagens exige permissão (bitflags de src/common/permissions.ts)
-- - Amizades com aceite pelo destinatário e DM só entre amigos
-- Flags: ADMINISTRATOR=8, MANAGE_CHANNELS=16, SEND_MESSAGES=2048, MANAGE_ROLES=268435456
-- ============================================================================

ALTER TABLE guilds ALTER COLUMN owner_id DROP NOT NULL;

-- 1. HELPERS (SECURITY DEFINER evita recursão das políticas)
CREATE OR REPLACE FUNCTION public.is_guild_member(gid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM guild_members WHERE guild_id = gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_dm_participant(dmid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM dm_participants WHERE dm_channel_id = dmid AND user_id = auth.uid());
$$;

-- Permissões base: dono = todas; @everyone (role.id = guild.id) + cargos do membro
CREATE OR REPLACE FUNCTION public.member_permissions(gid uuid, uid uuid DEFAULT auth.uid()) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM guild_members WHERE guild_id = gid AND user_id = uid) THEN 0::bigint
    WHEN EXISTS (SELECT 1 FROM guilds WHERE id = gid AND owner_id = uid) THEN (-1)::bigint
    ELSE COALESCE((
      SELECT bit_or(r.permissions::bigint) FROM roles r
      WHERE r.guild_id = gid AND (r.id = gid OR r.id IN (
        SELECT role_id FROM member_roles WHERE guild_id = gid AND user_id = uid))
    ), 0::bigint)
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_guild_permission(gid uuid, flag bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (public.member_permissions(gid) & 8) = 8 OR (public.member_permissions(gid) & flag) = flag;
$$;

-- Maior posição de cargo do membro (dono = infinito)
CREATE OR REPLACE FUNCTION public.member_top_position(gid uuid, uid uuid DEFAULT auth.uid()) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM guilds WHERE id = gid AND owner_id = uid) THEN 2147483647
    ELSE COALESCE((SELECT max(r.position) FROM roles r JOIN member_roles mr ON mr.role_id = r.id
                   WHERE mr.guild_id = gid AND mr.user_id = uid), 0)
  END;
$$;

-- 2. GUILDA ÚNICA
INSERT INTO guilds (id, name, owner_id) VALUES ('00000000-0000-0000-0000-000000000001', 'Discord Laux', NULL)
ON CONFLICT (id) DO NOTHING;
-- @everyone: VIEW_CHANNEL|SEND_MESSAGES|CONNECT|SPEAK|STREAM|CREATE_INSTANT_INVITE
INSERT INTO roles (id, guild_id, name, position, permissions)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '@everyone', 0, 3149313)
ON CONFLICT (id) DO NOTHING;
INSERT INTO channels (guild_id, name, type, position)
SELECT '00000000-0000-0000-0000-000000000001', n, t, p
FROM (VALUES ('geral', 'text', 0), ('Geral', 'voice', 1)) AS v(n, t, p)
WHERE NOT EXISTS (SELECT 1 FROM channels WHERE guild_id = '00000000-0000-0000-0000-000000000001');

-- Perfil a partir de auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text;
BEGIN
  base := lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user'), '[^a-zA-Z0-9_]', '', 'g'));
  IF base = '' THEN base := 'user'; END IF;
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, left(base, 23) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8),
          left(COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', base), 64),
          NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Entrada automática na guilda; primeiro perfil vira dono
CREATE OR REPLACE FUNCTION public.join_default_guild() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO guild_members (guild_id, user_id) VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
  ON CONFLICT DO NOTHING;
  UPDATE guilds SET owner_id = NEW.id WHERE id = '00000000-0000-0000-0000-000000000001' AND owner_id IS NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION public.join_default_guild();

-- 3. POLÍTICAS DE LEITURA REESCRITAS COM HELPERS
DROP POLICY IF EXISTS guilds_select_policy ON guilds;
CREATE POLICY guilds_select_policy ON guilds FOR SELECT USING (public.is_guild_member(id));
DROP POLICY IF EXISTS guild_members_select_policy ON guild_members;
CREATE POLICY guild_members_select_policy ON guild_members FOR SELECT USING (public.is_guild_member(guild_id));
DROP POLICY IF EXISTS channels_select_policy ON channels;
CREATE POLICY channels_select_policy ON channels FOR SELECT USING (public.is_guild_member(guild_id));
DROP POLICY IF EXISTS roles_select_policy ON roles;
CREATE POLICY roles_select_policy ON roles FOR SELECT USING (public.is_guild_member(guild_id));
DROP POLICY IF EXISTS member_roles_select_policy ON member_roles;
CREATE POLICY member_roles_select_policy ON member_roles FOR SELECT USING (public.is_guild_member(guild_id));
DROP POLICY IF EXISTS dm_channels_select_policy ON dm_channels;
CREATE POLICY dm_channels_select_policy ON dm_channels FOR SELECT USING (public.is_dm_participant(id));
DROP POLICY IF EXISTS dm_participants_select_policy ON dm_participants;
CREATE POLICY dm_participants_select_policy ON dm_participants FOR SELECT USING (public.is_dm_participant(dm_channel_id));
DROP POLICY IF EXISTS dm_messages_select_policy ON dm_messages;
CREATE POLICY dm_messages_select_policy ON dm_messages FOR SELECT USING (
  is_deleted = false AND created_at >= (now() - interval '10 days') AND public.is_dm_participant(dm_channel_id));

-- 4. ESCRITA DE CANAIS (MANAGE_CHANNELS)
CREATE POLICY channels_insert_policy ON channels FOR INSERT WITH CHECK (public.has_guild_permission(guild_id, 16));
CREATE POLICY channels_update_policy ON channels FOR UPDATE USING (public.has_guild_permission(guild_id, 16));
CREATE POLICY channels_delete_policy ON channels FOR DELETE USING (public.has_guild_permission(guild_id, 16));

-- 5. CARGOS (MANAGE_ROLES + hierarquia; @everyone não pode ser apagado)
CREATE POLICY roles_insert_policy ON roles FOR INSERT WITH CHECK (
  public.has_guild_permission(guild_id, 268435456) AND position < public.member_top_position(guild_id));
CREATE POLICY roles_update_policy ON roles FOR UPDATE
  USING (public.has_guild_permission(guild_id, 268435456) AND (id = guild_id OR position < public.member_top_position(guild_id)))
  WITH CHECK (public.has_guild_permission(guild_id, 268435456) AND (id = guild_id OR position < public.member_top_position(guild_id)));
CREATE POLICY roles_delete_policy ON roles FOR DELETE USING (
  id <> guild_id AND public.has_guild_permission(guild_id, 268435456) AND position < public.member_top_position(guild_id));

CREATE POLICY member_roles_insert_policy ON member_roles FOR INSERT WITH CHECK (
  role_id <> guild_id AND public.has_guild_permission(guild_id, 268435456)
  AND (SELECT position FROM roles WHERE id = role_id) < public.member_top_position(guild_id));
CREATE POLICY member_roles_delete_policy ON member_roles FOR DELETE USING (
  public.has_guild_permission(guild_id, 268435456)
  AND (SELECT position FROM roles WHERE id = role_id) < public.member_top_position(guild_id));

-- 6. MENSAGENS DE CANAL (SEND_MESSAGES, só em canal de texto)
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages FOR SELECT USING (
  is_deleted = false AND created_at >= (now() - interval '10 days')
  AND public.is_guild_member((SELECT guild_id FROM channels WHERE id = channel_id)));
DROP POLICY IF EXISTS messages_insert_policy ON messages;
CREATE POLICY messages_insert_policy ON messages FOR INSERT WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (SELECT 1 FROM channels c WHERE c.id = channel_id AND c.type = 'text'
              AND public.has_guild_permission(c.guild_id, 2048)));

-- 7. AMIZADES: destinatário aceita; sem pedido envolvendo bloqueio ou pedido inverso
DROP POLICY IF EXISTS friendships_insert_policy ON friendships;
CREATE POLICY friendships_insert_policy ON friendships FOR INSERT WITH CHECK (
  auth.uid() = user_id AND status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = friend_id AND b.blocked_id = user_id)
                                          OR (b.blocker_id = user_id AND b.blocked_id = friend_id))
  AND NOT EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = friendships.friend_id AND f.friend_id = friendships.user_id));
CREATE POLICY friendships_update_policy ON friendships FOR UPDATE
  USING (auth.uid() = friend_id AND status = 'pending') WITH CHECK (auth.uid() = friend_id AND status = 'accepted');

-- Bloqueio desfaz amizade
CREATE OR REPLACE FUNCTION public.block_removes_friendship() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM friendships WHERE (user_id = NEW.blocker_id AND friend_id = NEW.blocked_id)
                             OR (user_id = NEW.blocked_id AND friend_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_block_created ON blocks;
CREATE TRIGGER on_block_created AFTER INSERT ON blocks FOR EACH ROW EXECUTE FUNCTION public.block_removes_friendship();

-- 8. DM: abre (ou reaproveita) conversa só com amigo aceito
CREATE OR REPLACE FUNCTION public.open_dm(other uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dmid uuid;
BEGIN
  IF auth.uid() IS NULL OR other = auth.uid() THEN RAISE EXCEPTION 'DM inválida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted'
                 AND ((user_id = auth.uid() AND friend_id = other) OR (user_id = other AND friend_id = auth.uid()))) THEN
    RAISE EXCEPTION 'DM só entre amigos';
  END IF;
  SELECT a.dm_channel_id INTO dmid FROM dm_participants a JOIN dm_participants b ON a.dm_channel_id = b.dm_channel_id
  WHERE a.user_id = auth.uid() AND b.user_id = other LIMIT 1;
  IF dmid IS NULL THEN
    INSERT INTO dm_channels DEFAULT VALUES RETURNING id INTO dmid;
    INSERT INTO dm_participants VALUES (dmid, auth.uid()), (dmid, other);
  END IF;
  RETURN dmid;
END;
$$;

-- 9. PERMISSÕES DE EXECUÇÃO
REVOKE EXECUTE ON FUNCTION public.purge_expired_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_default_guild() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_removes_friendship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.open_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_dm(uuid) TO authenticated;

-- 10. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE messages, dm_messages, channels, roles, member_roles, friendships, guild_members;
