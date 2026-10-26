-- ============================================================================
-- Migration 000007: Correções da revisão Codex (docs/validacao/revisao-codex-supabase-2026-10-25.md)
-- P1a member_roles: concessão só de bits que o autor tem e só em alvo abaixo dele
-- P1b friendships: par (user_id, friend_id) imutável no UPDATE
-- P1c DM: leitura/escrita exige amizade aceita e ausência de bloqueio nos dois sentidos
-- P2  ADMINISTRATOR equivale a todas as permissões ao comparar subconjunto
-- ============================================================================

-- P2
CREATE OR REPLACE FUNCTION public.can_grant_permissions(gid uuid, perms numeric) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN (public.member_permissions(gid) & 8) = 8 THEN true
              ELSE (perms::bigint & ~public.member_permissions(gid)) = 0 END;
$$;

-- P1a
CREATE OR REPLACE FUNCTION public.can_manage_member_role(gid uuid, target uuid, rid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rid <> gid
     AND public.has_guild_permission(gid, 268435456)
     AND (SELECT position FROM roles WHERE id = rid AND guild_id = gid) < public.member_top_position(gid)
     AND public.can_grant_permissions(gid, (SELECT permissions FROM roles WHERE id = rid))
     AND (target = auth.uid() OR public.member_top_position(gid, target) < public.member_top_position(gid))
     AND NOT EXISTS (SELECT 1 FROM guilds WHERE id = gid AND owner_id = target AND target <> auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_member_role(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_member_role(uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS member_roles_insert_policy ON member_roles;
CREATE POLICY member_roles_insert_policy ON member_roles FOR INSERT
  WITH CHECK (public.can_manage_member_role(guild_id, user_id, role_id));
DROP POLICY IF EXISTS member_roles_delete_policy ON member_roles;
CREATE POLICY member_roles_delete_policy ON member_roles FOR DELETE
  USING (public.can_manage_member_role(guild_id, user_id, role_id));

-- P1b
CREATE OR REPLACE FUNCTION public.friendship_pair_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id OR NEW.friend_id <> OLD.friend_id THEN
    RAISE EXCEPTION 'Par da amizade não pode ser alterado' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.friendship_pair_immutable() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_friendship_update ON friendships;
CREATE TRIGGER on_friendship_update BEFORE UPDATE ON friendships FOR EACH ROW EXECUTE FUNCTION public.friendship_pair_immutable();

-- P1c
CREATE OR REPLACE FUNCTION public.can_use_dm(dmid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM dm_participants me
    JOIN dm_participants other ON other.dm_channel_id = me.dm_channel_id AND other.user_id <> me.user_id
    WHERE me.dm_channel_id = dmid AND me.user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted'
                  AND ((f.user_id = me.user_id AND f.friend_id = other.user_id)
                    OR (f.user_id = other.user_id AND f.friend_id = me.user_id)))
      AND NOT EXISTS (SELECT 1 FROM blocks b
                      WHERE (b.blocker_id = me.user_id AND b.blocked_id = other.user_id)
                         OR (b.blocker_id = other.user_id AND b.blocked_id = me.user_id))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_use_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_dm(uuid) TO authenticated;

DROP POLICY IF EXISTS dm_messages_select_policy ON dm_messages;
CREATE POLICY dm_messages_select_policy ON dm_messages FOR SELECT USING (
  is_deleted = false AND created_at >= (now() - interval '10 days') AND public.can_use_dm(dm_channel_id));
DROP POLICY IF EXISTS dm_messages_insert_policy ON dm_messages;
CREATE POLICY dm_messages_insert_policy ON dm_messages FOR INSERT WITH CHECK (
  auth.uid() = author_id AND public.can_use_dm(dm_channel_id));
